// Caja negra mínima para el panel "Diagnóstico" de Ajustes.
//
// Los módulos nativos (`notifications.ts`, `healthConnect.ts`, `sw.ts`) guardan
// aquí el último error de cada área en sus `catch`, en lugar de dejarlo sólo en
// la consola (que en el APK nadie puede leer). Ajustes lo muestra y permite
// copiarlo, así el usuario puede pegar el motivo real de un fallo.
//
// Es un módulo puro y sin dependencias: no toca el DOM, ni Capacitor, ni el store.

export type DiagnosticArea = 'notifications' | 'health' | 'sw' | 'native'

export interface DiagnosticError {
  /** Momento en que se registró (epoch ms). */
  at: number
  /** Qué se estaba haciendo: 'requestPermissions', 'isAvailable'… */
  context: string
  /** Mensaje legible del error. */
  message: string
}

/** Convierte cualquier cosa lanzada (Error, string, objeto del plugin…) en texto. */
export function errorMessage(err: unknown): string {
  if (err == null) return 'error desconocido'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message || err.name
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>
    const message = obj.message ?? obj.errorMessage ?? obj.error
    if (typeof message === 'string' && message) return message
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  return String(err)
}

const lastErrors: Record<DiagnosticArea, DiagnosticError | null> = {
  notifications: null,
  health: null,
  sw: null,
  native: null,
}

/** Guarda el último error de un área (y lo deja también en la consola). */
export function recordError(area: DiagnosticArea, context: string, err: unknown): DiagnosticError {
  const entry: DiagnosticError = { at: Date.now(), context, message: errorMessage(err) }
  lastErrors[area] = entry
  // También va al registro global: así el panel muestra la SECUENCIA de fallos
  // (p. ej. tres timeouts seguidos) y no sólo el último de cada área.
  pushGlobalError(`${area}/${context}`, entry.message)
  console.warn(`[${area}] ${context}: ${entry.message}`, err)
  return entry
}

/** Último error registrado en un área, o null si no hubo ninguno. */
export function getLastError(area: DiagnosticArea): DiagnosticError | null {
  return lastErrors[area]
}

/** Limpia el último error de un área (tras una operación correcta). */
export function clearError(area: DiagnosticArea): void {
  lastErrors[area] = null
}

/** Sólo para tests: vacía la caja negra. */
export function resetDiagnostics(): void {
  lastErrors.notifications = null
  lastErrors.health = null
  lastErrors.sw = null
  lastErrors.native = null
  globalErrors.length = 0
  installed = false
}

/** "hace 3 min", para pintar la antigüedad de un error. */
export function formatErrorLine(entry: DiagnosticError | null): string {
  if (!entry) return 'ninguno'
  const when = new Date(entry.at)
  const hh = String(when.getHours()).padStart(2, '0')
  const mm = String(when.getMinutes()).padStart(2, '0')
  return `${hh}:${mm} · ${entry.context}: ${entry.message}`
}

// ------------------------------------------------- registro global de errores
//
// En el APK no hay consola que mirar: un error de JavaScript (un chunk que no
// carga, una promesa rechazada sin `catch`) simplemente deja la pantalla a
// medias. Aquí se guardan los últimos 30, y el panel de Diagnóstico los enseña.

/** Cuántos errores se conservan (los más recientes). */
export const MAX_GLOBAL_ERRORS = 30

export interface GlobalErrorEntry {
  at: number
  /** De dónde vino: 'window.onerror', 'unhandledrejection', 'health/isAvailable'… */
  source: string
  message: string
}

const globalErrors: GlobalErrorEntry[] = []

/** Añade una entrada al registro global (descarta la más antigua si se llena). */
export function pushGlobalError(source: string, message: string): GlobalErrorEntry {
  const entry: GlobalErrorEntry = { at: Date.now(), source, message }
  globalErrors.push(entry)
  if (globalErrors.length > MAX_GLOBAL_ERRORS) globalErrors.splice(0, globalErrors.length - MAX_GLOBAL_ERRORS)
  return entry
}

/** Los últimos errores capturados, del más antiguo al más reciente. */
export function getGlobalErrors(): readonly GlobalErrorEntry[] {
  return globalErrors
}

/** "12:03 · unhandledrejection: timeout: isAvailable" */
export function formatGlobalError(entry: GlobalErrorEntry): string {
  const when = new Date(entry.at)
  const hh = String(when.getHours()).padStart(2, '0')
  const mm = String(when.getMinutes()).padStart(2, '0')
  const ss = String(when.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss} · ${entry.source}: ${entry.message}`
}

let installed = false

/**
 * Engancha `error` y `unhandledrejection` del documento. Se llama lo antes
 * posible en `main.tsx` para no perderse los fallos del arranque.
 * Idempotente: llamarla dos veces no duplica los listeners.
 */
export function installGlobalErrorLog(target: Pick<Window, 'addEventListener'> | undefined = typeof window !== 'undefined' ? window : undefined): void {
  if (installed || !target) return
  installed = true

  target.addEventListener('error', (event: Event) => {
    const e = event as ErrorEvent
    const where = e.filename ? ` (${e.filename}:${e.lineno ?? 0})` : ''
    pushGlobalError('window.onerror', `${errorMessage(e.error ?? e.message)}${where}`)
  })

  target.addEventListener('unhandledrejection', (event: Event) => {
    const e = event as PromiseRejectionEvent
    pushGlobalError('unhandledrejection', errorMessage(e.reason))
  })
}
