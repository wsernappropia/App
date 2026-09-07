// Qué ve la app en ESTE dispositivo: el contenido de la tarjeta "Diagnóstico".
//
// Está separado del componente para poder testearlo y, sobre todo, para dejar
// clara la regla que hace que la tarjeta no pueda colgarse:
//
//   · Los HECHOS SÍNCRONOS (`syncFacts`) no esperan a nadie. Se pintan en el
//     primer render. Ahí ya está casi todo lo que importa para diagnosticar:
//     plataforma, puente, plugins registrados, versión del WebView.
//   · Las SONDAS (`PROBES`) son llamadas que sí pueden tardar. Cada una se
//     resuelve por su cuenta (nada de `Promise.all`: una sola promesa colgada
//     bloqueaba la tarjeta entera) y con un timeout de 5 s. Si una se cuelga,
//     su línea dice "timeout" y las demás siguen apareciendo.
//
// La sonda de control es `App.getInfo()`: si ESA falla o hace timeout, el
// problema es el puente de Capacitor entero, no un plugin concreto.
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Health } from '@capgo/capacitor-health'
import { PROBE_TIMEOUT_MS, withTimeout } from './async'
import { errorMessage, formatErrorLine, formatGlobalError, getGlobalErrors, getLastError } from './diagnostics'
import type { GlobalErrorEntry } from './diagnostics'
import { HEALTH_PLUGIN_NAME, READ_TYPES } from './healthConnect'
import { formatSyncAge } from './health'
import { useStore } from './store'

export type LineStatus = 'sync' | 'pending' | 'ok' | 'failed'

export interface ReportLine {
  key: string
  label: string
  value: string
  status: LineStatus
}

/** Texto que se ve mientras una sonda no ha contestado. */
export const PENDING_VALUE = '…'

const yesNo = (v: boolean) => (v ? 'sí' : 'no')

function safe(run: () => string): string {
  try {
    return run()
  } catch (err) {
    return `error: ${errorMessage(err)}`
  }
}

/** Nombres de los plugins que el puente nativo dice tener registrados. */
export function pluginHeaderNames(): string[] {
  if (typeof window === 'undefined') return []
  const cap = (window as unknown as { Capacitor?: { PluginHeaders?: readonly { name?: string }[] } })
    .Capacitor
  const headers = cap?.PluginHeaders
  if (!headers) return []
  return headers.map((h) => h?.name ?? '?')
}

/** ¿Está inyectado el objeto que Capacitor usa para hablar con Android? */
export function hasAndroidBridge(): boolean {
  return typeof window !== 'undefined' && !!window.androidBridge
}

/**
 * Todo lo que se sabe SIN esperar a ninguna promesa. Nunca lanza y siempre
 * devuelve la lista completa: es lo primero que se pinta.
 */
export function syncFacts(): ReportLine[] {
  const line = (key: string, label: string, value: string): ReportLine => ({
    key,
    label,
    value,
    status: 'sync',
  })

  const headers = safe(() => {
    const names = pluginHeaderNames()
    if (names.length > 0) return `${names.length}: ${names.join(', ')}`
    // Dentro del APK esto es LA pista: sin PluginHeaders no hay puente nativo
    // en el documento (típicamente lo sirvió un service worker) y ningún
    // plugin va a responder. En la web es lo normal.
    return Capacitor.isNativePlatform() ? 'NINGUNO — el puente nativo no está inyectado' : 'ninguno (web)'
  })

  const available = (name: string) =>
    safe(() => yesNo(Capacitor.isPluginAvailable(name)))

  const health = useStore.getState().settings.health

  return [
    line('version', 'Versión', typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'desconocida'),
    line('platform', 'Plataforma', safe(() => Capacitor.getPlatform())),
    line('native', 'isNativePlatform', safe(() => yesNo(Capacitor.isNativePlatform()))),
    line('bridge', 'window.androidBridge', safe(() => yesNo(hasAndroidBridge()))),
    line('headers', 'Plugins registrados', headers),
    line('plugin-app', 'isPluginAvailable(App)', available('App')),
    line('plugin-ln', 'isPluginAvailable(LocalNotifications)', available('LocalNotifications')),
    line('plugin-health', `isPluginAvailable(${HEALTH_PLUGIN_NAME})`, available(HEALTH_PLUGIN_NAME)),
    line('origin', 'Origen', typeof location !== 'undefined' ? location.origin : '—'),
    line(
      'sw-controller',
      'Service worker controlando',
      typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? yesNo(!!navigator.serviceWorker.controller)
        : 'no soportado',
    ),
    line('ua', 'WebView (userAgent)', typeof navigator !== 'undefined' ? navigator.userAgent : '—'),
    line('health-enabled', 'Sincronización health', health.enabled ? 'activada' : 'desactivada'),
    line('health-sync', 'Última sincronización', formatSyncAge(health.lastSyncAt)),
    line('err-notifications', 'Último error notificaciones', formatErrorLine(getLastError('notifications'))),
    line('err-health', 'Último error health', formatErrorLine(getLastError('health'))),
    line('err-sw', 'Último error service worker', formatErrorLine(getLastError('sw'))),
    line('err-native', 'Último error arranque nativo', formatErrorLine(getLastError('native'))),
  ]
}

