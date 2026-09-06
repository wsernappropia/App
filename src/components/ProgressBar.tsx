export interface ProgressBarProps {
  value: number // 0-1
  color?: string
  trackColor?: string
  height?: number
  className?: string
}

export function ProgressBar({
  value,
  color = 'var(--color-teal)',
  trackColor = 'rgba(255,255,255,0.08)',
  height = 10,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height, background: trackColor }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${clamped * 100}%`, background: color }}
      />
    </div>
  )
}
