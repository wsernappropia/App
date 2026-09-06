// Presets de proteína y helpers de zona.
import type { ProteinZone } from './types'

export interface ProteinPreset {
  label: string
  grams: number
  emoji: string
}

export const PROTEIN_PRESETS: ProteinPreset[] = [
  { label: '2 huevos', grams: 12, emoji: '🥚' },
  { label: 'Pechuga de pollo 150 g', grams: 35, emoji: '🍗' },
  { label: 'Whey 1 scoop', grams: 25, emoji: '🥤' },
  { label: 'Yogur griego', grams: 15, emoji: '🥛' },
  { label: 'Lata de atún', grams: 25, emoji: '🐟' },
  { label: 'Lentejas 1 taza', grams: 18, emoji: '🍲' },
  { label: 'Vaso de leche', grams: 8, emoji: '🥛' },
  { label: 'Queso fresco 100 g', grams: 14, emoji: '🧀' },
  { label: 'Carne 150 g', grams: 32, emoji: '🥩' },
  { label: 'Salmón 150 g', grams: 30, emoji: '🍣' },
  { label: 'Tofu 150 g', grams: 18, emoji: '🧊' },
  { label: 'Proteína vegetal 1 scoop', grams: 20, emoji: '🌱' },
]

/** verde >= goal, amarillo >= min, rojo por debajo. */
export function proteinZone(grams: number, min: number, goal: number): ProteinZone {
  if (grams >= goal) return 'verde'
  if (grams >= min) return 'amarillo'
  return 'rojo'
}

export function remainingProtein(grams: number, goal: number): number {
  return Math.max(0, Math.round((goal - grams) * 10) / 10)
}

export const ZONE_LABEL: Record<ProteinZone, string> = {
  rojo: 'Baja',
  amarillo: 'Casi',
  verde: 'Zona verde',
}
