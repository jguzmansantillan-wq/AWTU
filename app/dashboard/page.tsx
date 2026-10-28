'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Gauge from '@/components/Gauge'

type Servicio = {
  id: string; placa: string; nombre: string; telefono?: string
  marca: string; modelo?: string; monto: number; fecha: string
  km?: number; proximo_km?: number; frecuencia?: number; km_diarios?: number
  fecha_proxima?: string; cumpleanos?: string; created_at: string
}

type Venta = { id: string; total?: number; monto: number; created_at: string }

export default function ResumenPage() {
  const router = useRouter()
  const [tallerID, setTallerID] = useState('')
  const [todosServicios, setTodosServicios] = useState<Servicio[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: t } = await supabase.from('talleres').select('id').eq('user_id', user.id).single()
      if (!t) return
      setTallerID(t.id)
      await cargar(t.id)
      setLoading(false)
    }
    init()
  }, [])

  const cargar = async (tid: string) => {
    const { data: svcs } = await supabase.from('servicios')
      .select('id, placa, nombre, telefono, marca, modelo, monto, fecha, km, proximo_km, frecuencia, km_diarios, fecha_proxima, cumpleanos, created_at')
      .eq('taller_id', tid).order('created_at', { ascending: false })
    setTodosServicios(svcs || [])
    const { data: vnts } = await supabase.from('ventas')
      .select('id, monto, created_at').eq('taller_id', tid)
    setVentas(vnts || [])
  }

  const cambiarPeriodo = async (mes: string) => {
    setPeriodo(mes)
    if (tallerID) { setLoading(true); await cargar(tallerID); setLoading(false) }
  }

  const abrirWhatsApp = (telefono: string, mensaje: string, nombre: string) => {
    if (!telefono) { alert(`${nombre} no tiene teléfono registrado`); return }
    const tel = telefono.replace(/\D/g, '')
    window.open(`https://wa.me/51${tel}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const eliminarRecordatorio = async (id: string) => {
    if (!confirm('¿Marcar este recordatorio como enviado y eliminarlo de la lista?')) return
    await supabase.from('servicios').update({ fecha_proxima: null, proximo_km: null }).eq('id', id)
    setTodosServicios(prev => prev.map(s => s.id === id ? { ...s, fecha_proxima: undefined, proximo_km: undefined } : s))
  }

  const serviciosMes = todosServicios.filter(s => s.created_at?.slice(0, 7) === periodo)
  const ventasMes = ventas.filter(v => v.created_at?.slice(0, 7) === periodo)

  const totalServicios = serviciosMes.length
  const totalVentasMes = ventasMes.length
  const totalOperaciones = totalServicios + totalVentasMes
  const ingresosServicios = serviciosMes.reduce((s, r) => s + (r.monto || 0), 0)
  const ingresosVentas = ventasMes.reduce((s, v) => s + (v.monto || 0), 0)
  const ingresosTotales = ingresosServicios + ingresosVentas
  const ticketPromedio = totalOperaciones > 0 ? ingresosTotales / totalOperaciones : 0

  const hoy = new Date()

  const proximosMantenimiento = todosServicios.filter(s => {
    if (!s.fecha_proxima || !s.proximo_km) return false
    const fp = new Date(s.fecha_proxima)
    const diff = Math.ceil((fp.getTime() - hoy.getTime()) / 86400000)
    return diff >= 0 && diff <= 15
  }).map(s => {
    const fp = new Date(s.fecha_proxima!)
    const diff = Math.ceil((fp.getTime() - hoy.getTime()) / 86400000)
    return { ...s, diasRestantes: diff }
  }).sort((a, b) => a.diasRestantes - b.diasRestantes)

  const cumpleanos = todosServicios.filter(s => {
    if (!s.cumpleanos) return false
    try {
      const parts = s.cumpleanos.split('-')
      const mm = parseInt(parts[1])
      const dd = parseInt(parts[2])
      const fecha = new Date(hoy.getFullYear(), mm - 1, dd)
      const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / 86400000)
      return diff >= 0 && diff <= 7
    } catch { return false }
  }).map(s => {
    const parts = s.cumpleanos!.split('-')
    const mm = parseInt(parts[1])
    const dd = parseInt(parts[2])
    const fecha = new Date(hoy.getFullYear(), mm - 1, dd)
    const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / 86400000)
    return { ...s, diasRestantes: diff }
  })

  const marcasMap: Record<string, number> = {}
  serviciosMes.forEach(s => {
    const m = (s.marca || 'Sin marca').toUpperCase()
    marcasMap[m] = (marcasMap[m] || 0) + 1
  })
  const marcasArr = Object.entries(marcasMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const totalMarcas = marcasArr.reduce((s, [, v]) => s + v, 0)
  const COLORES = ['var(--accent-teal)', 'var(--accent)', 'var(--accent-yellow)', '#a78bfa', '#f87171', '#22d3ee']
  const maxMonto = Math.max(...serviciosMes.map(s => s.monto || 0), 1)

  const periodoLabel = () => {
    const [y, m] = periodo.split('-')
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${meses[parseInt(m)]} de ${y}`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4" style={{ border: '4px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
        <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      </div>
    </div>
  )

  // Referencias de escala para los gauges (ajustables según el negocio)
  const refOperaciones = Math.max(totalOperaciones, 40)
  const refIngresos = Math.max(ingresosTotales, 1000)
  const refTicket = Math.max(ticketPromedio, 100)

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Panel de Estadísticas</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Periodo: {periodoLabel()}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-base" style={{ color: 'var(--accent-teal)' }}>📅</span>
          <div>
            <p className="font-display text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: 'var(--text-muted)' }}>Periodo</p>
            <input type="month" value={periodo} onChange={e => cambiarPeriodo(e.target.value)}
              className="font-mono font-bold text-sm outline-none bg-transparent" style={{ color: 'var(--text)' }} />
          </div>
        </div>
      </div>

      {/* KPIs con gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Operaciones', sub: `${totalServicios} serv. · ${totalVentasMes} ventas`, value: totalOperaciones, max: refOperaciones, display: totalOperaciones.toString(), color: 'var(--accent-teal)', icon: '🚗', href: '/dashboard/historial' },
          { label: 'Ingresos', sub: 'Servicios + ventas', value: ingresosTotales, max: refIngresos, display: `S/${ingresosTotales.toFixed(0)}`, color: 'var(--accent)', icon: '💰', href: '/dashboard/historial' },
          { label: 'Tkt. Promedio', sub: 'Por operación', value: ticketPromedio, max: refTicket, display: `S/${ticketPromedio.toFixed(0)}`, color: 'var(--accent-yellow)', icon: '📈', href: '/dashboard/historial' },
          { label: 'Facturado', sub: 'Comprobantes', value: 0, max: 1, display: 'S/0', color: '#a78bfa', icon: '🧾', href: '/dashboard/documentos' },
        ].map(k => (
          <div key={k.label} onClick={() => router.push(k.href)}
            className="card cursor-pointer transition-all flex items-center justify-center"
            onMouseEnter={e => e.currentTarget.style.borderColor = k.color + '60'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <Gauge value={k.value} max={k.max} label={k.label} displayValue={k.display} sub={k.sub} color={k.color} size={108} />
          </div>
        ))}
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Próximos mantenimientos — con scroll y botón eliminar */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,106,31,0.12)' }}>🔔</div>
              <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Próximos Mantenimientos</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[9px] font-bold px-2.5 py-1 rounded-xl" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>15 días</span>
              {proximosMantenimiento.length > 0 && (
                <span className="font-display text-[9px] font-bold px-2.5 py-1 rounded-xl" style={{ background: 'rgba(255,106,31,0.12)', border: '1px solid rgba(255,106,31,0.3)', color: 'var(--accent)' }}>{proximosMantenimiento.length}</span>
              )}
            </div>
          </div>

          {proximosMantenimiento.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No hay mantenimientos próximos agendados.</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
              <div className="p-3 space-y-2">
                {proximosMantenimiento.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{ background: 'rgba(255,106,31,0.06)', border: '1px solid rgba(255,106,31,0.2)' }}>
                    <div className="font-display w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                      {s.placa?.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-bold uppercase" style={{ color: 'var(--text)' }}>{s.placa} · {s.nombre}</p>
                      <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{s.marca} · Próximo: {s.proximo_km?.toLocaleString()} km</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="font-display text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,106,31,0.15)', color: 'var(--accent)' }}>{s.diasRestantes}d</span>
                      {s.telefono && (
                        <button
                          onClick={() => abrirWhatsApp(
                            s.telefono || '',
                            `Hola ${s.nombre}, le recordamos que su vehículo *${s.placa}* (${s.marca}) está próximo a su mantenimiento. Su próximo servicio es a los *${s.proximo_km?.toLocaleString()} km*. ¡Le esperamos en nuestro taller! 🔧`,
                            s.nombre
                          )}
                          className="font-display flex items-center gap-1 text-[9px] font-bold transition-colors" style={{ color: 'var(--accent-teal)' }}>
                          💬 WhatsApp
                        </button>
                      )}
                      <button
                        onClick={() => eliminarRecordatorio(s.id)}
                        title="Marcar como enviado"
                        className="font-display text-[9px] font-bold transition-colors uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                        ✓ Enviado
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cumpleaños */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,114,182,0.12)' }}>🎂</div>
              <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: '#f472b6' }}>Próximos Cumpleaños</p>
            </div>
            <span className="font-display text-[9px] font-bold px-2.5 py-1 rounded-xl" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>7 días</span>
          </div>

          {cumpleanos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-5 text-center">
              <p className="text-4xl mb-2">🎂</p>
              <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Sin cumpleaños en los próximos 7 días</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
              <div className="p-3 space-y-2">
                {cumpleanos.map((s, i) => {
                  const parts = (s.cumpleanos || '--').split('-')
                  const dd = parts[2]; const mm = parts[1]
                  return (
                    <div key={i}
                      onClick={() => abrirWhatsApp(
                        s.telefono || '',
                        `¡Hola ${s.nombre}! 🎂🎉 Todo el equipo de nuestro taller le desea un muy ¡*Feliz Cumpleaños*! Esperamos que pase un día muy especial junto a sus seres queridos. ¡Muchas felicidades! 🎊✨`,
                        s.nombre
                      )}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.2)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: '#f472b6' }}>🎂</div>
                      <div className="flex-1">
                        <p className="font-display text-xs font-bold uppercase" style={{ color: 'var(--text)' }}>{s.nombre}</p>
                        <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{s.placa} · {dd}/{mm} · en {s.diasRestantes}d</p>
                      </div>
                      <div className="text-right shrink-0">
                        {s.telefono && <p className="font-mono text-[9px] font-bold" style={{ color: '#f472b6' }}>{s.telefono}</p>}
                        <p className="font-display text-[8px] font-bold mt-1" style={{ color: 'var(--accent-teal)' }}>💬 WhatsApp</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6to mantenimiento */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,194,60,0.06)', border: '1px solid rgba(255,194,60,0.3)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--accent-yellow)' }}>⭐</div>
            <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-yellow)' }}>Próximo Sexto Mantenimiento</p>
          </div>
          <button className="font-display text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest transition-all"
            style={{ background: 'rgba(255,194,60,0.15)', color: 'var(--accent-yellow)' }}>
            🎁 Aplicar Descuento
          </button>
        </div>
        <p className="text-sm font-semibold mt-3" style={{ color: 'var(--accent-yellow)', opacity: 0.85 }}>No hay vehículos próximos a su 6to mantenimiento por ahora.</p>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: 'rgba(33,199,184,0.12)' }}>📊</div>
            <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }}>Ingresos del Mes</p>
          </div>
          {serviciosMes.length === 0 && ventasMes.length === 0 ? (
            <div className="flex items-center justify-center h-44" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <p className="text-4xl mb-2">📊</p>
                <p className="font-display font-bold text-sm uppercase tracking-widest">Sin datos este mes</p>
              </div>
            </div>
          ) : (
            <div className="relative h-48">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                {[maxMonto, maxMonto * 0.75, maxMonto * 0.5, maxMonto * 0.25, 0].map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[8px] font-bold w-12 text-right shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>S/{v.toFixed(0)}</span>
                    <div className="flex-1" style={{ borderTop: '1px dashed var(--border)' }} />
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1 h-full pl-14 pb-6 overflow-x-auto">
                {serviciosMes.slice(0, 20).map((s, i) => {
                  const pct = ((s.monto || 0) / maxMonto) * 100
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-1 min-w-8 flex-1 group cursor-pointer"
                      onClick={() => router.push('/dashboard/historial')}
                      title={`${s.placa} — S/ ${s.monto}`}>
                      <span className="font-mono text-[7px] font-bold opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>S/{s.monto}</span>
                      <div className="w-full rounded-t-lg transition-all group-hover:opacity-75"
                        style={{ height: `${Math.max(pct, 4)}%`, background: i % 2 === 0 ? 'var(--accent-teal)' : 'var(--accent)', minHeight: '4px' }} />
                      <span className="font-display text-[7px] font-bold uppercase truncate max-w-full" style={{ color: 'var(--text-muted)' }}>{s.placa?.slice(0, 6)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="font-display w-7 h-7 rounded-xl flex items-center justify-center text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>🚗</div>
            <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>Marcas Atendidas</p>
          </div>
          {marcasArr.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="font-display font-bold text-xs uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>Sin datos</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <svg viewBox="0 0 120 120" className="w-32 h-32">
                  {(() => {
                    let offset = 0
                    const circ = 2 * Math.PI * 40
                    return marcasArr.map(([marca, count], i) => {
                      const dash = (count / totalMarcas) * circ
                      const el = (
                        <circle key={marca} cx="60" cy="60" r="40"
                          fill="none" stroke={COLORES[i]} strokeWidth="22"
                          strokeDasharray={`${dash} ${circ - dash}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 60 60)" />
                      )
                      offset += dash
                      return el
                    })
                  })()}
                  <circle cx="60" cy="60" r="27" fill="var(--surface)" />
                </svg>
              </div>
              <div className="space-y-2">
                {marcasArr.map(([marca, count], i) => (
                  <div key={marca} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORES[i] }} />
                      <span className="font-display text-[10px] font-bold uppercase" style={{ color: 'var(--text)' }}>{marca}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="card">
        <p className="font-display text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Accesos Rápidos</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/atencion', label: '🚗 Nueva Atención', color: 'var(--accent-teal)' },
            { href: '/dashboard/historial', label: '🕐 Ver Historial', color: 'var(--accent-yellow)' },
            { href: '/dashboard/tienda', label: '🛍️ Tienda POS', color: '#a78bfa' },
            { href: '/dashboard/documentos', label: '🧾 Comprobantes', color: 'var(--text-muted)' },
          ].map(a => (
            <button key={a.href} onClick={() => router.push(a.href)}
              className="font-display active:scale-95 font-bold text-xs uppercase tracking-widest py-4 rounded-2xl transition-all"
              style={{ background: a.color + '1a', border: `1px solid ${a.color}50`, color: a.color }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
