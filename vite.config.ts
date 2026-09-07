/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages sirve la app bajo /<repo>/ ; en local es /
const base = process.env.VITE_BASE ?? '/'

// Versión visible en Ajustes y en el panel de Diagnóstico. En CI la inyecta el
// workflow de Android (`VERSION_NAME=0.1.<run_number>`, definido a nivel de job
// para que lo vean tanto `npm run build:android` como gradle); en local sale de
// package.json.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string }
const appVersion = process.env.VERSION_NAME ?? pkg.version

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // El registro lo hace SOLO `src/lib/sw.ts` (y nunca dentro del APK): con
      // `null` el plugin no inyecta ningún script de registro en index.html.
      injectRegister: null,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Momentum',
        short_name: 'Momentum',
        description: 'Hábitos de actividad física y bienestar, gamificados.',
        lang: 'es',
        theme_color: '#0f2b46',
        background_color: '#0b1a2b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
