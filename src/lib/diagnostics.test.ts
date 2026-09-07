import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearError,
  errorMessage,
  formatErrorLine,
  getLastError,
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
