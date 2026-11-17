'use client'

// Número de WhatsApp de soporte (Juan)
const WA_SOPORTE = '51925988464' // ← Reemplaza con tu número real

type Plan = 'basico' | 'pro' | 'exclusive'

const PLANES: Record<Plan, { label: string; color: string; precio: number; limites: Record<string, number | string> }> = {
  basico: {
    label: 'Básico',
    color: '#8A93A3',
    precio: 45,
    limites: { servicios: 50, comprobantes: 50, consultas: 50 },
  },
  pro: {
    label: 'Pro',
    color: '#21C7B8',
    precio: 90,
    limites: { servicios: 200, comprobantes: 200, consultas: 200 },
  },
  exclusive: {
    label: 'Exclusive',
    color: '#FFC23C',
    precio: 150,
    limites: { servicios: '∞', comprobantes: '∞', consultas: '∞' },
  },
}

const TIPO_LABEL: Record<string, string> = {
  servicios: 'atenciones / servicios',
  comprobantes: 'comprobantes electrónicos',
  consultas: 'consultas de placa',
}

interface Props {
  tipo: 'servicios' | 'comprobantes' | 'consultas'
  planActual?: string
  onCerrar?: () => void
}

export default function LimiteBloqueado({ tipo, planActual = 'basico', onCerrar }: Props) {
  const plan = (PLANES[planActual as Plan] ?? PLANES.basico)
  const limite = plan.limites[tipo]
  const tipoLabel = TIPO_LABEL[tipo] ?? tipo

  // Siguiente plan recomendado
  const siguiente: Plan | null =
    planActual === 'basico' ? 'pro' :
    planActual === 'pro'    ? 'exclusive' : null

  const sigPlan = siguiente ? PLANES[siguiente] : null

  const mensajeWA = encodeURIComponent(
    `Hola, soy cliente de AWTU 🔧\n` +
    `Mi plan actual es *${plan.label}* (S/${plan.precio}/mes) y ya llegué al límite de ${limite} ${tipoLabel} este mes.\n` +
    `Quisiera ${sigPlan ? `actualizar al plan *${sigPlan.label}* (S/${sigPlan.precio}/mes)` : 'conocer mis opciones de upgrade'}.\n\n` +
    `¿Me puedes ayudar? 🙏`
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 text-center" style={{ background: 'rgba(255,106,31,0.08)', borderBottom: '1px solid rgba(255,106,31,0.2)' }}>
          <div className="text-4xl mb-2">🚫</div>
          <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            Límite mensual alcanzado
          </p>
          <p className="text-xs font-bold mt-1" style={{ color: 'var(--text-muted)' }}>
            Llegaste a <span className="font-mono" style={{ color: 'var(--accent)' }}>{limite}</span> {tipoLabel} en tu plan {plan.label}
          </p>
        </div>

        {/* Planes */}
        <div className="p-5 space-y-3">
          <p className="font-display text-[9px] font-bold uppercase tracking-widest text-center mb-3" style={{ color: 'var(--text-muted)' }}>
            Actualiza tu plan para continuar
          </p>

          {Object.entries(PLANES)
            .filter(([key]) => key !== 'basico' || planActual === 'basico')
            .map(([key, p]) => {
              const esCurrent = key === planActual
              const esSiguiente = key === siguiente
              return (
                <div
                  key={key}
                  className="rounded-2xl px-4 py-3 flex items-center justify-between"
                  style={{
                    background: esSiguiente ? p.color + '14' : esCurrent ? 'rgba(255,106,31,0.06)' : 'var(--surface-2)',
                    border: `1px solid ${esSiguiente ? p.color + '40' : esCurrent ? 'rgba(255,106,31,0.25)' : 'var(--border)'}`,
                    opacity: (key === 'basico' && planActual !== 'basico') ? 0.4 : 1,
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: p.color }}>{p.label}</span>
                      {esCurrent && (
                        <span className="font-display text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase" style={{ background: 'rgba(255,106,31,0.15)', color: 'var(--accent)' }}>
                          Tu plan
                        </span>
                      )}
                      {esSiguiente && (
                        <span className="font-display text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase" style={{ background: p.color + '20', color: p.color }}>
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {typeof p.limites[tipo] === 'number'
                        ? `${p.limites[tipo]} ${tipoLabel}/mes`
                        : `Ilimitado`
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-base" style={{ color: 'var(--text)' }}>S/ {p.precio}</p>
                    <p className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>/mes</p>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Botones */}
        <div className="px-5 pb-5 space-y-2">
          {sigPlan && (
            <a
              href={`https://wa.me/${WA_SOPORTE}?text=${mensajeWA}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-display font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
              style={{ background: '#25D366', color: '#fff' }}
            >
              💬 Actualizar a {sigPlan.label} — S/ {sigPlan.precio}/mes
            </a>
          )}
          {!sigPlan && (
            <div className="text-center py-2">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }}>
                ✨ Ya tienes el plan máximo (Exclusive)
              </span>
            </div>
          )}
          {onCerrar && (
            <button
              onClick={onCerrar}
              className="w-full py-3 rounded-2xl font-display font-bold text-xs uppercase tracking-widest"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}