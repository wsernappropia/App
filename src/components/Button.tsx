import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
  children: ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-teal text-navy-deep shadow-[0_4px_0_0_var(--color-teal-deep)] active:shadow-[0_1px_0_0_var(--color-teal-deep)]',
  secondary:
    'bg-white/10 text-white shadow-[0_4px_0_0_rgba(0,0,0,0.35)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.35)]',
  ghost: 'bg-transparent text-white/80 shadow-none active:bg-white/5',
  danger: 'bg-red text-white shadow-[0_4px_0_0_#a52424] active:shadow-[0_1px_0_0_#a52424]',
}

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-11 px-4 text-base rounded-2xl',
  lg: 'h-[52px] px-5 text-lg rounded-2xl',
  xl: 'h-14 px-6 text-lg rounded-[22px]',
}

// Botón "gordo" tipo Duolingo: sombra inferior que se hunde al pulsar (ver .btn-pressable en index.css).
export function Button({
  variant = 'primary',
  size = 'md',
  block,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`btn-pressable inline-flex select-none items-center justify-center gap-2 font-extrabold ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${block ? 'w-full' : ''} ${disabled ? 'cursor-not-allowed opacity-40' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
