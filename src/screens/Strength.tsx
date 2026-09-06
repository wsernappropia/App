import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  IconCheck,
  IconDumbbell,
  ProgressBar,
  Screen,
  Sheet,
  useToast,
} from '../components'
import { HARD_SESSION } from '../lib/copy'
import { xpLabel } from '../lib/gamification'
import { useNav } from '../lib/nav'
import { useStore } from '../lib/store'
import { formatClock, plankSeconds, range } from './_shared'

const REST_SECONDS = 60

interface Exercise {
  name: string
  /** Dosis en reps o en segundos (plancha). */
  kind: 'reps' | 'seconds'
  easier: string
}

const EXERCISES: Exercise[] = [
  { name: 'Sentadillas', kind: 'reps', easier: 'Variante más fácil: sentarte y levantarte de una silla.' },
  {
    name: 'Flexiones inclinadas',
    kind: 'reps',
    easier: 'Variante más fácil: apoya las manos más alto (pared o encimera).',
  },
  {
    name: 'Puente de glúteo',
    kind: 'reps',
    easier: 'Variante más fácil: sube menos y aguanta 1 s arriba.',
  },
  {
    name: 'Plancha',
    kind: 'seconds',
    easier: 'Variante más fácil: plancha con rodillas apoyadas o sobre una mesa.',
  },
]

/** RPE alto o dolor relevante: no progresamos volumen (regla 7.1). */
function isHard(rpe: number, pain: number): boolean {
  return rpe >= 8 || pain > 3
}

