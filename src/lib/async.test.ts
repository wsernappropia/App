import { describe, expect, it, vi } from 'vitest'
import { TimeoutError, isTimeoutError, withTimeout } from './async'

describe('withTimeout', () => {
  it('devuelve el valor si la promesa resuelve a tiempo', async () => {
    await expect(withTimeout(Promise.resolve(7), 50, 'ok')).resolves.toBe(7)
  })

  it('propaga el error original si la promesa falla a tiempo', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 50, 'ok')).rejects.toThrow('boom')
  })

  it('rechaza con "timeout: <label>" si la promesa nunca resuelve', async () => {
    vi.useFakeTimers()
    try {
      const pending = withTimeout(new Promise(() => {}), 1000, 'checkPermissions')
      const assertion = expect(pending).rejects.toThrow('timeout: checkPermissions')
      await vi.advanceTimersByTimeAsync(1000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('no deja el temporizador vivo cuando resuelve antes', async () => {
    vi.useFakeTimers()
    try {
      await expect(withTimeout(Promise.resolve('ya'), 10_000, 'x')).resolves.toBe('ya')
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('isTimeoutError', () => {
  it('reconoce el error propio y el reconstruido desde su mensaje', () => {
    expect(isTimeoutError(new TimeoutError('isAvailable'))).toBe(true)
    expect(isTimeoutError(new Error('timeout: isAvailable'))).toBe(true)
    expect(isTimeoutError(new Error('otra cosa'))).toBe(false)
    expect(isTimeoutError('timeout: texto')).toBe(false)
  })
})
