import type { ComponentType } from 'react'
import { useNav } from '../lib/nav'
import type { Screen } from '../lib/types'
import { IconChart, IconHome, IconPill, IconSettings, IconUtensils, type IconProps } from './icons'

const TABS: { screen: Screen; label: string; Icon: ComponentType<IconProps> }[] = [
  { screen: 'today', label: 'Hoy', Icon: IconHome },
  { screen: 'nutrition', label: 'Nutrición', Icon: IconUtensils },
  { screen: 'supplements', label: 'Suplementos', Icon: IconPill },
  { screen: 'progress', label: 'Progreso', Icon: IconChart },
  { screen: 'settings', label: 'Ajustes', Icon: IconSettings },
]

// Única pieza del shell que conoce la navegación global.
export function TabBar() {
  const screen = useNav((s) => s.screen)
  const go = useNav((s) => s.go)

  return (
    <nav className="pb-safe sticky bottom-0 z-10 flex border-t border-white/5 bg-navy/95 backdrop-blur">
      {TABS.map(({ screen: target, label, Icon }) => {
        const active = screen === target
        return (
          <button
            key={target}
            type="button"
            onClick={() => go(target)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-semibold transition-colors ${
              active ? 'text-teal' : 'text-white/45'
            }`}
          >
            <Icon size={22} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
