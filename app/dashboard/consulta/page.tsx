'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Servicio = {
  id: string; fecha: string; placa: string; nombre: string; marca: string
  modelo: string; anio: string; km: number; proximo_km: number; monto: number
  aceite_marca: string; aceite_visc: string; aceite_cantidad: number
  filtro_aceite: string; filtro_aire: string; caja_marca: string; caja_tipo: string
  refrig_marca: string; bujia_marca: string; otros_servicios: string
  precio_aceite: number; precio_caja: number; precio_refrig: number
  precio_bujias: number; precio_otros: number; frecuencia: number
  fecha_proxima: string; created_at: string
}

export default function ConsultaPage() {
  const [placa, setPlaca] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ placa: string; servicios: Servicio[] } | null>(null)
  const [error, setError] = useState('')
  const [detalle, setDetalle] = useState<Servicio | null>(null)

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setResultado(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setLoading(false); return }

    const { data: taller } = await supabase.from('talleres').select('id').eq('user_id', user.id).single()
    if (!taller) { setError('Taller no encontrado'); setLoading(false); return }

    const { data: limite } = await supabase.rpc('verificar_limite', { p_taller_id: taller.id, p_tipo: 'consultas' })
    if (!limite) { setError('Límite mensual de consultas alcanzado'); setLoading(false); return }

    const placaNorm = placa.toUpperCase().replace(/-/g, '')
    const { data: todos } = await supabase.from('servicios')
      .select('*').eq('taller_id', taller.id)
      .order('created_at', { ascending: false })

    const filtrados = (todos || []).filter(s =>
      (s.placa || '').toUpperCase().replace(/-/g, '') === placaNorm
    )

    await supabase.rpc('incrementar_uso', { p_taller_id: taller.id, p_tipo: 'consultas' })
    setResultado({ placa: placa.toUpperCase(), servicios: filtrados })
    setLoading(false)
  }

  const ItemDetalle = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
    <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: color + '20' }}>
        <span>{icon}</span>
      </div>
      <div>
        <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-bold uppercase" style={{ color: 'var(--text)' }}>{value}</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Consulta por Placa</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Historial completo del vehículo</p>
      </div>

      <form onSubmit={handleConsultar} className="flex gap-3 mb-6">
        <input value={placa} onChange={e => setPlaca(e.target.value)} required
          placeholder="Ej: ABC-123"
          className="inp font-mono flex-1 text-lg uppercase tracking-widest"
          style={{ color: 'var(--accent-teal)' }} />
        <button type="submit" disabled={loading}
          className="font-display font-bold px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
          style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
          {loading ? '...' : '🔍 Buscar'}
        </button>
      </form>

      {error && (
        <div className="px-4 py-3 rounded-xl font-bold text-sm mb-4 border"
          style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
          ❌ {error}
        </div>
      )}

      {resultado && (
        <div className="card">
          {/* Header placa */}
          <div className="flex items-center gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="font-display w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl"
              style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.4)', color: 'var(--accent-teal)' }}>
              {resultado.placa.slice(0, 3)}
            </div>
            <div>
              <p className="font-mono text-2xl font-bold tracking-widest" style={{ color: 'var(--text)' }}>{resultado.placa}</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                {resultado.servicios.length} atención(es) registrada(s)
                {resultado.servicios[0] && ` · ${resultado.servicios[0].marca} ${resultado.servicios[0].modelo}`}
              </p>
              {resultado.servicios[0]?.proximo_km && (
                <p className="font-display text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block mt-1"
                  style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}>
                  Próximo servicio: {Number(resultado.servicios[0].proximo_km).toLocaleString()} km
                </p>
              )}
            </div>
          </div>

          {resultado.servicios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Sin atenciones para esta placa</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resultado.servicios.map((s, i) => {
                const desc = [
                  s.aceite_marca ? `${s.aceite_marca} ${s.aceite_visc || ''} ${s.aceite_cantidad ? s.aceite_cantidad + 'Lt' : ''}`.trim() : '',
                  s.filtro_aceite ? `Filtro: ${s.filtro_aceite}` : '',
                  s.caja_marca ? `Caja: ${s.caja_marca}` : '',
                  s.otros_servicios || '',
                ].filter(Boolean).join(' · ') || 'Servicio general'

                return (
                  <div key={s.id} onClick={() => setDetalle(detalle?.id === s.id ? null : s)}
                    className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border"
                    style={i === 0
                      ? { background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)' }
                      : { background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={i === 0 ? { background: 'var(--accent-teal)' } : { background: 'var(--border)' }}>
                      <span className="text-xs" style={{ color: i === 0 ? 'var(--bg)' : 'var(--text-muted)' }}>🔧</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-xs font-bold uppercase" style={{ color: 'var(--text)' }}>{s.fecha || new Date(s.created_at).toLocaleDateString('es-PE')}</p>
                        {i === 0 && (
                          <span className="font-display text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase"
                            style={{ background: 'rgba(33,199,184,0.15)', color: 'var(--accent-teal)' }}>Último</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                      {s.km && <p className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{Number(s.km).toLocaleString()} km</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold" style={{ color: 'var(--accent-teal)' }}>S/ {(s.monto || 0).toFixed(2)}</p>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>›</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Modal detalle inline */}
          {detalle && (
            <div className="mt-4 rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Detalle del servicio — {detalle.fecha}</p>
                <button onClick={() => setDetalle(null)} className="font-bold transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {detalle.aceite_marca && <ItemDetalle icon="🛢️" label="Aceite Motor" value={`${detalle.aceite_marca} ${detalle.aceite_visc || ''}`} color="#21C7B8" />}
                {detalle.filtro_aceite && <ItemDetalle icon="🔵" label="Filtro Aceite" value={detalle.filtro_aceite} color="#60a5fa" />}
                {detalle.filtro_aire && <ItemDetalle icon="💨" label="Filtro Aire" value={detalle.filtro_aire} color="#06b6d4" />}
                {detalle.caja_marca && <ItemDetalle icon="⚙️" label="Aceite Caja" value={`${detalle.caja_marca} (${detalle.caja_tipo})`} color="#FF6A1F" />}
                {detalle.refrig_marca && <ItemDetalle icon="🌡️" label="Refrigerante" value={detalle.refrig_marca} color="#f87171" />}
                {detalle.bujia_marca && <ItemDetalle icon="⚡" label="Bujías" value={detalle.bujia_marca} color="#FFC23C" />}
                {detalle.otros_servicios && <ItemDetalle icon="🔧" label="Otros" value={detalle.otros_servicios} color="#8A93A3" />}
              </div>
              {detalle.proximo_km && (
                <div className="rounded-xl p-3 mt-2" style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.25)' }}>
                  <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }}>Próximo servicio</p>
                  <p className="font-mono font-bold" style={{ color: 'var(--text)' }}>{Number(detalle.proximo_km).toLocaleString()} km</p>
                  {detalle.fecha_proxima && <p className="text-xs font-bold" style={{ color: 'var(--accent-teal)' }}>Fecha estimada: {detalle.fecha_proxima}</p>}
                </div>
              )}
              <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Total cobrado</span>
                <span className="font-mono font-bold text-lg" style={{ color: 'var(--text)' }}>S/ {(detalle.monto || 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
