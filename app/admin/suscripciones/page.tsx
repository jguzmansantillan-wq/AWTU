'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'jguzmansantillan@gmail.com'

type Taller = {
  id: string
  nombre: string
  ruc: string | null
  telefono: string | null
  plan: string
  suscripcion_activa: boolean
  trial_hasta: string | null
  created_at: string
  apisunat_modo: string | null
}

const PLANES = ['basico', 'pro', 'enterprise']

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const fin = new Date(fecha); fin.setHours(0,0,0,0)
  return Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function formatFecha(fecha: string | null) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminSuscripcionesPage() {
  const [autorizado, setAutorizado]   = useState<boolean | null>(null)
  const [talleres,   setTalleres]     = useState<Taller[]>([])
  const [loading,    setLoading]      = useState(true)
  const [guardando,  setGuardando]    = useState<string | null>(null)
  const [editando,   setEditando]     = useState<string | null>(null)
  const [cambios,    setCambios]      = useState<Record<string, Partial<Taller>>>({})
  const [busqueda,   setBusqueda]     = useState('')
  const [toast,      setToast]        = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        setAutorizado(false)
        setLoading(false)
        return
      }
      setAutorizado(true)
      await cargarTalleres()
    }
    init()
  }, [])

  const cargarTalleres = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('talleres')
      .select('id,nombre,ruc,telefono,plan,suscripcion_activa,trial_hasta,created_at,apisunat_modo')
      .order('created_at', { ascending: false })
    setTalleres(data || [])
    setLoading(false)
  }

  const mostrarToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const guardarCambios = async (id: string) => {
    const c = cambios[id]
    if (!c || Object.keys(c).length === 0) { setEditando(null); return }
    setGuardando(id)
    const { error } = await supabase.from('talleres').update(c).eq('id', id)
    if (error) {
      mostrarToast('❌ Error al guardar')
    } else {
      setTalleres(prev => prev.map(t => t.id === id ? { ...t, ...c } : t))
      setCambios(prev => { const n = { ...prev }; delete n[id]; return n })
      mostrarToast('✅ Cambios guardados')
    }
    setGuardando(null)
    setEditando(null)
  }

  const toggleActiva = async (taller: Taller) => {
    setGuardando(taller.id)
    const nuevo = !taller.suscripcion_activa
    const { error } = await supabase.from('talleres').update({ suscripcion_activa: nuevo }).eq('id', taller.id)
    if (!error) {
      setTalleres(prev => prev.map(t => t.id === taller.id ? { ...t, suscripcion_activa: nuevo } : t))
      mostrarToast(nuevo ? '✅ Suscripción activada' : '⏸️ Suscripción desactivada')
    }
    setGuardando(null)
  }

  const setCambio = (id: string, campo: keyof Taller, valor: any) => {
    setCambios(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))
  }

  const talleresFiltrados = talleres.filter(t =>
    t.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.ruc?.includes(busqueda) ||
    t.telefono?.includes(busqueda)
  )

  const activos   = talleres.filter(t => t.suscripcion_activa).length
  const vencidos  = talleres.filter(t => {
    const d = diasRestantes(t.trial_hasta)
    return d !== null && d < 0
  }).length
  const porVencer = talleres.filter(t => {
    const d = diasRestantes(t.trial_hasta)
    return d !== null && d >= 0 && d <= 7
  }).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!autorizado) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-5xl">🔒</div>
      <p className="font-display font-bold text-lg uppercase tracking-widest" style={{ color: 'var(--text)' }}>Acceso restringido</p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Solo el administrador puede acceder a este panel.</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl font-display font-bold text-sm shadow-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Panel Admin</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Gestión de suscripciones de talleres</p>
        </div>
        <button onClick={cargarTalleres}
          className="font-display font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          🔄 Recargar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total talleres', value: talleres.length, color: 'var(--text)',         icon: '🏪' },
          { label: 'Activos',        value: activos,         color: 'var(--accent-teal)',   icon: '✅' },
          { label: 'Por vencer',     value: porVencer,       color: 'var(--accent-yellow)', icon: '⚠️' },
          { label: 'Vencidos',       value: vencidos,        color: '#f87171',              icon: '❌' },
        ].map((k, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{k.icon}</span>
              <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            </div>
            <p className="font-mono text-3xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar por nombre, RUC o teléfono..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="inp w-full"
      />

      {/* Lista de talleres */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Cabecera */}
        <div className="grid grid-cols-12 gap-2 px-5 py-3" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'Taller',    span: 'col-span-3' },
            { label: 'Plan',      span: 'col-span-2' },
            { label: 'Vence',     span: 'col-span-2' },
            { label: 'Estado',    span: 'col-span-2' },
            { label: 'Modo SUNAT',span: 'col-span-1' },
            { label: 'Acciones',  span: 'col-span-2 text-right' },
          ].map(h => (
            <div key={h.label} className={`font-display text-[9px] font-bold uppercase tracking-widest ${h.span}`}
              style={{ color: 'var(--text-muted)' }}>{h.label}</div>
          ))}
        </div>

        {talleresFiltrados.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-4xl mb-3">🏪</p>
            <p className="font-display font-bold text-sm uppercase tracking-widest">Sin talleres</p>
          </div>
        ) : (
          talleresFiltrados.map(t => {
            const dias = diasRestantes(t.trial_hasta)
            const estaEditando = editando === t.id
            const c = cambios[t.id] || {}

            const estadoBadge = () => {
              if (!t.suscripcion_activa) return { label: 'Inactivo', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
              if (dias === null)         return { label: 'Activo',   color: 'var(--accent-teal)', bg: 'rgba(33,199,184,0.1)' }
              if (dias < 0)             return { label: 'Vencido',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
              if (dias <= 7)            return { label: `${dias}d`,  color: 'var(--accent-yellow)', bg: 'rgba(255,194,60,0.1)' }
              return { label: `${dias}d`, color: 'var(--accent-teal)', bg: 'rgba(33,199,184,0.1)' }
            }
            const badge = estadoBadge()

            return (
              <div key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="grid grid-cols-12 gap-2 px-5 py-4 items-center">

                  {/* Nombre */}
                  <div className="col-span-3">
                    <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{t.nombre}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.ruc || 'Sin RUC'}</p>
                  </div>

                  {/* Plan */}
                  <div className="col-span-2">
                    {estaEditando ? (
                      <select
                        value={c.plan ?? t.plan}
                        onChange={e => setCambio(t.id, 'plan', e.target.value)}
                        className="inp text-xs py-1.5"
                      >
                        {PLANES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <span className="font-display text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg"
                        style={{
                          background: t.plan === 'pro' ? 'rgba(167,139,250,0.15)' : 'rgba(33,199,184,0.1)',
                          color: t.plan === 'pro' ? '#a78bfa' : 'var(--accent-teal)',
                        }}>
                        {t.plan || 'basico'}
                      </span>
                    )}
                  </div>

                  {/* Fecha vencimiento */}
                  <div className="col-span-2">
                    {estaEditando ? (
                      <input
                        type="datetime-local"
                        value={(c.trial_hasta ?? t.trial_hasta ?? '').slice(0, 16)}
                        onChange={e => setCambio(t.id, 'trial_hasta', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="inp text-xs py-1.5 font-mono"
                      />
                    ) : (
                      <p className="font-mono text-xs" style={{ color: 'var(--text)' }}>{formatFecha(t.trial_hasta)}</p>
                    )}
                  </div>

                  {/* Estado badge */}
                  <div className="col-span-2">
                    <span className="font-display text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Modo SUNAT */}
                  <div className="col-span-1">
                    {estaEditando ? (
                      <select
                        value={c.apisunat_modo ?? t.apisunat_modo ?? 'sandbox'}
                        onChange={e => setCambio(t.id, 'apisunat_modo', e.target.value)}
                        className="inp text-xs py-1.5"
                      >
                        <option value="sandbox">sandbox</option>
                        <option value="produccion">produccion</option>
                      </select>
                    ) : (
                      <span className="font-mono text-[10px]" style={{ color: t.apisunat_modo === 'produccion' ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                        {t.apisunat_modo || 'sandbox'}
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {estaEditando ? (
                      <>
                        <button
                          onClick={() => guardarCambios(t.id)}
                          disabled={guardando === t.id}
                          className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                          style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
                          {guardando === t.id ? '...' : '💾 Guardar'}
                        </button>
                        <button
                          onClick={() => { setEditando(null); setCambios(prev => { const n = {...prev}; delete n[t.id]; return n }) }}
                          className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditando(t.id)}
                          className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => toggleActiva(t)}
                          disabled={guardando === t.id}
                          className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                          style={{
                            background: t.suscripcion_activa ? 'rgba(248,113,113,0.1)' : 'rgba(33,199,184,0.1)',
                            color: t.suscripcion_activa ? '#f87171' : 'var(--accent-teal)',
                          }}>
                          {guardando === t.id ? '...' : t.suscripcion_activa ? '⏸ Desactivar' : '▶ Activar'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Fila expandida al editar: extensión rápida de fecha */}
                {estaEditando && (
                  <div className="px-5 pb-4 flex flex-wrap gap-2">
                    <p className="font-display text-[9px] font-bold uppercase tracking-widest w-full mb-1" style={{ color: 'var(--text-muted)' }}>Extender suscripción rápido:</p>
                    {[
                      { label: '+7 días',  dias: 7  },
                      { label: '+15 días', dias: 15 },
                      { label: '+30 días', dias: 30 },
                      { label: '+90 días', dias: 90 },
                      { label: '+1 año',   dias: 365},
                    ].map(op => (
                      <button key={op.dias}
                        onClick={() => {
                          const base = c.trial_hasta ?? t.trial_hasta
                          const desde = base ? new Date(base) : new Date()
                          if (desde < new Date()) desde.setTime(new Date().getTime())
                          desde.setDate(desde.getDate() + op.dias)
                          setCambio(t.id, 'trial_hasta', desde.toISOString())
                        }}
                        className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                        {op.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}