import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDiagnostics } from './diagnostics'
import {
  PENDING_VALUE,
  PROBES,
  pendingProbeLines,
  reportToText,
  runProbe,
  runProbes,
  syncFacts,
} from './deviceReport'

beforeEach(() => {
  resetDiagnostics()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('syncFacts', () => {
  it('devuelve todas las líneas sin esperar a ninguna promesa', () => {
    const lines = syncFacts()
    const keys = lines.map((l) => l.key)
    expect(keys).toContain('version')
    expect(keys).toContain('platform')
    expect(keys).toContain('native')
    expect(keys).toContain('bridge')
    expect(keys).toContain('headers')
    expect(keys).toContain('plugin-app')
    expect(keys).toContain('plugin-ln')
    expect(keys).toContain('plugin-health')
    expect(lines.every((l) => l.status === 'sync')).toBe(true)
    // Ninguna línea puede quedar vacía: siempre hay algo que leer.
    expect(lines.every((l) => l.value.length > 0)).toBe(true)
  })
})

describe('sondas', () => {
  it('arrancan en "pendiente" y hay una de control del puente', () => {
    const pending = pendingProbeLines()
    expect(pending).toHaveLength(PROBES.length)
    expect(pending.every((l) => l.status === 'pending' && l.value === PENDING_VALUE)).toBe(true)
    expect(PROBES.map((p) => p.key)).toContain('probe-app')
  })

  it('una sonda colgada se rinde con "timeout" en lugar de bloquear', async () => {
    vi.useFakeTimers()
    try {
      const probe = { key: 'x', label: 'colgada', run: () => new Promise<string>(() => {}) }
      const result = runProbe(probe)
      await vi.advanceTimersByTimeAsync(5_000)
      await expect(result).resolves.toMatchObject({ status: 'failed', value: 'timeout: colgada' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('una sonda que lanza no tumba a la línea: queda como error', async () => {
    const probe = { key: 'x', label: 'rota', run: () => Promise.reject(new Error('boom')) }
    await expect(runProbe(probe)).resolves.toMatchObject({ status: 'failed', value: 'boom' })
  })

  it('runProbes resuelve todas las sondas reales fuera de la app nativa', async () => {
    const seen: string[] = []
    const lines = await runProbes((line) => seen.push(line.key))
    expect(lines).toHaveLength(PROBES.length)
    expect(seen.sort()).toEqual(PROBES.map((p) => p.key).sort())
    expect(lines.every((l) => l.status !== 'pending')).toBe(true)
  })
})

describe('reportToText', () => {
  it('mete las líneas y el registro de errores', () => {
    const text = reportToText(
      [{ key: 'a', label: 'Plataforma', value: 'web', status: 'sync' }],
      [{ at: Date.now(), source: 'unhandledrejection', message: 'timeout: isAvailable' }],
    )
    expect(text).toContain('Momentum · diagnóstico')
    expect(text).toContain('Plataforma: web')
    expect(text).toContain('Errores capturados (1)')
    expect(text).toContain('unhandledrejection: timeout: isAvailable')
  })

  it('dice "ninguno" cuando no hubo errores', () => {
    expect(reportToText([], [])).toContain('ninguno')
  })
})
