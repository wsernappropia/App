import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REMINDERS,
  REMINDER_ID_BASE,
  dateAtTime,
  normalizeReminders,
  parseTime,
  planReminders,
} from './reminders'
import { proteinLowMessage, missionStrengthMessage, missionWalkMessage, REST_DAY_TITLE } from './copy'
import { at, makeState } from './testing'
import type { DayLog, ReminderSettings, StrengthSession, WeeklyReview } from './types'

// 2026-09-07 es lunes (día de fuerza) y 2026-09-13, domingo (descanso).
const MONDAY = '2026-09-07'
const SUNDAY = '2026-09-13'

const on: ReminderSettings = { ...DEFAULT_REMINDERS, enabled: true }

const strength = (): Partial<DayLog> => ({
  strength: {
    id: 's',
    startedAt: 0,
    roundsDone: 1,
    roundsPlanned: 1,
    reps: 8,
    rpe: 6,
    pain: 1,
  } satisfies StrengthSession,
})

function byDate(plan: ReturnType<typeof planReminders>, date: string) {
  return plan.filter((p) => p.date === date)
}

describe('parseo de horas', () => {
  it('acepta HH:MM válidas y rechaza el resto', () => {
    expect(parseTime('08:00')).toEqual({ hour: 8, minute: 0 })
    expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 })
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('8:00')).toBeNull()
    expect(parseTime('')).toBeNull()
  })

  it('dateAtTime construye la fecha local correcta', () => {
    const d = dateAtTime(MONDAY, '14:30')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(8)
    expect(d?.getDate()).toBe(7)
    expect(d?.getHours()).toBe(14)
    expect(d?.getMinutes()).toBe(30)
  })
})

describe('normalizeReminders', () => {
  it('rellena el default cuando falta el campo (estados persistidos antiguos)', () => {
    expect(normalizeReminders(undefined)).toEqual(DEFAULT_REMINDERS)
    expect(normalizeReminders(null)).toEqual(DEFAULT_REMINDERS)
    expect(normalizeReminders('nope')).toEqual(DEFAULT_REMINDERS)
  })

  it('completa lo que falte y descarta horas inválidas', () => {
    const r = normalizeReminders({ enabled: true, protein: { time: '12:15' }, checkin: { on: false } })
    expect(r.enabled).toBe(true)
    expect(r.protein).toEqual({ on: true, time: '12:15' })
    expect(r.checkin).toEqual({ on: false, time: '21:00' })
    expect(r.mission).toEqual(DEFAULT_REMINDERS.mission)
    expect(normalizeReminders({ mission: { time: '99:99' } }).mission.time).toBe('08:00')
  })

  it('no comparte referencias con el default', () => {
    const r = normalizeReminders(undefined)
    r.mission.time = '06:00'
    expect(DEFAULT_REMINDERS.mission.time).toBe('08:00')
  })
})

describe('planReminders — interruptor maestro', () => {
  it('devuelve vacío si los recordatorios están apagados', () => {
    expect(planReminders(makeState(), DEFAULT_REMINDERS, at(MONDAY, 6))).toEqual([])
  })

  it('respeta el interruptor de cada recordatorio', () => {
    const settings: ReminderSettings = { ...on, protein: { on: false, time: '14:00' } }
    const plan = planReminders(makeState(), settings, at(MONDAY, 6))
    expect(plan.some((p) => p.reminder === 'protein')).toBe(false)
    expect(plan.some((p) => p.reminder === 'mission')).toBe(true)
  })
})

describe('planReminders — horas ya pasadas', () => {
  it('omite las de hoy cuya hora ya pasó', () => {
    const plan = planReminders(makeState(), on, at(MONDAY, 15))
    expect(byDate(plan, MONDAY).map((p) => p.reminder)).toEqual(['checkin'])
    // Mañana sigue completo.
    expect(byDate(plan, '2026-09-08').map((p) => p.reminder)).toEqual([
      'mission',
      'protein',
      'checkin',
    ])
  })

  it('a primera hora entran los tres de hoy', () => {
    const plan = planReminders(makeState(), on, at(MONDAY, 6))
    expect(byDate(plan, MONDAY).map((p) => p.reminder)).toEqual(['mission', 'protein', 'checkin'])
  })

  it('planifica exactamente 7 días', () => {
    const plan = planReminders(makeState(), on, at(MONDAY, 6))
    expect(new Set(plan.map((p) => p.date)).size).toBe(7)
    expect(plan.at(-1)?.date).toBe(SUNDAY)
    // Todas las horas son futuras.
    expect(plan.every((p) => p.at.getTime() > at(MONDAY, 6).getTime())).toBe(true)
  })
})

