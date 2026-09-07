// Dominio de la sincronización con Health Connect (alimentado por Samsung Health
// y el Galaxy Watch).
//
// Este módulo es PURO: no toca Capacitor, ni el DOM, ni el store. Recibe días y
// lecturas de Health Connect y decide qué hay que insertar. La capa nativa
// (`src/lib/healthConnect.ts`) sólo traduce el plugin a estas estructuras, y el
// store (`src/lib/store.ts`) las aplica reutilizando `logWalk`/`setBodyMetrics`.
import { MIN_WALK_MINUTES } from './gamification'
import type { DayLog, HealthSettings, Pace, Settings, WalkSession } from './types'

// ------------------------------------------------------------------ tipos

/** Una sesión de caminata/senderismo leída de Health Connect. */
export interface HealthWalk {
  /** Id estable del registro en Health Connect (metadata.id). Clave del dedupe. */
  externalId: string
  startedAt: number
  minutes: number
  distanceKm?: number
  avgHr?: number
}

/** Lo que se ha leído para UN día concreto. */
export interface HealthSnapshot {
  steps: number
  walks: HealthWalk[]
  /** Última medición de peso conocida, con su fecha real. */
  weightKg?: { at: number; kg: number }
}

// --------------------------------------------------------------- defaults

export const DEFAULT_HEALTH: HealthSettings = {
  enabled: false,
  stepsGoal: 8000,
  // Opt-in: activar la sincronización NO cambia por sí sola las reglas de racha.
  stepsMissionEnabled: false,
}

export const STEPS_GOAL_MIN = 5000
export const STEPS_GOAL_MAX = 15000
export const STEPS_GOAL_STEP = 500

/** Días de historial que se leen en cada sincronización. */
export const HEALTH_SYNC_DAYS = 7

/**
 * Health Connect sólo deja leer 30 días hacia atrás sin el permiso extra
 * `READ_HEALTH_DATA_HISTORY`. Momentum no lo pide: sincroniza en cada arranque,
 * así que nunca necesita mirar tan atrás.
 */
export const HEALTH_HISTORY_LIMIT_DAYS = 30

/** Ventana mínima entre sincronizaciones automáticas. */
export const HEALTH_SYNC_THROTTLE_MS = 5 * 60 * 1000

/** Etiqueta de origen que se muestra en la UI. */
export const HEALTH_SOURCE_LABEL = 'Desde Samsung Health'

/** Un solape >= 50 % con una caminata manual se considera la misma salida. */
export const WALK_OVERLAP_THRESHOLD = 0.5

// --------------------------------------------------------------- ajustes

export function clampStepsGoal(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_HEALTH.stepsGoal
  const snapped = Math.round(value / STEPS_GOAL_STEP) * STEPS_GOAL_STEP
  return Math.max(STEPS_GOAL_MIN, Math.min(STEPS_GOAL_MAX, snapped))
}

/** Tolerante: los estados guardados antes de esta función no traen `health`. */
export function normalizeHealth(raw: unknown): HealthSettings {
  const base: HealthSettings = { ...DEFAULT_HEALTH }
  if (typeof raw !== 'object' || raw === null) return base
  const r = raw as Partial<Record<keyof HealthSettings, unknown>>
  if (typeof r.enabled === 'boolean') base.enabled = r.enabled
  if (typeof r.stepsMissionEnabled === 'boolean') base.stepsMissionEnabled = r.stepsMissionEnabled
  if (typeof r.stepsGoal === 'number') base.stepsGoal = clampStepsGoal(r.stepsGoal)
  if (typeof r.lastSyncAt === 'number' && Number.isFinite(r.lastSyncAt)) {
    base.lastSyncAt = r.lastSyncAt
  }
  return base
}

// ----------------------------------------------------------------- pasos

