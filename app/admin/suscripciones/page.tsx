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
  apisunat_token: string | null
  serie_factura: string | null
  serie_boleta: string | null
}

const PLANES = ['basico', 'pro', 'exclusive']

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
  const [tabActivo,  setTabActivo]    = useState<Record<string, 'suscripcion' | 'factusmart'>>({})

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
      .select('id,nombre,ruc,telefono,plan,suscripcion_activa,trial_hasta,created_at,apisunat_modo,apisunat_token,serie_factura,serie_boleta')
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

  const getTab = (id: string) => tabActivo[id] || 'suscripcion'
  const setTab = (id: string, tab: 'suscripcion' | 'factusmart') =>
    setTabActivo(prev => ({ ...prev, [id]: tab }))

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
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Gestión de suscripciones y Factusmart</p>
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
      <div className="space-y-3">
        {talleresFiltrados.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-4xl mb-3">🏪</p>
            <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Sin talleres</p>
          </div>
        ) : (
          talleresFiltrados.map(t => {
            const dias = diasRestantes(t.trial_hasta)
            const estaEditando = editando === t.id
            const c = cambios[t.id] || {}
            const tab = getTab(t.id)

            const estadoBadge = () => {
              if (!t.suscripcion_activa) return { label: 'Inactivo', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
              if (dias === null)         return { label: 'Activo',   color: 'var(--accent-teal)', bg: 'rgba(33,199,184,0.1)' }
              if (dias < 0)             return { label: 'VENCIDO',  color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
              if (dias <= 7)            return { label: `${dias}d`,  color: 'var(--accent-yellow)', bg: 'rgba(255,194,60,0.1)' }
              return { label: `${dias}d`, color: 'var(--accent-teal)', bg: 'rgba(33,199,184,0.1)' }
            }
            const badge = estadoBadge()

            const tieneFactusmart = !!(t.apisunat_token)

            return (
              <div key={t.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

                {/* Fila principal */}
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">

                  {/* Nombre + RUC */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>{t.nombre}</p>
                      <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg"
                        style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg"
                        style={{
                          background: t.plan === 'pro' ? 'rgba(167,139,250,0.15)' : t.plan === 'exclusive' ? 'rgba(255,194,60,0.15)' : 'rgba(33,199,184,0.08)',
                          color: t.plan === 'pro' ? '#a78bfa' : t.plan === 'exclusive' ? 'var(--accent-yellow)' : 'var(--accent-teal)',
                        }}>
                        {t.plan || 'basico'}
                      </span>
                      {tieneFactusmart && (
                        <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg"
                          style={{ background: 'rgba(33,199,184,0.08)', color: 'var(--accent-teal)', border: '1px solid rgba(33,199,184,0.2)' }}>
                          🧾 Factusmart {t.apisunat_modo === 'produccion' ? '• PROD' : '• sandbox'}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {t.ruc || 'Sin RUC'} · {formatFecha(t.trial_hasta)} · {t.telefono || 'Sin teléfono'}
                    </p>
                  </div>

                  {/* Botones acción */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditando(estaEditando ? null : t.id)}
                      className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {estaEditando ? '✕ Cerrar' : '✏️ Editar'}
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
                  </div>
                </div>

                {/* Panel expandido al editar */}
                {estaEditando && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>

                    {/* Tabs */}
                    <div className="flex" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      {(['suscripcion', 'factusmart'] as const).map(t2 => (
                        <button key={t2} onClick={() => setTab(t.id, t2)}
                          className="font-display text-[10px] font-bold uppercase tracking-widest px-5 py-3 transition-all"
                          style={{
                            color: tab === t2 ? 'var(--accent-teal)' : 'var(--text-muted)',
                            borderBottom: tab === t2 ? '2px solid var(--accent-teal)' : '2px solid transparent',
                          }}>
                          {t2 === 'suscripcion' ? '📋 Suscripción' : '🧾 Factusmart'}
                        </button>
                      ))}
                    </div>

                    <div className="p-5 space-y-4">

                      {/* ── TAB SUSCRIPCIÓN ── */}
                      {tab === 'suscripcion' && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="lbl">Plan</label>
                              <select
                                value={c.plan ?? t.plan}
                                onChange={e => setCambio(t.id, 'plan', e.target.value)}
                                className="inp appearance-none">
                                {PLANES.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="lbl">Fecha de vencimiento</label>
                              <input
                                type="datetime-local"
                                value={(c.trial_hasta ?? t.trial_hasta ?? '').slice(0, 16)}
                                onChange={e => setCambio(t.id, 'trial_hasta', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                className="inp font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <p className="lbl mb-2">Extender suscripción rápido</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: '+7 días',  dias: 7   },
                                { label: '+15 días', dias: 15  },
                                { label: '+30 días', dias: 30  },
                                { label: '+90 días', dias: 90  },
                                { label: '+1 año',   dias: 365 },
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
                                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                                  {op.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── TAB FACTUSMART ── */}
                      {tab === 'factusmart' && (
                        <>
                          <div className="rounded-xl px-4 py-3 text-xs font-semibold"
                            style={{ background: 'rgba(33,199,184,0.06)', border: '1px solid rgba(33,199,184,0.2)', color: 'var(--accent-teal)' }}>
                            🔒 Estos datos son gestionados solo por ti. Los talleres no los ven ni pueden modificarlos.
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="lbl">Token Factusmart</label>
                              <input
                                type="text"
                                value={c.apisunat_token ?? t.apisunat_token ?? ''}
                                onChange={e => setCambio(t.id, 'apisunat_token', e.target.value)}
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                className="inp font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="lbl">Serie Factura</label>
                              <input
                                type="text"
                                value={c.serie_factura ?? t.serie_factura ?? ''}
                                onChange={e => setCambio(t.id, 'serie_factura', e.target.value.toUpperCase())}
                                placeholder="F001"
                                className="inp font-mono tracking-widest uppercase"
                                maxLength={4}
                              />
                            </div>
                            <div>
                              <label className="lbl">Serie Boleta</label>
                              <input
                                type="text"
                                value={c.serie_boleta ?? t.serie_boleta ?? ''}
                                onChange={e => setCambio(t.id, 'serie_boleta', e.target.value.toUpperCase())}
                                placeholder="B001"
                                className="inp font-mono tracking-widest uppercase"
                                maxLength={4}
                              />
                            </div>
                            <div>
                              <label className="lbl">Modo</label>
                              <div className="flex gap-2">
                                {(['sandbox', 'produccion'] as const).map(modo => (
                                  <button key={modo}
                                    onClick={() => setCambio(t.id, 'apisunat_modo', modo)}
                                    className="font-display flex-1 text-[10px] font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all"
                                    style={{
                                      background: (c.apisunat_modo ?? t.apisunat_modo ?? 'sandbox') === modo
                                        ? modo === 'produccion' ? 'var(--accent-teal)' : 'rgba(167,139,250,0.2)'
                                        : 'var(--bg)',
                                      color: (c.apisunat_modo ?? t.apisunat_modo ?? 'sandbox') === modo
                                        ? modo === 'produccion' ? 'var(--bg)' : '#a78bfa'
                                        : 'var(--text-muted)',
                                      border: '1px solid var(--border)',
                                    }}>
                                    {modo === 'sandbox' ? '🧪 Sandbox' : '🚀 Producción'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Botón guardar */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => guardarCambios(t.id)}
                          disabled={guardando === t.id}
                          className="font-display font-bold text-sm uppercase tracking-widest px-6 py-3 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                          style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
                          {guardando === t.id ? '⏳ Guardando...' : '💾 Guardar cambios'}
                        </button>
                      </div>
                    </div>
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