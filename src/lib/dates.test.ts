import { describe, expect, it } from 'vitest'
import {
  addDays,
  diffDays,
  formatWeekRange,
  listDays,
  shortDate,
  todayKey,
  weekDays,
  weekEnd,
  weekStart,
} from './dates'

describe('dates', () => {
  it('todayKey usa la hora local', () => {
    expect(todayKey(new Date(2026, 8, 7, 23, 30))).toBe('2026-09-07')
    expect(todayKey(new Date(2026, 8, 7, 0, 5))).toBe('2026-09-07')
  })

  it('weekStart es lunes', () => {
    expect(weekStart('2026-09-07')).toBe('2026-09-07') // lunes
    expect(weekStart('2026-09-09')).toBe('2026-09-07') // miércoles
    expect(weekStart('2026-09-13')).toBe('2026-09-07') // domingo -> lunes anterior
    expect(weekEnd('2026-09-07')).toBe('2026-09-13')
  })

  it('addDays cruza meses y años', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('listDays es inclusivo', () => {
    const week = listDays('2026-09-07', '2026-09-13')
    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-09-07')
    expect(week[6]).toBe('2026-09-13')
    expect(listDays('2026-09-13', '2026-09-07')).toEqual([])
    expect(weekDays('2026-09-09')).toEqual(week)
  })

  it('diffDays cuenta días naturales', () => {
    expect(diffDays('2026-09-07', '2026-09-09')).toBe(2)
    expect(diffDays('2026-09-09', '2026-09-07')).toBe(-2)
    expect(diffDays('2026-09-07', '2026-09-07')).toBe(0)
  })

  it('formato corto en español', () => {
    expect(shortDate('2026-09-07')).toBe('lun 7 sep')
    expect(shortDate('2026-09-13')).toBe('dom 13 sep')
    expect(shortDate('2026-01-02')).toBe('vie 2 ene')
    expect(formatWeekRange('2026-09-09')).toBe('7 sep – 13 sep')
  })
})
