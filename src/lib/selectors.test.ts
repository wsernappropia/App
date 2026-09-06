import { describe, expect, it } from 'vitest'
import {
  getDay,
  levelInfo,
  minimumDay,
  missionDone,
  missionFor,
  movementDone,
  pendingReview,
  proteinStatus,
  streak,
  todayMessage,
  weekSummary,
} from './selectors'
import { AFTER_MISS, MISSION_DONE, REST_DAY } from './copy'
import { at, makeState } from './testing'
import type { DayLog, ISODate, StrengthSession, WeeklyReview } from './types'

const walk = (minutes = 10): Partial<DayLog> => ({
  walks: [{ id: `w${minutes}`, startedAt: 0, minutes, pace: 'moderado' }],
})
const strength = (rpe = 6, pain = 1): Partial<DayLog> => ({
  strength: {
    id: 's',
    startedAt: 0,
    roundsDone: 1,
    roundsPlanned: 1,
    reps: 8,
    rpe,
    pain,
  } satisfies StrengthSession,
})
const protein = (grams: number): Partial<DayLog> => ({
  protein: [{ id: 'p', at: 0, grams, label: 'test' }],
})

describe('día y misión', () => {
  it('getDay devuelve un día vacío sin mutar', () => {
    const state = makeState()
    const day = getDay(state, '2026-09-07')
    expect(day).toMatchObject({ date: '2026-09-07', walks: [], protein: [], xp: 0 })
    expect(state.days['2026-09-07']).toBeUndefined()
  })

  it('missionFor: fuerza L/X/V, descanso domingo, caminata el resto', () => {
    const { settings } = makeState()
    expect(missionFor(settings, '2026-09-07')).toBe('strength') // lunes
    expect(missionFor(settings, '2026-09-08')).toBe('walk') // martes
    expect(missionFor(settings, '2026-09-13')).toBe('rest') // domingo
  })

  it('movementDone requiere 5 min de caminata o fuerza', () => {
    const state = makeState({ '2026-09-08': walk(4), '2026-09-09': walk(5), '2026-09-10': strength() })
    expect(movementDone(getDay(state, '2026-09-08'))).toBe(false)
    expect(movementDone(getDay(state, '2026-09-09'))).toBe(true)
    expect(movementDone(getDay(state, '2026-09-10'))).toBe(true)
  })

  it('missionDone: el día de descanso siempre cuenta como hecho', () => {
    const state = makeState({ '2026-09-08': walk(10) })
    expect(missionDone(state, '2026-09-08')).toBe(true)
    expect(missionDone(state, '2026-09-07')).toBe(false) // fuerza sin sesión
    expect(missionDone(state, '2026-09-13')).toBe(true) // descanso
  })
})

describe('minimumDay y proteína', () => {
  it('cuenta movimiento, proteína y check-in', () => {
    const empty = makeState()
    expect(minimumDay(empty, '2026-09-08')).toEqual({
      movement: false,
      protein: false,
      checkin: false,
      count: 0,
    })
    const state = makeState({
      '2026-09-08': {
        ...walk(10),
        ...protein(80),
        checkin: { at: 0, energy: 4 },
      },
    })
    expect(minimumDay(state, '2026-09-08')).toEqual({
      movement: true,
      protein: true,
      checkin: true,
      count: 3,
    })
  })

  it('proteína por debajo del mínimo no cuenta', () => {
    const state = makeState({ '2026-09-08': protein(79) })
    expect(minimumDay(state, '2026-09-08').protein).toBe(false)
  })

  it('proteinStatus: zonas rojo/amarillo/verde', () => {
    const s1 = makeState({ '2026-09-08': protein(40) })
    expect(proteinStatus(s1, '2026-09-08')).toEqual({
      grams: 40,
      goal: 110,
      min: 80,
      remaining: 70,
      zone: 'rojo',
    })
    const s2 = makeState({ '2026-09-08': protein(85) })
    expect(proteinStatus(s2, '2026-09-08').zone).toBe('amarillo')
    const s3 = makeState({ '2026-09-08': protein(120) })
    expect(proteinStatus(s3, '2026-09-08')).toMatchObject({ zone: 'verde', remaining: 0 })
  })
})

describe('streak', () => {
  it('el día de descanso no rompe la racha', () => {
    const state = makeState({
      '2026-09-11': walk(10),
      '2026-09-12': walk(10),
      // 2026-09-13 domingo (descanso) sin nada
      '2026-09-14': walk(10),
    })
    const s = streak(state, at('2026-09-14'))
    expect(s.current).toBe(3)
    expect(s.missedYesterday).toBe(false)
  })

  it('hoy pendiente no rompe la racha', () => {
    const state = makeState({ '2026-09-10': walk(10), '2026-09-11': walk(10) })
    const s = streak(state, at('2026-09-12'))
    expect(s.current).toBe(2)
  })

  it('sin escudos, una falta reinicia la racha', () => {
    const state = makeState(
      { '2026-09-01': walk(), '2026-09-02': walk(), '2026-09-03': walk(), '2026-09-05': walk() },
      { restDay: null },
    )
    const s = streak(state, at('2026-09-05'))
    expect(s.current).toBe(1)
    expect(s.best).toBe(3)
    expect(s.shields).toBe(0)
  })

  it('gana un escudo a los 7 días y lo consume en la falta siguiente', () => {
    const days: Record<ISODate, Partial<DayLog>> = {}
    for (let i = 1; i <= 7; i++) days[`2026-09-0${i}`] = walk()
    const seven = makeState(days, { restDay: null })
    expect(streak(seven, at('2026-09-07'))).toMatchObject({ current: 7, shields: 1 })

    // falta el 08, vuelve el 09
    const after = makeState({ ...days, '2026-09-09': walk() }, { restDay: null })
    const s = streak(after, at('2026-09-09'))
    expect(s.current).toBe(8) // el escudo mantiene la racha
    expect(s.shields).toBe(0)
    expect(s.missedYesterday).toBe(true)
    expect(s.shieldUsedYesterday).toBe(true)
  })

  it('los escudos se acumulan hasta 2', () => {
    const days: Record<ISODate, Partial<DayLog>> = {}
    for (let i = 0; i < 21; i++) {
      const d = new Date(2026, 8, 1 + i)
      days[`2026-09-${String(d.getDate()).padStart(2, '0')}`] = walk()
    }
    const s = streak(makeState(days, { restDay: null }), at('2026-09-21'))
    expect(s.current).toBe(21)
    expect(s.shields).toBe(2)
  })
})

