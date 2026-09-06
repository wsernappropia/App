// Motor de progresión semanal (regla 7.1 del PRD).
import { DECISION_MESSAGE, DECISION_TITLE } from './copy'
import type { Decision, ISODate, PlanVariable, WeeklyPlan } from './types'

/** Dosis base a la que vuelve `reduce`. */
export const BASE = { walkMinutes: 10, rounds: 1, reps: 8 } as const

/** Topes por variable. */
export const CAPS = { walk: 45, reps: 15, rounds: 3 } as const

/** Incrementos por variable. */
export const STEPS = { walk: 5, reps: 2, rounds: 1 } as const

/** Ciclo de progresión: caminata -> reps -> rondas -> caminata. */
export const VARIABLE_CYCLE: PlanVariable[] = ['walk', 'reps', 'rounds']

export function nextVariable(v: PlanVariable): PlanVariable {
  const i = VARIABLE_CYCLE.indexOf(v)
  return VARIABLE_CYCLE[(i + 1) % VARIABLE_CYCLE.length]
}

export function basePlan(since: ISODate = ''): WeeklyPlan {
  return {
    level: 1,
    walkMinutes: BASE.walkMinutes,
    rounds: BASE.rounds,
    reps: BASE.reps,
    nextVariable: 'walk',
    since,
  }
}

export function isBasePlan(plan: WeeklyPlan): boolean {
  return (
    plan.walkMinutes <= BASE.walkMinutes &&
    plan.rounds <= BASE.rounds &&
    plan.reps <= BASE.reps
  )
}

function atCap(plan: WeeklyPlan, v: PlanVariable): boolean {
  if (v === 'walk') return plan.walkMinutes >= CAPS.walk
  if (v === 'reps') return plan.reps >= CAPS.reps
  return plan.rounds >= CAPS.rounds
}

export interface DecisionInput {
  adherence: number
  avgRpe: number | null
  maxPain: number
}

/**
 * Tabla 7.1:
 *  - <50%  -> reduce (siempre)
 *  - >=80% con RPE <=7 y dolor <=2 -> progress
 *  - >=80% con RPE >=8 o dolor >2  -> hold  (nunca progresar con dolor)
 *  - 50-79% con RPE <=7 y dolor <=3 -> repeat
 *  - 50-79% con RPE >=8 o dolor >3  -> hold
 */
export function decide(summary: DecisionInput): Decision {
  const adherence = Number.isFinite(summary.adherence) ? summary.adherence : 0
  const rpe = summary.avgRpe
  const pain = summary.maxPain ?? 0
  if (adherence < 0.5) return 'reduce'
  const hardRpe = rpe !== null && rpe >= 8
  if (adherence >= 0.8) {
    if (hardRpe || pain > 2) return 'hold'
    return 'progress'
  }
  // 50–79%
  if (hardRpe || pain > 3) return 'hold'
  return 'repeat'
}

/**
 * Aplica la decisión al plan.
 * - progress: sube UNA variable siguiendo el ciclo; si está en su tope, prueba la
 *   siguiente del ciclo. Si todas están en tope, el plan no cambia (tampoco el nivel).
 * - reduce: vuelve a la base si estaba por encima; si ya está en base, se mantiene.
 * - repeat / hold: sin cambios.
 */
export function applyDecision(plan: WeeklyPlan, decision: Decision, since?: ISODate): WeeklyPlan {
  const next: WeeklyPlan = { ...plan, since: since ?? plan.since }
  if (decision === 'repeat' || decision === 'hold') return next
  if (decision === 'reduce') {
    if (isBasePlan(plan)) return next
    return { ...basePlan(next.since) }
  }
  // progress
  let variable: PlanVariable | null = null
  let candidate = plan.nextVariable
  for (let i = 0; i < VARIABLE_CYCLE.length; i++) {
    if (!atCap(plan, candidate)) {
      variable = candidate
      break
    }
    candidate = nextVariable(candidate)
  }
  if (!variable) return next // todo en tope: no se toca nada
  if (variable === 'walk') next.walkMinutes = Math.min(CAPS.walk, plan.walkMinutes + STEPS.walk)
  if (variable === 'reps') next.reps = Math.min(CAPS.reps, plan.reps + STEPS.reps)
  if (variable === 'rounds') next.rounds = Math.min(CAPS.rounds, plan.rounds + STEPS.rounds)
  next.nextVariable = nextVariable(variable)
  next.level = plan.level + 1
  return next
}

/** "10 min · 1×8" */
export function planSummary(plan: WeeklyPlan): string {
  return `caminata ${plan.walkMinutes} min · fuerza ${plan.rounds}×${plan.reps}`
}

/** Título y mensaje (copy 6.2) para explicar la decisión. */
export function describeDecision(
  decision: Decision,
  planAfter: WeeklyPlan,
): { title: string; message: string } {
  return {
    title: DECISION_TITLE[decision],
    message: `${DECISION_MESSAGE[decision]} Próxima semana: ${planSummary(planAfter)}.`,
  }
}

/** Diferencias legibles entre dos planes ("+5 min de caminata"). */
export function planDiff(before: WeeklyPlan, after: WeeklyPlan): string[] {
  const out: string[] = []
  if (after.walkMinutes !== before.walkMinutes) {
    const d = after.walkMinutes - before.walkMinutes
    out.push(`${d > 0 ? '+' : ''}${d} min de caminata`)
  }
  if (after.reps !== before.reps) {
    const d = after.reps - before.reps
    out.push(`${d > 0 ? '+' : ''}${d} reps`)
  }
  if (after.rounds !== before.rounds) {
    const d = after.rounds - before.rounds
    out.push(`${d > 0 ? '+' : ''}${d} ronda${Math.abs(d) === 1 ? '' : 's'}`)
  }
  return out
}
