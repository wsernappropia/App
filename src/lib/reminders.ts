// Planificación de recordatorios locales.
//
// Este módulo es PURO: no toca Capacitor ni el DOM. Recibe el estado, los ajustes
// de recordatorios y un `now` inyectable, y devuelve la lista de notificaciones
// que habría que programar para los próximos 7 días. La capa nativa
// (`src/lib/notifications.ts`) sólo traduce esa lista a llamadas del plugin.
import { addDays, dayOfWeek, todayKey, weekStart } from './dates'
import * as copy from './copy'
import { getDay, isRestDay, missionDone, missionFor, proteinStatus, proteinTotal } from './selectors'
import type {
  ISODate,
  MomentumData,
  ReminderId,
  ReminderSettings,
  ReminderTime,
  Screen,
} from './types'

export type { ReminderId, ReminderTime, ReminderSettings } from './types'

/** Orden fijo: define el `idx` del id determinista. No reordenar. */
export const REMINDER_ORDER: ReminderId[] = ['mission', 'protein', 'checkin', 'review']

/** Horizonte de planificación (hoy + 6 días). */
export const REMINDER_HORIZON_DAYS = 7

/**
 * Base de los ids nativos. Los ids son `BASE + dayOffset * 10 + idx`, con
 * dayOffset 0..6 e idx 0..3 → rango 100..163. Se deja hueco (10 por día) por si
 * en el futuro hay más de 4 recordatorios, y se evita el 0 y los ids sueltos que
 * usa la app para otras cosas (p. ej. la notificación de prueba).
 */
export const REMINDER_ID_BASE = 100

/** Id de la notificación de prueba de Ajustes (fuera del rango planificado). */
export const TEST_NOTIFICATION_ID = 9999

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  mission: { on: true, time: '08:00' },
  protein: { on: true, time: '14:00' },
  checkin: { on: true, time: '21:00' },
  // La revisión semanal sólo tiene sentido al cerrar la semana: domingos.
  review: { on: true, time: '18:00' },
}

export const REMINDER_LABEL: Record<ReminderId, string> = {
  mission: 'Misión del día',
  protein: 'Proteína',
  checkin: 'Check-in',
  review: 'Revisión semanal',
}

export const REMINDER_HINT: Record<ReminderId, string> = {
  mission: 'Por la mañana, con la misión de hoy',
  protein: 'A mitad del día, si vas corto de proteína',
  checkin: 'Por la noche, para cerrar el Día Mínimo',
  review: 'Sólo los domingos',
}

/** Notificación ya resuelta y lista para programar. */
export interface PlannedNotification {
  id: number
  reminder: ReminderId
  /** Día al que pertenece (clave local YYYY-MM-DD). */
  date: ISODate
  title: string
  body: string
  at: Date
}

// ------------------------------------------------------------------ tiempos

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isReminderTime(value: unknown): value is ReminderTime {
  return typeof value === 'string' && TIME_RE.test(value)
}

/** 'HH:MM' -> {hour, minute}. Si no es válida, devuelve null. */
export function parseTime(time: string): { hour: number; minute: number } | null {
  const m = TIME_RE.exec(time)
  if (!m) return null
  return { hour: Number(m[1]), minute: Number(m[2]) }
}

/** Date local del día `date` a la hora `time`. */
export function dateAtTime(date: ISODate, time: string): Date | null {
  const parsed = parseTime(time)
  if (!parsed) return null
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, parsed.hour, parsed.minute, 0, 0)
}

/** Completa con los defaults lo que falte (estados persistidos antiguos). */
export function normalizeReminders(raw: unknown): ReminderSettings {
  const base: ReminderSettings = {
    enabled: DEFAULT_REMINDERS.enabled,
    mission: { ...DEFAULT_REMINDERS.mission },
    protein: { ...DEFAULT_REMINDERS.protein },
    checkin: { ...DEFAULT_REMINDERS.checkin },
    review: { ...DEFAULT_REMINDERS.review },
  }
  if (typeof raw !== 'object' || raw === null) return base
  const r = raw as Partial<Record<string, unknown>>
  if (typeof r.enabled === 'boolean') base.enabled = r.enabled
  for (const id of REMINDER_ORDER) {
    const entry = r[id]
    if (typeof entry !== 'object' || entry === null) continue
    const e = entry as { on?: unknown; time?: unknown }
    if (typeof e.on === 'boolean') base[id].on = e.on
    if (isReminderTime(e.time)) base[id].time = e.time
  }
  return base
}

// -------------------------------------------------------------------- copy

const CHECKIN_BODY = '¿Cómo estuvo tu día? 10 segundos de check-in cierran tu Día Mínimo'
const REVIEW_BODY = 'Tu semana está lista para revisar. 1 minuto y tu plan se adapta.'
const REST_BODY = 'Caminata opcional 5 min. Si te apetece suma, pero hoy no hace falta.'

