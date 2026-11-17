'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'jguzmansantillan@gmail.com'

type Taller = {
  id: string
  nombre: string
  telefono: string | null
  plan: string
  trial_hasta: string | null
  suscripcion_activa: boolean
}

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const fin = new Date(fecha); fin.setHours(0, 0, 0, 0)
  return Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function formatFecha(fecha: string | null) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function generarMensaje(t: Taller): string {
  const dias = diasRestantes(t.trial_hasta)
  if (dias === null) return `Hola, te recordamos que tu suscripción de AWTU está por vencer. Contáctanos para renovar y seguir disfrutando del sistema. 🔧`
  if (dias < 0) return `Hola ${t.nombre}, tu suscripción de AWTU venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}. Renueva ahora para recuperar el acceso completo al sistema. 🔧`
  if (dias === 0) return `Hola ${t.nombre}, tu suscripción de AWTU vence HOY. Renueva ahora para no perder el acceso. 🔧`
  return `Hola ${t.nombre}, tu suscripción de AWTU vence en ${dias} día${dias !== 1 ? 's' : ''} (${formatFecha(t.trial_hasta)}). Te recomendamos renovar pronto para no interrumpir el servicio. 🔧`
}

function abrirWhatsApp(telefono: string, mensaje: string) {
  const tel = telefono.replace(/\D/g, '')
  const telFull = tel.startsWith('51') ? tel : `51${tel}`
  window.open(`https://wa.me/${telFull}?text=${encodeURIComponent(mensaje)}`, '_blank')
}

type Filtro = 'vencidos' | 'proximos' | 'todos'

