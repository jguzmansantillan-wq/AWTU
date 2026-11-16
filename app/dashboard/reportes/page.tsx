'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Servicio = {
  id: string; fecha: string; monto: number; nombre: string
  placa?: string; marca?: string; modelo?: string
  metodo_pago: string; created_at: string
  precio_aceite: number; precio_caja: number; precio_refrig: number
  precio_bujias: number; precio_otros: number
  productos_adicionales: any[]
}

type Venta = {
  id: string; fecha: string; monto: number; nombre: string; created_at: string
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatMoney(n: number) {
  return `S/ ${n.toFixed(2)}`
}

function getMesActual() {
  const hoy = new Date()
  return { mes: hoy.getMonth(), anio: hoy.getFullYear() }
}

export default function ReportesPage() {
  const [tallerID,     setTallerID]     = useState('')
  const [servicios,    setServicios]    = useState<Servicio[]>([])
  const [ventas,       setVentas]       = useState<Venta[]>([])
  const [loading,      setLoading]      = useState(true)
  const [mesVer,       setMesVer]       = useState(getMesActual().mes)
  const [anioVer,      setAnioVer]      = useState(getMesActual().anio)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('id').eq('user_id', user.id).single()
      if (!t) return
      setTallerID(t.id)
      await cargarDatos(t.id)
    }
    init()
  }, [])

  const cargarDatos = async (tid: string) => {
    setLoading(true)
    const { data: svcs } = await supabase.from('servicios')
      .select('id,fecha,monto,nombre,placa,marca,modelo,metodo_pago,created_at,precio_aceite,precio_caja,precio_refrig,precio_bujias,precio_otros,productos_adicionales')
      .eq('taller_id', tid)
    const { data: vnts } = await supabase.from('ventas')
      .select('id,fecha,monto,nombre,created_at')
      .eq('taller_id', tid)
    setServicios(svcs || [])
    setVentas(vnts || [])
    setLoading(false)
  }

  // ── Filtrar por mes/año seleccionado ──────────────────────────────────────
  const svcsDelMes = servicios.filter(s => {
    const f = new Date(s.fecha || s.created_at)
    return f.getMonth() === mesVer && f.getFullYear() === anioVer
  })
  const vntasDelMes = ventas.filter(v => {
    const f = new Date(v.fecha || v.created_at)
    return f.getMonth() === mesVer && f.getFullYear() === anioVer
  })

  const ingresosSvcs  = svcsDelMes.reduce((a, s) => a + (s.monto || 0), 0)
  const ingresosVntas = vntasDelMes.reduce((a, v) => a + (v.monto || 0), 0)
  const ingresosTotal = ingresosSvcs + ingresosVntas
  const totalServicios = svcsDelMes.length
  const ticketPromedio = totalServicios > 0 ? ingresosSvcs / totalServicios : 0

  // ── Ingresos por día (servicios) ─────────────────────────────────────────
  const diasDelMes = new Date(anioVer, mesVer + 1, 0).getDate()
  const ingresosPorDia = Array.from({ length: diasDelMes }, (_, i) => {
    const dia = i + 1
    const total = svcsDelMes
      .filter(s => new Date(s.fecha || s.created_at).getDate() === dia)
      .reduce((a, s) => a + (s.monto || 0), 0)
    return { dia, total }
  })
  const maxDia = Math.max(...ingresosPorDia.map(d => d.total), 1)

  // ── Métodos de pago ───────────────────────────────────────────────────────
  const metodos: Record<string, number> = {}
  svcsDelMes.forEach(s => {
    const m = s.metodo_pago || 'efectivo'
    metodos[m] = (metodos[m] || 0) + (s.monto || 0)
  })
  const metodosArr = Object.entries(metodos).sort((a, b) => b[1] - a[1])

  // ── Clientes top ──────────────────────────────────────────────────────────
  const clientesMap: Record<string, { nombre: string; visitas: number; total: number }> = {}
  svcsDelMes.forEach(s => {
    const k = s.nombre?.toLowerCase().trim() || 'sin nombre'
    if (!clientesMap[k]) clientesMap[k] = { nombre: s.nombre || 'Sin nombre', visitas: 0, total: 0 }
    clientesMap[k].visitas++
    clientesMap[k].total += s.monto || 0
  })
  const clientesTop = Object.values(clientesMap).sort((a, b) => b.total - a.total).slice(0, 5)

  // ── Servicios más realizados ──────────────────────────────────────────────
  const svcsMap: Record<string, number> = {}
  svcsDelMes.forEach(s => {
    if (s.precio_aceite   > 0) svcsMap['Cambio de aceite']    = (svcsMap['Cambio de aceite']    || 0) + 1
    if (s.precio_caja     > 0) svcsMap['Aceite de caja']      = (svcsMap['Aceite de caja']      || 0) + 1
    if (s.precio_refrig   > 0) svcsMap['Refrigerante']        = (svcsMap['Refrigerante']        || 0) + 1
    if (s.precio_bujias   > 0) svcsMap['Bujías']              = (svcsMap['Bujías']              || 0) + 1
    if (s.precio_otros    > 0) svcsMap['Otros servicios']     = (svcsMap['Otros servicios']     || 0) + 1
    if (Array.isArray(s.productos_adicionales) && s.productos_adicionales.length > 0)
      svcsMap['Productos adicionales'] = (svcsMap['Productos adicionales'] || 0) + 1
  })
  const svcsTop = Object.entries(svcsMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // ── Ingresos últimos 6 meses ──────────────────────────────────────────────
  const ultimos6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(anioVer, mesVer - i, 1)
    const m = d.getMonth(); const a = d.getFullYear()
    const total = servicios
      .filter(s => { const f = new Date(s.fecha || s.created_at); return f.getMonth() === m && f.getFullYear() === a })
      .reduce((acc, s) => acc + (s.monto || 0), 0)
    return { label: `${MESES[m]} ${a}`, total }
  }).reverse()
  const max6 = Math.max(...ultimos6.map(d => d.total), 1)

  // ── Navegación de meses ───────────────────────────────────────────────────
  const irMesAnterior = () => {
    if (mesVer === 0) { setMesVer(11); setAnioVer(a => a - 1) }
    else setMesVer(m => m - 1)
  }
  const irMesSiguiente = () => {
    const hoy = getMesActual()
    if (anioVer === hoy.anio && mesVer === hoy.mes) return
    if (mesVer === 11) { setMesVer(0); setAnioVer(a => a + 1) }
    else setMesVer(m => m + 1)
  }
  const esMesActual = mesVer === getMesActual().mes && anioVer === getMesActual().anio

  const coloresMetodo: Record<string, string> = {
    efectivo: 'bg-emerald-500', yape: 'bg-purple-500', plin: 'bg-blue-500',
    transferencia: 'bg-orange-500', tarjeta: 'bg-pink-500',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">📊</div>
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Cargando reportes...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Reportes</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Análisis de ingresos y actividad del taller</p>
        </div>
        {/* Selector de mes */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
          <button onClick={irMesAnterior} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-slate-600 transition-all">‹</button>
          <span className="font-black text-slate-800 text-sm w-28 text-center">{MESES[mesVer]} {anioVer}</span>
          <button onClick={irMesSiguiente} disabled={esMesActual}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center font-black text-slate-600 transition-all">›</button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos totales', value: formatMoney(ingresosTotal), sub: `Svcs: ${formatMoney(ingresosSvcs)} · Ventas: ${formatMoney(ingresosVntas)}`, color: 'bg-blue-600', icon: '💰' },
          { label: 'Servicios',        value: totalServicios.toString(),   sub: `${vntasDelMes.length} ventas POS`,                                            color: 'bg-emerald-600', icon: '🔧' },
          { label: 'Ticket promedio',  value: formatMoney(ticketPromedio), sub: 'Por servicio',                                                                color: 'bg-purple-600', icon: '🎫' },
          { label: 'Clientes únicos',  value: Object.keys(clientesMap).length.toString(), sub: 'Este mes',                                                     color: 'bg-orange-500', icon: '👤' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all">
            <div className={`w-10 h-10 ${kpi.color} rounded-xl flex items-center justify-center text-lg mb-3 shadow-sm`}>{kpi.icon}</div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
            <p className="font-black text-slate-900 text-2xl mt-1">{kpi.value}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico ingresos por día */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingresos por día — {MESES[mesVer]} {anioVer}</p>
        {ingresosSvcs === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-slate-300 font-bold text-sm">Sin ingresos este mes</p>
          </div>
        ) : (
          <div className="flex items-end gap-0.5 h-32">
            {ingresosPorDia.map(({ dia, total }) => (
              <div key={dia} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className={`w-full rounded-t-sm transition-all ${total > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-slate-100'}`}
                  style={{ height: `${Math.max((total / maxDia) * 100, total > 0 ? 4 : 0)}%` }}
                />
                {total > 0 && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10">
                    S/{total.toFixed(0)}
                  </div>
                )}
                {(dia === 1 || dia % 5 === 0 || dia === diasDelMes) && (
                  <span className="text-[8px] text-slate-400 font-bold">{dia}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comparativo últimos 6 meses */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingresos últimos 6 meses</p>
        <div className="flex items-end gap-3 h-28">
          {ultimos6.map(({ label, total }, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[9px] font-black text-slate-500">{total > 0 ? `S/${total.toFixed(0)}` : ''}</span>
              <div className="w-full flex flex-col justify-end" style={{ height: '72px' }}>
                <div
                  className={`w-full rounded-t-lg transition-all ${i === 5 ? 'bg-blue-600' : 'bg-slate-200'}`}
                  style={{ height: `${Math.max((total / max6) * 100, total > 0 ? 6 : 0)}%` }}
                />
              </div>
              <span className="text-[8px] font-bold text-slate-400 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Clientes top */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Clientes top del mes</p>
          {clientesTop.length === 0 ? (
            <p className="text-slate-300 font-bold text-sm text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2.5">
              {clientesTop.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 ${
                    i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-400' : 'bg-slate-200 text-slate-500'
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate capitalize">{c.nombre.toLowerCase()}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{c.visitas} visita{c.visitas > 1 ? 's' : ''}</p>
                  </div>
                  <p className="font-black text-slate-900 shrink-0">{formatMoney(c.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Métodos de pago */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Métodos de pago</p>
          {metodosArr.length === 0 ? (
            <p className="text-slate-300 font-bold text-sm text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {metodosArr.map(([metodo, monto], i) => {
                const pct = Math.round((monto / ingresosSvcs) * 100)
                const color = coloresMetodo[metodo.toLowerCase()] || 'bg-slate-400'
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-slate-700 capitalize">{metodo}</span>
                      <span className="text-xs font-black text-slate-900">{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{formatMoney(monto)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Servicios más realizados */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Servicios más realizados</p>
        {svcsTop.length === 0 ? (
          <p className="text-slate-300 font-bold text-sm text-center py-6">Sin datos este mes</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {svcsTop.map(([nombre, cantidad], i) => {
              const maxSvc = svcsTop[0][1]
              return (
                <div key={i} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <p className="font-black text-blue-600 text-2xl">{cantidad}</p>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mt-1 leading-tight">{nombre}</p>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(cantidad / maxSvc) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}