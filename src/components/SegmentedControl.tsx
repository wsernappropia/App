export interface SegmentedOption<T extends string> {
  label: string
  value: T
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`inline-flex w-full rounded-2xl bg-white/5 p-1 ${className}`} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-[40px] flex-1 rounded-xl px-3 text-sm font-bold transition-colors ${
              active ? 'bg-teal text-navy-deep' : 'text-white/60'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
