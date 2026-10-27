'use client'

interface GaugeProps {
  value: number          // valor actual (0 a max)
  max: number             // valor máximo de referencia para el arco
  label: string           // etiqueta pequeña arriba (ej: "INGRESOS")
  displayValue: string    // texto grande en el centro (ej: "S/ 1,250.00")
  sub?: string            // texto pequeño debajo del valor (ej: "12 servicios")
  color?: string          // color del arco (default: acento naranja)
  icon?: string           // emoji opcional en la esquina
  size?: number           // tamaño del SVG en px (default 120)
}

export default function Gauge({
  value,
  max,
  label,
  displayValue,
  sub,
  color = 'var(--accent)',
  icon,
  size = 120,
}: GaugeProps) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const radius = 40
  const circ = 2 * Math.PI * radius
  // Arco de 270° (deja un hueco de 90° abajo), estilo "tablero de auto"
  const arcFraction = 0.75
  const arcLength = circ * arcFraction
  const dash = arcLength * pct
  const rotateStart = 135 // empieza abajo-izquierda

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" width={size} height={size}>
          {/* Pista de fondo */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none" stroke="var(--surface-2)" strokeWidth="10"
            strokeDasharray={`${arcLength} ${circ - arcLength}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotateStart} 60 60)`}
          />
          {/* Arco de progreso */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotateStart} 60 60)`}
            style={{ transition: 'stroke-dasharray 0.5s ease', filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          {icon && <span className="text-base leading-none mb-0.5">{icon}</span>}
          <span className="font-mono font-bold leading-tight" style={{ color: 'var(--text)', fontSize: size >= 120 ? '15px' : '13px' }}>
            {displayValue}
          </span>
        </div>
      </div>
      <p className="font-display text-[9px] font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      {sub && (
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          {sub}
        </p>
      )}
    </div>
  )
}
