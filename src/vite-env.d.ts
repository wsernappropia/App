/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Versión de la app, inyectada por Vite (`define` en vite.config.ts).
 * Sale de `VERSION_NAME` en CI y de `package.json` en local.
 */
declare const __APP_VERSION__: string

/**
 * Objeto que el WebView de Android inyecta para hablar con la capa nativa.
 * Si `window.androidBridge` no existe dentro del APK, Capacitor no se ha
 * inyectado en el documento (típicamente porque lo sirvió un service worker):
 * ningún plugin funcionará. El panel de Diagnóstico lo muestra.
 */
interface AndroidBridge {
  postMessage?: (message: string) => void
}

interface Window {
  androidBridge?: AndroidBridge
}
