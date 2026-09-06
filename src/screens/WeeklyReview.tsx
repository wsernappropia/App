import { useState } from 'react'
import {
  Button,
  Card,
  EmptyState,
  IconChart,
  IconCheck,
  ProgressRing,
  Screen,
  Sheet,
  Stat,
  useToast,
} from '../components'
import { DECISION_LABEL, DIFFICULTY_LABEL, ENERGY_LABEL } from '../lib/copy'
import { formatWeekRange } from '../lib/dates'
import { xpLabel } from '../lib/gamification'
import { useNav } from '../lib/nav'
import { applyDecision, decide, describeDecision, planDiff, planSummary } from '../lib/progression'
import { pendingReview, todayKey, weekStart, weekSummary } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { MomentumStore } from '../lib/store'
import type { Decision, MomentumData } from '../lib/types'
import { range, useData, useOnce } from './_shared'

const DECISION_TONE: Record<Decision, 'default' | 'hero' | 'success' | 'warn'> = {
  reduce: 'warn',
  repeat: 'default',
  progress: 'success',
  hold: 'warn',
}

export default function WeeklyReview() {
  const data = useData()
  const back = useNav((s) => s.back)
  const go = useNav((s) => s.go)
  const params = useNav((s) => s.params)
  const completeWeeklyReview = useStore((s) => s.completeWeeklyReview)
  const toast = useToast()

  const pending = pendingReview(data)
  const requested = params?.week
  const [forcedWeek, setForcedWeek] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const target = requested ?? pending ?? forcedWeek
  const currentWeek = weekStart(todayKey())

  if (!target) {
    return (
      <Screen title="Revisión semanal" back onBack={back}>
        <EmptyState
          icon={<IconChart size={40} />}
          title="No hay semanas pendientes"
          description="Cuando termine la semana podrás cerrarla y ajustar el plan. Si quieres, puedes cerrar la semana actual ya."
          action={
            <Button size="lg" onClick={() => setConfirmOpen(true)}>
              Cerrar semana actual
            </Button>
          }
        />
        <Sheet
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="¿Cerrar la semana actual?"
        >
          <p className="text-sm text-white/60">
            La semana {formatWeekRange(currentWeek)} aún no ha terminado. Si la cierras ahora, el
            plan se ajustará con lo registrado hasta hoy.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              size="lg"
              block
              onClick={() => {
                setForcedWeek(currentWeek)
                setConfirmOpen(false)
              }}
            >
              Sí, cerrarla ahora
            </Button>
            <Button size="lg" block variant="ghost" onClick={() => setConfirmOpen(false)}>
              Mejor luego
            </Button>
          </div>
        </Sheet>
      </Screen>
    )
  }

  return (
    <ReviewForm
      weekStartIso={weekStart(target)}
      data={data}
      back={back}
      onDone={() => go('progress')}
      onSave={completeWeeklyReview}
      toastShow={toast.show}
    />
  )
}

interface ReviewFormProps {
  weekStartIso: string
  data: MomentumData
  back: () => void
  onDone: () => void
  toastShow: (message: string) => void
  onSave: MomentumStore['completeWeeklyReview']
}

