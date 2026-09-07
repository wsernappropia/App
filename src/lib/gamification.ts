// Gamificación: XP, niveles, escudos y badges.
import type { BadgeId, LevelInfo } from './types'

/** Tarifas de XP (PRD). */
export const XP = {
  /** Caminata: 2 XP por minuto (cada sesión). */
  walkPerMinute: 2,
  /** Bonus por caminata >= 5 min, una vez por día. */
  walkBonus: 10,
  /** Sesión de fuerza registrada, una vez por día. */
  strength: 40,
  /** Proteína >= proteinMin, una vez por día. */
  proteinMin: 10,
  /** Proteína >= proteinGoal, una vez por día (además del anterior). */
  proteinGoal: 10,
  /** Cada suplemento marcado (se revierte al desmarcar). */
  supplement: 5,
  /** Check-in diario. */
  checkin: 10,
  /** Día Mínimo 3/3. */
  minimumDay: 25,
  /** Meta de pasos del día (misión alternativa de Health Connect), una vez al día. */
  stepsGoal: 15,
  /** Revisión semanal completada. */
  weeklyReview: 50,
  /** El plan sube de nivel tras la revisión. */
  levelUp: 100,
} as const

export const MIN_WALK_MINUTES = 5

/** Escudos: 1 cada 7 días de racha, máximo 2 acumulados. */
export const SHIELD_EVERY = 7
export const MAX_SHIELDS = 2

export const LEVEL_NAMES = [
  'Semilla', // 1
  'Brote', // 2
  'Caminante', // 3
  'Constante', // 4
  'Sólido', // 5
  'Fuerte', // 6
  'Resistente', // 7
  'Imparable', // 8
  'Leyenda', // 9+
] as const

/** XP acumulado necesario para pasar del nivel n al n+1. */
export function xpForLevel(n: number): number {
  if (n < 1) return 0
  return Math.round(100 * Math.pow(n, 1.5))
}

/** XP acumulado necesario para ALCANZAR el nivel `level` (nivel 1 = 0 XP). */
export function xpThreshold(level: number): number {
  if (level <= 1) return 0
  return xpForLevel(level - 1)
}

export function levelName(level: number): string {
  if (level < 1) return LEVEL_NAMES[0]
  return LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1]
}

/** Nivel, nombre y progreso dentro del nivel a partir del XP total. */
export function levelInfo(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp))
  let level = 1
  // Los umbrales crecen; bucle acotado por seguridad.
  while (level < 999 && total >= xpThreshold(level + 1)) level++
  const base = xpThreshold(level)
  const next = xpThreshold(level + 1)
  const xpForNext = Math.max(1, next - base)
  const xpInLevel = total - base
  return {
    level,
    name: levelName(level),
    xpInLevel,
    xpForNext,
    progress: Math.max(0, Math.min(1, xpInLevel / xpForNext)),
  }
}

export interface BadgeDef {
  id: BadgeId
  name: string
  description: string
  emoji: string
}

export const BADGES: Record<BadgeId, BadgeDef> = {
  'first-walk': {
    id: 'first-walk',
    name: 'Primer paso',
    description: 'Registraste tu primera caminata.',
    emoji: '👟',
  },
  'first-strength': {
    id: 'first-strength',
    name: 'Primera sesión',
    description: 'Completaste tu primera sesión de fuerza.',
    emoji: '💪',
  },
  'streak-7': {
    id: 'streak-7',
    name: 'Siete seguidos',
    description: '7 días de racha.',
    emoji: '🔥',
  },
  'streak-30': {
    id: 'streak-30',
    name: 'Un mes en marcha',
    description: '30 días de racha.',
    emoji: '🏆',
  },
  'protein-7': {
    id: 'protein-7',
    name: 'Proteína constante',
    description: '7 días seguidos en el mínimo de proteína.',
    emoji: '🥚',
  },
  'level-5': {
    id: 'level-5',
    name: 'Sólido',
    description: 'Alcanzaste el nivel 5.',
    emoji: '⭐',
  },
  'review-1': {
    id: 'review-1',
    name: 'Primera revisión',
    description: 'Cerraste tu primera semana.',
    emoji: '📋',
  },
  'week-perfect': {
    id: 'week-perfect',
    name: 'Semana perfecta',
    description: '100% de adherencia en una semana.',
    emoji: '✨',
  },
}

export const BADGE_ORDER: BadgeId[] = [
  'first-walk',
  'first-strength',
  'streak-7',
  'streak-30',
  'protein-7',
  'level-5',
  'review-1',
  'week-perfect',
]

/** XP de una caminata concreta (sin el bonus diario). */
export function walkXp(minutes: number): number {
  return Math.max(0, Math.round(minutes)) * XP.walkPerMinute
}

/** Etiqueta corta para el Toast: "+40 XP". */
export function xpLabel(amount: number): string {
  return `${amount >= 0 ? '+' : ''}${amount} XP`
}
