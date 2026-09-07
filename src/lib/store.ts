// Store de Momentum: zustand + persist (localStorage) con inyección de reloj y storage
// para los tests. `createStore({ now, storage })` devuelve un hook independiente;
// `useStore` es la instancia de la app.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import { addDays, listDays, parseISODate, todayKey, weekStart } from './dates'
import { XP, walkXp } from './gamification'
import { newId } from './ids'
import { DEFAULT_REMINDERS, normalizeReminders } from './reminders'
import { applyDecision, basePlan, decide } from './progression'
import {
  getDay,
  hasActivity,
  isRestDay,
  levelInfo,
  minimumDayFor,
  missionDone,
  proteinTotal,
  streak,
  weekSummary,
} from './selectors'
import { isSupplementId } from './supplements'
import type {
  BadgeId,
  Checkin,
  DayLog,
  ExportPayload,
  GameState,
  ISODate,
  MomentumData,
  Pace,
  Settings,
  StrengthSession,
  SupplementId,
  WeeklyPlan,
  WeeklyReview,
} from './types'

export const STORAGE_KEY = 'momentum-v1'
export const STORE_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  proteinGoal: 110,
  proteinMin: 80,
  enabledSupplements: ['creatine', 'omega3'],
  strengthDays: [1, 3, 5],
  restDay: 0,
  waterEnabled: false,
  waterGoal: 8,
  onboarded: false,
  reminders: DEFAULT_REMINDERS,
}

export const DEFAULT_GAME: GameState = { xp: 0, shields: 0, badges: [] }

export function initialData(now: Date = new Date()): MomentumData {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      enabledSupplements: [...DEFAULT_SETTINGS.enabledSupplements],
      strengthDays: [...DEFAULT_SETTINGS.strengthDays],
      reminders: normalizeReminders(DEFAULT_SETTINGS.reminders),
    },
    plan: basePlan(todayKey(now)),
    days: {},
    reviews: [],
    game: { ...DEFAULT_GAME, badges: [] },
  }
}

export interface MomentumActions {
  updateSettings: (patch: Partial<Settings>) => void
  /** Devuelve el XP obtenido. */
  logWalk: (minutes: number, pace: Pace, startedAt?: number) => number
  logStrength: (session: Omit<StrengthSession, 'id' | 'startedAt'>) => number
  addProtein: (grams: number, label: string) => number
  removeProtein: (id: string) => void
  toggleSupplement: (id: SupplementId, date?: ISODate) => number
  setWater: (glasses: number) => void
  setCheckin: (energy: Checkin['energy'], note?: string) => number
  setBodyMetrics: (metrics: { weight?: number; waist?: number }, date?: ISODate) => void
  completeWeeklyReview: (input: {
    weekStart: ISODate
    energy: 1 | 2 | 3 | 4 | 5
    difficulty: 1 | 2 | 3 | 4 | 5
    /** Dolor máximo corregido por la persona (por defecto, el de las sesiones). */
    maxPain?: number
    note?: string
  }) => { review: WeeklyReview; xp: number }
  exportJSON: () => string
  importJSON: (json: string) => boolean
  resetAll: () => void
  /** Sólo para tests/depuración: fija el "hoy" del store. */
  _setToday: (iso?: ISODate | null) => void
  /** ISODate de hoy según el reloj del store. */
  today: () => ISODate
}

export interface MomentumStore extends MomentumData, MomentumActions {}

// ---------------------------------------------------------------- storage

/** StateStorage en memoria (tests, SSR, navegadores sin localStorage). */
export function createMemoryStorage(): StateStorage {
  const map = new Map<string, string>()
  return {
    getItem: (name) => (map.has(name) ? (map.get(name) as string) : null),
    setItem: (name, value) => {
      map.set(name, value)
    },
    removeItem: (name) => {
      map.delete(name)
    },
  }
}

function resolveStorage(custom?: StateStorage | null): StateStorage {
  if (custom) return custom
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage
  } catch {
    /* acceso bloqueado (modo privado) */
  }
  return createMemoryStorage()
}

// ---------------------------------------------------------------- XP / tx

interface Tx {
  day: DayLog
  game: GameState
  nowMs: number
}

function cloneDay(day: DayLog): DayLog {
  return {
    ...day,
    walks: [...day.walks],
    protein: [...day.protein],
    supplements: { ...day.supplements },
    awards: { ...(day.awards ?? {}) },
  }
}

