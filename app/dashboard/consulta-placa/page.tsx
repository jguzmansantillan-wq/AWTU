'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import LimiteBloqueado from '@/components/LimiteBloqueado'

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

type Comprobante = {
  id: string; tipo: string; serie: string; numero: number
  cliente_nombre: string; cliente_doc: string; monto: number
  estado_sunat: string; fecha_emision: string; created_at: string
  payload?: {
    items?: { descripcion: string; precio: number }[]
    subtotal?: number; igv?: number; igv_pct?: number
    pdf_base64?: string; entorno?: string
  }
}

export default function ConsultaPage() {
  const [placa, setPlaca] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ placa: string; servicios: Servicio[] } | null>(null)
  const [error, setError] = useState('')
  const [detalle, setDetalle] = useState<Servicio | null>(null)
  const [showLimite, setShowLimite] = useState(false)
  const [planActual, setPlanActual] = useState('basico')

  // Comprobantes por servicio_id
  const [comprobantes, setComprobantes] = useState<Record<string, Comprobante>>({})
  const [modalComprobante, setModalComprobante] = useState<Comprobante | null>(null)

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setResultado(null); setDetalle(null)
    setComprobantes({}); setModalComprobante(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setLoading(false); return }

    const { data: taller } = await supabase.from('talleres').select('id, plan').eq('user_id', user.id).single()
    if (!taller) { setError('Taller no encontrado'); setLoading(false); return }

    setPlanActual(taller.plan || 'basico')

    const { data: limite } = await supabase.rpc('verificar_limite', { p_taller_id: taller.id, p_tipo: 'consultas' })
    if (!limite) {
      setShowLimite(true)
      setLoading(false)
      return
    }

    const placaNorm = placa.toUpperCase().replace(/-/g, '')
    const { data: todos } = await supabase.from('servicios')
      .select('*').eq('taller_id', taller.id)
      .order('created_at', { ascending: false })

    const filtrados = (todos || []).filter(s =>
      (s.placa || '').toUpperCase().replace(/-/g, '') === placaNorm
    )

    // Buscar comprobantes para estos servicios
    if (filtrados.length > 0) {
      const ids = filtrados.map(s => s.id)
      const { data: comps } = await supabase.from('comprobantes')
        .select('*').in('servicio_id', ids)
      if (comps && comps.length > 0) {
        const mapa: Record<string, Comprobante> = {}
        comps.forEach(c => { if (c.servicio_id) mapa[c.servicio_id] = c })
        setComprobantes(mapa)
      }
    }

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

  const primerServicio = resultado?.servicios?.[0]
  const nombreCliente = primerServicio?.nombre || ''
  const vehiculo = [primerServicio?.marca, primerServicio?.modelo].filter(Boolean).join(' ') || ''

  return (
    <div className="max-w-2xl mx-auto">

      {/* Modal límite alcanzado */}
      {showLimite && (
        <LimiteBloqueado
          tipo="consultas"
          planActual={planActual}
          onCerrar={() => setShowLimite(false)}
        />
      )}

      {/* MODAL COMPROBANTE */}
      {modalComprobante && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalComprobante(null) }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'rgba(33,199,184,0.15)', border: '1px solid rgba(33,199,184,0.4)' }}>🧾</div>
                <div>
                  <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>
                    {modalComprobante.tipo === 'factura' ? 'Factura Electrónica' : 'Boleta de Venta'}
                  </p>
                  <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {modalComprobante.serie}-{String(modalComprobante.numero).padStart(6, '0')}
                  </p>
                </div>
              </div>
              <button onClick={() => setModalComprobante(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">

              {/* Estado */}
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {modalComprobante.fecha_emision || new Date(modalComprobante.created_at).toLocaleDateString('es-PE')}
                </span>
                <span className="font-display text-[9px] font-bold px-3 py-1 rounded-xl uppercase tracking-widest"
                  style={{
                    background: modalComprobante.estado_sunat === 'emitido' ? 'rgba(33,199,184,0.1)' : 'rgba(255,194,60,0.1)',
                    color: modalComprobante.estado_sunat === 'emitido' ? 'var(--accent-teal)' : 'var(--accent-yellow)',
                    border: `1px solid ${modalComprobante.estado_sunat === 'emitido' ? 'rgba(33,199,184,0.3)' : 'rgba(255,194,60,0.3)'}`,
                  }}>
                  {modalComprobante.estado_sunat === 'emitido' ? '✓ Emitido SUNAT' : modalComprobante.estado_sunat}
                </span>
              </div>

              {/* Cliente */}
              <div className="rounded-2xl p-4 space-y-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cliente</p>
                <p className="font-bold text-sm uppercase" style={{ color: 'var(--text)' }}>{modalComprobante.cliente_nombre}</p>
                {modalComprobante.cliente_doc && (
                  <p className="font-mono text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    {modalComprobante.tipo === 'factura' ? 'RUC' : 'DNI'}: {modalComprobante.cliente_doc}
                  </p>
                )}
              </div>

              {/* Items */}
              {modalComprobante.payload?.items && modalComprobante.payload.items.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex justify-between px-4 py-2" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <span className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Descripción</span>
                    <span className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Precio</span>
                  </div>
                  {modalComprobante.payload.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3"
                      style={{ borderBottom: i < (modalComprobante.payload?.items?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span className="font-bold text-xs uppercase flex-1 mr-4" style={{ color: 'var(--text)' }}>{item.descripcion}</span>
                      <span className="font-mono font-bold text-xs shrink-0" style={{ color: 'var(--accent-teal)' }}>S/ {(item.precio || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totales */}
              <div className="space-y-2 pt-1">
                {modalComprobante.payload?.subtotal != null && (
                  <div className="flex justify-between text-xs">
                    <span className="font-bold" style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>S/ {Number(modalComprobante.payload.subtotal).toFixed(2)}</span>
                  </div>
                )}
                {modalComprobante.payload?.igv != null && (
                  <div className="flex justify-between text-xs">
                    <span className="font-bold" style={{ color: 'var(--text-muted)' }}>IGV ({modalComprobante.payload.igv_pct || 18}%)</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>S/ {Number(modalComprobante.payload.igv).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 rounded-2xl px-4 py-3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total</span>
                  <span className="font-mono font-bold text-xl" style={{ color: 'var(--text)' }}>S/ {(modalComprobante.monto || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Demo badge */}
              {modalComprobante.payload?.entorno === 'prueba' && (
                <p className="text-center font-display text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--accent-yellow)' }}>🧪 Comprobante de prueba — no tiene validez fiscal</p>
              )}

              {/* Descargar PDF si existe */}
              {modalComprobante.payload?.pdf_base64 && (
                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = modalComprobante.payload!.pdf_base64!
                    link.download = `${modalComprobante.serie}-${String(modalComprobante.numero).padStart(6, '0')}.pdf`
                    link.click()
                  }}
                  className="w-full font-display font-bold text-sm uppercase tracking-widest py-3 rounded-2xl transition-all"
                  style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
                  ⬇ Descargar PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Consulta por Placa</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Historial completo del vehículo</p>
      </div>

      <form onSubmit={handleConsultar} className="flex gap-3 mb-6">
        <input value={placa} onChange={e => setPlaca(e.target.value)} required
          placeholder="Ej: ABC-123"
          className="inp font-mono flex-1 min-w-0 text-lg uppercase tracking-widest"
          style={{ color: 'var(--accent-teal)', width: 'auto' }} />
        <button type="submit" disabled={loading}
          className="font-display font-bold px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm shrink-0"
          style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
          {loading ? '...' : '🔍 Buscar'}
        </button>
      </form>

      {error && (
        <div className="px-4 py-3 rounded-xl font-bold text-sm mb-4 border"
          style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
          ⚠ {error}
        </div>
      )}

      {resultado && (
        <div className="card space-y-4">
          {/* Cabecera del vehículo */}
          <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-sm shrink-0"
              style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
              {resultado.placa.slice(0, 3)}
            </div>
            <div>
              <p className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>
                {resultado.placa}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {resultado.servicios.length} atención(es) registrada(s)
                </p>
                {vehiculo && (
                  <>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <p className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {vehiculo}
                    </p>
                  </>
                )}
              </div>
              {nombreCliente && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs">👤</span>
                  <p className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }}>
                    {nombreCliente}
                  </p>
                </div>
              )}
            </div>
          </div>

          {resultado.servicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10" style={{ color: 'var(--text-muted)' }}>
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-display font-bold text-sm uppercase tracking-widest">Sin atenciones para esta placa</p>
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

                const comp = comprobantes[s.id]

                return (
                  <div key={s.id}>
                    <div onClick={() => setDetalle(detalle?.id === s.id ? null : s)}
                      className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border"
                      style={i === 0
                        ? { background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)' }
                        : { background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={i === 0 ? { background: 'var(--accent-teal)' } : { background: 'var(--border)' }}>
                        <span className="text-xs" style={{ color: i === 0 ? 'var(--bg)' : 'var(--text-muted)' }}>🔧</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display text-xs font-bold uppercase" style={{ color: 'var(--text)' }}>{s.fecha || new Date(s.created_at).toLocaleDateString('es-PE')}</p>
                          {i === 0 && (
                            <span className="font-display text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase"
                              style={{ background: 'rgba(33,199,184,0.15)', color: 'var(--accent-teal)' }}>Último</span>
                          )}
                          {comp && (
                            <span className="font-display text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase"
                              style={{ background: 'rgba(33,199,184,0.1)', color: 'var(--accent-teal)', border: '1px solid rgba(33,199,184,0.3)' }}>
                              🧾 Comprobante
                            </span>
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

                    {/* Detalle expandible */}
                    {detalle?.id === s.id && (
                      <div className="mt-2 rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Detalle del servicio – {s.fecha}</p>
                          <button onClick={() => setDetalle(null)} className="font-bold" style={{ color: 'var(--text-muted)' }}>✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {s.aceite_marca && <ItemDetalle icon="🛢️" label="Aceite Motor" value={`${s.aceite_marca} ${s.aceite_visc || ''}`} color="#21C7B8" />}
                          {s.filtro_aceite && <ItemDetalle icon="🔵" label="Filtro Aceite" value={s.filtro_aceite} color="#60a5fa" />}
                          {s.filtro_aire && <ItemDetalle icon="💨" label="Filtro Aire" value={s.filtro_aire} color="#06b6d4" />}
                          {s.caja_marca && <ItemDetalle icon="⚙️" label="Aceite Caja" value={`${s.caja_marca} (${s.caja_tipo})`} color="#FF6A1F" />}
                          {s.refrig_marca && <ItemDetalle icon="🌡️" label="Refrigerante" value={s.refrig_marca} color="#f87171" />}
                          {s.bujia_marca && <ItemDetalle icon="⚡" label="Bujías" value={s.bujia_marca} color="#FFC23C" />}
                          {s.otros_servicios && <ItemDetalle icon="🔧" label="Otros" value={s.otros_servicios} color="#8A93A3" />}
                        </div>
                        {s.proximo_km > 0 && (
                          <div className="rounded-xl p-3" style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.25)' }}>
                            <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }}>Próximo servicio</p>
                            <p className="font-mono font-bold" style={{ color: 'var(--text)' }}>{Number(s.proximo_km).toLocaleString()} km</p>
                            {s.fecha_proxima && <p className="text-xs font-bold" style={{ color: 'var(--accent-teal)' }}>Fecha estimada: {s.fecha_proxima}</p>}
                          </div>
                        )}
                        <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                          <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Total cobrado</span>
                          <span className="font-mono font-bold text-lg" style={{ color: 'var(--text)' }}>S/ {(s.monto || 0).toFixed(2)}</span>
                        </div>

                        {/* BOTÓN VER COMPROBANTE */}
                        {comp && (
                          <button
                            onClick={() => setModalComprobante(comp)}
                            className="w-full font-display font-bold text-sm uppercase tracking-widest py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            style={{ background: 'rgba(33,199,184,0.1)', color: 'var(--accent-teal)', border: '1px solid rgba(33,199,184,0.3)' }}>
                            🧾 Ver Comprobante de Pago
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}