// Selectores puros sobre el estado. Todos aceptan `date`/`now` explícitos (testables).
import { addDays, dayOfWeek, listDays, todayKey, weekStart } from './dates'
import {
  MAX_SHIELDS,
  MIN_WALK_MINUTES,
  SHIELD_EVERY,
  levelInfo,
  xpForLevel,
  xpThreshold,
} from './gamification'
import { proteinZone, remainingProtein } from './nutrition'
import * as copy from './copy'
import type {
  DayLog,
  ISODate,
  MinimumDay,
  Mission,
  MomentumData,
  ProteinStatus,
  Settings,
  StreakInfo,
  WeekSummary,
} from './types'

export { todayKey, weekStart, addDays, listDays }
export { levelInfo, xpForLevel, xpThreshold }

/** DayLog vacío (no se guarda en el estado). */
export function emptyDay(date: ISODate): DayLog {
  return { date, walks: [], protein: [], supplements: {}, water: 0, xp: 0, awards: {} }
}

/** Día registrado o vacío. Nunca muta el estado. */
export function getDay(state: MomentumData, date: ISODate): DayLog {
  return state.days[date] ?? emptyDay(date)
}

/** ¿El día tiene algún registro? */
export function hasActivity(day: DayLog): boolean {
  return (
    day.walks.length > 0 ||
    !!day.strength ||
    day.protein.length > 0 ||
    !!day.checkin ||
    day.water > 0 ||
    day.weight !== undefined ||
    day.waist !== undefined ||
    Object.values(day.supplements).some(Boolean)
  )
}

export function walkMinutes(day: DayLog): number {
  return day.walks.reduce((acc, w) => acc + (w.minutes || 0), 0)
}

export function proteinTotal(day: DayLog): number {
  return Math.round(day.protein.reduce((acc, p) => acc + (p.grams || 0), 0) * 10) / 10
}

/** Movimiento hecho: caminata total >= 5 min o sesión de fuerza registrada. */
export function movementDone(day: DayLog): boolean {
  return walkMinutes(day) >= MIN_WALK_MINUTES || !!day.strength
}

export function isRestDay(settings: Settings, date: ISODate): boolean {
  return settings.restDay !== null && dayOfWeek(date) === settings.restDay
}

/** Misión del día según los ajustes. El día de descanso manda sobre los días de fuerza. */
export function missionFor(settings: Settings, date: ISODate): Mission {
  if (isRestDay(settings, date)) return 'rest'
  return settings.strengthDays.includes(dayOfWeek(date)) ? 'strength' : 'walk'
}

/**
 * Misión cumplida. Descanso siempre true (pero no cuenta en adherencia).
 * Día de caminata: cualquier movimiento >= 5 min (o fuerza, que también es movimiento).
 * Día de fuerza: sesión de fuerza registrada.
 */
export function missionDone(state: MomentumData, date: ISODate): boolean {
  const mission = missionFor(state.settings, date)
  if (mission === 'rest') return true
  const day = getDay(state, date)
  if (mission === 'strength') return !!day.strength
  return movementDone(day)
}

/** Día Mínimo a partir de un DayLog + ajustes (sin tocar el estado). */
export function minimumDayFor(day: DayLog, settings: Settings): MinimumDay {
  const movement = movementDone(day)
  const protein = proteinTotal(day) >= settings.proteinMin
  const checkin = !!day.checkin
  const count = (Number(movement) + Number(protein) + Number(checkin)) as 0 | 1 | 2 | 3
  return { movement, protein, checkin, count }
}

export function minimumDay(state: MomentumData, date: ISODate): MinimumDay {
  return minimumDayFor(getDay(state, date), state.settings)
}

export function proteinStatus(state: MomentumData, date: ISODate): ProteinStatus {
  const grams = proteinTotal(getDay(state, date))
  const goal = state.settings.proteinGoal
  const min = state.settings.proteinMin
  return {
    grams,
    goal,
    min,
    remaining: remainingProtein(grams, goal),
    zone: proteinZone(grams, min, goal),
  }
}

function firstRecordedDay(state: MomentumData): ISODate | null {
  const keys = Object.keys(state.days).sort()
  for (const k of keys) {
    if (hasActivity(state.days[k])) return k
  }
  return keys[0] ?? null
}

/**
 * Racha derivada del historial (estrategia elegida: DETERMINISTA a partir de `days`).
 * Se recorre el historial hacia delante desde el primer día con registro:
 *  - día con movimiento -> +1 (y cada 7 días de racha se gana un escudo, máx. 2)
 *  - día de descanso sin movimiento -> ni suma ni rompe
 *  - día perdido -> consume un escudo si hay; si no, la racha vuelve a 0
 *  - hoy sin movimiento todavía -> no rompe (puede completarse aún)
 * `game.shields` del store es sólo un espejo de este cálculo, así que
 * `streak(state, now)` siempre es reproducible a partir de los datos.
 */
