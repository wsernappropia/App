export interface StatProps {
  label: string
  value: string | number
  hint?: string
  className?: string
}

export function Stat({ label, value, hint, className = '' }: StatProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-2xl font-extrabold text-white">{value}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</span>
      {hint && <span className="text-xs text-white/40">{hint}</span>}
    </div>
  )
}
