// Utilidades de fecha en HORA LOCAL. Clave ISODate = 'YYYY-MM-DD'. La semana empieza en lunes.
import type { ISODate } from './types'

export const DAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const
export const DAY_LONG = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const
export const MONTH_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Date -> 'YYYY-MM-DD' en hora local. */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 'YYYY-MM-DD' -> Date a medianoche local. */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map((p) => Number(p))
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export const fromISODate = parseISODate

/** Acepta ISODate o Date y devuelve Date local. */
export function asDate(date: ISODate | Date): Date {
  return typeof date === 'string' ? parseISODate(date) : new Date(date.getTime())
}

/** Clave del día de hoy (o de `now`). */
export function todayKey(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Suma (o resta) días y devuelve ISODate. */
export function addDays(date: ISODate | Date, n: number): ISODate {
  const d = asDate(date)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** 0=domingo .. 6=sábado */
export function dayOfWeek(date: ISODate | Date): number {
  return asDate(date).getDay()
}

/** ISODate del lunes de la semana de `date`. */
export function weekStart(date: ISODate | Date = new Date()): ISODate {
  const d = asDate(date)
  const dow = d.getDay() // 0=dom
  const delta = dow === 0 ? -6 : 1 - dow // lunes
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

/** ISODate del domingo de la semana de `date`. */
export function weekEnd(date: ISODate | Date = new Date()): ISODate {
  return addDays(weekStart(date), 6)
}

/** Lista inclusiva de días entre `from` y `to`. Si to < from devuelve []. */
export function listDays(from: ISODate | Date, to: ISODate | Date): ISODate[] {
  const start = typeof from === 'string' ? from : toISODate(from)
  const end = typeof to === 'string' ? to : toISODate(to)
  const out: ISODate[] = []
  let cursor = start
  let guard = 0
  while (cursor <= end && guard < 4000) {
    out.push(cursor)
    cursor = addDays(cursor, 1)
    guard++
  }
  return out
}

/** Los 7 días (lunes..domingo) de la semana que contiene `date`. */
export function weekDays(date: ISODate | Date): ISODate[] {
  const ws = weekStart(date)
  return listDays(ws, addDays(ws, 6))
}

/** Diferencia en días naturales (b - a), inmune a horario de verano. */
export function diffDays(a: ISODate | Date, b: ISODate | Date): number {
  const da = asDate(a)
  const db = asDate(b)
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate())
  return Math.round((ub - ua) / 86400000)
}

export function isSameDay(a: ISODate | Date, b: ISODate | Date): boolean {
  return diffDays(a, b) === 0
}

export function weekdayShort(date: ISODate | Date): string {
  return DAY_SHORT[dayOfWeek(date)]
}

export function weekdayLong(date: ISODate | Date): string {
  return DAY_LONG[dayOfWeek(date)]
}

export function monthShort(date: ISODate | Date): string {
  return MONTH_SHORT[asDate(date).getMonth()]
}

/** Formato corto en español: "lun 2 sep". */
export function shortDate(date: ISODate | Date): string {
  const d = asDate(date)
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

export const formatShort = shortDate
export const formatDayShort = shortDate

/** "2 sep" (sin día de la semana). */
export function dayAndMonth(date: ISODate | Date): string {
  const d = asDate(date)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

/** "2 sep – 8 sep" para una semana. */
export function formatWeekRange(date: ISODate | Date): string {
  const ws = weekStart(date)
  return `${dayAndMonth(ws)} – ${dayAndMonth(addDays(ws, 6))}`
}

/** Etiqueta relativa: "Hoy", "Ayer" o formato corto. */
export function relativeLabel(date: ISODate | Date, now: Date = new Date()): string {
  const d = diffDays(date, now)
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Ayer'
  if (d === -1) return 'Mañana'
  return shortDate(date)
}
