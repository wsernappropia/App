import type { KeyboardEvent, ReactNode } from 'react'

export interface CardProps {
  tone?: 'default' | 'hero' | 'success' | 'warn'
  children: ReactNode
  onClick?: () => void
  className?: string
}

const TONE_CLASSES: Record<NonNullable<CardProps['tone']>, string> = {
  default: 'bg-navy border border-white/5',
  hero: 'bg-gradient-to-br from-teal-deep to-teal border border-teal/40 text-navy-deep',
  success: 'bg-green/10 border border-green/30',
  warn: 'bg-yellow/10 border border-yellow/30',
}

export function Card({ tone = 'default', children, onClick, className = '' }: CardProps) {
  const interactive = !!onClick

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? onKeyDown : undefined}
      className={`rounded-[22px] p-4 ${TONE_CLASSES[tone]} ${
        interactive ? 'cursor-pointer transition-transform active:scale-[0.98]' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
