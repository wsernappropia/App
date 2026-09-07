import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initNative } from './lib/native'
import { setupServiceWorker } from './lib/sw'
import './index.css'

// Service worker SÓLO en la web: dentro del APK rompe el puente nativo de
// Capacitor (ver src/lib/sw.ts). Ahí, además, limpia el que dejaron versiones
// anteriores y recarga una vez.
setupServiceWorker()

// Status bar, splash y botón atrás de Android; no hace nada en la web.
void initNative()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