export function streak(state: MomentumData, now: Date = new Date()): StreakInfo {
  const today = todayKey(now)
  const yesterday = addDays(today, -1)
  const first = firstRecordedDay(state)
  const empty: StreakInfo = {
    current: 0,
    best: 0,
    shields: 0,
    missedYesterday: false,
    shieldUsedYesterday: false,
  }
  if (!first || first > today) return empty

  let current = 0
  let best = 0
  let shields = 0
  let shieldUsedYesterday = false
  let missedYesterday = false

  for (const date of listDays(first, today)) {
    const day = getDay(state, date)
    const rest = isRestDay(state.settings, date)
    if (movementDone(day)) {
      current += 1
      if (current > best) best = current
      if (current % SHIELD_EVERY === 0) shields = Math.min(MAX_SHIELDS, shields + 1)
      continue
    }
    if (rest) continue // el descanso no rompe la racha
    if (date === today) continue // hoy sigue abierto
    // falta real
    if (date === yesterday) missedYesterday = true
    if (shields > 0) {
      shields -= 1
      if (date === yesterday) shieldUsedYesterday = true
    } else {
      current = 0
    }
  }

  return { current, best, shields, missedYesterday, shieldUsedYesterday }
}

/** Resumen de la semana (lunes..domingo) que empieza en `weekStartIso`. */
export function weekSummary(state: MomentumData, weekStartIso: ISODate): WeekSummary {
  const ws = weekStart(weekStartIso)
  const days = listDays(ws, addDays(ws, 6))
  const enabled = state.settings.enabledSupplements

  let plannedDays = 0
  let doneDays = 0
  let walkMin = 0
  let walkSessions = 0
  let strengthSessions = 0
  let painMax = 0
  let rpeSum = 0
  let rpeCount = 0
  let proteinSum = 0
  let proteinDays = 0
  let proteinGreenDays = 0
  let suppTaken = 0
  let minimumDaysComplete = 0
  let xp = 0

  for (const date of days) {
    const day = getDay(state, date)
    const recorded = !!state.days[date]
    if (missionFor(state.settings, date) !== 'rest') {
      plannedDays += 1
      if (missionDone(state, date)) doneDays += 1
    }
    walkMin += walkMinutes(day)
    walkSessions += day.walks.length
    if (day.strength) {
      strengthSessions += 1
      rpeSum += day.strength.rpe
      rpeCount += 1
      painMax = Math.max(painMax, day.strength.pain)
    }
    const grams = proteinTotal(day)
    if (recorded) {
      proteinSum += grams
      proteinDays += 1
    }
    if (grams >= state.settings.proteinGoal) proteinGreenDays += 1
    for (const id of enabled) if (day.supplements[id]) suppTaken += 1
    if (minimumDayFor(day, state.settings).count === 3) minimumDaysComplete += 1
    xp += day.xp
  }

  const suppSlots = enabled.length * days.length
  return {
    weekStart: ws,
    plannedDays,
    doneDays,
    adherence: plannedDays > 0 ? doneDays / plannedDays : 0,
    walkMinutes: walkMin,
    walkSessions,
    strengthSessions,
    avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
    maxPain: painMax,
    // Media sobre los días con registro (no diluye semanas a medias).
    proteinAvg: proteinDays > 0 ? Math.round((proteinSum / proteinDays) * 10) / 10 : 0,
    proteinGreenDays,
    supplementsRate: suppSlots > 0 ? suppTaken / suppSlots : 0,
    minimumDaysComplete,
    xp,
  }
}

/** Semana anterior más antigua con registros y sin revisión, o null. */
export function pendingReview(state: MomentumData, now: Date = new Date()): ISODate | null {
  const currentWeek = weekStart(todayKey(now))
  const reviewed = new Set(state.reviews.map((r) => r.weekStart))
  const weeks = new Set<ISODate>()
  for (const [date, day] of Object.entries(state.days)) {
    if (!hasActivity(day)) continue
    const ws = weekStart(date)
    if (ws < currentWeek) weeks.add(ws)
  }
  const sorted = [...weeks].sort()
  for (const ws of sorted) {
    if (!reviewed.has(ws)) return ws
  }
  return null
}

/** Hora a partir de la cual avisamos de proteína baja. */
export const LATE_HOUR = 20

/** Mensaje del día (copy 6.2). */
export function todayMessage(state: MomentumData, now: Date = new Date()): string {
  const today = todayKey(now)
  const mission = missionFor(state.settings, today)
  const done = missionDone(state, today)
  const protein = proteinStatus(state, today)
  const late = now.getHours() >= LATE_HOUR

  // Final del día con la misión resuelta (o descanso) y proteína por debajo del mínimo.
  if (late && (done || mission === 'rest') && protein.grams < protein.min) {
    return copy.proteinLowMessage(protein.remaining)
  }
  if (mission === 'rest') return copy.REST_DAY
  if (done) return copy.MISSION_DONE

  const s = streak(state, now)
  if (s.missedYesterday && !s.shieldUsedYesterday) return copy.AFTER_MISS

  if (mission === 'strength') {
    return copy.missionStrengthMessage(state.plan.rounds, state.plan.reps)
  }
  return copy.missionWalkMessage(state.plan.walkMinutes)
}

/** Días de la semana con su resumen mínimo, para rejillas de historial. */
export function daysOfWeek(state: MomentumData, weekStartIso: ISODate): DayLog[] {
  const ws = weekStart(weekStartIso)
  return listDays(ws, addDays(ws, 6)).map((d) => getDay(state, d))
}

/** Últimos `n` días (incluyendo hoy), de más antiguo a más reciente. */
export function lastDays(state: MomentumData, n: number, now: Date = new Date()): DayLog[] {
  const today = todayKey(now)
  return listDays(addDays(today, -(n - 1)), today).map((d) => getDay(state, d))
}
