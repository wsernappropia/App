import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      {icon && <div className="text-white/30">{icon}</div>}
      <h3 className="text-lg font-extrabold text-white">{title}</h3>
      {description && <p className="max-w-xs text-sm text-white/50">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
