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
}

/** "hace 3 min", para pintar la antigüedad de un error. */
export function formatErrorLine(entry: DiagnosticError | null): string {
  if (!entry) return 'ninguno'
  const when = new Date(entry.at)
  const hh = String(when.getHours()).padStart(2, '0')
  const mm = String(when.getMinutes()).padStart(2, '0')
  return `${hh}:${mm} · ${entry.context}: ${entry.message}`
}
