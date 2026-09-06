// Helpers SOLO para tests (no se importa desde la app, así que no entra en el bundle).
//
// Cómo probar el store sin localStorage:
//   const store = makeTestStore('2026-09-07')          // reloj fijo + storage en memoria
//   store.getState().logWalk(10, 'moderado')
//   store.getState()._setToday('2026-09-08')           // avanzar de día
// `makeTestStore` inyecta `now` y un `StateStorage` en memoria, por lo que `persist`
// funciona igual que en el navegador pero sin tocar `window`.
import { createMemoryStorage, createStore, initialData } from './store'
import type { CreateStoreOptions } from './store'
import { parseISODate } from './dates'
import type { DayLog, ISODate, MomentumData, Settings } from './types'
import { emptyDay } from './selectors'

/** Date local a las 12:00 del día indicado (evita líos de husos). */
export function at(date: ISODate, hour = 12, minute = 0): Date {
  const d = parseISODate(date)
  d.setHours(hour, minute, 0, 0)
  return d
}

/** Estado plano para probar selectores puros. */
export function makeState(
  days: Record<ISODate, Partial<DayLog>> = {},
  settings: Partial<Settings> = {},
  extra: Partial<MomentumData> = {},
): MomentumData {
  const base = initialData(at('2026-09-07'))
  const out: MomentumData = {
    ...base,
    ...extra,
    settings: { ...base.settings, ...settings },
    days: {},
  }
  for (const [date, patch] of Object.entries(days)) {
    out.days[date] = { ...emptyDay(date), ...patch, date }
  }
  return out
}

/** Store aislado con reloj mutable y storage en memoria. */
export function makeTestStore(today: ISODate = '2026-09-07', options: CreateStoreOptions = {}) {
  let clock = at(today)
  const store = createStore({
    now: () => clock,
    storage: createMemoryStorage(),
    name: `momentum-test-${Math.random().toString(36).slice(2)}`,
    ...options,
  })
  return Object.assign(store, {
    setNow(date: ISODate, hour = 12) {
      clock = at(date, hour)
    },
  })
}
