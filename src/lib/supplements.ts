// Catálogo de suplementos con dosis y nota condicional.
import type { SupplementDef, SupplementId } from './types'

export const SUPPLEMENTS: Record<SupplementId, SupplementDef> = {
  creatine: {
    id: 'creatine',
    name: 'Creatina',
    dose: '3–5 g/día',
    note: 'También en días de descanso. Bebe agua extra.',
  },
  omega3: {
    id: 'omega3',
    name: 'Omega-3',
    dose: '1–2 g EPA+DHA',
    note: 'Con una comida. Si hoy comes pescado graso, puedes saltarla.',
  },
  vitd: {
    id: 'vitd',
    name: 'Vitamina D',
    dose: '1000–2000 UI',
    note: 'Con grasa. No dupliques si tu multivitamínico ya la incluye.',
  },
  magnesium: {
    id: 'magnesium',
    name: 'Magnesio',
    dose: '200–400 mg',
    note: 'Por la noche. Si hay molestias digestivas, reduce la dosis.',
  },
}

/** Orden estable para listados y rejillas de historial. */
export const SUPPLEMENT_ORDER: SupplementId[] = ['creatine', 'omega3', 'vitd', 'magnesium']

export const ALL_SUPPLEMENTS: SupplementDef[] = SUPPLEMENT_ORDER.map((id) => SUPPLEMENTS[id])

export function isSupplementId(value: unknown): value is SupplementId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SUPPLEMENTS, value)
}

/** Definiciones de los suplementos activos, en orden estable. */
export function supplementList(enabled: SupplementId[]): SupplementDef[] {
  return SUPPLEMENT_ORDER.filter((id) => enabled.includes(id)).map((id) => SUPPLEMENTS[id])
}
