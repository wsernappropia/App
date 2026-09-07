import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HEALTH,
  clampStepsGoal,
  formatSyncAge,
  healthWalkMinutes,
  mergeHealthWalks,
  normalizeHealth,
  overlapRatio,
  paceFromWalk,
  stepsMissionDone,
} from './health'
import type { HealthWalk } from './health'
import { emptyDay } from './selectors'
import { at, makeState } from './testing'
import type { DayLog, WalkSession } from './types'

const DAY = '2026-09-08'

/** 10:00 del 8/9/2026 + `offsetMin` minutos. */
function t(offsetMin: number): number {
  return at(DAY, 10).getTime() + offsetMin * 60_000
}

function walk(id: string, offsetMin: number, minutes: number, distanceKm?: number): HealthWalk {
  return { externalId: id, startedAt: t(offsetMin), minutes, distanceKm }
}

function dayWith(walks: Partial<WalkSession>[], steps?: number): DayLog {
  return {
    ...emptyDay(DAY),
    steps,
    walks: walks.map((w, i) => ({
      id: `w${i}`,
      startedAt: t(0),
      minutes: 10,
      pace: 'moderado' as const,
      ...w,
    })),
  }
}

describe('paceFromWalk', () => {
  it('sin distancia asume moderado', () => {
    expect(paceFromWalk({ minutes: 20 })).toBe('moderado')
    expect(paceFromWalk({ minutes: 20, distanceKm: 0 })).toBe('moderado')
  })

  it('clasifica por velocidad media', () => {
    // 1 km en 20 min = 3 km/h
    expect(paceFromWalk({ minutes: 20, distanceKm: 1 })).toBe('suave')
    // 1.5 km en 20 min = 4.5 km/h
    expect(paceFromWalk({ minutes: 20, distanceKm: 1.5 })).toBe('moderado')
    // 2 km en 20 min = 6 km/h
    expect(paceFromWalk({ minutes: 20, distanceKm: 2 })).toBe('rapido')
  })

  it('los límites 4 y 5.5 km/h caen en el tramo de arriba', () => {
    expect(paceFromWalk({ minutes: 60, distanceKm: 4 })).toBe('moderado')
    expect(paceFromWalk({ minutes: 60, distanceKm: 5.5 })).toBe('rapido')
  })
})

describe('overlapRatio', () => {
  it('0 si no hay solape', () => {
    expect(overlapRatio({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(0)
  })

  it('se mide sobre el intervalo más corto', () => {
    // 10 min dentro de 30 min -> solape total
    expect(overlapRatio({ start: 0, end: 30 }, { start: 5, end: 15 })).toBe(1)
    expect(overlapRatio({ start: 0, end: 20 }, { start: 10, end: 30 })).toBe(0.5)
  })
})

describe('mergeHealthWalks', () => {
  it('descarta las de menos de 5 minutos', () => {
    const pending = mergeHealthWalks(emptyDay(DAY), [walk('a', 0, 4), walk('b', 60, 5)])
    expect(pending.map((w) => w.externalId)).toEqual(['b'])
  })

  it('descarta las que ya están por externalId', () => {
    const day = dayWith([{ source: 'health', externalId: 'a', minutes: 20 }])
    const pending = mergeHealthWalks(day, [walk('a', 0, 20), walk('c', 120, 20)])
    expect(pending.map((w) => w.externalId)).toEqual(['c'])
  })

  it('no repite una misma caminata dentro del propio lote', () => {
    const pending = mergeHealthWalks(emptyDay(DAY), [walk('a', 0, 20), walk('a', 0, 20)])
    expect(pending).toHaveLength(1)
  })

  it('descarta las que solapan >= 50 % con una caminata manual', () => {
    // Manual 10:00-10:20 (manual = sin `source`, como los datos antiguos).
    const day = dayWith([{ startedAt: t(0), minutes: 20 }])
    const overlapping = walk('a', 10, 20) // 10:10-10:30 -> 10 min de 20 = 50 %
    const apart = walk('b', 30, 20) // 10:30-10:50 -> sin solape
    const pending = mergeHealthWalks(day, [overlapping, apart])
    expect(pending.map((w) => w.externalId)).toEqual(['b'])
  })

  it('un solape corto (< 50 %) sí se inserta', () => {
    const day = dayWith([{ startedAt: t(0), minutes: 20 }])
    const pending = mergeHealthWalks(day, [walk('a', 15, 20)]) // 5 de 20 = 25 %
    expect(pending.map((w) => w.externalId)).toEqual(['a'])
  })

  it('el solape sólo se mira contra caminatas manuales', () => {
    const day = dayWith([{ source: 'health', externalId: 'old', startedAt: t(0), minutes: 20 }])
    const pending = mergeHealthWalks(day, [walk('new', 5, 20)])
    expect(pending.map((w) => w.externalId)).toEqual(['new'])
  })
})

describe('pasos', () => {
  it('stepsMissionDone exige la misión activa y la meta alcanzada', () => {
    const state = makeState({}, { health: { ...DEFAULT_HEALTH, stepsMissionEnabled: true } })
    expect(stepsMissionDone(dayWith([], 9000), state.settings)).toBe(true)
    expect(stepsMissionDone(dayWith([], 7000), state.settings)).toBe(false)
    expect(stepsMissionDone(dayWith([], 9000))).toBe(false)

    const off = makeState({}, { health: { ...DEFAULT_HEALTH } })
    expect(stepsMissionDone(dayWith([], 20000), off.settings)).toBe(false)
  })

  it('clampStepsGoal se queda en el rango y en pasos de 500', () => {
    expect(clampStepsGoal(1000)).toBe(5000)
    expect(clampStepsGoal(99999)).toBe(15000)
    expect(clampStepsGoal(8200)).toBe(8000)
    expect(clampStepsGoal(Number.NaN)).toBe(8000)
  })
})

describe('normalizeHealth', () => {
  it('rellena con el default lo que falta o no es válido', () => {
    expect(normalizeHealth(undefined)).toEqual(DEFAULT_HEALTH)
    expect(normalizeHealth({ enabled: 'sí', stepsGoal: '9000' })).toEqual(DEFAULT_HEALTH)
    expect(normalizeHealth({ enabled: true, stepsGoal: 12000, lastSyncAt: 5 })).toEqual({
      enabled: true,
      stepsGoal: 12000,
      stepsMissionEnabled: false,
      lastSyncAt: 5,
    })
  })
})

describe('helpers de UI', () => {
  it('healthWalkMinutes sólo suma las de Health Connect', () => {
    const day = dayWith([
      { minutes: 10 },
      { minutes: 25, source: 'health', externalId: 'a' },
      { minutes: 5, source: 'health', externalId: 'b' },
    ])
    expect(healthWalkMinutes(day)).toBe(30)
  })

  it('formatSyncAge', () => {
    const now = 1_000_000_000
    expect(formatSyncAge(undefined, now)).toBe('nunca')
    expect(formatSyncAge(now - 30_000, now)).toBe('hace un momento')
    expect(formatSyncAge(now - 5 * 60_000, now)).toBe('hace 5 min')
    expect(formatSyncAge(now - 3 * 3_600_000, now)).toBe('hace 3 h')
    expect(formatSyncAge(now - 26 * 3_600_000, now)).toBe('ayer')
  })
})
