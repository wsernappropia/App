import { useMemo, useState } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { ProgressRing } from '../components/ProgressRing'
import { Stat } from '../components/Stat'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { BarChart } from '../components/BarChart'
import { TrendLine } from '../components/TrendLine'
import { IconBack, IconChart } from '../components/icons'
import { useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { addDays, dayAndMonth, formatWeekRange, todayKey, weekStart, weekdayShort } from '../lib/dates'
import { daysOfWeek, missionDone, missionFor, pendingReview, weekSummary } from '../lib/selectors'
import { BADGES, BADGE_ORDER } from '../lib/gamification'
import type { Decision, ISODate } from '../lib/types'

const WEEKS_BACK = 8

const DECISION_LABEL: Record<Decision, string> = {
  reduce: 'Reducir',
  repeat: 'Repetir',
  progress: 'Progresar',
  hold: 'Mantener',
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

export default function Progress() {
  const state = useStore()
  const go = useNav((s) => s.go)
  const { show } = useToast()
  const [weeksAgo, setWeeksAgo] = useState(0)
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [waistInput, setWaistInput] = useState('')

  const now = new Date()
  const currentWeek = weekStart(todayKey(now))
  const selectedWeek = weekStart(addDays(currentWeek, -7 * weeksAgo))
  const isCurrentWeek = selectedWeek === currentWeek

  const summary = useMemo(() => weekSummary(state, selectedWeek), [state, selectedWeek])
  const dayDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(selectedWeek, i)),
    [selectedWeek],
  )
  const dayLogs = useMemo(() => daysOfWeek(state, selectedWeek), [state, selectedWeek])

  const weeklyBars = useMemo(() => {
    return Array.from({ length: WEEKS_BACK }, (_, i) => {
      const idx = WEEKS_BACK - 1 - i
      const ws = weekStart(addDays(currentWeek, -7 * idx))
      const s = weekSummary(state, ws)
      return { ws, s }
    })
  }, [state, currentWeek])

  const adherenceBars = weeklyBars.map(({ ws, s }) => ({
    label: dayAndMonth(ws).split(' ')[0],
    value: Math.round(s.adherence * 100),
    highlight: ws === selectedWeek,
  }))
  const minutesBars = weeklyBars.map(({ ws, s }) => ({
    label: dayAndMonth(ws).split(' ')[0],
    value: s.walkMinutes,
    highlight: ws === selectedWeek,
  }))

  const weightPoints = useMemo(() => {
    const dates = Object.keys(state.days).sort() as ISODate[]
    return dates
      .filter((d) => typeof state.days[d].weight === 'number')
      .slice(-12)
      .map((d) => ({ x: dayAndMonth(d), y: state.days[d].weight as number }))
  }, [state.days])
  const waistPoints = useMemo(() => {
    const dates = Object.keys(state.days).sort() as ISODate[]
    return dates
      .filter((d) => typeof state.days[d].waist === 'number')
      .slice(-12)
      .map((d) => ({ x: dayAndMonth(d), y: state.days[d].waist as number }))
  }, [state.days])

  const pending = pendingReview(state, now)

  function submitMetrics() {
    const weight = weightInput.trim() ? Number(weightInput) : undefined
    const waist = waistInput.trim() ? Number(waistInput) : undefined
    if (weight === undefined && waist === undefined) {
      setMetricsOpen(false)
      return
    }
    state.setBodyMetrics({ weight, waist })
    setMetricsOpen(false)
    setWeightInput('')
    setWaistInput('')
    show('Registro guardado')
  }

  return (
    <Screen title="Progreso" subtitle="Tu evidencia semana a semana">
      <div className="flex flex-col gap-4">
        {/* Selector de semana */}
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-2 py-2">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setWeeksAgo((w) => w + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 active:bg-white/10"
          >
            <IconBack size={20} />
          </button>
          <span className="text-sm font-extrabold text-white">
            {isCurrentWeek ? 'Esta semana' : formatWeekRange(selectedWeek)}
          </span>
          <button
            type="button"
            aria-label="Semana siguiente"
            disabled={isCurrentWeek}
            onClick={() => setWeeksAgo((w) => Math.max(0, w - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 active:bg-white/10 disabled:opacity-30"
          >
            <IconBack size={20} className="rotate-180" />
          </button>
        </div>

        {/* Tarjetas de resumen */}
        <Card>
          <div className="flex items-center gap-4">
            <ProgressRing value={summary.adherence} size={84} stroke={9}>
              <span className="text-lg font-extrabold text-white">{pct(summary.adherence)}</span>
            </ProgressRing>
            <div>
              <p className="text-sm font-extrabold text-white">Adherencia</p>
              <p className="text-xs text-white/55">
                {summary.doneDays}/{summary.plannedDays} días de misión cumplidos
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <Stat label="Min. caminados" value={summary.walkMinutes} hint={`${summary.walkSessions} sesiones`} />
          </Card>
          <Card>
            <Stat label="Sesiones fuerza" value={summary.strengthSessions} hint={summary.avgRpe != null ? `RPE medio ${summary.avgRpe}` : 'Sin datos'} />
          </Card>
          <Card>
            <Stat label="Proteína media" value={`${summary.proteinAvg} g`} hint={`${summary.proteinGreenDays} días en verde`} />
          </Card>
          <Card>
            <Stat label="Suplementos" value={pct(summary.supplementsRate)} hint="tomas de la semana" />
          </Card>
          <Card className="col-span-2">
            <Stat label="Días Mínimo completos" value={`${summary.minimumDaysComplete}/7`} hint="Movimiento + proteína + check-in" />
          </Card>
        </div>

        {/* Tira de 7 días */}
        <Card>
          <p className="mb-3 text-sm font-extrabold text-white">Semana día a día</p>
          <div className="grid grid-cols-7 gap-1.5">
            {dayDates.map((date, i) => {
              const day = dayLogs[i]
              const mission = missionFor(state.settings, date)
              const done = mission === 'rest' ? false : missionDone(state, date)
              const isRest = mission === 'rest'
              const isFuture = date > todayKey(now)
              const failed = !isRest && !done && !isFuture && !!state.days[date]
              let dot = 'bg-white/10 text-white/40'
              let label = '—'
              if (isRest) {
                dot = 'bg-white/5 text-white/40'
                label = 'Desc.'
              } else if (done) {
                dot = 'bg-green/25 text-green'
                label = 'Hecho'
              } else if (failed) {
                dot = 'bg-red/20 text-red'
                label = 'Falló'
              } else if (isFuture) {
                dot = 'bg-white/5 text-white/25'
                label = '·'
              } else {
                dot = 'bg-yellow/20 text-yellow'
                label = 'Hoy'
              }
              void day
              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold uppercase text-white/40">{weekdayShort(date)}</span>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-[9px] font-extrabold ${dot}`}>
                    {label === 'Hecho' ? '✓' : label === 'Falló' ? '✕' : label === 'Desc.' ? '·' : label === 'Hoy' ? '•' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Gráficos históricos */}
        <Card>
          <p className="mb-2 text-sm font-extrabold text-white">Adherencia · últimas {WEEKS_BACK} semanas</p>
          <BarChart data={adherenceBars} formatValue={(v) => `${v}%`} />
        </Card>
        <Card>
          <p className="mb-2 text-sm font-extrabold text-white">Minutos caminados · últimas {WEEKS_BACK} semanas</p>
          <BarChart data={minutesBars} color="rgba(20,184,166,0.25)" highlightColor="var(--color-teal)" />
        </Card>

        {/* Peso / cintura */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-white">Peso y cintura</p>
            <Button size="sm" variant="secondary" onClick={() => setMetricsOpen(true)}>
              Registrar
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-white/50">Peso (kg)</p>
              <TrendLine points={weightPoints} unit=" kg" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-white/50">Cintura (cm)</p>
              <TrendLine points={waistPoints} unit=" cm" />
            </div>
          </div>
        </Card>

        {/* Badges */}
        <Card>
          <p className="mb-3 text-sm font-extrabold text-white">Insignias</p>
          <div className="grid grid-cols-4 gap-3">
            {BADGE_ORDER.map((id) => {
              const badge = BADGES[id]
              const earned = state.game.badges.includes(id)
              return (
                <div key={id} className="flex flex-col items-center gap-1 text-center" title={badge.description}>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${
                      earned ? 'bg-yellow/20' : 'bg-white/5 grayscale opacity-40'
                    }`}
                  >
                    {badge.emoji}
                  </div>
                  <span className={`text-[9px] font-bold leading-tight ${earned ? 'text-white/80' : 'text-white/35'}`}>
                    {badge.name}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Revisión semanal */}
        <Card tone={pending ? 'hero' : 'default'}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-extrabold ${pending ? 'text-navy-deep' : 'text-white'}`}>
                {pending ? 'Tienes una semana por revisar' : 'Revisión semanal'}
              </p>
              <p className={`text-xs ${pending ? 'text-navy-deep/70' : 'text-white/55'}`}>
                {pending ? formatWeekRange(pending) : 'Cierra tu semana cuando quieras'}
              </p>
            </div>
            <Button variant={pending ? 'primary' : 'secondary'} size="sm" onClick={() => go('review')}>
              Ver
            </Button>
          </div>
        </Card>

        {/* Historial de revisiones */}
        {state.reviews.length > 0 && (
          <Card>
            <p className="mb-3 text-sm font-extrabold text-white">Revisiones pasadas</p>
            <div className="flex flex-col gap-2">
              {[...state.reviews]
                .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
                .slice(0, 8)
                .map((r) => (
                  <div key={r.weekStart} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{formatWeekRange(r.weekStart)}</span>
                    <span className="font-bold text-teal">{DECISION_LABEL[r.decision]}</span>
                    <span className="text-white/50">{pct(r.adherence)}</span>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {state.reviews.length === 0 && (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-white/35">
            <IconChart size={14} />
            Aún no has cerrado ninguna semana.
          </div>
        )}
      </div>

      <Sheet open={metricsOpen} onClose={() => setMetricsOpen(false)} title="Registrar peso / cintura">
        <div className="flex flex-col gap-4 pb-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-white/70">Peso (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="p. ej. 78.5"
              className="h-11 rounded-xl bg-white/10 px-3 text-base font-bold text-white outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-white/70">Cintura (cm)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={waistInput}
              onChange={(e) => setWaistInput(e.target.value)}
              placeholder="p. ej. 88"
              className="h-11 rounded-xl bg-white/10 px-3 text-base font-bold text-white outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
          <Button block size="lg" onClick={submitMetrics}>
            Guardar
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}