function ReviewForm({ weekStartIso, data, back, onDone, onSave, toastShow }: ReviewFormProps) {
  const summary = weekSummary(data, weekStartIso)
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [pain, setPain] = useState(summary.maxPain)
  const [note, setNote] = useState('')

  const decision = decide({
    adherence: summary.adherence,
    avgRpe: summary.avgRpe,
    maxPain: pain,
  })
  const planAfter = applyDecision(data.plan, decision, todayKey())
  const described = describeDecision(decision, planAfter)
  const diff = planDiff(data.plan, planAfter)
  const painEdited = pain !== summary.maxPain

  const accept = useOnce(function accept() {
    const { review, xp } = onSave({
      weekStart: weekStartIso,
      energy,
      difficulty,
      maxPain: pain,
      note: note.trim() || undefined,
    })
    toastShow(`${xpLabel(xp)} · ${DECISION_LABEL[review.decision]}`)
    onDone()
  })

  return (
    <Screen title="Revisión semanal" subtitle={formatWeekRange(weekStartIso)} back onBack={back}>
      {/* Resumen de la semana */}
      <Card>
        <div className="flex items-center gap-4">
          <ProgressRing value={summary.adherence} size={84} stroke={9}>
            <span className="text-lg font-extrabold text-white">
              {Math.round(summary.adherence * 100)}%
            </span>
          </ProgressRing>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-white">Adherencia</h2>
            <p className="mt-0.5 text-sm text-white/55">
              {summary.doneDays} de {summary.plannedDays} días con misión cumplida
            </p>
            <p className="mt-1 text-xs text-white/45">Día Mínimo 3/3: {summary.minimumDaysComplete} días</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Minutos" value={summary.walkMinutes} hint={`${summary.walkSessions} ${summary.walkSessions === 1 ? 'caminata' : 'caminatas'}`} />
          <Stat label="Fuerza" value={summary.strengthSessions} hint={`RPE ${summary.avgRpe ?? '—'}`} />
          <Stat
            label="Proteína"
            value={`${Math.round(summary.proteinAvg)} g`}
            hint={`${summary.proteinGreenDays} días verde`}
          />
        </div>
      </Card>

      {/* Energía */}
      <Card className="mt-3">
        <h2 className="text-sm font-extrabold text-white">¿Cómo fue tu energía?</h2>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as const).map((v) => (
            <ScaleButton
              key={v}
              value={v}
              active={energy === v}
              label={`Energía ${v}: ${ENERGY_LABEL[v]}`}
              onClick={() => setEnergy(v)}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-sm font-bold text-teal">{ENERGY_LABEL[energy]}</p>
      </Card>

      {/* Dificultad */}
      <Card className="mt-3">
        <h2 className="text-sm font-extrabold text-white">¿Qué tal la dificultad?</h2>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as const).map((v) => (
            <ScaleButton
              key={v}
              value={v}
              active={difficulty === v}
              label={`Dificultad ${v}: ${DIFFICULTY_LABEL[v]}`}
              onClick={() => setDifficulty(v)}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-sm font-bold text-teal">{DIFFICULTY_LABEL[difficulty]}</p>
      </Card>

      {/* Dolor máximo */}
      <Card className="mt-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-extrabold text-white">Dolor máximo</h2>
          <span className="text-sm font-extrabold text-yellow">{pain}/10</span>
        </div>
        <p className="mt-1 text-xs text-white/45">
          Calculado desde tus sesiones ({summary.maxPain}/10). Ajústalo si no encaja.
        </p>
        <div className="mt-3 grid grid-cols-6 gap-2">
          {range(0, 10).map((v) => (
            <ScaleButton
              key={v}
              value={v}
              active={pain === v}
              tone="warn"
              label={`Dolor ${v} de 10`}
              onClick={() => setPain(v)}
            />
          ))}
        </div>
        {painEdited && (
          <p className="mt-2 text-xs leading-snug text-white/45">
            Usaremos tu valor ({pain}/10) para decidir el plan de la próxima semana.
          </p>
        )}
      </Card>

      {/* Decisión y plan */}
      <Card className="mt-3" tone={DECISION_TONE[decision]}>
        <p className="text-xs font-extrabold uppercase tracking-wide text-white/60">
          Decisión: {DECISION_LABEL[decision]}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-white">{described.title}</h2>
        <p className="mt-1 text-sm leading-snug text-white/70">{described.message}</p>

        <div className="mt-4 rounded-2xl bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Plan</p>
          <p className="mt-1 text-sm text-white/60">Antes: {planSummary(data.plan)}</p>
          <p className="mt-0.5 text-sm font-bold text-white">Después: {planSummary(planAfter)}</p>
          {diff.length > 0 && (
            <p className="mt-1 text-xs font-bold text-teal">{diff.join(' · ')}</p>
          )}
        </div>
      </Card>

      <label
        htmlFor="review-note"
        className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/50"
      >
        Nota de la semana (opcional)
      </label>
      <textarea
        id="review-note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Semana con mucho trabajo, dormí poco…"
        className="mt-1 w-full rounded-2xl bg-white/5 p-3 text-sm text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-teal"
      />

      <Button className="mt-4 mb-2" size="xl" block onClick={accept}>
        <IconCheck size={20} />
        Aceptar próxima semana
      </Button>
    </Screen>
  )
}

function ScaleButton({
  value,
  active,
  onClick,
  label,
  tone = 'teal',
}: {
  value: number
  active: boolean
  onClick: () => void
  label: string
  tone?: 'teal' | 'warn'
}) {
  const activeClass = tone === 'warn' ? 'bg-yellow text-navy-deep' : 'bg-teal text-navy-deep'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`min-h-[48px] rounded-2xl text-base font-extrabold transition-colors ${
        active ? activeClass : 'bg-white/5 text-white/70'
      }`}
    >
      {value}
    </button>
  )
}
