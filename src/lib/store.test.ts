import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, STORE_VERSION, createStore, normalizeData } from './store'
import { makeTestStore } from './testing'
import { XP } from './gamification'
import { proteinTotal, streak } from './selectors'

// Los tests corren en node (sin localStorage): `makeTestStore` inyecta un reloj fijo
// y un StateStorage en memoria, así que `persist` funciona igual que en el navegador.

type Store = ReturnType<typeof makeTestStore>

describe('store', () => {
  let store: Store
  beforeEach(() => {
    store = makeTestStore('2026-09-08') // martes -> día de caminata
  })

  it('arranca con los valores por defecto', () => {
    const s = store.getState()
    expect(s.settings.proteinGoal).toBe(110)
    expect(s.settings.proteinMin).toBe(80)
    expect(s.settings.enabledSupplements).toEqual(['creatine', 'omega3'])
    expect(s.settings.strengthDays).toEqual([1, 3, 5])
    expect(s.settings.restDay).toBe(0)
    expect(s.plan).toMatchObject({ level: 1, walkMinutes: 10, rounds: 1, reps: 8 })
    expect(s.game.xp).toBe(0)
    expect(s.today()).toBe('2026-09-08')
  })

  it('updateSettings hace merge', () => {
    store.getState().updateSettings({ proteinGoal: 130, name: 'Ana' })
    expect(store.getState().settings.proteinGoal).toBe(130)
    expect(store.getState().settings.name).toBe('Ana')
    expect(store.getState().settings.proteinMin).toBe(80)
  })

  it('logWalk suma XP por minuto y el bonus una sola vez al día', () => {
    const gained = store.getState().logWalk(10, 'moderado')
    expect(gained).toBe(10 * XP.walkPerMinute + XP.walkBonus) // 30
    expect(store.getState().game.xp).toBe(30)
    expect(store.getState().days['2026-09-08'].xp).toBe(30)

    const second = store.getState().logWalk(10, 'suave')
    expect(second).toBe(20) // sin bonus repetido
    expect(store.getState().game.xp).toBe(50)
    expect(store.getState().days['2026-09-08'].walks).toHaveLength(2)
  })

  it('una caminata corta no da el bonus hasta llegar a 5 min', () => {
    expect(store.getState().logWalk(3, 'suave')).toBe(6)
    expect(store.getState().logWalk(2, 'suave')).toBe(4 + XP.walkBonus)
    expect(store.getState().game.xp).toBe(20)
  })

  it('logStrength da 40 XP una sola vez al día', () => {
    const session = { roundsDone: 3, roundsPlanned: 3, reps: 8, rpe: 6, pain: 1 }
    expect(store.getState().logStrength(session)).toBe(XP.strength)
    expect(store.getState().logStrength({ ...session, rpe: 7 })).toBe(0)
    expect(store.getState().game.xp).toBe(XP.strength)
    expect(store.getState().days['2026-09-08'].strength?.rpe).toBe(7)
    expect(store.getState().game.badges).toContain('first-strength')
  })

  it('la proteína premia cada umbral una vez y lo retira si baja', () => {
    expect(store.getState().addProtein(50, 'pollo')).toBe(0)
    expect(store.getState().addProtein(30, 'whey')).toBe(XP.proteinMin) // 80 = mínimo
    expect(store.getState().addProtein(30, 'atún')).toBe(XP.proteinGoal) // 110 = meta
    expect(store.getState().game.xp).toBe(20)

    const entry = store.getState().days['2026-09-08'].protein[2]
    store.getState().removeProtein(entry.id)
    expect(proteinTotal(store.getState().days['2026-09-08'])).toBe(80)
    expect(store.getState().game.xp).toBe(10) // se retira el bonus de meta
  })

  it('marcar y desmarcar suplemento suma y resta XP', () => {
    expect(store.getState().toggleSupplement('creatine')).toBe(XP.supplement)
    expect(store.getState().game.xp).toBe(5)
    expect(store.getState().days['2026-09-08'].supplements.creatine).toBe(true)

    expect(store.getState().toggleSupplement('creatine')).toBe(-XP.supplement)
    expect(store.getState().game.xp).toBe(0)
    expect(store.getState().days['2026-09-08'].supplements.creatine).toBe(false)
    expect(store.getState().days['2026-09-08'].xp).toBe(0)
  })

  it('el check-in y el Día Mínimo 3/3 dan bonus una sola vez', () => {
    store.getState().logWalk(10, 'moderado') // 30
    store.getState().addProtein(90, 'comida') // +10 (mínimo)
    const xpBefore = store.getState().game.xp
    const gained = store.getState().setCheckin(4, 'bien')
    expect(gained).toBe(XP.checkin + XP.minimumDay) // 10 + 25
    expect(store.getState().game.xp).toBe(xpBefore + 35)

    // repetir el check-in no vuelve a pagar
    expect(store.getState().setCheckin(5)).toBe(0)
  })

  it('setWater y setBodyMetrics no dan XP', () => {
    store.getState().setWater(4)
    store.getState().setBodyMetrics({ weight: 80.5, waist: 92 })
    expect(store.getState().days['2026-09-08'].water).toBe(4)
    expect(store.getState().days['2026-09-08'].weight).toBe(80.5)
    expect(store.getState().game.xp).toBe(0)
  })

  it('_setToday cambia el día y la racha se acumula', () => {
    store.getState()._setToday('2026-09-08')
    store.getState().logWalk(10, 'moderado')
    store.getState()._setToday('2026-09-09')
    store.getState().logWalk(10, 'moderado')
    store.getState()._setToday('2026-09-10')
    store.getState().logWalk(10, 'moderado')
    const s = streak(store.getState(), new Date(2026, 8, 10, 12))
    expect(s.current).toBe(3)
    expect(Object.keys(store.getState().days)).toHaveLength(3)
    expect(store.getState().game.badges).toContain('first-walk')
  })
})

