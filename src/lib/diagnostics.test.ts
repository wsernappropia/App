import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_GLOBAL_ERRORS,
  clearError,
  errorMessage,
  formatErrorLine,
  formatGlobalError,
  getGlobalErrors,
  getLastError,
  installGlobalErrorLog,
  pushGlobalError,
  recordError,
  resetDiagnostics,
} from './diagnostics'

beforeEach(() => {
  resetDiagnostics()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('errorMessage', () => {
  it('saca texto de lo que sea que lance un plugin', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('texto plano')).toBe('texto plano')
    expect(errorMessage({ message: 'del plugin' })).toBe('del plugin')
    expect(errorMessage({ errorMessage: 'Health Connect no instalado' })).toBe(
      'Health Connect no instalado',
    )
    expect(errorMessage({ code: 'UNAVAILABLE' })).toBe('{"code":"UNAVAILABLE"}')
    expect(errorMessage(null)).toBe('error desconocido')
  })
})

describe('recordError', () => {
  it('guarda el último error por área y lo puede limpiar', () => {
    expect(getLastError('health')).toBeNull()
    recordError('health', 'isAvailable', new Error('sin Health Connect'))
    expect(getLastError('health')?.message).toBe('sin Health Connect')
    expect(getLastError('notifications')).toBeNull()
    clearError('health')
    expect(getLastError('health')).toBeNull()
  })
})

describe('formatErrorLine', () => {
  it('describe el error con su contexto', () => {
    const entry = recordError('notifications', 'requestPermissions', new Error('denegado'))
    expect(formatErrorLine(entry)).toContain('requestPermissions: denegado')
    expect(formatErrorLine(null)).toBe('ninguno')
  })
})

describe('registro global de errores', () => {
  it('recordError también deja rastro en el registro global', () => {
    recordError('health', 'isAvailable', new Error('timeout: isAvailable'))
    const errors = getGlobalErrors()
    expect(errors).toHaveLength(1)
    expect(errors[0].source).toBe('health/isAvailable')
    expect(formatGlobalError(errors[0])).toContain('timeout: isAvailable')
  })

  it('conserva sólo los últimos 30', () => {
    for (let i = 0; i < 35; i += 1) pushGlobalError('test', `error ${i}`)
    const errors = getGlobalErrors()
    expect(errors).toHaveLength(MAX_GLOBAL_ERRORS)
    expect(errors[0].message).toBe('error 5')
    expect(errors[errors.length - 1].message).toBe('error 34')
  })

  it('installGlobalErrorLog engancha error y unhandledrejection una sola vez', () => {
    const listeners = new Map<string, (e: Event) => void>()
    const target = {
      addEventListener: (type: string, fn: EventListenerOrEventListenerObject) => {
        listeners.set(type, fn as (e: Event) => void)
      },
    }
    installGlobalErrorLog(target as unknown as Window)
    installGlobalErrorLog(target as unknown as Window) // idempotente
    expect(listeners.size).toBe(2)

    listeners.get('error')?.({
      error: new Error('chunk no cargado'),
      filename: 'index.js',
      lineno: 3,
    } as unknown as Event)
    listeners.get('unhandledrejection')?.({
      reason: new Error('timeout: checkPermissions'),
    } as unknown as Event)

    const errors = getGlobalErrors()
    expect(errors).toHaveLength(2)
    expect(errors[0].message).toContain('chunk no cargado (index.js:3)')
    expect(errors[1].source).toBe('unhandledrejection')
  })
})
