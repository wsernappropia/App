// Quita el service worker de los assets del APK (android/app/src/main/assets/public).
//
// Por qué: `cap sync` copia `dist/` entero dentro del APK, y ahí va el service
// worker de la PWA (`sw.js` + `workbox-*.js`). Dentro del WebView de Capacitor
// ese service worker NO debe existir: si llega a registrarse, sirve él
// `index.html` desde su caché y el documento llega SIN el puente nativo
// (`window.androidBridge`), con lo que `isNativePlatform()` pasa a false y
// ningún plugin responde — que es justo el fallo que se veía en el APK.
//
// `src/lib/sw.ts` ya se encarga de no registrarlo y de limpiar el que hubieran
// dejado versiones anteriores. Esto es el cinturón además de los tirantes: si
// el archivo no está en el APK, no hay nada que registrar ni que servir.
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const dir = join(process.cwd(), 'android', 'app', 'src', 'main', 'assets', 'public')

// sw.js y su runtime de Workbox. El manifest de la PWA se queda: es inofensivo.
const isServiceWorkerFile = (name) => name === 'sw.js' || /^workbox-[a-f0-9]+\.js$/.test(name)

let entries
try {
  entries = await readdir(dir)
} catch {
  console.log('[strip-service-worker] no hay assets de Android todavía; nada que hacer')
  process.exit(0)
}

const removed = []
for (const name of entries) {
  if (!isServiceWorkerFile(name)) continue
  await rm(join(dir, name), { force: true })
  removed.push(name)
}

console.log(
  removed.length > 0
    ? `[strip-service-worker] fuera del APK: ${removed.join(', ')}`
    : '[strip-service-worker] no había service worker en los assets',
)