export default function Strength() {
  const back = useNav((s) => s.back)
  const toast = useToast()
  const logStrength = useStore((s) => s.logStrength)
  const plan = useStore((s) => s.plan)

  const rounds = Math.max(1, plan.rounds)
  const reps = plan.reps
  const seconds = plankSeconds(plan.level)

  // checks[ronda][ejercicio]
  const [checks, setChecks] = useState<boolean[][]>(() =>
    Array.from({ length: rounds }, () => EXERCISES.map(() => false)),
  )
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [rpe, setRpe] = useState(5)
  const [pain, setPain] = useState(0)
  const [note, setNote] = useState('')

  const roundsDone = useMemo(() => checks.filter((r) => r.every(Boolean)).length, [checks])
  const totalChecks = rounds * EXERCISES.length
  const doneChecks = useMemo(
    () => checks.reduce((acc, r) => acc + r.filter(Boolean).length, 0),
    [checks],
  )
  const allDone = doneChecks === totalChecks

  // Temporizador de descanso
  useEffect(() => {
    if (restLeft === null) return
    if (restLeft <= 0) {
      setRestLeft(null)
      return
    }
    const id = window.setTimeout(() => setRestLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [restLeft])

  // Al completar el circuito, abrimos la hoja final.
  useEffect(() => {
    if (allDone) setFinishOpen(true)
  }, [allDone])

  function toggle(roundIndex: number, exerciseIndex: number) {
    setChecks((prev) =>
      prev.map((round, r) =>
        r === roundIndex ? round.map((v, e) => (e === exerciseIndex ? !v : v)) : round,
      ),
    )
  }

  function save() {
    const xp = logStrength({
      roundsDone,
      roundsPlanned: rounds,
      reps,
      rpe,
      pain,
      note: note.trim() || undefined,
    })
    setFinishOpen(false)
    toast.show(isHard(rpe, pain) ? `${xpLabel(xp)} · repetir también es progreso` : xpLabel(xp))
    back()
  }

  return (
    <Screen
      title="Fuerza"
      subtitle={`${rounds} ronda${rounds === 1 ? '' : 's'} × ${reps} reps · plancha ${seconds} s`}
      back
      onBack={back}
    >
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-white">Circuito</span>
          <span className="text-sm font-extrabold text-teal">
            {doneChecks}/{totalChecks}
          </span>
        </div>
        <ProgressBar className="mt-2" value={doneChecks / totalChecks} />
      </Card>

      {checks.map((round, r) => {
        const roundComplete = round.every(Boolean)
        return (
          <Card key={r} className="mt-3" tone={roundComplete ? 'success' : 'default'}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white">Ronda {r + 1}</h2>
              {roundComplete && (
                <span className="flex items-center gap-1 text-xs font-bold text-green">
                  <IconCheck size={14} />
                  Hecha
                </span>
              )}
            </div>

            <ul className="mt-2 flex flex-col gap-2">
              {EXERCISES.map((ex, e) => {
                const active = round[e]
                const dose = ex.kind === 'reps' ? `${reps} reps` : `${seconds} s`
                return (
                  <li key={ex.name}>
                    <button
                      type="button"
                      onClick={() => toggle(r, e)}
                      aria-pressed={active}
                      aria-label={`${active ? 'Desmarcar' : 'Marcar'} ${ex.name} ronda ${r + 1}`}
                      className={`flex min-h-[56px] w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors ${
                        active ? 'bg-green/15' : 'bg-white/5'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          active ? 'bg-green text-navy-deep' : 'bg-white/10 text-white/30'
                        }`}
                      >
                        <IconCheck size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-bold text-white">{ex.name}</span>
                          <span className="shrink-0 text-sm font-extrabold text-teal">{dose}</span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-white/45">
                          {ex.easier}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {roundComplete && r < rounds - 1 && (
              <Button
                className="mt-3"
                variant="secondary"
                size="md"
                block
                onClick={() => setRestLeft(REST_SECONDS)}
                disabled={restLeft !== null}
              >
                Descanso {REST_SECONDS} s
              </Button>
            )}
          </Card>
        )
      })}

      <Button className="mt-4" size="lg" block variant="ghost" onClick={() => setFinishOpen(true)}>
        Terminar antes
      </Button>

      {restLeft !== null && (
        <div className="fixed inset-x-0 bottom-6 z-40 mx-auto flex max-w-[480px] items-center justify-between gap-3 px-4">
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-navy-light px-4 py-3 shadow-lg ring-1 ring-white/10">
            <span className="text-sm font-semibold text-white/70">Descanso</span>
            <span className="font-mono text-xl font-extrabold tabular-nums text-teal">
              {formatClock(restLeft * 1000)}
            </span>
            <button
              type="button"
              onClick={() => setRestLeft(null)}
              className="ml-auto min-h-[44px] rounded-xl px-3 text-sm font-bold text-white/70 active:bg-white/10"
            >
              Saltar
            </button>
          </div>
        </div>
      )}

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="¿Cómo fue la sesión?">
        <p className="text-sm text-white/60">
          {roundsDone} de {rounds} ronda{rounds === 1 ? '' : 's'} completada
          {roundsDone === 1 ? '' : 's'}.
        </p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/50">
          Esfuerzo (RPE) · {rpe}/10
        </p>
        <ScaleButtons values={range(1, 10)} value={rpe} onChange={setRpe} label="Esfuerzo" />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/50">
          Dolor o molestias · {pain}/10
        </p>
        <ScaleButtons
          values={range(0, 10)}
          value={pain}
          onChange={setPain}
          label="Dolor"
          tone="warn"
        />

        {isHard(rpe, pain) && (
          <div className="mt-4 rounded-2xl border border-yellow/30 bg-yellow/10 p-3 text-sm leading-snug text-yellow">
            {HARD_SESSION}
          </div>
        )}

        <label
          htmlFor="strength-note"
          className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/50"
        >
          Nota (opcional)
        </label>
        <textarea
          id="strength-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Molestia en la rodilla, bajé el ritmo…"
          className="mt-1 w-full rounded-2xl bg-white/5 p-3 text-sm text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-teal"
        />

        <Button className="mt-4" size="lg" block onClick={save}>
          <IconDumbbell size={18} />
          Guardar sesión
        </Button>
      </Sheet>
    </Screen>
  )
}

function ScaleButtons({
  values,
  value,
  onChange,
  label,
  tone = 'teal',
}: {
  values: number[]
  value: number
  onChange: (v: number) => void
  label: string
  tone?: 'teal' | 'warn'
}) {
  return (
    <div className="mt-2 grid grid-cols-6 gap-2">
      {values.map((v) => {
        const active = v === value
        const activeClass = tone === 'warn' ? 'bg-yellow text-navy-deep' : 'bg-teal text-navy-deep'
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-label={`${label} ${v}`}
            aria-pressed={active}
            className={`min-h-[48px] rounded-2xl text-base font-extrabold transition-colors ${
              active ? activeClass : 'bg-white/5 text-white/70'
            }`}
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}