/** Texto genérico de proteína para días futuros (aún no hay gramos que contar). */
function proteinFutureBody(goal: number): string {
  return `Reparte la proteína durante el día: apunta a ${goal} g y llegarás sin apretones.`
}

// --------------------------------------------------------------- planificar

function missionNotification(
  state: MomentumData,
  date: ISODate,
): { title: string; body: string } | null {
  if (isRestDay(state.settings, date)) {
    return { title: copy.REST_DAY_TITLE, body: REST_BODY }
  }
  const mission = missionFor(state.settings, date)
  if (mission === 'strength') {
    return {
      title: 'Tu misión de hoy',
      body: copy.missionStrengthMessage(state.plan.rounds, state.plan.reps),
    }
  }
  return { title: 'Tu misión de hoy', body: copy.missionWalkMessage(state.plan.walkMinutes) }
}

function proteinNotification(
  state: MomentumData,
  date: ISODate,
  isToday: boolean,
): { title: string; body: string } {
  if (isToday) {
    const status = proteinStatus(state, date)
    return { title: 'Proteína', body: copy.proteinLowMessage(status.remaining) }
  }
  return { title: 'Proteína', body: proteinFutureBody(state.settings.proteinGoal) }
}

/** ¿Ya existe revisión guardada para la semana de `date`? */
function reviewDone(state: MomentumData, date: ISODate): boolean {
  const ws = weekStart(date)
  return state.reviews.some((r) => r.weekStart === ws)
}

/**
 * Notificaciones de los próximos 7 días (hoy incluido), ordenadas por fecha.
 *
 * Se omiten:
 *  - las horas que ya han pasado (típicamente, las de hoy),
 *  - las de hoy cuya meta ya está cumplida (misión hecha, proteína ≥ mínimo, check-in hecho),
 *  - `review` fuera de los domingos, o si esa semana ya está revisada,
 *  - las de un recordatorio apagado (o con el interruptor maestro apagado).
 *
 * En los días de descanso la misión no se omite: se cambia por la caminata opcional.
 *
 * Los ids son deterministas (`REMINDER_ID_BASE + dayOffset*10 + idx`), así que
 * reprogramar sobre los mismos ids sustituye la planificación anterior sin duplicar.
 */
export function planReminders(
  state: MomentumData,
  settings: ReminderSettings,
  now: Date = new Date(),
): PlannedNotification[] {
  if (!settings.enabled) return []

  const today = todayKey(now)
  const out: PlannedNotification[] = []

  for (let dayOffset = 0; dayOffset < REMINDER_HORIZON_DAYS; dayOffset++) {
    const date = addDays(today, dayOffset)
    const isToday = dayOffset === 0

    for (let idx = 0; idx < REMINDER_ORDER.length; idx++) {
      const reminder = REMINDER_ORDER[idx]
      const config = settings[reminder]
      if (!config.on) continue

      const at = dateAtTime(date, config.time)
      if (!at) continue
      if (at.getTime() <= now.getTime()) continue // hora ya pasada

      let content: { title: string; body: string } | null = null

      switch (reminder) {
        case 'mission': {
          // Hoy: si la misión ya está hecha, no molestamos.
          if (isToday && !isRestDay(state.settings, date) && missionDone(state, date)) break
          content = missionNotification(state, date)
          break
        }
        case 'protein': {
          if (isToday && proteinTotal(getDay(state, date)) >= state.settings.proteinMin) break
          content = proteinNotification(state, date, isToday)
          break
        }
        case 'checkin': {
          if (isToday && getDay(state, date).checkin) break
          content = { title: 'Check-in', body: CHECKIN_BODY }
          break
        }
        case 'review': {
          if (dayOfWeek(date) !== 0) break // sólo domingos
          if (reviewDone(state, date)) break
          content = { title: 'Revisión semanal', body: REVIEW_BODY }
          break
        }
      }

      if (!content) continue
      out.push({
        id: REMINDER_ID_BASE + dayOffset * 10 + idx,
        reminder,
        date,
        title: content.title,
        body: content.body,
        at,
      })
    }
  }

  return out
}

/** Pantalla a la que lleva cada recordatorio al tocarlo. */
export const REMINDER_SCREEN = {
  mission: 'today',
  protein: 'nutrition',
  checkin: 'today',
  review: 'review',
} as const satisfies Record<ReminderId, Screen>

export function isReminderId(value: unknown): value is ReminderId {
  return typeof value === 'string' && (REMINDER_ORDER as string[]).includes(value)
}

/** Rango de ids que ocupa la planificación (para cancelar sólo lo nuestro). */
export const REMINDER_ID_MAX = REMINDER_ID_BASE + REMINDER_HORIZON_DAYS * 10

export function isPlannedReminderId(id: number): boolean {
  return Number.isInteger(id) && id >= REMINDER_ID_BASE && id < REMINDER_ID_MAX
}
