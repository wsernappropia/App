// Set de iconos SVG inline, minimalistas (stroke), usados en todo el shell de UI.
import type { SVGProps } from 'react'

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

function base(size: number | undefined, props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props
  return {
    width: size ?? 22,
    height: size ?? 22,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    ...rest,
  }
}

export function IconHome({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function IconUtensils({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M7 3v7a2 2 0 0 0 2 2v9" />
      <path d="M7 3v5M10 3v5" />
      <path d="M17 3c-1.5 1.5-2 3-2 5.5S16 13 17 13v9" />
    </svg>
  )
}

export function IconPill({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="3.5" y="9.5" width="17" height="7" rx="3.5" transform="rotate(-45 12 13)" />
      <path d="M9 9.5 15.5 16" />
    </svg>
  )
}

export function IconChart({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M4 20V4M4 20h16" />
      <rect x="7" y="12" width="3" height="6" rx="0.5" />
      <rect x="12" y="8" width="3" height="10" rx="0.5" />
      <rect x="17" y="14" width="3" height="4" rx="0.5" />
    </svg>
  )
}

export function IconSettings({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L15 3.5h-6l-.3 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.3 2.6h6l.3-2.6a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z" />
    </svg>
  )
}

export function IconBack({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  )
}

export function IconFlame({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2 2 4a5 5 0 0 1-10 0c0-5 4-6 5-12Z" />
    </svg>
  )
}

export function IconShield({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
    </svg>
  )
}

export function IconBolt({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  )
}

export function IconCheck({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="m4 12 6 6L20 6" />
    </svg>
  )
}

export function IconPlus({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconMinus({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M5 12h14" />
    </svg>
  )
}

export function IconPlay({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M7 4.5v15l13-7.5Z" />
    </svg>
  )
}

export function IconPause({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
    </svg>
  )
}

export function IconWalk({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="13" cy="4" r="1.8" fill="currentColor" stroke="none" />
      <path d="M10.5 9 8 14l-2.5 2M10.5 9l2 2 3.5 1.5-1 5.5M12.5 11l3-1 2 2.5" />
      <path d="M13.5 15 11 22" />
    </svg>
  )
}

export function IconDumbbell({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M6 8v8M4 10v4M20 10v4M18 8v8" />
      <path d="M6 12h12" />
    </svg>
  )
}

export function IconWater({ size, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
    </svg>
  )
}
