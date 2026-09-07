// Switch táctil (on/off). Pista fija w-14/h-8, knob absoluto anclado con
// left-1/top-1 y desplazado con translate-x explícito para que quede SIEMPRE
// dentro de la pista, sin depender de la posición estática por defecto del
// navegador (que en Chrome Android resolvía el knob fuera de la pista).
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-teal' : 'bg-white/15'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <span
        className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(1.5rem)' : 'translateX(0)' }}
      />
    </button>
  )
}
