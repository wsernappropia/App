import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  IconPause,
  IconPlay,
  IconWalk,
  ProgressRing,
  Screen,
  SegmentedControl,
  Sheet,
  Stepper,
  useToast,
} from '../components'
import { PACE_LABEL } from '../lib/copy'
import { xpLabel } from '../lib/gamification'
import { useNav } from '../lib/nav'
import { useStore } from '../lib/store'
import type { Pace } from '../lib/types'
import { clearLocal, formatClock, readLocal, useTicker, useWakeLock, writeLocal } from './_shared'

export const ACTIVE_WALK_KEY = 'momentum-walk-active'

/** Sesión en curso persistida: el tiempo se calcula con timestamps, nunca con contadores. */
interface ActiveWalk {
  /** Momento del último "play"; null si está en pausa. */
  runningSince: number | null
  /** Milisegundos acumulados en tramos ya cerrados. */
  accumulatedMs: number
  /** Cuándo empezó la caminata (para `logWalk`). */
  startedAt: number
  goalMinutes: number
}

function isActiveWalk(value: unknown): value is ActiveWalk {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (typeof v.runningSince === 'number' || v.runningSince === null) &&
    typeof v.accumulatedMs === 'number' &&
    typeof v.startedAt === 'number' &&
    typeof v.goalMinutes === 'number'
  )
}

const PACE_OPTIONS: { label: string; value: Pace }[] = [
  { label: PACE_LABEL.suave, value: 'suave' },
  { label: PACE_LABEL.moderado, value: 'moderado' },
  { label: PACE_LABEL.rapido, value: 'rapido' },
]

function elapsedOf(walk: ActiveWalk, now: number): number {
  return walk.accumulatedMs + (walk.runningSince !== null ? Math.max(0, now - walk.runningSince) : 0)
}

