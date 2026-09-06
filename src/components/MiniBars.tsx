// Mini gráfico de barras (historial de N días). Sin dependencias externas.
export interface MiniBarsDatum {
  label: string
  value: number
  highlight?: boolean
}

export interface MiniBarsProps {
  data: MiniBarsDatum[]
  goal?: number
  min?: number
  max?: number
  height?: number
  barColor?: string
  goalColor?: string
  minColor?: string
  className?: string
}

// Barras verticales simples con líneas de referencia (meta / mínimo) superpuestas.
export function MiniBars({
  data,
  goal,
  min,
  max,
  height = 96,
  barColor = 'var(--color-teal)',
  goalColor = 'var(--color-green)',
  minColor = 'var(--color-yellow)',
  className = '',
}: MiniBarsProps) {
  const scaleMax = Math.max(max ?? 0, goal ?? 0, ...data.map((d) => d.value), 1) * 1.05
  const linePct = (v: number) => Math.min(100, Math.max(0, (v / scaleMax) * 100))

  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        {typeof goal === 'number' && (
          <div
            className="absolute inset-x-0 border-t border-dashed"
            style={{ bottom: `${linePct(goal)}%`, borderColor: goalColor }}
          />
        )}
        {typeof min === 'number' && (
          <div
            className="absolute inset-x-0 border-t border-dashed"
            style={{ bottom: `${linePct(min)}%`, borderColor: minColor }}
          />
        )}
        <div className="absolute inset-0 flex items-end gap-1.5">
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md transition-[height] duration-300"
              style={{
                height: `${Math.max(2, linePct(d.value))}%`,
                background: d.highlight ? goalColor : barColor,
                opacity: d.value > 0 ? 1 : 0.25,
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] font-semibold text-white/45">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}
