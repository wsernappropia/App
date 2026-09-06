import type { ReactNode } from 'react'

export interface ProgressRingProps {
  value: number // 0-1
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  children?: ReactNode
  className?: string
}

// Anillo de progreso circular (usado para XP, adherencia, proteína, timer de caminata).
export function ProgressRing({
  value,
  size = 96,
  stroke = 10,
  color = 'var(--color-teal)',
  trackColor = 'rgba(255,255,255,0.08)',
  children,
  className = '',
}: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped)

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
