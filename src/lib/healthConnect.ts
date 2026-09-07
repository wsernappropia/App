// Capa nativa de Health Connect (Capacitor + @capgo/capacitor-health).
//
// Igual que `notifications.ts`: todo es un no-op en la web (`isNativePlatform()`
// es false y ninguna función llega a tocar el plugin). La lógica de QUÉ insertar
// vive en `health.ts` (pura y testeada) y en `store.applyHealthSnapshot`; aquí
// sólo se lee del plugin y se mapea.
//
// El plugin se importa de forma ESTÁTICA y toda llamada nativa lleva TIMEOUT:
// ver el comentario largo de `notifications.ts` — un `import()` dinámico que no
// resuelve, o una llamada al puente que nunca contesta, dejaban el interruptor
// de Ajustes y el panel de Diagnóstico colgados sin decir nada.
//
// API real del plugin usada (v8.10.x):
//   Health.isAvailable()                      -> { available, platform, reason }
//   Health.requestAuthorization({ read })     -> { readAuthorized, readDenied, ... }
//   Health.checkAuthorization({ read })       -> idem, sin abrir el diálogo
//   Health.queryAggregated({ dataType:'steps', bucket:'day', aggregation:'sum' })
//   Health.queryWorkouts({ startDate, endDate })  -> ExerciseSessionRecord
//   Health.readSamples({ dataType:'weight' | 'heartRate' })
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Health } from '@capgo/capacitor-health'
import type {
  AuthorizationStatus,
  HealthDataType,
  Workout,
} from '@capgo/capacitor-health'
import { NATIVE_TIMEOUT_MS, PERMISSION_TIMEOUT_MS, withTimeout } from './async'
import { toISODate } from './dates'
import { clearError, getLastError, recordError } from './diagnostics'
import { HEALTH_SYNC_DAYS, HEALTH_SYNC_THROTTLE_MS } from './health'
import type { HealthSnapshot, HealthWalk } from './health'
import { useStore } from './store'
import type { ISODate } from './types'

type Plugin = typeof Health

/** Nombre con el que el plugin se registra en el puente (`registerPlugin('Health')`). */
export const HEALTH_PLUGIN_NAME = 'Health'

/**
 * Tipos que Momentum lee. `workouts` mapea a READ_EXERCISE en Health Connect;
 * `distance` hace falta porque el plugin agrega DistanceRecord dentro de cada
 * sesión, y de ahí sale el ritmo (suave/moderado/rápido).
 */
export const READ_TYPES: HealthDataType[] = [
  'steps',
  'workouts',
  'distance',
  'weight',
  'heartRate',
]

/** Sin estos dos no hay nada que sincronizar; peso y pulso son opcionales. */
const REQUIRED_TYPES: HealthDataType[] = ['steps', 'workouts']

/** Tipos de sesión de Health Connect que Momentum cuenta como caminata. */
const WALK_WORKOUTS = new Set(['walking', 'hiking'])

const MAX_WORKOUTS = 200
const MAX_HR_SAMPLES = 2000