export default function RecordatoriosPage() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [talleres, setTalleres] = useState<Taller[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('proximos')
  const [busqueda, setBusqueda] = useState('')
  const [mensajes, setMensajes] = useState<Record<string, string>>({})
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [enviados, setEnviados] = useState<Set<string>>(new Set())

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        setAutorizado(false)
        setLoading(false)
        return
      }
      setAutorizado(true)

      const { data } = await supabase
        .from('talleres')
        .select('id,nombre,telefono,plan,trial_hasta,suscripcion_activa')
        .order('trial_hasta', { ascending: true })

      const lista = (data || []).filter(t => t.telefono)
      setTalleres(lista)

      const msgs: Record<string, string> = {}
      lista.forEach(t => { msgs[t.id] = generarMensaje(t) })
      setMensajes(msgs)
      setLoading(false)
    }
    init()
  }, [])

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

  const filtrados = talleres.filter(t => {
    const match =
      t.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.telefono?.includes(busqueda)
    if (!match) return false
    const dias = diasRestantes(t.trial_hasta)
    if (filtro === 'vencidos') return dias !== null && dias < 0
    if (filtro === 'proximos') return dias !== null && dias >= 0 && dias <= 30
    return true
  })

  const contVencidos = talleres.filter(t => { const d = diasRestantes(t.trial_hasta); return d !== null && d < 0 }).length
  const contProximos = talleres.filter(t => { const d = diasRestantes(t.trial_hasta); return d !== null && d >= 0 && d <= 30 }).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!autorizado) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-5xl">🔒</div>
      <p className="font-display font-bold text-lg uppercase tracking-widest" style={{ color: 'var(--text)' }}>Acceso restringido</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Recordatorios</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Avisa a talleres con suscripción por vencer o vencida
          </p>
        </div>
        <div className="rounded-2xl px-4 py-2.5 text-center shrink-0"
          style={{ background: contVencidos > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(33,199,184,0.08)', border: `1px solid ${contVencidos > 0 ? 'rgba(248,113,113,0.3)' : 'rgba(33,199,184,0.2)'}` }}>
          <p className="font-mono text-2xl font-bold" style={{ color: contVencidos > 0 ? '#f87171' : 'var(--accent-teal)' }}>
            {contVencidos + contProximos}
          </p>
          <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>pendientes</p>
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {([
            { key: 'vencidos', label: `Vencidos (${contVencidos})`,   color: '#f87171',              bg: 'rgba(248,113,113,0.15)'  },
            { key: 'proximos', label: `Próximos (${contProximos})`,   color: 'var(--accent-yellow)', bg: 'rgba(255,194,60,0.15)'   },
            { key: 'todos',    label: `Todos (${talleres.length})`,   color: 'var(--text)',          bg: 'var(--surface-2)'        },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className="font-display px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
              style={filtro === f.key
                ? { background: f.bg, color: f.color }
                : { color: 'var(--text-muted)' }}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="inp flex-1"
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-5xl mb-3">
            {filtro === 'vencidos' ? '✅' : filtro === 'proximos' ? '📅' : '🔍'}
          </div>
          <p className="font-display font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-muted)' }}>
            {filtro === 'vencidos' ? 'Sin vencidos' : filtro === 'proximos' ? 'Sin próximos a vencer' : 'Sin resultados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(t => {
            const dias = diasRestantes(t.trial_hasta)
            const vencido = dias !== null && dias < 0
            const yaEnviado = enviados.has(t.id)
            const msg = mensajes[t.id] || ''

            return (
              <div key={t.id} className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${yaEnviado ? 'rgba(33,199,184,0.3)' : vencido ? 'rgba(248,113,113,0.3)' : 'rgba(255,194,60,0.3)'}`,
                  opacity: yaEnviado ? 0.7 : 1,
                }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>{t.nombre}</p>
                        <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg"
                          style={{
                            background: t.plan === 'pro' ? 'rgba(167,139,250,0.15)' : t.plan === 'exclusive' ? 'rgba(255,194,60,0.15)' : 'rgba(33,199,184,0.08)',
                            color: t.plan === 'pro' ? '#a78bfa' : t.plan === 'exclusive' ? 'var(--accent-yellow)' : 'var(--accent-teal)',
                          }}>
                          {t.plan || 'basico'}
                        </span>
                        {yaEnviado && (
                          <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg"
                            style={{ background: 'rgba(33,199,184,0.1)', color: 'var(--accent-teal)' }}>
                            ✓ Enviado
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>📱 {t.telefono}</p>

                      <div className="mt-2">
                        {dias === null ? (
                          <span className="font-display text-[10px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                            Sin fecha de vencimiento
                          </span>
                        ) : dias < 0 ? (
                          <span className="font-display text-[10px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                            ⚠️ Vencido hace {Math.abs(dias)} día{Math.abs(dias) !== 1 ? 's' : ''} · {formatFecha(t.trial_hasta)}
                          </span>
                        ) : dias === 0 ? (
                          <span className="font-display text-[10px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                            🔴 Vence HOY
                          </span>
                        ) : (
                          <span className="font-display text-[10px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(255,194,60,0.1)', color: 'var(--accent-yellow)' }}>
                            📅 Vence en {dias} día{dias !== 1 ? 's' : ''} · {formatFecha(t.trial_hasta)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botón WhatsApp */}
                    <button
                      onClick={() => { abrirWhatsApp(t.telefono!, msg); setEnviados(prev => new Set([...prev, t.id])) }}
                      className="shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                      style={yaEnviado
                        ? { background: 'rgba(33,199,184,0.08)', color: 'var(--accent-teal)', border: '1px solid rgba(33,199,184,0.3)' }
                        : { background: '#25D366', color: '#fff' }}>
                      <span className="text-xl">{yaEnviado ? '✓' : '💬'}</span>
                      <span>{yaEnviado ? 'Enviado' : 'WhatsApp'}</span>
                    </button>
                  </div>

                  {/* Mensaje editable */}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    {editandoId === t.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={msg}
                          onChange={e => setMensajes(prev => ({ ...prev, [t.id]: e.target.value }))}
                          rows={3}
                          className="w-full text-xs font-medium p-3 rounded-xl resize-none outline-none"
                          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setEditandoId(null)}
                            className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                            Listo ✓
                          </button>
                          <button onClick={() => setMensajes(prev => ({ ...prev, [t.id]: generarMensaje(t) }))}
                            className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg"
                            style={{ color: 'var(--accent-teal)' }}>
                            Restaurar original
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-medium leading-relaxed flex-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{msg}</p>
                        <button onClick={() => setEditandoId(t.id)}
                          className="font-display shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
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
      {filtro === 'vencidos' && filtrados.filter(t => !enviados.has(t.id)).length > 1 && (
        <div className="rounded-2xl p-4 flex items-center justify-between gap-4"
          style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)' }}>
          <div>
            <p className="font-display font-bold text-sm" style={{ color: '#25D366' }}>Enviar a todos los vencidos</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Se abrirán {filtrados.filter(t => !enviados.has(t.id)).length} conversaciones de WhatsApp
            </p>
          </div>
          <button
            onClick={() => {
              filtrados.filter(t => !enviados.has(t.id)).forEach((t, i) => {
                setTimeout(() => {
                  abrirWhatsApp(t.telefono!, mensajes[t.id] || '')
                  setEnviados(prev => new Set([...prev, t.id]))
                }, i * 800)
              })
            }}
            className="font-display font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95"
            style={{ background: '#25D366', color: '#fff' }}>
            💬 Enviar a todos
          </button>
        </div>
      )}

    </div>
  )
}