describe('weekSummary', () => {
  const state = makeState({
    '2026-09-07': strength(7, 1), // lunes fuerza
    '2026-09-08': { ...walk(20), ...protein(120) }, // martes caminata
    '2026-09-09': strength(9, 4), // miércoles fuerza
    '2026-09-13': walk(30), // domingo (descanso) caminata extra
  })

  it('la adherencia ignora el día de descanso', () => {
    const w = weekSummary(state, '2026-09-09')
    expect(w.weekStart).toBe('2026-09-07')
    expect(w.plannedDays).toBe(6) // 7 días - domingo de descanso
    expect(w.doneDays).toBe(3)
    expect(w.adherence).toBeCloseTo(0.5)
  })

  it('agrega minutos, sesiones, RPE y dolor', () => {
    const w = weekSummary(state, '2026-09-07')
    expect(w.walkMinutes).toBe(50) // incluye la caminata del día de descanso
    expect(w.walkSessions).toBe(2)
    expect(w.strengthSessions).toBe(2)
    expect(w.avgRpe).toBe(8)
    expect(w.maxPain).toBe(4)
    expect(w.proteinGreenDays).toBe(1)
  })

  it('semana perfecta = 100% sin contar el descanso', () => {
    const perfect = makeState({
      '2026-09-07': strength(),
      '2026-09-08': walk(),
      '2026-09-09': strength(),
      '2026-09-10': walk(),
      '2026-09-11': strength(),
      '2026-09-12': walk(),
    })
    expect(weekSummary(perfect, '2026-09-07').adherence).toBe(1)
  })
})

describe('pendingReview', () => {
  it('devuelve la semana anterior más antigua sin revisar', () => {
    const state = makeState({ '2026-09-01': walk(), '2026-09-08': walk() })
    // hoy 2026-09-16 -> semana actual 09-14; pendientes: 08-31 y 09-07
    expect(pendingReview(state, at('2026-09-16'))).toBe('2026-08-31')
  })

  it('null cuando todo está revisado', () => {
    const review: WeeklyReview = {
      weekStart: '2026-08-31',
      createdAt: 0,
      adherence: 1,
      avgRpe: null,
      maxPain: 0,
      energy: 3,
      difficulty: 3,
      decision: 'repeat',
      planBefore: makeState().plan,
      planAfter: makeState().plan,
    }
    const state = makeState({ '2026-09-01': walk() }, {}, { reviews: [review] })
    expect(pendingReview(state, at('2026-09-09'))).toBeNull()
  })

  it('la semana en curso no está pendiente', () => {
    const state = makeState({ '2026-09-08': walk() })
    expect(pendingReview(state, at('2026-09-09'))).toBeNull()
  })
})

describe('todayMessage', () => {
  it('día de descanso', () => {
    expect(todayMessage(makeState(), at('2026-09-13'))).toBe(REST_DAY)
  })

  it('misión cumplida', () => {
    const state = makeState({ '2026-09-08': { ...walk(10), ...protein(90) } })
    expect(todayMessage(state, at('2026-09-08'))).toBe(MISSION_DONE)
  })

  it('después de faltar ayer, sin escudo', () => {
    const state = makeState(
      { '2026-09-01': walk(), '2026-09-02': walk(), '2026-09-03': walk() },
      { restDay: null },
    )
    expect(todayMessage(state, at('2026-09-05'))).toBe(AFTER_MISS)
  })

  it('día normal de caminata usa los minutos del plan', () => {
    const state = makeState()
    expect(todayMessage(state, at('2026-09-08'))).toBe(
      'Tu misión: caminar 10 min. Si hoy está pesado, 5 min mantienen la racha.',
    )
  })

  it('día normal de fuerza menciona las rondas', () => {
    const msg = todayMessage(makeState(), at('2026-09-07'))
    expect(msg).toContain('fuerza: 1 ronda de 8 reps')
    const withPlan = makeState()
    withPlan.plan = { ...withPlan.plan, rounds: 3, reps: 10 }
    expect(todayMessage(withPlan, at('2026-09-07'))).toContain('fuerza: 3 rondas de 10 reps')
  })

  it('proteína baja al final del día', () => {
    const state = makeState({ '2026-09-08': { ...walk(10), ...protein(60) } })
    expect(todayMessage(state, at('2026-09-08', 21))).toBe(
      'Te faltan ~50 g. Un batido o una comida alta en proteína te pone en zona verde.',
    )
  })
})

describe('levelInfo re-exportado', () => {
  it('funciona desde selectors', () => {
    expect(levelInfo(100).level).toBe(2)
  })
})
