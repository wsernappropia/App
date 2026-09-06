import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  IconBolt,
  IconCheck,
  IconDumbbell,
  IconFlame,
  IconShield,
  IconWalk,
  IconWater,
  ProgressBar,
  ProgressRing,
  Screen,
  Sheet,
  Stepper,
  useToast,
} from '../components'
import { xpLabel } from '../lib/gamification'
import * as copy from '../lib/copy'
import { useNav } from '../lib/nav'
import { ZONE_LABEL } from '../lib/nutrition'
import { ALL_SUPPLEMENTS, supplementList } from '../lib/supplements'
import { DEFAULT_SETTINGS, useStore } from '../lib/store'
import {
  levelInfo,
  minimumDay,
  missionDone,
  missionFor,
  proteinStatus,
  streak,
  todayKey,
  todayMessage,
} from '../lib/selectors'
import type { Checkin, SupplementId } from '../lib/types'
import { useData } from './_shared'

const ENERGIES: Checkin['energy'][] = [1, 2, 3, 4, 5]
const ENERGY_EMOJI: Record<Checkin['energy'], string> = {
  1: '😵',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '🤩',
}

export default function Today() {
  const data = useData()
  const go = useNav((s) => s.go)
  const toast = useToast()
  const setCheckin = useStore((s) => s.setCheckin)
  const toggleSupplement = useStore((s) => s.toggleSupplement)
  const setWater = useStore((s) => s.setWater)
  const updateSettings = useStore((s) => s.updateSettings)

  const [checkinOpen, setCheckinOpen] = useState(false)

  const today = todayKey()
  const day = data.days[today]
  const mission = missionFor(data.settings, today)
  const done = missionDone(data, today)
  const min = minimumDay(data, today)
  const protein = proteinStatus(data, today)
  const streakInfo = useMemo(() => streak(data), [data])
  const level = levelInfo(data.game.xp)
  const message = useMemo(() => todayMessage(data), [data])
  const supplements = supplementList(data.settings.enabledSupplements)
  const water = day?.water ?? 0

  const greeting = data.settings.name ? `Hola, ${data.settings.name}` : 'Hoy'

  function startMission() {
    go(mission === 'strength' ? 'strength' : 'walk')
  }

  return (
    <Screen title={greeting} subtitle={copy.APP_NAME}>
      {/* 1. Encabezado literal + mensaje del día */}
      <p className="text-[15px] font-bold leading-snug text-white">{copy.HEADER_TAGLINE}</p>
      <p className="mt-1 text-sm leading-snug text-white/60">{message}</p>

      {/* 2. Hero: misión del día */}
      <div className="mt-4">
        <MissionHero
          mission={mission}
          done={done}
          walkMinutes={data.plan.walkMinutes}
          rounds={data.plan.rounds}
          reps={data.plan.reps}
          onStart={startMission}
          onExtraWalk={() => go('walk')}
        />
      </div>

      {/* 3. Día Mínimo */}
      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-white">Día Mínimo</span>
          <span className="text-sm font-extrabold text-teal">{min.count}/3</span>
        </div>
        <ProgressBar className="mt-2" value={min.count / 3} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MinimumChip
            label={copy.MINIMUM_LABELS.movement}
            active={min.movement}
            onClick={startMission}
          />
          <MinimumChip
            label={copy.MINIMUM_LABELS.protein}
            active={min.protein}
            onClick={() => go('nutrition')}
          />
          <MinimumChip
            label={copy.MINIMUM_LABELS.checkin}
            active={min.checkin}
            onClick={() => setCheckinOpen(true)}
          />
        </div>
      </Card>

      {/* 4. Tarjetas secundarias */}
      {supplements.length > 0 && (
        <Card className="mt-3">
          <h2 className="text-sm font-extrabold text-white">Suplementos de hoy</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {supplements.map((s) => {
              const taken = !!day?.supplements[s.id]
              return (
                <li key={s.id}>
                  <SupplementRow
                    name={s.name}
                    dose={s.dose}
                    taken={taken}
                    onToggle={() => {
                      const xp = toggleSupplement(s.id)
                      if (xp > 0) toast.show(xpLabel(xp))
                    }}
                  />
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Card className="mt-3" tone={protein.zone === 'verde' ? 'success' : 'default'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-white">Proteína</h2>
            <p className="mt-1 text-2xl font-extrabold text-white">
              {Math.round(protein.grams)}
              <span className="text-base font-bold text-white/50"> / {protein.goal} g</span>
            </p>
            <p className="mt-1 text-xs text-white/55">
              {protein.remaining > 0
                ? `Te faltan ~${Math.round(protein.remaining)} g · ${ZONE_LABEL[protein.zone]}`
                : ZONE_LABEL[protein.zone]}
            </p>
          </div>
          <Button size="md" variant="secondary" onClick={() => go('nutrition')}>
            Añadir
          </Button>
        </div>
        <ProgressBar
          className="mt-3"
          value={protein.goal > 0 ? protein.grams / protein.goal : 0}
          color={
            protein.zone === 'verde'
              ? 'var(--color-green)'
              : protein.zone === 'amarillo'
                ? 'var(--color-yellow)'
                : 'var(--color-red)'
          }
        />
      </Card>

      {data.settings.waterEnabled && (
        <Card className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-white/60">
                <IconWater size={20} />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-white">Agua</h2>
                <p className="text-xs text-white/55">
                  {water} / {data.settings.waterGoal} vasos
                </p>
              </div>
            </div>
            <Stepper value={water} onChange={setWater} min={0} max={20} />
          </div>
        </Card>
      )}

      {/* 5. Racha y XP al final */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-2 text-yellow">
            <IconFlame size={20} />
            <span className="text-2xl font-extrabold text-white">{streakInfo.current}</span>
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/50">
            {streakInfo.current === 1 ? 'día de racha' : 'días de racha'}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-white/60">
            {streakInfo.shields > 0 ? (
              <>
                <span className="flex items-center gap-1 text-teal">
                  <IconShield size={14} />
                </span>
                <span>
                  {streakInfo.shields} escudo{streakInfo.shields === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <span>Mejor racha: {streakInfo.best}</span>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <ProgressRing value={level.progress} size={56} stroke={6}>
              <span className="text-sm font-extrabold text-white">{level.level}</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold leading-tight text-white">{level.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-yellow">
                <IconBolt size={12} />
                {data.game.xp} XP
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-white/45">
            {level.xpForNext - level.xpInLevel} XP para el nivel {level.level + 1}
          </p>
        </Card>
      </div>

      {checkinOpen && (
        <CheckinSheet
          current={day?.checkin}
          onClose={() => setCheckinOpen(false)}
          onSave={(energy, note) => {
            const xp = setCheckin(energy, note)
            setCheckinOpen(false)
            toast.show(xp > 0 ? `Check-in guardado · ${xpLabel(xp)}` : 'Check-in actualizado')
          }}
        />
      )}

      <OnboardingSheet
        open={!data.settings.onboarded}
        onDone={(name, proteinGoal, enabledSupplements) =>
          updateSettings({ name, proteinGoal, enabledSupplements, onboarded: true })
        }
      />
    </Screen>
  )
}

// ------------------------------------------------------------------ hero

interface MissionHeroProps {
  mission: 'walk' | 'strength' | 'rest'
  done: boolean
  walkMinutes: number
  rounds: number
  reps: number
  onStart: () => void
  onExtraWalk: () => void
}

function MissionHero({
  mission,
  done,
  walkMinutes,
  rounds,
  reps,
  onStart,
  onExtraWalk,
}: MissionHeroProps) {
  if (mission === 'rest') {
    return (
      <Card tone="warn">
        <p className="text-xs font-extrabold uppercase tracking-wide text-yellow">Descanso</p>
        <h2 className="mt-1 text-xl font-extrabold text-white">{copy.REST_DAY_TITLE}</h2>
        <p className="mt-1 text-sm text-white/60">
          Recuperar también entrena. Mañana seguimos.
        </p>
        <Button className="mt-4" variant="secondary" size="lg" block onClick={onExtraWalk}>
          {copy.REST_DAY_CTA}
        </Button>
      </Card>
    )
  }

  const title = mission === 'strength' ? 'Fuerza' : 'Caminata'
  const detail =
    mission === 'strength'
      ? `${rounds} ronda${rounds === 1 ? '' : 's'} × ${reps} reps`
      : `${walkMinutes} min`

  if (done) {
    return (
      <Card tone="success">
        <div className="flex items-center gap-2 text-green">
          <IconCheck size={20} />
          <p className="text-xs font-extrabold uppercase tracking-wide">Misión cumplida</p>
        </div>
        <h2 className="mt-1 text-xl font-extrabold text-white">
          {title} · {detail}
        </h2>
        <p className="mt-1 text-sm text-white/60">{copy.MISSION_DONE}</p>
        <Button className="mt-4" variant="secondary" size="lg" block onClick={onStart}>
          Añadir más
        </Button>
      </Card>
    )
  }

  return (
    <Card tone="hero">
      <div className="flex items-center gap-2 text-navy-deep/70">
        {mission === 'strength' ? <IconDumbbell size={18} /> : <IconWalk size={18} />}
        <p className="text-xs font-extrabold uppercase tracking-wide">Tu misión de hoy</p>
      </div>
      <h2 className="mt-1 text-2xl font-extrabold text-navy-deep">
        {title} · {detail}
      </h2>
      <p className="mt-1 text-sm font-semibold text-navy-deep/70">
        Empieza y el resto viene solo.
      </p>
      <Button
        className="mt-4 shadow-[0_4px_0_0_rgba(0,0,0,0.45)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.45)]"
        style={{ background: 'var(--color-navy-deep)', color: '#fff' }}
        size="xl"
        block
        onClick={onStart}
      >
        Empezar
      </Button>
    </Card>
  )
}

// ------------------------------------------------------------- día mínimo

function MinimumChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-xs font-bold transition-colors ${
        active ? 'bg-green/20 text-green' : 'bg-white/5 text-white/60'
      }`}
    >
      <span className={active ? 'text-green' : 'text-white/30'}>
        <IconCheck size={16} />
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

// ------------------------------------------------------------ suplementos

function SupplementRow({
  name,
  dose,
  taken,
  onToggle,
}: {
  name: string
  dose: string
  taken: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={taken}
      aria-label={`${taken ? 'Desmarcar' : 'Marcar'} ${name}`}
      className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors ${
        taken ? 'bg-green/15' : 'bg-white/5'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          taken ? 'bg-green text-navy-deep' : 'bg-white/10 text-white/30'
        }`}
      >
        <IconCheck size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">{name}</span>
        <span className="block truncate text-xs text-white/50">{dose}</span>
      </span>
    </button>
  )
}

// --------------------------------------------------------------- check-in

function CheckinSheet({
  current,
  onClose,
  onSave,
}: {
  current?: Checkin
  onClose: () => void
  onSave: (energy: Checkin['energy'], note?: string) => void
}) {
  const [energy, setEnergy] = useState<Checkin['energy']>(current?.energy ?? 3)
  const [note, setNote] = useState(current?.note ?? '')

  return (
    <Sheet open onClose={onClose} title="Check-in de hoy">
      <p className="text-sm text-white/60">¿Cómo andas de energía?</p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {ENERGIES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEnergy(e)}
            aria-label={copy.ENERGY_LABEL[e]}
            aria-pressed={energy === e}
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl text-lg transition-colors ${
              energy === e ? 'bg-teal text-navy-deep' : 'bg-white/5 text-white/70'
            }`}
          >
            <span>{ENERGY_EMOJI[e]}</span>
            <span className="text-xs font-extrabold">{e}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-sm font-bold text-teal">{copy.ENERGY_LABEL[energy]}</p>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/50">
        Nota (opcional)
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Dormí poco, rodilla mejor…"
        className="mt-1 w-full rounded-2xl bg-white/5 p-3 text-sm text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-teal"
      />

      <Button
        className="mt-4"
        size="lg"
        block
        onClick={() => onSave(energy, note.trim() || undefined)}
      >
        Guardar check-in
      </Button>
    </Sheet>
  )
}

// ------------------------------------------------------------- onboarding

function OnboardingSheet({
  open,
  onDone,
}: {
  open: boolean
  onDone: (name: string, proteinGoal: number, supplements: SupplementId[]) => void
}) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(DEFAULT_SETTINGS.proteinGoal)
  const [supps, setSupps] = useState<SupplementId[]>([...DEFAULT_SETTINGS.enabledSupplements])

  const titles = ['Bienvenido a Momentum', 'Tu meta de proteína', 'Tus suplementos']

  return (
    <Sheet open={open} onClose={() => undefined}>
      <h2 className="mb-3 pt-1 text-base font-extrabold text-white">{titles[step]}</h2>
      <div className="mb-3 flex gap-1.5" aria-hidden="true">
        {titles.map((t, i) => (
          <span
            key={t}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-teal' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div>
          <p className="text-sm text-white/60">{copy.HEADER_TAGLINE}</p>
          <label
            htmlFor="onboarding-name"
            className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/50"
          >
            ¿Cómo te llamamos?
          </label>
          <input
            id="onboarding-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="mt-1 h-12 w-full rounded-2xl bg-white/5 px-3 text-base text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-teal"
          />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-sm text-white/60">
            Cuántos gramos quieres alcanzar al día. Puedes cambiarlo luego en Ajustes.
          </p>
          <div className="mt-4 rounded-2xl bg-white/5 p-4">
            <Stepper value={goal} onChange={setGoal} min={40} max={220} step={5} suffix=" g" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-sm text-white/60">Marca los que tomas. Sin agobios.</p>
          <div className="mt-3 flex flex-col gap-2">
            {ALL_SUPPLEMENTS.map((def) => (
              <SupplementRow
                key={def.id}
                name={def.name}
                dose={def.dose}
                taken={supps.includes(def.id)}
                onToggle={() =>
                  setSupps((prev) =>
                    prev.includes(def.id) ? prev.filter((s) => s !== def.id) : [...prev, def.id],
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        {step > 0 && (
          <Button variant="ghost" size="lg" onClick={() => setStep((s) => s - 1)}>
            Atrás
          </Button>
        )}
        <Button
          className="flex-1"
          size="lg"
          block
          onClick={() => {
            if (step < 2) {
              setStep((s) => s + 1)
              return
            }
            onDone(name.trim(), goal, supps)
          }}
        >
          {step < 2 ? 'Siguiente' : 'Empezar'}
        </Button>
      </div>
    </Sheet>
  )
}