describe('completeWeeklyReview', () => {
  it('semana perfecta -> progress, +150 XP y plan nuevo', () => {
    const store = makeTestStore('2026-09-07')
    const s = () => store.getState()
    const week: [string, 'walk' | 'strength'][] = [
      ['2026-09-07', 'strength'],
      ['2026-09-08', 'walk'],
      ['2026-09-09', 'strength'],
      ['2026-09-10', 'walk'],
      ['2026-09-11', 'strength'],
      ['2026-09-12', 'walk'],
    ]
    for (const [date, kind] of week) {
      s()._setToday(date)
      if (kind === 'walk') s().logWalk(10, 'moderado')
      else s().logStrength({ roundsDone: 1, roundsPlanned: 1, reps: 8, rpe: 6, pain: 1 })
    }
    s()._setToday('2026-09-14') // lunes siguiente
    const xpBefore = s().game.xp
    const { review, xp } = s().completeWeeklyReview({
      weekStart: '2026-09-07',
      energy: 4,
      difficulty: 3,
      note: 'bien',
    })

    expect(review.adherence).toBe(1)
    expect(review.decision).toBe('progress')
    expect(review.planBefore.walkMinutes).toBe(10)
    expect(review.planAfter.walkMinutes).toBe(15)
    expect(xp).toBe(XP.weeklyReview + XP.levelUp)
    expect(s().game.xp).toBe(xpBefore + 150)
    expect(s().plan).toMatchObject({ walkMinutes: 15, level: 2, nextVariable: 'reps' })
    expect(s().reviews).toHaveLength(1)
    expect(s().game.badges).toContain('review-1')
    expect(s().game.badges).toContain('week-perfect')

    // repetir la revisión de la misma semana no duplica XP
    const again = s().completeWeeklyReview({ weekStart: '2026-09-07', energy: 4, difficulty: 3 })
    expect(again.xp).toBe(0)
    expect(s().reviews).toHaveLength(1)
  })

  it('el dolor corregido en la revisión manda sobre el de las sesiones', () => {
    // Bug encontrado en QA: la pantalla mostraba la decisión con el dolor editado
    // pero el store decidía con el de las sesiones, así que el plan aplicado no
    // era el que la persona había aceptado.
    const store = makeTestStore('2026-09-07')
    const s = () => store.getState()
    const week: [string, 'walk' | 'strength'][] = [
      ['2026-09-07', 'strength'],
      ['2026-09-08', 'walk'],
      ['2026-09-09', 'strength'],
      ['2026-09-10', 'walk'],
      ['2026-09-11', 'strength'],
      ['2026-09-12', 'walk'],
    ]
    for (const [date, kind] of week) {
      s()._setToday(date)
      if (kind === 'walk') s().logWalk(10, 'moderado')
      else s().logStrength({ roundsDone: 1, roundsPlanned: 1, reps: 8, rpe: 6, pain: 1 })
    }
    s()._setToday('2026-09-14')
    const { review } = s().completeWeeklyReview({
      weekStart: '2026-09-07',
      energy: 3,
      difficulty: 4,
      maxPain: 6, // la persona corrige: le dolió más de lo registrado
    })
    expect(review.maxPain).toBe(6)
    expect(review.decision).toBe('hold') // nunca progresar con dolor
    expect(s().plan.walkMinutes).toBe(10) // el plan no sube
  })

  it('semana floja -> reduce y el plan vuelve a base', () => {
    const store = makeTestStore('2026-09-07')
    const s = () => store.getState()
    s().updateSettings({})
    // plan por encima de la base
    store.setState({ plan: { ...s().plan, walkMinutes: 25, rounds: 2, reps: 12, level: 4 } })
    s()._setToday('2026-09-08')
    s().logWalk(10, 'moderado') // 1 de 6 días -> adherencia 0.17
    s()._setToday('2026-09-14')
    const { review } = s().completeWeeklyReview({ weekStart: '2026-09-07', energy: 2, difficulty: 5 })
    expect(review.decision).toBe('reduce')
    expect(s().plan).toMatchObject({ walkMinutes: 10, rounds: 1, reps: 8, level: 1 })
  })
})

