import type { ReactNode } from 'react'
import { IconBack } from './icons'

export interface ScreenProps {
  title?: string
  subtitle?: string
  back?: boolean
  onBack?: () => void
  right?: ReactNode
  children: ReactNode
}

// Layout base de cada pantalla: header sticky + área con scroll.
export function Screen({ title, subtitle, back, onBack, right, children }: ScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="pt-safe sticky top-0 z-10 flex items-center gap-2 border-b border-white/5 bg-navy-deep/95 px-3 pb-3 pt-4 backdrop-blur">
        {back && (
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 active:bg-white/10"
          >
            <IconBack />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate text-lg font-extrabold text-white">{title}</h1>}
          {subtitle && <p className="truncate text-sm text-white/55">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">{children}</div>
    </div>
  )
}