// ------------------------------------------------------------------ sondas

export interface Probe {
  key: string
  label: string
  /** Devuelve el texto de la línea. Puede lanzar: el runner lo convierte en "error: …". */
  run: () => Promise<string>
}

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

const NOT_NATIVE = 'no nativo (esto es la web)'

export const PROBES: Probe[] = [
  {
    key: 'probe-sw',
    label: 'getRegistrations()',
    run: async () => {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 'no soportado'
      const registrations = await navigator.serviceWorker.getRegistrations()
      return `${registrations.length} registro/s`
    },
  },
  {
    key: 'probe-app',
    label: 'App.getInfo() · control del puente',
    run: async () => {
      if (!isNative()) return NOT_NATIVE
      const info = await App.getInfo()
      return `ok · ${info.id} v${info.version} (build ${info.build})`
    },
  },
  {
    key: 'probe-notifications',
    label: 'LocalNotifications.checkPermissions()',
    run: async () => {
      if (!isNative()) return NOT_NATIVE
      const status = await LocalNotifications.checkPermissions()
      return status.display
    },
  },
  {
    key: 'probe-health-available',
    label: 'Health.isAvailable()',
    run: async () => {
      if (!isNative()) return NOT_NATIVE
      const result = (await Health.isAvailable()) as {
        available?: boolean
        reason?: string
        platform?: string
      }
      const extra = [result.platform, result.reason].filter(Boolean).join(' · ')
      return `${yesNo(!!result.available)}${extra ? ` (${extra})` : ''}`
    },
  },
  {
    key: 'probe-health-auth',
    label: 'Health.checkAuthorization()',
    run: async () => {
      if (!isNative()) return NOT_NATIVE
      const status = await Health.checkAuthorization({ read: READ_TYPES })
      const ok = status.readAuthorized?.join(', ') || 'ninguno'
      const no = status.readDenied?.join(', ') || 'ninguno'
      return `concedidos: ${ok} · denegados: ${no}`
    },
  },
]

/** Línea en estado "esperando" de cada sonda, para pintarlas desde el principio. */
export function pendingProbeLines(): ReportLine[] {
  return PROBES.map((p) => ({ key: p.key, label: p.label, value: PENDING_VALUE, status: 'pending' }))
}

/**
 * Lanza una sonda con timeout de 5 s. NUNCA lanza ni se queda pendiente:
 * devuelve siempre una línea, con "timeout: …" o "error: …" si tocó.
 */
export async function runProbe(probe: Probe): Promise<ReportLine> {
  try {
    const value = await withTimeout(probe.run(), PROBE_TIMEOUT_MS, probe.label)
    return { key: probe.key, label: probe.label, value, status: 'ok' }
  } catch (err) {
    return { key: probe.key, label: probe.label, value: errorMessage(err), status: 'failed' }
  }
}

/**
 * Corre TODAS las sondas en paralelo pero independientes: `onLine` se llama en
 * cuanto cada una termina, así la tarjeta se va rellenando sola.
 */
export async function runProbes(onLine: (line: ReportLine) => void): Promise<ReportLine[]> {
  const settled = await Promise.allSettled(
    PROBES.map(async (probe) => {
      const line = await runProbe(probe)
      onLine(line)
      return line
    }),
  )
  return settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { key: PROBES[i].key, label: PROBES[i].label, value: errorMessage(r.reason), status: 'failed' },
  )
}

// ------------------------------------------------------------------- texto

/** Texto plano que se copia / comparte. Incluye las líneas y el registro de errores. */
export function reportToText(
  lines: readonly ReportLine[],
  errors: readonly GlobalErrorEntry[] = getGlobalErrors(),
): string {
  const out = [
    `Momentum · diagnóstico · ${new Date().toISOString()}`,
    '',
    ...lines.map((l) => `${l.label}: ${l.value}`),
    '',
    `Errores capturados (${errors.length}):`,
    ...(errors.length === 0 ? ['  ninguno'] : errors.map((e) => `  ${formatGlobalError(e)}`)),
  ]
  return out.join('\n')
}
