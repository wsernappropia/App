// Gráfico de barras SVG minimalista (sin librerías). Usado en Progreso.
export interface BarChartDatum {
  label: string
  value: number
  highlight?: boolean
}

export interface BarChartProps {
  data: BarChartDatum[]
  height?: number
  color?: string
  highlightColor?: string
  formatValue?: (value: number) => string
  className?: string
}

export function BarChart({
  data,
  height = 96,
  color = 'rgba(255,255,255,0.18)',
  highlightColor = 'var(--color-teal)',
  formatValue,
  className = '',
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const barWidth = 100 / data.length

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        role="img"
        aria-label="Gráfico de barras"
      >
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * (height - 14) : 0
          const x = i * barWidth + barWidth * 0.2
          const w = barWidth * 0.6
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - 14 - h}
                width={w}
                height={Math.max(1, h)}
                rx={2}
                fill={d.highlight ? highlightColor : color}
              />
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex text-[9px] font-semibold text-white/40">
        {data.map((d, i) => (
          <div key={i} style={{ width: `${barWidth}%` }} className="truncate text-center">
            {d.label}
          </div>
        ))}
      </div>
      {formatValue && (
        <div className="mt-0.5 flex text-[9px] text-white/30">
          {data.map((d, i) => (
            <div key={i} style={{ width: `${barWidth}%` }} className="truncate text-center">
              {formatValue(d.value)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