describe('planReminders — metas ya cumplidas hoy', () => {
  it('omite la misión de hoy si ya está hecha', () => {
    const state = makeState({ [MONDAY]: strength() })
    const plan = planReminders(state, on, at(MONDAY, 6))
    expect(byDate(plan, MONDAY).map((p) => p.reminder)).toEqual(['protein', 'checkin'])
    // No afecta a los días siguientes.
    expect(byDate(plan, '2026-09-08').some((p) => p.reminder === 'mission')).toBe(true)
  })

  it('omite la proteína de hoy si ya se llegó al mínimo', () => {
    const state = makeState({ [MONDAY]: { protein: [{ id: 'p', at: 0, grams: 85, label: 'x' }] } })
    const plan = planReminders(state, on, at(MONDAY, 6))
    expect(byDate(plan, MONDAY).some((p) => p.reminder === 'protein')).toBe(false)
  })

  it('mantiene la proteína si aún falta, con los gramos que faltan', () => {
    const state = makeState({ [MONDAY]: { protein: [{ id: 'p', at: 0, grams: 30, label: 'x' }] } })
    const plan = planReminders(state, on, at(MONDAY, 6))
    const protein = byDate(plan, MONDAY).find((p) => p.reminder === 'protein')
    expect(protein?.body).toBe(proteinLowMessage(80))
    // Los días futuros usan el texto genérico (aún no hay gramos que contar).
    const future = byDate(plan, '2026-09-08').find((p) => p.reminder === 'protein')
    expect(future?.body).toContain('110 g')
    expect(future?.body).not.toContain('Te faltan')
  })

  it('omite el check-in de hoy si ya está hecho', () => {
    const state = makeState({ [MONDAY]: { checkin: { at: 0, energy: 3 } } })
    const plan = planReminders(state, on, at(MONDAY, 6))
    expect(byDate(plan, MONDAY).some((p) => p.reminder === 'checkin')).toBe(false)
  })
})

describe('planReminders — copy de la misión', () => {
  it('usa la misión real de cada día (fuerza / caminata)', () => {
    const state = makeState()
    const plan = planReminders(state, on, at(MONDAY, 6))
    const monday = byDate(plan, MONDAY).find((p) => p.reminder === 'mission')
    const tuesday = byDate(plan, '2026-09-08').find((p) => p.reminder === 'mission')
    expect(monday?.body).toBe(missionStrengthMessage(state.plan.rounds, state.plan.reps))
    expect(tuesday?.body).toBe(missionWalkMessage(state.plan.walkMinutes))
    expect(monday?.body).toContain('5 min')
    expect(tuesday?.body).toContain('Si hoy está pesado, 5 min mantienen la racha')
  })

  it('el día de descanso cambia la misión por la caminata opcional', () => {
    const plan = planReminders(makeState(), on, at(MONDAY, 6))
    const sunday = byDate(plan, SUNDAY).find((p) => p.reminder === 'mission')
    expect(sunday?.title).toBe(REST_DAY_TITLE)
    expect(sunday?.body).toContain('Caminata opcional 5 min')
  })
})

describe('planReminders — revisión semanal', () => {
  it('sólo aparece el domingo', () => {
    const plan = planReminders(makeState(), on, at(MONDAY, 6))
    const reviews = plan.filter((p) => p.reminder === 'review')
    expect(reviews).toHaveLength(1)
    expect(reviews[0].date).toBe(SUNDAY)
    expect(reviews[0].at.getHours()).toBe(18)
    expect(reviews[0].body).toBe('Tu semana está lista para revisar. 1 minuto y tu plan se adapta.')
  })

  it('desaparece si la semana ya está revisada', () => {
    const review = { weekStart: MONDAY, createdAt: 0, adherence: 1 } as WeeklyReview
    const state = makeState({}, {}, { reviews: [review] })
    const plan = planReminders(state, on, at(MONDAY, 6))
    expect(plan.some((p) => p.reminder === 'review')).toBe(false)
  })
})

describe('planReminders — ids deterministas', () => {
  it('id = base + dayOffset*10 + idx, estable entre llamadas', () => {
    const state = makeState()
    const a = planReminders(state, on, at(MONDAY, 6))
    const b = planReminders(state, on, at(MONDAY, 6))
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id))

    const mission = a.find((p) => p.date === MONDAY && p.reminder === 'mission')
    const checkin = a.find((p) => p.date === MONDAY && p.reminder === 'checkin')
    const sundayReview = a.find((p) => p.reminder === 'review')
    expect(mission?.id).toBe(REMINDER_ID_BASE + 0)
    expect(checkin?.id).toBe(REMINDER_ID_BASE + 2)
    expect(sundayReview?.id).toBe(REMINDER_ID_BASE + 6 * 10 + 3)
  })

  it('no hay ids repetidos', () => {
    const plan = planReminders(makeState(), on, at(MONDAY, 6))
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length)
  })

  it('los ids de un día no dependen de que falten los de otro', () => {
    const withMission = planReminders(makeState(), on, at(MONDAY, 6))
    const withoutMission = planReminders(makeState({ [MONDAY]: strength() }), on, at(MONDAY, 6))
    const idOf = (plan: typeof withMission, date: string, reminder: string) =>
      plan.find((p) => p.date === date && p.reminder === reminder)?.id
    expect(idOf(withoutMission, MONDAY, 'checkin')).toBe(idOf(withMission, MONDAY, 'checkin'))
    expect(idOf(withoutMission, SUNDAY, 'review')).toBe(idOf(withMission, SUNDAY, 'review'))
  })
})
