import { useMemo, useState } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { ProgressRing } from '../components/ProgressRing'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { useToast } from '../components/Toast'
import { MiniBars } from '../components/MiniBars'
import { useStore, getDay } from '../lib/store'
import { lastDays, proteinStatus, proteinTotal, todayKey } from '../lib/selectors'
import { PROTEIN_PRESETS, ZONE_LABEL } from '../lib/nutrition'
import * as copy from '../lib/copy'
import { weekdayShort } from '../lib/dates'
import type { ProteinZone } from '../lib/types'

const ZONE_COLOR: Record<ProteinZone, string> = {
  rojo: 'var(--color-red)',
  amarillo: 'var(--color-yellow)',
  verde: 'var(--color-green)',
}

function formatTime(ms: number): string {
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
}

export default function Nutrition() {
  const state = useStore()
  const addProtein = useStore((s) => s.addProtein)
  const removeProtein = useStore((s) => s.removeProtein)
  const { show } = useToast()

  const [customOpen, setCustomOpen] = useState(false)
  const [customGrams, setCustomGrams] = useState(20)
  const [customLabel, setCustomLabel] = useState('')

  const today = todayKey()
  const status = proteinStatus(state, today)
  const day = getDay(state, today)
  const entries = [...day.protein].sort((a, b) => b.at - a.at)

  const history = useMemo(() => {
    const days = lastDays(state, 7)
    return days.map((d) => ({
      label: weekdayShort(d.date),
      value: proteinTotal(d),
      highlight: d.date === today,
    }))
  }, [state, today])

  function handleAdd(grams: number, label: string) {
    const xp = addProtein(grams, label)
    show(xp > 0 ? `+${grams} g · +${xp} XP` : `+${grams} g`)
  }

  function handleCustomAdd() {
    if (customGrams <= 0) return
    handleAdd(customGrams, customLabel.trim() || 'Otra cantidad')
    setCustomOpen(false)
    setCustomGrams(20)
    setCustomLabel('')
  }

  const ringValue = status.goal > 0 ? Math.min(1, status.grams / status.goal) : 0

  return (
    <Screen title="Nutrición" subtitle="Proteína de hoy">
      <div className="flex flex-col gap-5">
        <Card tone="default" className="flex flex-col items-center gap-3 py-6">
          <ProgressRing value={ringValue} size={168} stroke={14} color={ZONE_COLOR[status.zone]}>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold text-white">{status.grams}</span>
              <span className="text-sm font-semibold text-white/45">de {status.goal} g</span>
            </div>
          </ProgressRing>
          <span
            className="rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide"
            style={{ background: `color-mix(in srgb, ${ZONE_COLOR[status.zone]} 20%, transparent)`, color: ZONE_COLOR[status.zone] }}
          >
            {ZONE_LABEL[status.zone]}
          </span>
          {status.zone !== 'verde' && (
            <p className="max-w-xs text-center text-sm text-white/60">
              {copy.proteinLowMessage(status.remaining)}
            </p>
          )}
        </Card>

        <div>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-white/50">
            Añadir proteína
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {PROTEIN_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleAdd(preset.grams, preset.label)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl bg-navy border border-white/5 px-1.5 py-2 text-center transition-transform active:scale-95 active:bg-white/5"
              >
                <span className="text-2xl leading-none">{preset.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight text-white/80">
                  {preset.label}
                </span>
                <span className="text-xs font-extrabold text-teal">{preset.grams} g</span>
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="md"
            block
            className="mt-3"
            onClick={() => setCustomOpen(true)}
          >
            Otra cantidad
          </Button>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-white/50">
            Registrado hoy
          </h2>
          {entries.length === 0 ? (
            <p className="text-sm text-white/40">Todavía no has añadido proteína hoy.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-navy border border-white/5 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{entry.label}</p>
                    <p className="text-xs text-white/40">{formatTime(entry.at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-extrabold text-teal">{entry.grams} g</span>
                    <button
                      type="button"
                      aria-label={`Eliminar ${entry.label}`}
                      onClick={() => removeProtein(entry.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white/50 active:bg-white/10"
                    >
                      &times;
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-white/50">
            Últimos 7 días
          </h2>
          <Card>
            <MiniBars data={history} goal={status.goal} min={status.min} />
            <div className="mt-3 flex items-center gap-4 text-xs text-white/45">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 border-t border-dashed border-green/50" /> Meta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 border-t border-dashed border-yellow/50" /> Mínimo
              </span>
            </div>
          </Card>
        </div>
      </div>

      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Otra cantidad">
        <div className="flex flex-col gap-4">
          <Stepper
            value={customGrams}
            onChange={setCustomGrams}
            min={5}
            max={200}
            step={5}
            suffix=" g"
            label="Gramos"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-white/70">Etiqueta (opcional)</span>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Ej. Batido casero"
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-white/30 focus:border-teal focus:outline-none"
            />
          </label>
          <Button variant="primary" size="lg" block onClick={handleCustomAdd}>
            Añadir {customGrams} g
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}
