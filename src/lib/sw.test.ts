import { describe, expect, it } from 'vitest'
import { isCapacitorEnvironment, shouldRegisterServiceWorker, shouldReloadAfterCleanup } from './sw'
import type { CleanupResult, SwEnvironment } from './sw'

const env = (over: Partial<SwEnvironment> = {}): SwEnvironment => ({
  native: false,
  protocol: 'https:',
  hostname: 'wsernappropia.github.io',
  ...over,
})

const cleanup = (over: Partial<CleanupResult> = {}): CleanupResult => ({
  hadController: false,
  unregistered: 0,
  cachesDeleted: 0,
  ...over,
})

describe('isCapacitorEnvironment', () => {
  it('detecta el WebView por isNativePlatform()', () => {
    expect(isCapacitorEnvironment(env({ native: true }))).toBe(true)
  })

  it('detecta el WebView por su origen aunque el puente no exista', () => {
    // Éste es el caso del bug: el HTML lo sirvió el service worker, no hay
    // puente nativo y isNativePlatform() ya devuelve false.
    expect(
      isCapacitorEnvironment(env({ native: false, protocol: 'https:', hostname: 'localhost' })),
    ).toBe(true)
  })

  it('no confunde la PWA publicada ni el dev server', () => {
    expect(isCapacitorEnvironment(env())).toBe(false)
    expect(isCapacitorEnvironment(env({ protocol: 'http:', hostname: 'localhost' }))).toBe(false)
    expect(isCapacitorEnvironment(env({ protocol: 'http:', hostname: '127.0.0.1' }))).toBe(false)
  })
})

describe('shouldRegisterServiceWorker', () => {
  it('registra en la web y nunca en Capacitor', () => {
    expect(shouldRegisterServiceWorker(env())).toBe(true)
    expect(shouldRegisterServiceWorker(env({ native: true }))).toBe(false)
    expect(shouldRegisterServiceWorker(env({ hostname: 'localhost' }))).toBe(false)
  })
})

describe('shouldReloadAfterCleanup', () => {
  it('recarga si el documento venía de un service worker', () => {
    expect(shouldReloadAfterCleanup(cleanup({ hadController: true }), false)).toBe(true)
  })

  it('recarga si se desregistró algo o se borraron caches', () => {
    expect(shouldReloadAfterCleanup(cleanup({ unregistered: 1 }), false)).toBe(true)
    expect(shouldReloadAfterCleanup(cleanup({ cachesDeleted: 2 }), false)).toBe(true)
  })

  it('no recarga si no había nada que limpiar', () => {
    expect(shouldReloadAfterCleanup(cleanup(), false)).toBe(false)
  })

  it('no recarga dos veces (marca de sessionStorage)', () => {
    expect(shouldReloadAfterCleanup(cleanup({ hadController: true, unregistered: 1 }), true)).toBe(
      false,
    )
  })
})
