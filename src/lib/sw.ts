// Service worker: SÓLO en la web (PWA/navegador). Nunca dentro del APK.
//
// Por qué: en Android el WebView de Capacitor sirve la app desde su servidor
// local (https://localhost) y es ese servidor —o la inyección por origen del
// WebView— quien mete el puente nativo (`window.androidBridge` + native-bridge.js)
// en el documento. Si un service worker de Workbox precachea `index.html` y lo
// sirve él en las siguientes aperturas, el documento puede llegar SIN el puente:
// `Capacitor.isNativePlatform()` pasa a ser false, los plugins dejan de existir y
// la UI muestra Recordatorios y Health Connect como si fuera la web (controles
// desactivados). La propia documentación de Capacitor lo dice: los service
// workers impiden la inyección del código de Capacitor y sus plugins.
//
// Además de no registrarlo, hay que LIMPIAR el que dejaron las versiones
// anteriores del APK (v0.1.4 y anteriores sí lo registraban): desregistrar,
// borrar sus caches y recargar UNA vez para que el documento vuelva a servirlo
// el servidor local con el puente dentro.
import { Capacitor } from '@capacitor/core'
import { recordError } from './diagnostics'

/** Marca en sessionStorage para no entrar en un bucle de recargas. */
export const RELOAD_FLAG = 'momentum:sw-cleanup'

/** Lo mínimo que hace falta saber del entorno para decidir. */
export interface SwEnvironment {
  /** `Capacitor.isNativePlatform()` — no fiable si el HTML viene del caché. */
  native: boolean
  /** `location.protocol` ("https:") */
  protocol: string
  /** `location.hostname` ("localhost") */
  hostname: string
}

/**
 * ¿Estamos dentro del WebView de Capacitor?
 *
 * A propósito NO se confía sólo en `isNativePlatform()`: cuando el bug se ha
 * producido, eso ya devuelve false y nunca limpiaríamos el service worker que lo
 * causa. El segundo criterio es el origen del WebView de Android: Capacitor 8
 * usa `androidScheme: 'https'` y `hostname: 'localhost'` por defecto
 * (CapConfig.java: `hostname = "localhost"`, `androidScheme = CAPACITOR_HTTPS_SCHEME`),
 * es decir `https://localhost`. Un navegador de escritorio en desarrollo usa
 * `http://localhost`, así que no colisiona; y el userAgent no se usa porque en
 * Android es el de Chrome normal.
 */
export function isCapacitorEnvironment(env: SwEnvironment): boolean {
  if (env.native) return true
  return env.protocol === 'https:' && env.hostname === 'localhost'
}

/** En la web sí; dentro del WebView de Capacitor nunca. */
export function shouldRegisterServiceWorker(env: SwEnvironment): boolean {
  return !isCapacitorEnvironment(env)
}

/** Entorno real del navegador actual. */
export function currentEnvironment(): SwEnvironment {
  let native = false
  try {
    native = Capacitor.isNativePlatform()
  } catch {
    native = false
  }
  return {
    native,
    protocol: typeof location !== 'undefined' ? location.protocol : '',
    hostname: typeof location !== 'undefined' ? location.hostname : '',
  }
}

export interface CleanupResult {
  /** Había un service worker controlando este documento. */
  hadController: boolean
  /** Registros desregistrados. */
  unregistered: number
  /** Caches (Cache Storage) borradas. */
  cachesDeleted: number
}

/**
 * Desregistra todos los service workers y borra todas las caches.
 * Nunca lanza: cualquier fallo se anota en `diagnostics`.
 */
export async function cleanupServiceWorkers(): Promise<CleanupResult> {
  const result: CleanupResult = { hadController: false, unregistered: 0, cachesDeleted: 0 }
  if (typeof navigator === 'undefined') return result

  if ('serviceWorker' in navigator) {
    result.hadController = !!navigator.serviceWorker.controller
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        if (await registration.unregister()) result.unregistered += 1
      }
    } catch (err) {
      recordError('sw', 'unregister', err)
    }
  }

  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys()
      for (const key of keys) {
        if (await caches.delete(key)) result.cachesDeleted += 1
      }
    } catch (err) {
      recordError('sw', 'caches.delete', err)
    }
  }

  return result
}

/** ¿Hay que recargar tras la limpieza? Sólo si algo se limpió y no se recargó ya. */
export function shouldReloadAfterCleanup(result: CleanupResult, alreadyReloaded: boolean): boolean {
  if (alreadyReloaded) return false
  return result.hadController || result.unregistered > 0 || result.cachesDeleted > 0
}

function readFlag(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) === '1'
  } catch {
    // sessionStorage puede fallar (modo privado): mejor no recargar que recargar en bucle.
    return true
  }
}

function writeFlag(): void {
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    /* si no se puede marcar, no se recarga */
  }
}

/**
 * Punto de entrada llamado desde `main.tsx`.
 * - Web/PWA: registra el service worker como siempre.
 * - Capacitor: no registra nada, limpia lo que hubiera y recarga una sola vez.
 */
export function setupServiceWorker(env: SwEnvironment = currentEnvironment()): void {
  if (shouldRegisterServiceWorker(env)) {
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({ immediate: true })
      })
      .catch((err) => {
        recordError('sw', 'registerSW', err)
      })
    return
  }

  void (async () => {
    const alreadyReloaded = readFlag()
    const result = await cleanupServiceWorkers()
    if (shouldReloadAfterCleanup(result, alreadyReloaded)) {
      writeFlag()
      // El documento actual lo sirvió el service worker (sin puente nativo):
      // una recarga lo pide de nuevo al servidor local de Capacitor.
      location.reload()
    }
  })()
}
