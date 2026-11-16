'use client'

import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

type Servicio = {
  id: string; placa: string; nombre: string; marca: string; modelo: string
  monto: number; fecha: string; created_at: string; tipo: 'servicio'
  metodo_pago?: string
}

type Venta = {
  id: string; nombre: string; items: any[]
  monto: number; fecha: string; created_at: string; tipo: 'venta'
  metodo_pago?: string
}

type Registro = Servicio | Venta
type FiltroTipo = 'dia' | 'mes' | 'anio'

const METODOS_PAGO = [
  { key: 'efectivo',      icon: '💵', label: 'Efectivo',      color: '#34d399' },
  { key: 'yape',          icon: '📱', label: 'Yape / Plin',   color: 'var(--accent-teal)' },
  { key: 'transferencia', icon: '🏦', label: 'Transferencia', color: '#a78bfa' },
  { key: 'tarjeta',       icon: '💳', label: 'Tarjeta',       color: 'var(--accent-yellow)' },
]

export default function ReportesPage() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('mes')
  const [diaSel, setDiaSel] = useState(new Date().toISOString().slice(0, 10))
  const [mesSel, setMesSel] = useState(new Date().toISOString().slice(0, 7))
  const [anioSel, setAnioSel] = useState(String(new Date().getFullYear()))

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('id').eq('user_id', user.id).single()
      if (!t) return
      const { data: svcs } = await supabase.from('servicios')
        .select('id, placa, nombre, marca, modelo, monto, fecha, created_at, metodo_pago')
        .eq('taller_id', t.id).order('created_at', { ascending: false })
      const { data: vnts } = await supabase.from('ventas')
        .select('id, nombre, items, monto, fecha, created_at, metodo_pago')
        .eq('taller_id', t.id).order('created_at', { ascending: false })
      const todos: Registro[] = [
        ...(svcs || []).map(s => ({ ...s, tipo: 'servicio' as const })),
        ...(vnts || []).map(v => ({ ...v, tipo: 'venta' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRegistros(todos)
      setLoading(false)
    }
    cargar()
  }, [])

  const fechaDe = (r: Registro) => r.fecha || r.created_at.slice(0, 10)

  const filtrados = registros.filter(r => {
    const f = fechaDe(r)
    if (filtroTipo === 'dia') return f === diaSel
    if (filtroTipo === 'mes') return f.slice(0, 7) === mesSel
    return f.slice(0, 4) === anioSel
  })

  const serviciosF = filtrados.filter(r => r.tipo === 'servicio') as Servicio[]
  const ventasF    = filtrados.filter(r => r.tipo === 'venta')    as Venta[]

  const totalServicios = serviciosF.reduce((s, r) => s + (r.monto || 0), 0)
  const totalVentas    = ventasF.reduce((s, r) => s + (r.monto || 0), 0)
  const totalGeneral   = totalServicios + totalVentas

  // Totales por método de pago (servicios + ventas)
  const totalesPorMetodo = METODOS_PAGO.map(m => ({
    ...m,
    total: filtrados
      .filter(r => (r.metodo_pago || 'efectivo') === m.key)
      .reduce((s, r) => s + (r.monto || 0), 0),
    cantidad: filtrados.filter(r => (r.metodo_pago || 'efectivo') === m.key).length,
  }))

  const etiquetaPeriodo = () => {
    if (filtroTipo === 'dia') return new Date(diaSel + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    if (filtroTipo === 'mes') {
      const [y, m] = mesSel.split('-')
      const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      return `${meses[parseInt(m)]} de ${y}`
    }
    return `Año ${anioSel}`
  }

  const detalleDescripcion = (r: Registro) => {
    if (r.tipo === 'servicio') return [r.marca, r.modelo].filter(Boolean).join(' ') || 'Servicio de taller'
    const items = Array.isArray(r.items) ? r.items : []
    return items.map((i: any) => `${i.cantidad}x ${i.nombre}`).join(', ') || 'Venta'
  }

  const etiquetaMetodo = (r: Registro) => {
    const m = METODOS_PAGO.find(m => m.key === (r.metodo_pago || 'efectivo'))
    return m ? `${m.icon} ${m.label}` : '💵 Efectivo'
  }

  const exportarExcel = () => {
    const filas = filtrados.map(r => ({
      'FECHA': fechaDe(r),
      'TIPO': r.tipo === 'servicio' ? 'Servicio' : 'Venta',
      'PLACA': r.tipo === 'servicio' ? r.placa : '',
      'CLIENTE': r.nombre || (r.tipo === 'venta' ? 'CLIENTE AL CONTADO' : '-'),
      'DETALLE': detalleDescripcion(r),
      'MÉTODO DE PAGO': METODOS_PAGO.find(m => m.key === (r.metodo_pago || 'efectivo'))?.label || 'Efectivo',
      'MONTO': r.monto || 0,
    }))

    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 24 }, { wch: 40 }, { wch: 16 }, { wch: 12 }]

    const wsResumen = XLSX.utils.aoa_to_sheet([
      ['REPORTE AWTU'],
      ['Periodo', etiquetaPeriodo()],
      [],
      ['Ingresos por Servicios', totalServicios],
      ['Ingresos por Tienda', totalVentas],
      ['TOTAL GENERAL', totalGeneral],
      [],
      ['Cantidad de Servicios', serviciosF.length],
      ['Cantidad de Ventas', ventasF.length],
      [],
      ['--- INGRESOS POR MÉTODO DE PAGO ---'],
      ...totalesPorMetodo.map(m => [`${m.icon} ${m.label}`, m.total, `(${m.cantidad} transacción(es))`]),
    ])
    wsResumen['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle')

    const sufijo = filtroTipo === 'dia' ? diaSel : filtroTipo === 'mes' ? mesSel : anioSel
    XLSX.writeFile(wb, `reporte_awtu_${sufijo}.xlsx`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Reportes</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{etiquetaPeriodo()}</p>
        </div>
        <button onClick={exportarExcel} disabled={filtrados.length === 0}
          className="font-display disabled:opacity-40 font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95"
          style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
          📥 Exportar a Excel
        </button>
      </div>

      {/* Filtros de periodo */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {[
              { key: 'dia', label: 'Día' },
              { key: 'mes', label: 'Mes' },
              { key: 'anio', label: 'Año' },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroTipo(f.key as FiltroTipo)}
                className="font-display px-4 py-2.5 text-xs rounded-xl font-bold uppercase tracking-widest transition-all"
                style={filtroTipo === f.key
                  ? { background: 'var(--accent-teal)', color: 'var(--bg)' }
                  : { background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-48">
            {filtroTipo === 'dia' && (
              <input type="date" value={diaSel} onChange={e => setDiaSel(e.target.value)} className="inp font-mono" />
            )}
            {filtroTipo === 'mes' && (
              <input type="month" value={mesSel} onChange={e => setMesSel(e.target.value)} className="inp font-mono" />
            )}
            {filtroTipo === 'anio' && (
              <input type="number" value={anioSel} onChange={e => setAnioSel(e.target.value)}
                min="2020" max="2100" placeholder="2026" className="inp font-mono" />
            )}
          </div>
        </div>
      </div>

      {/* Totales generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }}>Ingresos por Servicios</p>
          <p className="font-mono text-2xl font-bold mt-2" style={{ color: 'var(--text)' }}>S/ {totalServicios.toFixed(2)}</p>
          <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>{serviciosF.length} servicio(s)</p>
        </div>
        <div className="card">
          <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Ingresos por Tienda</p>
          <p className="font-mono text-2xl font-bold mt-2" style={{ color: 'var(--text)' }}>S/ {totalVentas.toFixed(2)}</p>
          <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>{ventasF.length} venta(s)</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(255,194,60,0.4)' }}>
          <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-yellow)' }}>Total General</p>
          <p className="font-mono text-2xl font-bold mt-2" style={{ color: 'var(--text)' }}>S/ {totalGeneral.toFixed(2)}</p>
          <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>{filtrados.length} transacción(es)</p>
        </div>
      </div>

      {/* Ingresos por método de pago */}
      {filtrados.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs"
              style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.35)' }}>💳</div>
            <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Ingresos por Método de Pago</p>
            <span className="font-display ml-auto text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Servicios y Tienda</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
            {totalesPorMetodo.map((m, idx) => (
              <div key={m.key}
                className="p-5 flex flex-col gap-2"
                style={{
                  borderRight: idx < 3 ? '1px solid var(--border)' : 'none',
                  borderBottom: idx < 2 ? '1px solid var(--border)' : 'none',
                  opacity: m.total === 0 ? 0.4 : 1,
                }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.icon}</span>
                  <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                </div>
                <p className="font-mono text-xl font-bold" style={{ color: m.total > 0 ? m.color : 'var(--text-muted)' }}>
                  S/ {m.total.toFixed(2)}
                </p>
                <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {m.cantidad} transacción(es)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalle de transacciones */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs"
            style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.35)' }}>📋</div>
          <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Detalle de Transacciones</p>
        </div>

        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
            <p className="text-4xl mb-3">📋</p>
            <p className="font-display font-bold text-sm uppercase tracking-widest">Sin transacciones en este periodo</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 px-4 py-2" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {[
                { label: 'Fecha',   span: 'col-span-2' },
                { label: 'Tipo',    span: 'col-span-1' },
                { label: 'Cliente', span: 'col-span-2' },
                { label: 'Detalle', span: 'col-span-4' },
                { label: 'Pago',    span: 'col-span-2' },
                { label: 'Monto',   span: 'col-span-1 text-right' },
              ].map(h => (
                <div key={h.label} className={`font-display text-[9px] font-bold uppercase tracking-widest ${h.span}`} style={{ color: 'var(--text-muted)' }}>{h.label}</div>
              ))}
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {filtrados.map(r => {
                const accentColor = r.tipo === 'servicio' ? 'var(--accent-teal)' : 'var(--accent)'
                const metodo = METODOS_PAGO.find(m => m.key === (r.metodo_pago || 'efectivo'))
                return (
                  <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="col-span-2 font-mono text-xs font-bold" style={{ color: 'var(--text)' }}>{fechaDe(r)}</div>
                    <div className="col-span-1">
                      <span className="font-display text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase"
                        style={{ background: accentColor + '1a', color: accentColor }}>
                        {r.tipo === 'servicio' ? 'Serv.' : 'Venta'}
                      </span>
                    </div>
                    <div className="col-span-2 text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                      {r.nombre || (r.tipo === 'venta' ? 'Directo' : '-')}
                      {r.tipo === 'servicio' && <span className="font-mono ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.placa}</span>}
                    </div>
                    <div className="col-span-4 text-xs truncate" style={{ color: 'var(--text-muted)' }}>{detalleDescripcion(r)}</div>
                    <div className="col-span-2">
                      {metodo ? (
                        <span className="font-display text-[9px] font-bold flex items-center gap-1" style={{ color: metodo.color }}>
                          <span>{metodo.icon}</span>
                          <span className="uppercase tracking-widest">{metodo.label}</span>
                        </span>
                      ) : (
                        <span className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                    <div className="col-span-1 text-right font-mono text-xs font-bold" style={{ color: 'var(--text)' }}>S/ {(r.monto || 0).toFixed(2)}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
