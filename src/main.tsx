import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initNative } from './lib/native'
import './index.css'

registerSW({ immediate: true })

// Status bar, splash y botón atrás de Android; no hace nada en la web.
void initNative()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
