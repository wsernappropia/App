// Helpers locales de las pantallas (no forman parte del dominio en src/lib).
import { useCallback, useEffect, useRef, useState } from 'react'
import { todayKey } from '../lib/dates'
import { useStore } from '../lib/store'
import type { ISODate, MomentumData } from '../lib/types'

/** Estado completo del store como datos de dominio (para los selectores puros). */
export function useData(): MomentumData {
  return useStore((s) => s)
}

/**
 * Día de hoy reactivo: se recalcula al cruzar la medianoche y al volver a la app,
 * para que las pantallas no se queden mostrando el día anterior (el store escribe
 * siempre en el día real, así que si no se refresca se descuadran).
 */
export function useToday(): ISODate {
  const [day, setDay] = useState<ISODate>(() => todayKey())

  useEffect(() => {
    let timer = 0
    function refresh() {
      setDay((prev) => {
        const next = todayKey()
        return prev === next ? prev : next
      })
    }
    function schedule() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 100)
      timer = window.setTimeout(() => {
        refresh()
        schedule()
      }, Math.max(1000, midnight.getTime() - now.getTime()))
    }
    function onVisible() {
      if (document.visibilityState === 'visible') refresh()
    }
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return day
}

/**
 * Envuelve una acción para que un doble toque rápido no la ejecute dos veces
 * (registros duplicados de caminata, fuerza, check-in o revisión).
 */
export function useOnce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms = 1000,
): (...args: A) => void {
  const lastRun = useRef(0)
  return useCallback(
    (...args: A) => {
      const now = Date.now()
      if (now - lastRun.current < ms) return
      lastRun.current = now
      fn(...args)
    },
    [fn, ms],
  )
}

/** "07:32" a partir de milisegundos. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Fuerza un re-render cada `intervalMs` mientras `active` sea true. */
export function useTicker(active: boolean, intervalMs = 500): number {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTick(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])
  return tick
}

// Tipado mínimo de la Wake Lock API (no está en todos los navegadores).
interface WakeLockSentinelLike {
  release: () => Promise<void>
}
interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>
}

/** Mantiene la pantalla encendida mientras `active`. Silencioso si no hay soporte. */
export function useWakeLock(active: boolean): void {
  const sentinel = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    let cancelled = false
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock
    if (!wakeLock) return

    async function acquire() {
      try {
        const s = await wakeLock?.request('screen')
        if (!s) return
        if (cancelled) {
          void s.release().catch(() => undefined)
          return
        }
        sentinel.current = s
      } catch {
        /* sin permiso o sin soporte: no pasa nada */
      }
    }

    function release() {
      const s = sentinel.current
      sentinel.current = null
      if (s) void s.release().catch(() => undefined)
    }

    function onVisibility() {
      if (document.visibilityState === 'visible' && active && !sentinel.current) void acquire()
    }

    if (active) {
      void acquire()
      document.addEventListener('visibilitychange', onVisibility)
    } else {
      release()
    }

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      release()
    }
  }, [active])
}

/** Lee un JSON de localStorage sin lanzar. */
export function readLocal<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible */
  }
}

export function clearLocal(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Segundos de plancha según el nivel del plan: 20 s base, +5 s por nivel, tope 45 s. */
export function plankSeconds(level: number): number {
  return Math.min(45, 20 + 5 * Math.max(0, level - 1))
}

/** Escala de números para RPE/dolor. */
export function range(from: number, to: number): number[] {
  const out: number[] = []
  for (let i = from; i <= to; i++) out.push(i)
  return out
}
