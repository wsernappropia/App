// Utilidades de asincronía compartidas por la capa nativa.
//
// Por qué existe: dentro del WebView de Android una llamada al puente de
// Capacitor puede quedarse colgada para siempre (plugin no registrado, diálogo
// del sistema que nunca devuelve el control, puente a medio inyectar…). Una
// promesa que nunca resuelve deja la UI en "…" sin explicación y, si se hace
// `Promise.all`, tumba TODO el diagnóstico. Aquí se les pone un límite.
//
// Módulo puro: no toca el DOM, ni Capacitor, ni el store.

/** Error con el que rechaza `withTimeout`. */
export class TimeoutError extends Error {
  readonly label: string

  constructor(label: string) {
    super(`timeout: ${label}`)
    this.name = 'TimeoutError'
    this.label = label
  }
}

/** ¿Este error viene de un `withTimeout`? */
export function isTimeoutError(err: unknown): err is TimeoutError {
  if (err instanceof TimeoutError) return true
  // Tras pasar por un `catch` que sólo guardó el mensaje seguimos reconociéndolo.
  return err instanceof Error && err.message.startsWith('timeout: ')
}

/**
 * Igual que `promise`, pero rechaza con `Error("timeout: <label>")` si tarda
 * más de `ms`. La promesa original sigue su curso (no se puede cancelar), pero
 * ya no bloquea a quien esperaba.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label)), ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/** 8 s: cualquier llamada nativa que no abra un diálogo del sistema. */
export const NATIVE_TIMEOUT_MS = 8_000

/**
 * 120 s: `requestPermissions` / `requestAuthorization` abren un diálogo de
 * Android y no devuelven hasta que la persona responde.
 */
export const PERMISSION_TIMEOUT_MS = 120_000

/** 5 s: sondas del panel de Diagnóstico (tienen que responder rápido o rendirse). */
export const PROBE_TIMEOUT_MS = 5_000
