import { describe, expect, it } from 'vitest'
import { CAPS, applyDecision, basePlan, decide, describeDecision, planDiff } from './progression'
import { GREAT_WEEK, HARD_SESSION } from './copy'
import type { WeeklyPlan } from './types'

const plan = (patch: Partial<WeeklyPlan> = {}): WeeklyPlan => ({
  ...basePlan('2026-09-07'),
  ...patch,
})

describe('decide (tabla 7.1)', () => {
  it('<50% adherencia -> reduce, pase lo que pase', () => {
    expect(decide({ adherence: 0.4, avgRpe: 5, maxPain: 0 })).toBe('reduce')
    expect(decide({ adherence: 0.49, avgRpe: 9, maxPain: 8 })).toBe('reduce')
    expect(decide({ adherence: 0, avgRpe: null, maxPain: 0 })).toBe('reduce')
  })

  it('50-79% con RPE <=7 y dolor bajo -> repeat', () => {
    expect(decide({ adherence: 0.5, avgRpe: 7, maxPain: 1 })).toBe('repeat')
    expect(decide({ adherence: 0.79, avgRpe: null, maxPain: 0 })).toBe('repeat')
  })

  it('>=80% con RPE <=7 y dolor <=2 -> progress', () => {
    expect(decide({ adherence: 0.8, avgRpe: 7, maxPain: 2 })).toBe('progress')
    expect(decide({ adherence: 1, avgRpe: null, maxPain: 0 })).toBe('progress')
  })

  it('>=80% con RPE >=8 o dolor alto -> hold', () => {
    expect(decide({ adherence: 0.9, avgRpe: 8, maxPain: 0 })).toBe('hold')
    expect(decide({ adherence: 0.9, avgRpe: 6, maxPain: 4 })).toBe('hold')
    expect(decide({ adherence: 1, avgRpe: 6, maxPain: 3 })).toBe('hold') // nunca progresar con dolor
  })

  it('50-79% con RPE >=8 o dolor >3 -> hold', () => {
    expect(decide({ adherence: 0.6, avgRpe: 8, maxPain: 0 })).toBe('hold')
    expect(decide({ adherence: 0.6, avgRpe: 5, maxPain: 5 })).toBe('hold')
  })
})

describe('applyDecision', () => {
  it('progresa una sola variable en ciclo walk -> reps -> rounds', () => {
    const p0 = plan()
    const p1 = applyDecision(p0, 'progress')
    expect(p1).toMatchObject({ walkMinutes: 15, reps: 8, rounds: 1, nextVariable: 'reps', level: 2 })
    const p2 = applyDecision(p1, 'progress')
    expect(p2).toMatchObject({ walkMinutes: 15, reps: 10, rounds: 1, nextVariable: 'rounds', level: 3 })
    const p3 = applyDecision(p2, 'progress')
    expect(p3).toMatchObject({ walkMinutes: 15, reps: 10, rounds: 2, nextVariable: 'walk', level: 4 })
    const p4 = applyDecision(p3, 'progress')
    expect(p4.walkMinutes).toBe(20)
  })

  it('respeta los topes y salta a la siguiente variable', () => {
    const capped = plan({ walkMinutes: CAPS.walk, nextVariable: 'walk' })
    const next = applyDecision(capped, 'progress')
    expect(next.walkMinutes).toBe(CAPS.walk)
    expect(next.reps).toBe(10)
    expect(next.nextVariable).toBe('rounds')
  })

  it('con todo en tope no cambia nada', () => {
    const maxed = plan({ walkMinutes: CAPS.walk, reps: CAPS.reps, rounds: CAPS.rounds, level: 9 })
    const next = applyDecision(maxed, 'progress')
    expect(next.walkMinutes).toBe(CAPS.walk)
    expect(next.reps).toBe(CAPS.reps)
    expect(next.rounds).toBe(CAPS.rounds)
    expect(next.level).toBe(9)
  })

  it('reduce vuelve a la base (10 min, 1 ronda, 8 reps)', () => {
    const big = plan({ walkMinutes: 30, rounds: 3, reps: 14, level: 6, nextVariable: 'rounds' })
    const next = applyDecision(big, 'reduce', '2026-09-14')
    expect(next).toMatchObject({
      walkMinutes: 10,
      rounds: 1,
      reps: 8,
      nextVariable: 'walk',
      level: 1,
      since: '2026-09-14',
    })
  })

  it('reduce en base se mantiene', () => {
    const p = plan({ level: 3 })
    const next = applyDecision(p, 'reduce')
    expect(next).toMatchObject({ walkMinutes: 10, rounds: 1, reps: 8, level: 3 })
  })

  it('repeat y hold no cambian el plan', () => {
    const p = plan({ walkMinutes: 20, reps: 10 })
    expect(applyDecision(p, 'repeat')).toMatchObject({ walkMinutes: 20, reps: 10, level: p.level })
    expect(applyDecision(p, 'hold')).toMatchObject({ walkMinutes: 20, reps: 10, level: p.level })
  })

  it('actualiza `since` cuando se le pasa', () => {
    expect(applyDecision(plan(), 'repeat', '2026-09-14').since).toBe('2026-09-14')
  })
})

describe('describeDecision', () => {
  it('usa el copy del PRD', () => {
    const after = applyDecision(plan(), 'progress')
    expect(describeDecision('progress', after).message).toContain(GREAT_WEEK)
    expect(describeDecision('progress', after).message).toContain('caminata 15 min')
    expect(describeDecision('hold', plan()).message).toContain(HARD_SESSION)
    expect(describeDecision('reduce', plan()).title).toBeTruthy()
  })

  it('planDiff describe el cambio', () => {
    const before = plan()
    const after = applyDecision(before, 'progress')
    expect(planDiff(before, after)).toEqual(['+5 min de caminata'])
  })
})
