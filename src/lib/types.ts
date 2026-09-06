// Modelo de datos de Momentum. Nombres del contrato compartido: no renombrar.

export type ISODate = string

export type Screen =
  | 'today'
  | 'walk'
  | 'strength'
  | 'nutrition'
  | 'supplements'
  | 'progress'
  | 'review'
  | 'settings'

export type Pace = 'suave' | 'moderado' | 'rapido'

export interface WalkSession {
  id: string
  startedAt: number
  minutes: number
  pace: Pace
}

export interface StrengthSession {
  id: string
  startedAt: number
  roundsDone: number
  roundsPlanned: number
  reps: number
  rpe: number /* 1-10 */
  pain: number /* 0-10 */
  note?: string
}

export interface ProteinEntry {
  id: string
  at: number
  grams: number
  label: string
}

export type SupplementId = 'creatine' | 'omega3' | 'vitd' | 'magnesium'

export interface SupplementDef {
  id: SupplementId
  name: string
  dose: string
  note: string /* nota condicional */
}

export interface Checkin {
  at: number
  energy: 1 | 2 | 3 | 4 | 5
  note?: string
}

/** Claves de XP ya otorgado en un día (idempotencia por umbral/día). */
export type XpAwardKey = string

export interface DayLog {
  date: ISODate
  walks: WalkSession[]
  strength?: StrengthSession
  protein: ProteinEntry[]
  supplements: Partial<Record<SupplementId, boolean>>
  water: number // vasos
  checkin?: Checkin
  weight?: number // kg (opcional)
  waist?: number // cm (opcional)
  xp: number // XP ganado ese día (suma)
  /** Añadido: registro de bonos ya concedidos, para que las acciones sean idempotentes. */
  awards?: Partial<Record<XpAwardKey, boolean>>
}

export interface Settings {
  name: string
  proteinGoal: number // default 110
  proteinMin: number // default 80 -> cuenta para Día Mínimo ("zona verde" = >= proteinGoal)
  enabledSupplements: SupplementId[] // default ['creatine','omega3']
  strengthDays: number[] // 0=domingo..6=sábado; default [1,3,5]
  restDay: number | null // default 0 (domingo)
  waterEnabled: boolean
  waterGoal: number
  onboarded: boolean
}

export interface WeeklyPlan {
  level: number
  walkMinutes: number
  rounds: number
  reps: number
  nextVariable: 'walk' | 'reps' | 'rounds'
  since: ISODate
}

export type PlanVariable = WeeklyPlan['nextVariable']

export type Decision = 'reduce' | 'repeat' | 'progress' | 'hold'

export interface WeeklyReview {
  weekStart: ISODate
  createdAt: number
  adherence: number /* 0-1 */
  avgRpe: number | null
  maxPain: number
  energy: 1 | 2 | 3 | 4 | 5
  difficulty: 1 | 2 | 3 | 4 | 5
  decision: Decision
  planBefore: WeeklyPlan
  planAfter: WeeklyPlan
  note?: string
}

export type BadgeId =
  | 'first-walk'
  | 'first-strength'
  | 'streak-7'
  | 'streak-30'
  | 'protein-7'
  | 'level-5'
  | 'review-1'
  | 'week-perfect'

export interface GameState {
  xp: number
  shields: number /* 0-2 */
  badges: BadgeId[]
  lastXpAt?: number
}

/** Datos persistidos (sin acciones). */
export interface MomentumData {
  settings: Settings
  plan: WeeklyPlan
  days: Record<ISODate, DayLog>
  reviews: WeeklyReview[]
  game: GameState
}

export type Mission = 'walk' | 'strength' | 'rest'
export type ProteinZone = 'rojo' | 'amarillo' | 'verde'

export interface MinimumDay {
  movement: boolean
  protein: boolean
  checkin: boolean
  count: 0 | 1 | 2 | 3
}

export interface ProteinStatus {
  grams: number
  goal: number
  min: number
  remaining: number
  zone: ProteinZone
}

export interface StreakInfo {
  current: number
  best: number
  shields: number
  missedYesterday: boolean
  /** Añadido: true si un escudo cubrió la falta de ayer. */
  shieldUsedYesterday: boolean
}

export interface WeekSummary {
  weekStart: ISODate
  plannedDays: number
  doneDays: number
  adherence: number
  walkMinutes: number
  walkSessions: number
  strengthSessions: number
  avgRpe: number | null
  maxPain: number
  proteinAvg: number
  proteinGreenDays: number
  supplementsRate: number
  minimumDaysComplete: number
  xp: number
}

export interface LevelInfo {
  level: number
  name: string
  xpInLevel: number
  xpForNext: number
  progress: number
}

export interface ExportPayload {
  version: number
  exportedAt: number
  state: MomentumData
}
