'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function FactusmartConfigPage() {
  const [tallerID,  setTallerID]  = useState('')
  const [tallerRuc, setTallerRuc] = useState('')
  const [loading,   setLoading]   = useState(true)

  const [solUsuario, setSolUsuario] = useState('')
  const [solClave,   setSolClave]   = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [modo,       setModo]       = useState<'prueba' | 'produccion'>('prueba')
  const [registrado, setRegistrado] = useState(false)

  const [guardando,  setGuardando]  = useState(false)
  const [ok,         setOk]         = useState('')
  const [error,      setError]      = useState('')
  const [mostrarClave, setMostrarClave] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase
        .from('talleres')
        .select('id, ruc, nombre, factusmart_ruc_registrado, factusmart_modo, factusmart_sol_usuario')
        .eq('user_id', user.id)
        .single()
      if (!t) return
      setTallerID(t.id)
      setTallerRuc(t.ruc || '')
      setRazonSocial(t.nombre || '')
      setRegistrado(t.factusmart_ruc_registrado || false)
      setModo(t.factusmart_modo || 'prueba')
      setSolUsuario(t.factusmart_sol_usuario || '')
      setLoading(false)
    }
    init()
  }, [])

  const registrarRuc = async () => {
    setGuardando(true); setError(''); setOk('')

    if (!tallerRuc) { setError('Tu taller no tiene RUC configurado. Ve a Configuración → Perfil del Negocio.'); setGuardando(false); return }
    if (!solUsuario.trim()) { setError('Ingresa tu usuario SOL de SUNAT'); setGuardando(false); return }
    if (!solClave.trim())   { setError('Ingresa tu clave SOL de SUNAT');   setGuardando(false); return }

    const res = await fetch('/api/factusmart/registrar-ruc', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taller_id:   tallerID,
        ruc:         tallerRuc,
        razon_social: razonSocial,
        sol_usuario: solUsuario.trim(),
        sol_clave:   solClave.trim(),
        modo,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al registrar RUC en Factusmart')
      setGuardando(false)
      return
    }

    setRegistrado(true)
    setOk(`✅ RUC ${tallerRuc} habilitado para emitir comprobantes en modo ${modo}`)
    setGuardando(false)
    setTimeout(() => setOk(''), 6000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full animate-spin"
        style={{ border: '4px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-4">

      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>
          Factura Electrónica
        </h2>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Configura tu RUC para emitir comprobantes electrónicos
        </p>
      </div>

      {ok && (
        <div className="px-4 py-3 rounded-xl font-bold text-sm border"
          style={{ background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>
          {ok}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl font-bold text-sm border"
          style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
          ❌ {error}
        </div>
      )}

      {/* Estado actual */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: registrado ? 'rgba(33,199,184,0.12)' : 'rgba(255,106,31,0.12)',
                     border: `1px solid ${registrado ? 'rgba(33,199,184,0.35)' : 'rgba(255,106,31,0.35)'}` }}>
            {registrado ? '✅' : '⚠️'}
          </div>
          <div>
            <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>
              {registrado ? 'RUC habilitado' : 'RUC no configurado'}
            </p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {registrado
                ? `${tallerRuc} · Modo ${modo}`
                : 'Completa el formulario para habilitar la emisión'}
            </p>
          </div>
        </div>

        {/* Info sobre clave SOL */}
        <div className="rounded-xl p-4 mb-4"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)' }}>
          <p className="font-display text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#a78bfa' }}>
            🔐 ¿Qué es el Usuario y Clave SOL?
          </p>
          <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Son las credenciales de SUNAT (sol.sunat.gob.pe) que usa tu empresa para declarar impuestos.
            Se usan para firmar digitalmente tus comprobantes electrónicos.
            <strong style={{ color: 'var(--text)' }}> Nunca las compartimos con terceros</strong> — solo
            se envían directo a Factusmart de forma segura.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="lbl">RUC del taller</label>
            <input
              value={tallerRuc}
              disabled
              className="inp font-mono opacity-60 cursor-not-allowed"
              placeholder="Configura tu RUC en Perfil del Negocio"
            />
            {!tallerRuc && (
              <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--accent)' }}>
                ⚠️ Ve a <a href="/dashboard/config" className="underline">Configuración → Perfil</a> y guarda tu RUC primero
              </p>
            )}
          </div>

          <div>
            <label className="lbl">Razón Social</label>
            <input
              value={razonSocial}
              onChange={e => setRazonSocial(e.target.value)}
              className="inp"
              placeholder="Nombre de tu empresa tal como aparece en SUNAT"
            />
          </div>

          <div>
            <label className="lbl">Usuario SOL</label>
            <input
              value={solUsuario}
              onChange={e => setSolUsuario(e.target.value)}
              className="inp font-mono"
              placeholder="Ej: RUCXXXXXXXX123456"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="lbl">Clave SOL</label>
            <div className="relative">
              <input
                type={mostrarClave ? 'text' : 'password'}
                value={solClave}
                onChange={e => setSolClave(e.target.value)}
                className="inp font-mono pr-10"
                placeholder="Tu clave SOL de SUNAT"
                autoComplete="new-password"
              />
              <button
                onClick={() => setMostrarClave(!mostrarClave)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: 'var(--text-muted)' }}>
                {mostrarClave ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className="lbl">Modo de emisión</label>
            <select
              value={modo}
              onChange={e => setModo(e.target.value as 'prueba' | 'produccion')}
              className="inp appearance-none cursor-pointer">
              <option value="prueba">🧪 Prueba (sin validez fiscal)</option>
              <option value="produccion">🏭 Producción (comprobantes reales)</option>
            </select>
            {modo === 'produccion' && (
              <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--accent)' }}>
                ⚠️ En modo producción los comprobantes tienen validez fiscal ante SUNAT
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={registrarRuc}
            disabled={guardando || !tallerRuc}
            className="font-display disabled:opacity-50 font-bold px-7 py-3 rounded-2xl transition-all uppercase tracking-widest text-sm active:scale-95"
            style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
            {guardando
              ? '⏳ Registrando...'
              : registrado
                ? '🔄 Actualizar configuración'
                : '🚀 Habilitar emisión electrónica'}
          </button>
        </div>
      </div>

      {/* Siguiente paso */}
      {registrado && (
        <div className="card p-5">
          <p className="font-display text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-teal)' }}>
            ✅ ¿Qué sigue?
          </p>
          <div className="space-y-2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            <p>1. Ve a <strong style={{ color: 'var(--text)' }}>Configuración → Logotipo</strong> y sube tu logo — aparecerá en tus facturas automáticamente.</p>
            <p>2. Ve al módulo de <strong style={{ color: 'var(--text)' }}>Documentos</strong> para emitir tu primera boleta o factura electrónica.</p>
            {modo === 'prueba' && (
              <p>3. Cuando estés listo para emitir comprobantes reales, cambia el modo a <strong style={{ color: 'var(--text)' }}>Producción</strong>.</p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}