import { IconBolt } from './icons'

export interface XpBadgeProps {
  xp: number
  className?: string
}

export function XpBadge({ xp, className = '' }: XpBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-yellow/15 px-2.5 py-1 text-sm font-extrabold text-yellow ${className}`}
    >
      <IconBolt size={14} />
      {xp} XP
    </span>
  )
}
