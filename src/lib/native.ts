// Integraciones con el contenedor nativo de Android (Capacitor).
//
// En la web (PWA o navegador) esto es un no-op: `isNativePlatform()` devuelve false
// y los plugins ni siquiera se importan, así que el bundle web no crece ni se rompe
// si Capacitor no está presente.
import { Capacitor } from '@capacitor/core'
import { useNav } from './nav'

export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
      import('@capacitor/app'),
    ])

    // La barra de estado se pinta del navy del header y NO se superpone al WebView,
    // para que no tape el título de cada pantalla.
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setBackgroundColor({ color: '#0f2b46' })
    await StatusBar.setStyle({ style: Style.Dark }) // texto claro sobre fondo oscuro

    // El botón atrás de Android navega dentro de la app (igual que el botón atrás
    // de las pantallas hijas). Solo cierra la app si ya no hay a dónde volver.
    await App.addListener('backButton', () => {
      const { history, back } = useNav.getState()
      if (history.length > 0) back()
      else void App.exitApp()
    })

    // El splash también se auto-oculta a los 800 ms (capacitor.config.ts); esto lo
    // quita antes si la app ya está lista.
    await SplashScreen.hide()
  } catch (err) {
    // Nunca dejamos que un fallo de un plugin nativo impida arrancar la app.
    console.error('[native] no se pudo inicializar Capacitor', err)
  }
}
