// Copy en español. Los textos del PRD 6.2 se usan literalmente.
import type { Decision } from './types'

export const APP_NAME = 'Momentum'

/** Encabezado fijo de Hoy (6.1). */
export const HEADER_TAGLINE = 'Hoy solo necesitas 5 minutos para mantener el ritmo.'

/** 6.2 — Día normal (caminata). Los minutos vienen del plan. */
export function missionWalkMessage(minutes: number): string {
  return `Tu misión: caminar ${minutes} min. Si hoy está pesado, 5 min mantienen la racha.`
}

/** 6.2 — Día normal (fuerza). Rondas/reps vienen del plan. */
export function missionStrengthMessage(rounds: number, reps: number): string {
  const r = `${rounds} ronda${rounds === 1 ? '' : 's'}`
  return `Tu misión: fuerza: ${r} de ${reps} reps. Si hoy está pesado, 5 min de caminata mantienen la racha.`
}

/** 6.2 — Después de faltar. */
export const AFTER_MISS = 'No hay deuda. Hoy vuelves con 5 minutos.'

/** 6.2 — Sesión difícil (decisión `hold`). */
export const HARD_SESSION = 'Buen trabajo. No progresaremos volumen todavía; repetir también es progreso.'

/** 6.2 — Semana excelente (decisión `progress`). */
export const GREAT_WEEK = 'Ya dominas este nivel. La próxima semana sube una sola variable.'

/** 6.2 — Proteína baja. Los gramos se calculan. */
export function proteinLowMessage(remaining: number): string {
  return `Te faltan ~${Math.round(remaining)} g. Un batido o una comida alta en proteína te pone en zona verde.`
}

/** Misión cumplida. */
export const MISSION_DONE = '¡Misión cumplida! Todo lo demás es extra.'

/** Día de descanso. */
export const REST_DAY = 'Hoy toca descansar. Si te apetece, una caminata suave suma, pero no hace falta.'

export const REST_DAY_TITLE = 'Hoy toca descansar'
export const REST_DAY_CTA = 'Caminata opcional'

/** Textos de las decisiones semanales (7.1). */
export const DECISION_TITLE: Record<Decision, string> = {
  reduce: 'Bajamos la fricción',
  repeat: 'Repetimos la semana',
  progress: 'Subes de nivel',
  hold: 'Mantenemos el volumen',
}

export const DECISION_MESSAGE: Record<Decision, string> = {
  reduce: 'No hay deuda. Volvemos a la dosis base para que empezar sea fácil otra vez.',
  repeat: 'Misma dosis esta semana; consolidar el hábito ya es progreso.',
  progress: GREAT_WEEK,
  hold: HARD_SESSION,
}

export const DECISION_LABEL: Record<Decision, string> = {
  reduce: 'Reducir',
  repeat: 'Repetir',
  progress: 'Progresar',
  hold: 'Mantener',
}

export const MINIMUM_LABELS = {
  movement: 'Movimiento',
  protein: 'Proteína',
  checkin: 'Check-in',
} as const

export const PACE_LABEL = {
  suave: 'Suave',
  moderado: 'Moderado',
  rapido: 'Rápido',
} as const

export const ENERGY_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Agotado',
  2: 'Flojo',
  3: 'Normal',
  4: 'Bien',
  5: 'Con energía',
}

export const DIFFICULTY_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Muy fácil',
  2: 'Fácil',
  3: 'Justo',
  4: 'Duro',
  5: 'Demasiado duro',
}

export const copy = {
  appName: APP_NAME,
  headerTagline: HEADER_TAGLINE,
  missionWalkMessage,
  missionStrengthMessage,
  afterMiss: AFTER_MISS,
  hardSession: HARD_SESSION,
  greatWeek: GREAT_WEEK,
  proteinLowMessage,
  missionDone: MISSION_DONE,
  restDay: REST_DAY,
  restDayTitle: REST_DAY_TITLE,
  restDayCta: REST_DAY_CTA,
  decisionTitle: DECISION_TITLE,
  decisionMessage: DECISION_MESSAGE,
  decisionLabel: DECISION_LABEL,
  minimumLabels: MINIMUM_LABELS,
  paceLabel: PACE_LABEL,
  energyLabel: ENERGY_LABEL,
  difficultyLabel: DIFFICULTY_LABEL,
} as const
