import type { CapacitorConfig } from '@capacitor/cli'

// Envoltorio nativo de la PWA. El contenido web se copia desde `dist/`
// (el mismo build de Vite que se publica en GitHub Pages, pero con base `/`).
const config: CapacitorConfig = {
  appId: 'com.momentum.habits',
  appName: 'Momentum',
  webDir: 'dist',
  android: {
    // La app es 100 % local: nada de cargar http:// dentro del WebView https.
    allowMixedContent: false,
    // Depuración remota del WebView por USB (chrome://inspect). Es una app
    // personal que se instala por sideload, no hay secretos que proteger, y sin
    // esto no hay forma de ver la consola del APK en un móvil real. Ver README.
    webContentsDebuggingEnabled: true,
  },
  backgroundColor: '#0b1a2b',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#0b1a2b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    LocalNotifications: {
      // Icono monocromo de la barra de estado (res/drawable/ic_stat_momentum.xml)
      // y color de acento. Cada notificación lo repite por si acaso.
      smallIcon: 'ic_stat_momentum',
      iconColor: '#14b8a6',
    },
    StatusBar: {
      // Navy del header: la barra de estado se funde con él, sin taparlo.
      backgroundColor: '#0f2b46',
      style: 'DARK',
      overlaysWebView: false,
    },
  },
}

export default config
