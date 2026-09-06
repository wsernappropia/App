import { IconMinus, IconPlus } from './icons'

export interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  suffix?: string
  className?: string
}

// Control +/- táctil (proteína, agua, ajustes numéricos).
export function Stepper({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  suffix = '',
  className = '',
}: StepperProps) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {label && <span className="text-sm font-semibold text-white/70">{label}</span>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Disminuir"
          onClick={dec}
          disabled={value <= min}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors active:bg-white/20 disabled:opacity-30"
        >
          <IconMinus size={18} />
        </button>
        <span className="min-w-[3.5ch] text-center text-lg font-extrabold text-white">
          {value}
          {suffix}
        </span>
        <button
          type="button"
          aria-label="Aumentar"
          onClick={inc}
          disabled={value >= max}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-navy-deep transition-colors active:bg-teal-deep disabled:opacity-30"
        >
          <IconPlus size={18} />
        </button>
      </div>
    </div>
  )
}
