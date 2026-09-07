/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Versión de la app, inyectada por Vite (`define` en vite.config.ts).
 * Sale de `VERSION_NAME` en CI y de `package.json` en local.
 */
declare const __APP_VERSION__: string