function grant(tx: Tx, amount: number, key?: string): number {
  if (amount === 0) return 0
  if (key) {
    if (tx.day.awards?.[key]) return 0
    tx.day.awards = { ...(tx.day.awards ?? {}), [key]: true }
  }
  tx.day.xp = Math.max(0, tx.day.xp + amount)
  tx.game.xp = Math.max(0, tx.game.xp + amount)
  tx.game.lastXpAt = tx.nowMs
  return amount
}

function revoke(tx: Tx, amount: number, key: string): number {
  if (!tx.day.awards?.[key]) return 0
  const awards = { ...(tx.day.awards ?? {}) }
  delete awards[key]
  tx.day.awards = awards
  tx.day.xp = Math.max(0, tx.day.xp - amount)
  tx.game.xp = Math.max(0, tx.game.xp - amount)
  return -amount
}

function syncAward(tx: Tx, key: string, active: boolean, amount: number): number {
  const has = !!tx.day.awards?.[key]
  if (active && !has) return grant(tx, amount, key)
  if (!active && has) return revoke(tx, amount, key)
  return 0
}

/** Bonos que dependen de umbrales del día (se conceden y se retiran solos). */
function applyDerivedAwards(tx: Tx, settings: Settings): void {
  const grams = proteinTotal(tx.day)
  syncAward(tx, 'protein-min', grams >= settings.proteinMin, XP.proteinMin)
  syncAward(tx, 'protein-goal', grams >= settings.proteinGoal, XP.proteinGoal)
  const min = minimumDayFor(tx.day, settings)
  syncAward(tx, 'minimum-day', min.count === 3, XP.minimumDay)
}

const PROTEIN_STREAK_WINDOW = 40

function computeBadges(data: MomentumData, now: Date, touched: ISODate): BadgeId[] {
  const badges = new Set<BadgeId>(data.game.badges)
  const keys = Object.keys(data.days).sort()
  for (const k of keys) {
    const day = data.days[k]
    if (day.walks.length > 0) badges.add('first-walk')
    if (day.strength) badges.add('first-strength')
  }
  const s = streak(data, now)
  if (s.best >= 7) badges.add('streak-7')
  if (s.best >= 30) badges.add('streak-30')
  if (levelInfo(data.game.xp).level >= 5) badges.add('level-5')
  if (data.reviews.length >= 1) badges.add('review-1')
  if (data.reviews.some((r) => r.adherence >= 1)) badges.add('week-perfect')

  // protein-7: 7 días seguidos con proteína >= mínimo (ventana reciente)
  const today = todayKey(now)
  let run = 0
  for (const date of listDays(addDays(today, -PROTEIN_STREAK_WINDOW), today)) {
    const day = data.days[date]
    if (day && proteinTotal(day) >= data.settings.proteinMin) {
      run += 1
      if (run >= 7) {
        badges.add('protein-7')
        break
      }
    } else {
      run = 0
    }
  }

  // week-perfect: se comprueba la semana tocada y la actual
  for (const ws of new Set([weekStart(touched), weekStart(today)])) {
    const summary = weekSummary(data, ws)
    if (summary.plannedDays > 0 && summary.adherence >= 1) badges.add('week-perfect')
  }

  return [...badges]
}

function finalizeGame(data: MomentumData, now: Date, touched: ISODate): GameState {
  const s = streak(data, now)
  return {
    ...data.game,
    shields: s.shields,
    badges: computeBadges(data, now, touched),
  }
}

// ---------------------------------------------------------------- sanitizar