export default function Walk() {
  const back = useNav((s) => s.back)
  const toast = useToast()
  const logWalk = useStore((s) => s.logWalk)
  const planMinutes = useStore((s) => s.plan.walkMinutes)

  const [walk, setWalk] = useState<ActiveWalk | null>(() =>
    readLocal(ACTIVE_WALK_KEY, isActiveWalk),
  )
  const [goalMinutes, setGoalMinutes] = useState<number>(
    () => readLocal(ACTIVE_WALK_KEY, isActiveWalk)?.goalMinutes ?? planMinutes,
  )
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [pace, setPace] = useState<Pace>('moderado')
  const [manualMinutes, setManualMinutes] = useState(planMinutes)
  const [manualPace, setManualPace] = useState<Pace>('moderado')

  const running = walk?.runningSince != null
  const tick = useTicker(running, 250)
  useWakeLock(running)

  const elapsedMs = walk ? elapsedOf(walk, running ? tick : Date.now()) : 0
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const goalMs = Math.max(1, goalMinutes) * 60000

  const persist = useCallback((next: ActiveWalk | null) => {
    setWalk(next)
    if (next) writeLocal(ACTIVE_WALK_KEY, next)
    else clearLocal(ACTIVE_WALK_KEY)
  }, [])

  // Al volver a la pestaña, refrescamos el reloj aunque el intervalo se haya congelado.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') setWalk((w) => (w ? { ...w } : w))
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  function start() {
    const now = Date.now()
    persist({ runningSince: now, accumulatedMs: 0, startedAt: now, goalMinutes })
  }

  function pause() {
    if (!walk || walk.runningSince === null) return
    persist({
      ...walk,
      accumulatedMs: elapsedOf(walk, Date.now()),
      runningSince: null,
    })
  }

  function resume() {
    if (!walk) return
    persist({ ...walk, runningSince: Date.now() })
  }

  function finish() {
    pause()
    if (elapsedMinutes < 1) {
      setDiscardOpen(true)
      return
    }
    setFinishOpen(true)
  }

  function save(minutes: number, selectedPace: Pace, startedAt?: number) {
    const xp = logWalk(minutes, selectedPace, startedAt)
    persist(null)
    setFinishOpen(false)
    toast.show(`${xpLabel(xp)} · ${minutes} min`)
    back()
  }

  function changeGoal(minutes: number) {
    setGoalMinutes(minutes)
    if (walk) persist({ ...walk, goalMinutes: minutes })
  }

  return (
    <Screen title="Caminata" subtitle={`Objetivo: ${goalMinutes} min`} back onBack={back}>
      <Card tone="default" className="flex flex-col items-center">
        <ProgressRing value={elapsedMs / goalMs} size={220} stroke={16}>
          <div className="flex flex-col items-center">
            <span className="font-mono text-[44px] font-extrabold leading-none text-white tabular-nums">
              {formatClock(elapsedMs)}
            </span>
            <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/50">
              {walk ? (running ? 'En marcha' : 'En pausa') : `Objetivo ${goalMinutes} min`}
            </span>
          </div>
        </ProgressRing>

        <div className="mt-5 w-full">
          {!walk && (
            <>
              <Button size="xl" block onClick={start}>
                <IconPlay size={20} />
                Iniciar caminata
              </Button>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => changeGoal(5)}
                  disabled={goalMinutes === 5}
                >
                  Solo 5 min
                </Button>
                <Stepper
                  value={goalMinutes}
                  onChange={changeGoal}
                  min={5}
                  max={120}
                  step={5}
                  suffix=" min"
                />
              </div>
            </>
          )}

          {walk && (
            <div className="flex flex-col gap-3">
              {running ? (
                <Button size="xl" block variant="secondary" onClick={pause}>
                  <IconPause size={20} />
                  Pausar
                </Button>
              ) : (
                <Button size="xl" block onClick={resume}>
                  <IconPlay size={20} />
                  Reanudar
                </Button>
              )}
              <Button size="lg" block variant="ghost" onClick={finish}>
                Terminar
              </Button>
            </div>
          )}
        </div>
      </Card>

      {walk && (
        <p className="mt-3 text-center text-xs text-white/45">
          El tiempo sigue corriendo aunque bloquees la pantalla o cierres la app.
        </p>
      )}

      {/* Registro manual de caminatas ya hechas */}
      <Card className="mt-4">
        <h2 className="text-sm font-extrabold text-white">Registrar manualmente</h2>
        <p className="mt-1 text-xs text-white/50">¿Ya caminaste? Apúntalo sin cronómetro.</p>
        <div className="mt-3 rounded-2xl bg-white/5 p-3">
          <Stepper
            label="Minutos"
            value={manualMinutes}
            onChange={setManualMinutes}
            min={1}
            max={240}
            step={5}
            suffix=" min"
          />
        </div>
        <div className="mt-3">
          <SegmentedControl options={PACE_OPTIONS} value={manualPace} onChange={setManualPace} />
        </div>
        <Button
          className="mt-3"
          size="lg"
          block
          variant="secondary"
          onClick={() => save(manualMinutes, manualPace)}
        >
          <IconWalk size={18} />
          Registrar {manualMinutes} min
        </Button>
      </Card>

      {/* Ritmo percibido al terminar */}
      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="¿Cómo fue el ritmo?">
        <p className="text-sm text-white/60">
          {elapsedMinutes} min caminados. Elige el ritmo percibido.
        </p>
        <div className="mt-4">
          <SegmentedControl options={PACE_OPTIONS} value={pace} onChange={setPace} />
        </div>
        <Button
          className="mt-4"
          size="lg"
          block
          onClick={() => save(elapsedMinutes, pace, walk?.startedAt)}
        >
          Guardar caminata
        </Button>
      </Sheet>

      {/* Menos de 1 minuto: descartar */}
      <Sheet open={discardOpen} onClose={() => setDiscardOpen(false)} title="Muy corta para contar">
        <p className="text-sm text-white/60">
          Llevas menos de un minuto. Puedes seguir caminando o descartar esta sesión.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="lg"
            block
            onClick={() => {
              setDiscardOpen(false)
              resume()
            }}
          >
            Seguir caminando
          </Button>
          <Button
            size="lg"
            block
            variant="danger"
            onClick={() => {
              persist(null)
              setDiscardOpen(false)
              back()
            }}
          >
            Descartar
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}
