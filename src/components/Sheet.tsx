import { useEffect, type ReactNode } from 'react'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

// Modal tipo bottom-sheet (onboarding, check-in, cantidades personalizadas...).
export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="pb-safe relative w-full max-w-[480px] rounded-t-[24px] bg-navy pt-3 shadow-2xl animate-[sheet-in_0.22s_ease]">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/20" />
        {title && (
          <div className="flex items-center justify-between px-5 pb-2">
            <h2 className="text-base font-extrabold text-white">{title}</h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-white/60 active:bg-white/10"
            >
              &times;
            </button>
          </div>
        )}
        <div className="max-h-[75vh] overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
