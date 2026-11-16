'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Servicio = {
  id: string
  nombre: string
  telefono: string
  placa: string
  marca?: string
  modelo?: string
  fecha_proxima?: string
  proximo_km?: number
  km_diarios?: number
  fecha: string
  created_at: string
}

type FiltroVista = 'vencidos' | 'proximos' | 'todos'

function diasDesde(fechaStr: string) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fecha = new Date(fechaStr)
  fecha.setHours(0, 0, 0, 0)
  return Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function formatFecha(fechaStr: string) {
  const f = new Date(fechaStr)
  return f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function generarMensaje(s: Servicio): string {
  const marca = s.marca || ''
  const modelo = s.modelo || ''
  const auto = [marca, modelo].filter(Boolean).join(' ') || 'su vehículo'
  const placa = s.placa ? ` (${s.placa.toUpperCase()})` : ''

  let detalle = ''
  if (s.fecha_proxima) {
    const dias = diasDesde(s.fecha_proxima)
    if (dias < 0) {
      detalle = `Su próximo mantenimiento venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}.`
    } else if (dias === 0) {
      detalle = `Su próximo mantenimiento es HOY.`
    } else {
      detalle = `Su próximo mantenimiento es en ${dias} día${dias !== 1 ? 's' : ''} (${formatFecha(s.fecha_proxima)}).`
    }
  }
  if (s.proximo_km) {
    detalle += detalle ? ` O al llegar a ${s.proximo_km.toLocaleString()} km.` : `Su próximo mantenimiento es a los ${s.proximo_km.toLocaleString()} km.`
  }

  return `Hola ${s.nombre.split(' ')[0]}, le recordamos que ${auto}${placa} necesita su mantenimiento preventivo. ${detalle} Lo esperamos en nuestro taller. 🔧`
}

function abrirWhatsApp(telefono: string, mensaje: string) {
  const tel = telefono.replace(/\D/g, '')
  const telFull = tel.startsWith('51') ? tel : `51${tel}`
  const url = `https://wa.me/${telFull}?text=${encodeURIComponent(mensaje)}`
  window.open(url, '_blank')
}

export default function RecordatoriosPage() {
  const [servicios,   setServicios]   = useState<Servicio[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filtro,      setFiltro]      = useState<FiltroVista>('vencidos')
  const [busqueda,    setBusqueda]    = useState('')
  const [mensajes,    setMensajes]    = useState<Record<string, string>>({})
  const [editandoId,  setEditandoId]  = useState<string | null>(null)
  const [enviados,    setEnviados]    = useState<Set<string>>(new Set())

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('id').eq('user_id', user.id).single()
      if (!t) return

      // Traer últimos servicios por placa (el más reciente de cada placa)
      const { data } = await supabase
        .from('servicios')
        .select('id,nombre,telefono,placa,marca,modelo,fecha_proxima,proximo_km,km_diarios,fecha,created_at')
        .eq('taller_id', t.id)
        .not('telefono', 'is', null)
        .neq('telefono', '')
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      // Deduplicar por placa — quedarse con el registro más reciente
      const vistos = new Set<string>()
      const unicos: Servicio[] = []
      for (const s of data) {
        const key = s.placa?.toLowerCase().trim() || s.id
        if (!vistos.has(key)) {
          vistos.add(key)
          unicos.push(s)
        }
      }

      setServicios(unicos)

      // Pre-generar mensajes
      const msgs: Record<string, string> = {}
      unicos.forEach(s => { msgs[s.id] = generarMensaje(s) })
      setMensajes(msgs)

      setLoading(false)
    }
    init()
  }, [])

  // ── Filtros ───────────────────────────────────────────────────────────────
  const hoy = new Date(); hoy.setHours(0,0,0,0)

  const filtrados = servicios.filter(s => {
    const matchBusqueda =
      s.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.placa?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.telefono?.includes(busqueda)

    if (!matchBusqueda) return false

    if (filtro === 'todos') return true

    if (!s.fecha_proxima) {
      // Sin fecha próxima — mostrar en "vencidos" si el último servicio fue hace más de 90 días
      const ultimoSvc = new Date(s.fecha || s.created_at)
      const diasUltimo = Math.round((hoy.getTime() - ultimoSvc.getTime()) / (1000 * 60 * 60 * 24))
      if (filtro === 'vencidos') return diasUltimo > 90
      return false
    }

    const dias = diasDesde(s.fecha_proxima)
    if (filtro === 'vencidos') return dias < 0
    if (filtro === 'proximos') return dias >= 0 && dias <= 30
    return true
  })

  const contVencidos = servicios.filter(s => {
    if (!s.fecha_proxima) {
      const d = new Date(s.fecha || s.created_at)
      return Math.round((hoy.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) > 90
    }
    return diasDesde(s.fecha_proxima) < 0
  }).length

  const contProximos = servicios.filter(s => {
    if (!s.fecha_proxima) return false
    const d = diasDesde(s.fecha_proxima)
    return d >= 0 && d <= 30
  }).length

  const marcarEnviado = (id: string) => {
    setEnviados(prev => new Set([...prev, id]))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">💬</div>
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Cargando recordatorios...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Recordatorios</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Envía recordatorios de mantenimiento por WhatsApp</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-2.5 text-center shrink-0">
          <p className="text-2xl font-black text-green-700">{contVencidos + contProximos}</p>
          <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">pendientes</p>
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
          {([
            { key: 'vencidos', label: `Vencidos (${contVencidos})`,   color: 'bg-red-500'    },
            { key: 'proximos', label: `Próximos (${contProximos})`,   color: 'bg-orange-500' },
            { key: 'todos',    label: `Todos (${servicios.length})`,  color: 'bg-slate-600'  },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                filtro === f.key
                  ? `${f.color} text-white shadow-sm`
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, placa o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-3">
            {filtro === 'vencidos' ? '✅' : filtro === 'proximos' ? '📅' : '🔍'}
          </div>
          <p className="font-black text-slate-400 uppercase tracking-widest text-sm">
            {filtro === 'vencidos' ? 'Sin vencidos' : filtro === 'proximos' ? 'Sin próximos' : 'Sin resultados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(s => {
            const dias = s.fecha_proxima ? diasDesde(s.fecha_proxima) : null
            const estaVencido = dias !== null ? dias < 0 : (() => {
              const d = new Date(s.fecha || s.created_at)
              return Math.round((hoy.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) > 90
            })()
            const yaEnviado = enviados.has(s.id)
            const msg = mensajes[s.id] || ''

            return (
              <div key={s.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                yaEnviado ? 'border-green-200 opacity-70' : estaVencido ? 'border-red-100' : 'border-orange-100'
              }`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">

                    {/* Info cliente */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-slate-900 text-sm capitalize">{s.nombre.toLowerCase()}</p>
                        {s.placa && (
                          <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase">{s.placa}</span>
                        )}
                        {yaEnviado && (
                          <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">✓ Enviado</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {s.marca && <p className="text-[11px] text-slate-500 font-semibold">{s.marca} {s.modelo}</p>}
                        <p className="text-[11px] text-slate-400 font-semibold">📱 {s.telefono}</p>
                      </div>

                      {/* Badge de estado */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {s.fecha_proxima ? (
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            dias! < 0
                              ? 'bg-red-100 text-red-700'
                              : dias! === 0
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-orange-50 text-orange-600'
                          }`}>
                            {dias! < 0
                              ? `⚠️ Vencido hace ${Math.abs(dias!)} día${Math.abs(dias!) !== 1 ? 's' : ''}`
                              : dias! === 0
                                ? '🔴 Vence HOY'
                                : `📅 Vence en ${dias!} día${dias! !== 1 ? 's' : ''} (${formatFecha(s.fecha_proxima)})`
                            }
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                            📅 Sin fecha próxima · último svc {formatFecha(s.fecha || s.created_at)}
                          </span>
                        )}
                        {s.proximo_km && (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                            🏎️ A los {s.proximo_km.toLocaleString()} km
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botón WhatsApp */}
                    <button
                      onClick={() => {
                        abrirWhatsApp(s.telefono, msg)
                        marcarEnviado(s.id)
                      }}
                      className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-black text-xs transition-all ${
                        yaEnviado
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : 'bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      <span className="text-xl">{yaEnviado ? '✓' : '💬'}</span>
                      <span>{yaEnviado ? 'Enviado' : 'WhatsApp'}</span>
                    </button>
                  </div>

                  {/* Mensaje editable */}
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {editandoId === s.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={msg}
                          onChange={e => setMensajes(prev => ({ ...prev, [s.id]: e.target.value }))}
                          rows={3}
                          className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditandoId(null)}
                            className="text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Listo ✓
                          </button>
                          <button
                            onClick={() => {
                              setMensajes(prev => ({ ...prev, [s.id]: generarMensaje(s) }))
                            }}
                            className="text-[10px] font-black text-blue-500 hover:text-blue-700 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Restaurar original
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed flex-1 line-clamp-2">{msg}</p>
                        <button
                          onClick={() => setEditandoId(s.id)}
                          className="shrink-0 text-[10px] font-black text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap"
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Enviar a todos los vencidos */}
      {filtro === 'vencidos' && filtrados.length > 1 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-black text-green-800 text-sm">Enviar a todos los vencidos</p>
            <p className="text-[10px] text-green-600 font-semibold mt-0.5">Se abrirán {filtrados.filter(s => !enviados.has(s.id)).length} conversaciones de WhatsApp</p>
          </div>
          <button
            onClick={() => {
              filtrados
                .filter(s => !enviados.has(s.id))
                .forEach((s, i) => {
                  setTimeout(() => {
                    abrirWhatsApp(s.telefono, mensajes[s.id] || '')
                    marcarEnviado(s.id)
                  }, i * 800)
                })
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-black text-xs px-5 py-3 rounded-xl shadow-sm hover:shadow-md transition-all whitespace-nowrap"
          >
            💬 Enviar a todos
          </button>
        </div>
      )}

    </div>
  )
}
