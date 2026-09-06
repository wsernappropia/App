// Mini gráfico de línea SVG para tendencias (peso, cintura). Sin librerías.
export interface TrendPoint {
  x: string // etiqueta (fecha corta)
  y: number
}

export interface TrendLineProps {
  points: TrendPoint[]
  height?: number
  color?: string
  unit?: string
  className?: string
}

export function TrendLine({
  points,
  height = 72,
  color = 'var(--color-teal)',
  unit = '',
  className = '',
}: TrendLineProps) {
  if (points.length === 0) {
    return <div className={`text-xs text-white/40 ${className}`}>Sin registros todavía.</div>
  }
  const values = points.map((p) => p.y)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 100
  const pad = 6
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? pad + i * step : width / 2
    const y = pad + (height - pad * 2) * (1 - (p.y - min) / range)
    return { x, y }
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Tendencia">
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.2} fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
        <span>{points[0].x}</span>
        <span className="font-bold text-white/70">
          {points[points.length - 1].y}
          {unit}
        </span>
        <span>{points[points.length - 1].x}</span>
      </div>
    </div>
  )
}