describe('export / import / reset', () => {
  it('exportJSON incluye version, exportedAt y state', () => {
    const store = makeTestStore('2026-09-08')
    store.getState().logWalk(12, 'rapido')
    const json = store.getState().exportJSON()
    const parsed = JSON.parse(json) as { version: number; exportedAt: number; state: unknown }
    expect(parsed.version).toBe(STORE_VERSION)
    expect(typeof parsed.exportedAt).toBe('number')
    expect(parsed.state).toMatchObject({ days: {}, reviews: [] })
    expect(Object.keys((parsed.state as { days: object }).days)).toEqual(['2026-09-08'])
  })

  it('importJSON restaura el estado exportado', () => {
    const a = makeTestStore('2026-09-08')
    a.getState().logWalk(12, 'rapido')
    a.getState().addProtein(90, 'pollo')
    a.getState().updateSettings({ name: 'Ana', proteinGoal: 120 })
    const json = a.getState().exportJSON()
    const xp = a.getState().game.xp

    const b = makeTestStore('2026-09-08')
    expect(b.getState().importJSON(json)).toBe(true)
    expect(b.getState().settings.name).toBe('Ana')
    expect(b.getState().settings.proteinGoal).toBe(120)
    expect(b.getState().game.xp).toBe(xp)
    expect(b.getState().days['2026-09-08'].walks).toHaveLength(1)
  })

  it('importJSON acepta un estado "pelado" y rechaza basura', () => {
    const store = makeTestStore('2026-09-08')
    expect(store.getState().importJSON('no soy json')).toBe(false)
    expect(store.getState().importJSON('[1,2,3]')).toBe(false)
    expect(store.getState().importJSON('{"foo":1}')).toBe(false)
    expect(store.getState().importJSON(JSON.stringify({ version: 1, state: { days: {} } }))).toBe(
      false,
    )

    const bare = JSON.stringify({
      settings: { name: 'Bare' },
      plan: { walkMinutes: 20 },
      days: {},
      reviews: [],
      game: { xp: 42 },
    })
    expect(store.getState().importJSON(bare)).toBe(true)
    expect(store.getState().settings.name).toBe('Bare')
    expect(store.getState().settings.proteinGoal).toBe(110) // relleno con defaults
    expect(store.getState().plan.walkMinutes).toBe(20)
    expect(store.getState().game.xp).toBe(42)
  })

  it('resetAll vuelve al estado inicial', () => {
    const store = makeTestStore('2026-09-08')
    store.getState().logWalk(30, 'moderado')
    store.getState().resetAll()
    expect(store.getState().game.xp).toBe(0)
    expect(store.getState().days).toEqual({})
    expect(store.getState().settings.name).toBe('')
  })

  it('normalizeData rellena huecos', () => {
    const data = normalizeData({ settings: {}, plan: {}, days: { x: {} }, reviews: [], game: {} })
    expect(data.settings.proteinGoal).toBe(110)
    expect(data.days.x.walks).toEqual([])
  })
})

describe('persistencia', () => {
  it('guarda y rehidrata con la clave momentum-v1', () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v)
      },
      removeItem: (k: string) => {
        mem.delete(k)
      },
    }
    const a = createStore({ now: () => new Date(2026, 8, 8, 12), storage })
    a.getState().logWalk(10, 'moderado')
    expect(mem.has(STORAGE_KEY)).toBe(true)
    const saved = JSON.parse(mem.get(STORAGE_KEY) as string) as { version: number }
    expect(saved.version).toBe(STORE_VERSION)

    const b = createStore({ now: () => new Date(2026, 8, 8, 12), storage })
    expect(b.getState().game.xp).toBe(30)
    expect(b.getState().days['2026-09-08'].walks).toHaveLength(1)
  })
})