/** ¿Se ha alcanzado la meta de pasos y la misión de pasos está activa? */
export function stepsMissionDone(day: DayLog, settings?: Settings): boolean {
  const health = settings?.health
  if (!health || !health.stepsMissionEnabled) return false
  return (day.steps ?? 0) >= clampStepsGoal(health.stepsGoal)
}

/** Progreso 0..1 hacia la meta de pasos (para la barra de Hoy). */
export function stepsProgress(day: DayLog, settings: Settings): number {
  const goal = clampStepsGoal(settings.health.stepsGoal)
  if (goal <= 0) return 0
  return Math.max(0, Math.min(1, (day.steps ?? 0) / goal))
}

// ------------------------------------------------------------- caminatas

interface Span {
  start: number
  end: number
}

function span(startedAt: number, minutes: number): Span {
  return { start: startedAt, end: startedAt + Math.max(0, minutes) * 60_000 }
}

/**
 * Fracción de solape entre dos intervalos, medida sobre el MÁS CORTO de los dos.
 * Así una caminata manual de 10 min contenida en una sesión del reloj de 30 min
 * cuenta como solape total (1.0) y no se duplica.
 */
export function overlapRatio(a: Span, b: Span): number {
  const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start)
  if (overlap <= 0) return 0
  const shortest = Math.min(a.end - a.start, b.end - b.start)
  return shortest > 0 ? Math.min(1, overlap / shortest) : 0
}

/** ¿Esta sesión vino de Health Connect? (sin `source` = manual, datos antiguos) */
export function isHealthWalk(walk: WalkSession): boolean {
  return walk.source === 'health'
}

/** Minutos del día que vinieron de Health Connect. */
export function healthWalkMinutes(day: DayLog): number {
  return day.walks.reduce((acc, w) => acc + (isHealthWalk(w) ? w.minutes || 0 : 0), 0)
}

/**
 * Ritmo estimado a partir de la distancia. Sin distancia, 'moderado'
 * (Samsung Health no siempre adjunta DistanceRecord a la sesión).
 */
export function paceFromWalk(walk: Pick<HealthWalk, 'minutes' | 'distanceKm'>): Pace {
  const km = walk.distanceKm
  if (!km || km <= 0 || walk.minutes <= 0) return 'moderado'
  const kmh = km / (walk.minutes / 60)
  if (kmh < 4) return 'suave'
  if (kmh < 5.5) return 'moderado'
  return 'rapido'
}

/**
 * Caminatas de Health Connect que TOCA insertar en `day`. Se descartan:
 *  - las de menos de `MIN_WALK_MINUTES` (5 min, mismo umbral que el modo manual),
 *  - las que ya están en el día por `externalId` (o repetidas en la propia lista),
 *  - las que solapan >= 50 % con una caminata registrada a mano (misma salida).
 */
export function mergeHealthWalks(day: DayLog, walks: HealthWalk[]): HealthWalk[] {
  const known = new Set<string>()
  for (const w of day.walks) {
    if (w.externalId) known.add(w.externalId)
  }
  const manual = day.walks.filter((w) => !isHealthWalk(w)).map((w) => span(w.startedAt, w.minutes))

  const out: HealthWalk[] = []
  for (const walk of walks) {
    if (!walk.externalId) continue
    if (!(walk.minutes >= MIN_WALK_MINUTES)) continue
    if (known.has(walk.externalId)) continue
    const s = span(walk.startedAt, walk.minutes)
    if (manual.some((m) => overlapRatio(s, m) >= WALK_OVERLAP_THRESHOLD)) continue
    known.add(walk.externalId)
    out.push(walk)
  }
  return out
}

/** "hace 3 min" / "hace 2 h" / "ayer" para la última sincronización. */
export function formatSyncAge(lastSyncAt: number | undefined, now: number = Date.now()): string {
  if (!lastSyncAt) return 'nunca'
  const mins = Math.floor((now - lastSyncAt) / 60_000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'ayer' : `hace ${days} días`
}