function sanitizeDay(raw: unknown, date: ISODate): DayLog {
  const d = (raw ?? {}) as Partial<DayLog>
  return {
    date: typeof d.date === 'string' ? d.date : date,
    walks: Array.isArray(d.walks) ? d.walks : [],
    strength: d.strength,
    protein: Array.isArray(d.protein) ? d.protein : [],
    supplements: typeof d.supplements === 'object' && d.supplements ? d.supplements : {},
    water: typeof d.water === 'number' ? d.water : 0,
    checkin: d.checkin,
    weight: typeof d.weight === 'number' ? d.weight : undefined,
    waist: typeof d.waist === 'number' ? d.waist : undefined,
    xp: typeof d.xp === 'number' ? d.xp : 0,
    awards: typeof d.awards === 'object' && d.awards ? d.awards : {},
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Forma mínima válida de los datos persistidos/importados. */
export function isMomentumData(value: unknown): value is MomentumData {
  if (!isRecord(value)) return false
  return (
    isRecord(value.settings) &&
    isRecord(value.plan) &&
    isRecord(value.days) &&
    Array.isArray(value.reviews) &&
    isRecord(value.game)
  )
}

/** Completa con defaults lo que falte y limpia tipos. */
export function normalizeData(raw: unknown, now: Date = new Date()): MomentumData {
  const base = initialData(now)
  if (!isMomentumData(raw)) return base
  const settings = { ...base.settings, ...(raw.settings as Partial<Settings>) }
  settings.enabledSupplements = Array.isArray(settings.enabledSupplements)
    ? settings.enabledSupplements.filter(isSupplementId)
    : [...base.settings.enabledSupplements]
  settings.strengthDays = Array.isArray(settings.strengthDays)
    ? settings.strengthDays.filter((n) => typeof n === 'number')
    : [...base.settings.strengthDays]
  // Los estados persistidos antes de los recordatorios no traen este campo:
  // se rellena con el default (y se completa lo que falte dentro).
  settings.reminders = normalizeReminders(settings.reminders)
  const plan: WeeklyPlan = { ...base.plan, ...(raw.plan as Partial<WeeklyPlan>) }
  const days: Record<ISODate, DayLog> = {}
  for (const [key, value] of Object.entries(raw.days as Record<string, unknown>)) {
    days[key] = sanitizeDay(value, key)
  }
  const game: GameState = { ...base.game, ...(raw.game as Partial<GameState>) }
  game.badges = Array.isArray(game.badges) ? game.badges : []
  const reviews = (raw.reviews as WeeklyReview[]).filter((r) => isRecord(r) && !!r.weekStart)
  return { settings, plan, days, reviews, game }
}

// ---------------------------------------------------------------- factory

export interface CreateStoreOptions {
  /** Reloj inyectable (tests). */
  now?: () => Date
  /** StateStorage a medida; por defecto localStorage o memoria. */
  storage?: StateStorage | null
  /** Clave de persistencia (por defecto `momentum-v1`). */
  name?: string
}

export function createStore(options: CreateStoreOptions = {}) {
  const baseNow = options.now ?? (() => new Date())
  let todayOverride: ISODate | null = null
  const now = (): Date => {
    if (todayOverride) {
      const d = parseISODate(todayOverride)
      d.setHours(12, 0, 0, 0)
      return d
    }
    return baseNow()
  }
  const storage = resolveStorage(options.storage)

  return create<MomentumStore>()(
    persist(
      (set, get) => {
        /** Aplica una mutación sobre un día y recalcula XP/badges. Devuelve el XP neto. */
        const commit = (
          date: ISODate,
          mutate: (tx: Tx, state: MomentumStore) => Partial<MomentumData> | void,
        ): number => {
          const state = get()
          const nowDate = now()
          const tx: Tx = {
            day: cloneDay(getDay(state, date)),
            game: { ...state.game, badges: [...state.game.badges] },
            nowMs: nowDate.getTime(),
          }
          const xpBefore = tx.game.xp
          const extra = mutate(tx, state) ?? {}
          applyDerivedAwards(tx, state.settings)
          const days = { ...state.days, ...(extra.days ?? {}), [date]: tx.day }
          const data: MomentumData = {
            settings: extra.settings ?? state.settings,
            plan: extra.plan ?? state.plan,
            days,
            reviews: extra.reviews ?? state.reviews,
            game: tx.game,
          }
          data.game = finalizeGame(data, nowDate, date)
          set({
            settings: data.settings,
            plan: data.plan,
            days: data.days,
            reviews: data.reviews,
            game: data.game,
          })
          return data.game.xp - xpBefore
        }

        return {
          ...initialData(baseNow()),

          today: () => todayKey(now()),

          _setToday: (iso) => {
            todayOverride = iso ?? null
          },

          updateSettings: (patch) => {
            const state = get()
            const settings: Settings = { ...state.settings, ...patch }
            const data: MomentumData = { ...state, settings }
            set({ settings, game: finalizeGame(data, now(), todayKey(now())) })
          },

          logWalk: (minutes, pace, startedAt) => {
            const mins = Math.max(0, Math.round(minutes))
            const date = todayKey(now())
            return commit(date, (tx) => {
              tx.day.walks = [
                ...tx.day.walks,
                { id: newId('w'), startedAt: startedAt ?? tx.nowMs, minutes: mins, pace },
              ]
              grant(tx, walkXp(mins))
              // bonus de movimiento: una sola vez al día
              const total = tx.day.walks.reduce((a, w) => a + w.minutes, 0)
              if (total >= 5) grant(tx, XP.walkBonus, 'walk-bonus')
            })
          },

          logStrength: (session) => {
            const date = todayKey(now())
            return commit(date, (tx) => {
              tx.day.strength = { id: newId('s'), startedAt: tx.nowMs, ...session }
              grant(tx, XP.strength, 'strength')
            })
          },

          addProtein: (grams, label) => {
            const date = todayKey(now())
            return commit(date, (tx) => {
              tx.day.protein = [
                ...tx.day.protein,
                { id: newId('p'), at: tx.nowMs, grams: Math.max(0, grams), label },
              ]
            })
          },

          removeProtein: (id) => {
            const date = todayKey(now())
            commit(date, (tx) => {
              tx.day.protein = tx.day.protein.filter((p) => p.id !== id)
            })
          },

          toggleSupplement: (id, date) => {
            const key = date ?? todayKey(now())
            return commit(key, (tx) => {
              const taken = !tx.day.supplements[id]
              tx.day.supplements = { ...tx.day.supplements, [id]: taken }
              syncAward(tx, `supp:${id}`, taken, XP.supplement)
            })
          },

          setWater: (glasses) => {
            const date = todayKey(now())
            commit(date, (tx) => {
              tx.day.water = Math.max(0, Math.round(glasses))
            })
          },

          setCheckin: (energy, note) => {
            const date = todayKey(now())
            return commit(date, (tx) => {
              tx.day.checkin = { at: tx.nowMs, energy, note }
              grant(tx, XP.checkin, 'checkin')
            })
          },

          setBodyMetrics: (metrics, date) => {
            const key = date ?? todayKey(now())
            commit(key, (tx) => {
              if (metrics.weight !== undefined) tx.day.weight = metrics.weight
              if (metrics.waist !== undefined) tx.day.waist = metrics.waist
            })
          },

          completeWeeklyReview: (input) => {
            const state = get()
            const nowDate = now()
            const ws = weekStart(input.weekStart)
            const summary = weekSummary(state, ws)
            // El dolor puede corregirlo la persona en la revisión: manda su valor.
            const maxPain =
              typeof input.maxPain === 'number'
                ? Math.max(0, Math.min(10, Math.round(input.maxPain)))
                : summary.maxPain
            const decision = decide({ ...summary, maxPain })
            const planBefore = state.plan
            const planAfter = applyDecision(planBefore, decision, todayKey(nowDate))
            const review: WeeklyReview = {
              weekStart: ws,
              createdAt: nowDate.getTime(),
              adherence: summary.adherence,
              avgRpe: summary.avgRpe,
              maxPain,
              energy: input.energy,
              difficulty: input.difficulty,
              decision,
              planBefore,
              planAfter,
              note: input.note,
            }
            const reviews = [...state.reviews.filter((r) => r.weekStart !== ws), review].sort(
              (a, b) => (a.weekStart < b.weekStart ? -1 : 1),
            )
            const xp = commit(todayKey(nowDate), (tx) => {
              grant(tx, XP.weeklyReview, `review:${ws}`)
              if (planAfter.level > planBefore.level) grant(tx, XP.levelUp, `levelup:${ws}`)
              return { plan: planAfter, reviews }
            })
            return { review, xp }
          },

          exportJSON: () => {
            const s = get()
            const payload: ExportPayload = {
              version: STORE_VERSION,
              exportedAt: now().getTime(),
              state: {
                settings: s.settings,
                plan: s.plan,
                days: s.days,
                reviews: s.reviews,
                game: s.game,
              },
            }
            return JSON.stringify(payload, null, 2)
          },

          importJSON: (json) => {
            let parsed: unknown
            try {
              parsed = JSON.parse(json)
            } catch {
              return false
            }
            if (!isRecord(parsed)) return false
            const raw = isMomentumData(parsed.state) ? parsed.state : parsed
            if (!isMomentumData(raw)) return false
            const data = normalizeData(raw, now())
            set({ ...data })
            return true
          },

          resetAll: () => {
            set({ ...initialData(now()) })
          },
        }
      },
      {
        name: options.name ?? STORAGE_KEY,
        version: STORE_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({
          settings: state.settings,
          plan: state.plan,
          days: state.days,
          reviews: state.reviews,
          game: state.game,
        }),
        // Migración trivial: hoy sólo existe la v1.
        migrate: (persisted, version) => {
          if (version === STORE_VERSION) return persisted as MomentumData
          return normalizeData(persisted)
        },
        merge: (persisted, current) => ({
          ...current,
          ...normalizeData(persisted, baseNow()),
        }),
      },
    ),
  )
}

/** Instancia de la app (persiste en localStorage con la clave `momentum-v1`). */
export const useStore = createStore()

/** Alias explícito por si se necesita el factory con otro nombre. */
export const createMomentumStore = createStore

// Re-exports útiles para las pantallas.
export { getDay, hasActivity, isRestDay, missionDone }