export function isNativeHealth(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** El plugin, o null fuera de la app nativa. Síncrono: nada que pueda colgarse. */
function plugin(): Plugin | null {
  return isNativeHealth() ? Health : null
}

/** Llamada al puente nativo con límite de tiempo. Rechaza con "timeout: <label>". */
function nativeCall<T>(label: string, run: () => Promise<T>, ms: number = NATIVE_TIMEOUT_MS): Promise<T> {
  return withTimeout(run(), ms, label)
}

// ------------------------------------------------------ disponibilidad

/** Disponibilidad detallada, con el motivo que dé el plugin. */
export interface HealthAvailability {
  pluginLoaded: boolean
  available: boolean
  /** Motivo que devuelve el plugin cuando no está disponible. */
  reason?: string
  platform?: string
  /** Mensaje del error capturado, si lo hubo. */
  error?: string
}

/** ¿Hay Health Connect en este teléfono? Con motivo, para poder explicarlo. */
export async function availabilityDetail(): Promise<HealthAvailability> {
  const health = plugin()
  if (!health) {
    return {
      pluginLoaded: false,
      available: false,
      error: isNativeHealth()
        ? (getLastError('health')?.message ?? 'el plugin de Health Connect no está disponible')
        : 'la sincronización sólo existe en la app Android',
    }
  }
  try {
    const result = (await nativeCall('isAvailable', () => health.isAvailable())) as {
      available?: boolean
      reason?: string
      platform?: string
    }
    if (result.available) clearError('health')
    return {
      pluginLoaded: true,
      available: !!result.available,
      reason: result.reason,
      platform: result.platform,
    }
  } catch (err) {
    const entry = recordError('health', 'isAvailable', err)
    return { pluginLoaded: true, available: false, error: entry.message }
  }
}

/** ¿Hay Health Connect en este teléfono? (false siempre en la web) */
export async function isAvailable(): Promise<boolean> {
  return (await availabilityDetail()).available
}

function granted(status: AuthorizationStatus): boolean {
  const ok = new Set(status.readAuthorized ?? [])
  return REQUIRED_TYPES.every((t) => ok.has(t))
}

/** Permisos ya concedidos, sin abrir ningún diálogo. */
export async function hasPermissions(): Promise<boolean> {
  const health = plugin()
  if (!health) return false
  try {
    return granted(
      await nativeCall('checkAuthorization', () => health.checkAuthorization({ read: READ_TYPES })),
    )
  } catch (err) {
    recordError('health', 'checkAuthorization', err)
    return false
  }
}

/** Resultado detallado de pedir permisos, para poder explicar el fallo. */
export interface HealthPermissionResult {
  granted: boolean
  /** 'granted' | 'denied' | 'no-plugin' | 'error' */
  reason: 'granted' | 'denied' | 'no-plugin' | 'error'
  readAuthorized?: string[]
  readDenied?: string[]
  error?: string
}

/** Abre el diálogo de Health Connect. Nunca lanza: devuelve el motivo. */
export async function requestPermissions(): Promise<HealthPermissionResult> {
  const health = plugin()
  if (!health) {
    return {
      granted: false,
      reason: 'no-plugin',
      error: isNativeHealth()
        ? (getLastError('health')?.message ?? 'el plugin de Health Connect no está disponible')
        : 'la sincronización sólo existe en la app Android',
    }
  }
  try {
    const current = await nativeCall('checkAuthorization', () =>
      health.checkAuthorization({ read: READ_TYPES }),
    )
    if (granted(current)) {
      clearError('health')
      return {
        granted: true,
        reason: 'granted',
        readAuthorized: current.readAuthorized ?? [],
        readDenied: current.readDenied ?? [],
      }
    }
    // Abre el diálogo de Health Connect: tarda lo que tarde la persona.
    const asked = await nativeCall(
      'requestAuthorization',
      () => health.requestAuthorization({ read: READ_TYPES }),
      PERMISSION_TIMEOUT_MS,
    )
    const ok = granted(asked)
    if (ok) clearError('health')
    return {
      granted: ok,
      reason: ok ? 'granted' : 'denied',
      readAuthorized: asked.readAuthorized ?? [],
      readDenied: asked.readDenied ?? [],
    }
  } catch (err) {
    const entry = recordError('health', 'requestAuthorization', err)
    return { granted: false, reason: 'error', error: entry.message }
  }
}

/** Permisos vigentes (sin abrir diálogo), para el panel de Diagnóstico. */
export async function authorizationDetail(): Promise<HealthPermissionResult> {
  const health = plugin()
  if (!health) return { granted: false, reason: 'no-plugin' }
  try {
    const current = await nativeCall('checkAuthorization', () =>
      health.checkAuthorization({ read: READ_TYPES }),
    )
    return {
      granted: granted(current),
      reason: granted(current) ? 'granted' : 'denied',
      readAuthorized: current.readAuthorized ?? [],
      readDenied: current.readDenied ?? [],
    }
  } catch (err) {
    const entry = recordError('health', 'checkAuthorization', err)
    return { granted: false, reason: 'error', error: entry.message }
  }
}

/** Abre los ajustes de Health Connect del sistema (para revisar permisos). */
export async function openHealthSettings(): Promise<void> {
  const health = plugin()
  if (!health) return
  try {
    await nativeCall('openHealthConnectSettings', () => health.openHealthConnectSettings())
  } catch (err) {
    recordError('health', 'openHealthConnectSettings', err)
  }
}

// -------------------------------------------------------------- lectura

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function emptySnapshot(): HealthSnapshot {
  return { steps: 0, walks: [] }
}

function bucketOf(map: Map<ISODate, HealthSnapshot>, date: ISODate): HealthSnapshot {
  const found = map.get(date)
  if (found) return found
  const fresh = emptySnapshot()
  map.set(date, fresh)
  return fresh
}

interface HrSample {
  at: number
  value: number
}

/** Pulso medio de la ventana [start, end) a partir de las muestras del periodo. */
function averageHr(samples: HrSample[], start: number, end: number): number | undefined {
  let sum = 0
  let count = 0
  for (const s of samples) {
    if (s.at >= start && s.at <= end) {
      sum += s.value
      count += 1
    }
  }
  return count > 0 ? Math.round(sum / count) : undefined
}

function toWalk(workout: Workout, hr: HrSample[]): HealthWalk | null {
  const startedAt = Date.parse(workout.startDate)
  if (!Number.isFinite(startedAt)) return null
  const endedAt = Date.parse(workout.endDate)
  const seconds = workout.duration > 0 ? workout.duration : (endedAt - startedAt) / 1000
  const minutes = Math.round(seconds / 60)
  // Sin platformId no hay dedupe fiable: se usa el instante de inicio como id.
  const externalId = workout.platformId ?? `hc:${startedAt}`
  const walk: HealthWalk = { externalId, startedAt, minutes }
  if (typeof workout.totalDistance === 'number' && workout.totalDistance > 0) {
    walk.distanceKm = Math.round((workout.totalDistance / 1000) * 100) / 100
  }
  const avgHr = averageHr(hr, startedAt, Number.isFinite(endedAt) ? endedAt : startedAt)
  if (avgHr) walk.avgHr = avgHr
  return walk
}

/**
 * Lee los últimos `days` días de Health Connect y los agrupa POR DÍA local:
 * pasos (bucket diario), caminatas/senderismo y la última medición de peso.
 * Devuelve `{}` en la web, sin permisos o si algo falla.
 */
export async function readSnapshot(
  days: number = HEALTH_SYNC_DAYS,
  now: Date = new Date(),
): Promise<Record<ISODate, HealthSnapshot>> {
  const health = plugin()
  if (!health) return {}

  const start = startOfDay(new Date(now.getTime() - (Math.max(1, days) - 1) * 86_400_000))
  const startISO = start.toISOString()
  const endISO = now.toISOString()
  const byDay = new Map<ISODate, HealthSnapshot>()

  // Pasos: un bucket por día local (el plugin corta desde `startDate`, que es
  // medianoche local, así que los buckets caen en días naturales).
  try {
    const { samples } = await nativeCall('queryAggregated (pasos)', () =>
      health.queryAggregated({
        dataType: 'steps',
        startDate: startISO,
        endDate: endISO,
        bucket: 'day',
        aggregation: 'sum',
      }),
    )
    for (const sample of samples) {
      const at = new Date(sample.startDate)
      if (Number.isNaN(at.getTime())) continue
      const value = Math.round(sample.value ?? 0)
      if (value <= 0) continue
      bucketOf(byDay, toISODate(at)).steps = value
    }
  } catch (err) {
    recordError('health', 'lectura de pasos', err)
  }

  // Pulso de la ventana, para estimar el pulso medio de cada caminata.
  let hr: HrSample[] = []
  try {
    const { samples } = await nativeCall('readSamples (pulso)', () =>
      health.readSamples({
        dataType: 'heartRate',
        startDate: startISO,
        endDate: endISO,
        limit: MAX_HR_SAMPLES,
        ascending: true,
      }),
    )
    hr = samples
      .map((s) => ({ at: Date.parse(s.startDate), value: s.value }))
      .filter((s) => Number.isFinite(s.at) && s.value > 0)
  } catch (err) {
    // Sin permiso de pulso simplemente no hay `avgHr`.
    recordError('health', 'lectura de pulso', err)
  }

  // Caminatas y senderismo.
  try {
    const { workouts } = await nativeCall('queryWorkouts', () =>
      health.queryWorkouts({
        startDate: startISO,
        endDate: endISO,
        limit: MAX_WORKOUTS,
        ascending: true,
      }),
    )
    for (const workout of workouts) {
      if (!WALK_WORKOUTS.has(workout.workoutType)) continue
      const walk = toWalk(workout, hr)
      if (!walk) continue
      bucketOf(byDay, toISODate(new Date(walk.startedAt))).walks.push(walk)
    }
  } catch (err) {
    recordError('health', 'lectura de caminatas', err)
  }

  // Peso: la medición más reciente de la ventana, en el día en que se tomó.
  try {
    const { samples } = await nativeCall('readSamples (peso)', () =>
      health.readSamples({
        dataType: 'weight',
        startDate: startISO,
        endDate: endISO,
        limit: 1,
        ascending: false,
      }),
    )
    const latest = samples[0]
    if (latest && latest.value > 0) {
      const at = Date.parse(latest.startDate)
      if (Number.isFinite(at)) {
        bucketOf(byDay, toISODate(new Date(at))).weightKg = { at, kg: latest.value }
      }
    }
  } catch (err) {
    recordError('health', 'lectura de peso', err)
  }

  const out: Record<ISODate, HealthSnapshot> = {}
  for (const [date, snapshot] of byDay) out[date] = snapshot
  return out
}

// ---------------------------------------------------------- orquestación

let syncing = false

/**
 * Sincroniza si procede: ajuste activo, plataforma nativa y permisos vigentes.
 * `force` salta el throttle de 5 min (botón "Sincronizar ahora").
 * Nunca lanza: cualquier error queda en `diagnostics` (panel de Ajustes).
 */
export async function syncHealth(force = false, now: Date = new Date()): Promise<boolean> {
  if (!isNativeHealth()) return false
  if (syncing) return false

  const store = useStore.getState()
  const settings = store.settings.health
  if (!settings.enabled) return false
  if (!force && settings.lastSyncAt && now.getTime() - settings.lastSyncAt < HEALTH_SYNC_THROTTLE_MS) {
    return false
  }

  syncing = true
  try {
    if (!(await hasPermissions())) return false
    const byDay = await readSnapshot(HEALTH_SYNC_DAYS, now)
    const dates = Object.keys(byDay).sort() as ISODate[]
    for (const date of dates) {
      useStore.getState().applyHealthSnapshot(byDay[date], date)
    }
    const current = useStore.getState()
    current.updateSettings({
      health: { ...current.settings.health, lastSyncAt: now.getTime() },
    })
    return true
  } catch (err) {
    recordError('health', 'sincronización', err)
    return false
  } finally {
    syncing = false
  }
}

/** Rango de días que se lee (para el copy de Ajustes). */
export { HEALTH_SYNC_DAYS }

// ------------------------------------------------------------------ hook

/**
 * Sincroniza al arrancar la app y cada vez que vuelve a primer plano
 * (`appStateChange`), con el throttle de 5 min de `HEALTH_SYNC_THROTTLE_MS`.
 * En la web no hace absolutamente nada.
 */
export function useHealthSync(): void {
  useEffect(() => {
    if (!isNativeHealth()) return

    let disposed = false
    const handles: PluginListenerHandle[] = []

    const requestSync = () => {
      if (disposed) return
      void syncHealth()
    }

    // El arranque no espera al primer `appStateChange`.
    requestSync()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') requestSync()
    }
    document.addEventListener('visibilitychange', onVisibility)

    void (async () => {
      try {
        const handle = await nativeCall('addListener appStateChange', () =>
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) requestSync()
          }),
        )
        if (disposed) void handle.remove()
        else handles.push(handle)
      } catch (err) {
        recordError('health', 'appStateChange', err)
      }
    })()

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      for (const h of handles) void h.remove()
    }
  }, [])
}
