// Integraciones con el contenedor nativo de Android (Capacitor).
//
// En la web (PWA o navegador) esto es un no-op: `isNativePlatform()` devuelve
// false y no se llama a ningún plugin.
//
// Los plugins se importan de forma ESTÁTICA (antes era `import()` dinámico): un
// chunk que no llega dentro del WebView deja la promesa colgada para siempre y
// el arranque nativo a medias — sin barra de estado, sin botón atrás y con el
// splash pegado. Importar el módulo no llama a nada nativo (`registerPlugin` es
// perezoso), así que en la web sigue sin pasar nada. Y cada paso lleva timeout.
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { NATIVE_TIMEOUT_MS, withTimeout } from './async'
import { recordError } from './diagnostics'
import { useNav } from './nav'

/** ¿Existe el puente nativo de Capacitor en este documento? */
function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/**
 * Ejecuta un paso de la inicialización nativa sin dejar que tumbe a los demás:
 * si tarda más de 8 s se da por perdido y queda anotado en Diagnóstico.
 */
async function step(name: string, run: () => Promise<void>): Promise<void> {
  try {
    await withTimeout(run(), NATIVE_TIMEOUT_MS, `initNative/${name}`)
  } catch (err) {
    recordError('native', `initNative/${name}`, err)
  }
}

export async function initNative(): Promise<void> {
  // Si el puente nativo no está (web, o WebView sin inyectar), no hay nada que
  // hacer: nunca se llama a un plugin ni se rompe el arranque.
  if (!isNative()) return

  // Cada bloque va por separado a propósito: que falle la barra de estado no
  // puede dejar la app sin botón atrás ni con el splash pegado.
  await step('status-bar', async () => {
    // La barra de estado se pinta del navy del header y NO se superpone al
    // WebView, para que no tape el título de cada pantalla.
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setBackgroundColor({ color: '#0f2b46' })
    await StatusBar.setStyle({ style: Style.Dark }) // texto claro sobre fondo oscuro
  })

  // El botón atrás de Android navega dentro de la app (igual que el botón atrás
  // de las pantallas hijas). Solo cierra la app si ya no hay a dónde volver.
  // Se re-registra en cada carga del documento, así que sigue funcionando tras
  // la recarga que hace la limpieza del service worker (src/lib/sw.ts).
  await step('back-button', async () => {
    await App.addListener('backButton', () => {
      const { history, back } = useNav.getState()
      if (history.length > 0) back()
      else void App.exitApp()
    })
  })

  // El splash también se auto-oculta a los 800 ms (capacitor.config.ts); esto lo
  // quita antes si la app ya está lista.
  await step('splash', async () => {
    await SplashScreen.hide()
  })
}
