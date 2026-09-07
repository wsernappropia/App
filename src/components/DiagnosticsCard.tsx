// Tarjeta plegable "Diagnóstico" (al final de Ajustes).
//
// Existe para poder depurar el APK instalado sin cable ni logcat: muestra en
// texto plano qué ve la app (plataforma, puente nativo, service worker, plugins,
// permisos, último error) y deja copiarlo todo al portapapeles para pegarlo en
// un reporte.
import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Card } from './Card'
import { Button } from './Button'
import { formatErrorLine, getLastError } from '../lib/diagnostics'
import { formatSyncAge } from '../lib/health'
import { notificationsDiagnostics } from '../lib/notifications'
import { authorizationDetail, availabilityDetail } from '../lib/healthConnect'
import { useStore } from '../lib/store'

export interface DiagnosticLine {
  label: string
  value: string
}

const yesNo = (v: boolean) => (v ? 'sí' : 'no')

/** Estado del service worker en este documento. */
export async function serviceWorkerStatus(): Promise<string> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return 'no soportado'
  }
  const controlled = !!navigator.serviceWorker.controller
  let registrations = 0
  try {
    registrations = (await navigator.serviceWorker.getRegistrations()).length
  } catch {
    return controlled ? 'controlando (registros ilegibles)' : 'registros ilegibles'
  }
  if (controlled) return `SÍ, controlando esta página (${registrations} registro/s)`
  if (registrations > 0) return `registrado pero sin controlar (${registrations})`
  return 'ninguno'
}

/** Recoge todo el diagnóstico. Nunca lanza. */
export async function collectDiagnostics(): Promise<DiagnosticLine[]> {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'desconocida'
  let platform = 'desconocida'
  let native = false
  try {
    platform = Capacitor.getPlatform()
    native = Capacitor.isNativePlatform()
  } catch {
    /* sin Capacitor: quedan los valores por defecto */
  }

  const [sw, notifications, availability, authorization] = await Promise.all([
    serviceWorkerStatus(),
    notificationsDiagnostics(),
    availabilityDetail(),
    authorizationDetail(),
  ])

  const health = useStore.getState().settings.health

  const availabilityText = availability.available
    ? 'sí'
    : `no${availability.reason ? ` (${availability.reason})` : ''}${
        availability.error ? ` (${availability.error})` : ''
      }`

  const authText = availability.pluginLoaded
    ? `concedidos: ${authorization.readAuthorized?.join(', ') || 'ninguno'} · denegados: ${
        authorization.readDenied?.join(', ') || 'ninguno'
      }`
    : 'sin plugin'

  return [
    { label: 'Versión', value: version },
    { label: 'Plataforma', value: platform },
    { label: 'isNativePlatform', value: yesNo(native) },
    { label: 'Origen', value: typeof location !== 'undefined' ? location.origin : '—' },
    { label: 'Service worker', value: sw },
    { label: 'Plugin notificaciones', value: yesNo(notifications.pluginLoaded) },
    { label: 'Permiso notificaciones', value: notifications.permission },
    { label: 'Plugin Health Connect', value: yesNo(availability.pluginLoaded) },
    { label: 'Health Connect disponible', value: availabilityText },
    { label: 'Permisos health', value: authText },
    { label: 'Sincronización health', value: health.enabled ? 'activada' : 'desactivada' },
    { label: 'Última sincronización', value: formatSyncAge(health.lastSyncAt) },
    { label: 'Último error notificaciones', value: formatErrorLine(getLastError('notifications')) },
    { label: 'Último error health', value: formatErrorLine(getLastError('health')) },
    { label: 'Último error service worker', value: formatErrorLine(getLastError('sw')) },
    { label: 'Último error arranque nativo', value: formatErrorLine(getLastError('native')) },
  ]
}

/** Texto plano que se copia al portapapeles. */
export function diagnosticsToText(lines: DiagnosticLine[]): string {
  const header = `Momentum · diagnóstico · ${new Date().toISOString()}`
  return [header, ...lines.map((l) => `${l.label}: ${l.value}`)].join('\n')
}

export function DiagnosticsCard({ onToast }: { onToast?: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<DiagnosticLine[] | null>(null)
  const [copyFallback, setCopyFallback] = useState<string | null>(null)

  const refresh = useCallback(() => {
    void collectDiagnostics().then(setLines)
  }, [])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  async function handleCopy() {
    const text = diagnosticsToText(lines ?? (await collectDiagnostics()))
    try {
      await navigator.clipboard.writeText(text)
      setCopyFallback(null)
      onToast?.('Diagnóstico copiado')
    } catch {
      // El WebView puede negar el portapapeles: se muestra para copiar a mano.
      setCopyFallback(text)
      onToast?.('No se pudo copiar: cópialo a mano')
    }
  }

  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-extrabold text-white">Diagnóstico</span>
          <span className="block text-xs text-white/45">
            Qué ve la app en este dispositivo. Útil para reportar un problema.
          </span>
        </span>
        <span className="shrink-0 text-lg font-bold text-white/50">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4">
          <dl className="flex flex-col gap-2">
            {(lines ?? []).map((line) => (
              <div key={line.label} className="flex flex-col gap-0.5">
                <dt className="text-[11px] uppercase tracking-wide text-white/35">{line.label}</dt>
                <dd className="break-words font-mono text-xs text-white/80">{line.value}</dd>
              </div>
            ))}
            {lines === null && <p className="text-xs text-white/45">Recogiendo datos…</p>}
          </dl>

          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => void handleCopy()}>
              Copiar diagnóstico
            </Button>
            <Button variant="secondary" block onClick={refresh}>
              Actualizar
            </Button>
          </div>

          {copyFallback && (
            <textarea
              readOnly
              value={copyFallback}
              onFocus={(e) => e.currentTarget.select()}
              className="h-40 w-full rounded-xl bg-white/10 p-3 font-mono text-xs text-white/80 outline-none"
            />
          )}
        </div>
      )}
    </Card>
  )
}
