'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NuevaContrasenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const [sesionLista, setSesionLista] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSesionLista(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError('No se pudo actualizar. Intenta solicitar un nuevo enlace.'); setLoading(false); return }
    setListo(true); setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (listo) return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md card text-center py-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6"
          style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.3)' }}>✅</div>
        <h2 className="font-display text-xl font-bold uppercase tracking-tighter mb-3" style={{ color: 'var(--text)' }}>
          ¡Contraseña actualizada!
        </h2>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          Redirigiendo al inicio de sesión...
        </p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md card">
        <div className="flex items-center gap-2 mb-6">
          <div className="pilot-light" />
          <span className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>AWTU</span>
        </div>
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
            style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.3)' }}>🔐</div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tighter mb-1" style={{ color: 'var(--text)' }}>
            Nueva contraseña
          </h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            Ingresa tu nueva contraseña para acceder a AWTU.
          </p>
        </div>

        {!sesionLista ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-4"
              style={{ border: '3px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Verificando enlace...</p>
          </div>
        ) : (
          <form onSubmit={handleGuardar} className="space-y-5">
            <div>
              <label className="lbl">Nueva contraseña</label>
              <div className="relative">
                <input type={mostrar ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="inp pr-10" placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setMostrar(!mostrar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {mostrar ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className="lbl">Confirmar contraseña</label>
              <div className="relative">
                <input type={mostrar ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)} required
                  className="inp pr-10" placeholder="Repite la contraseña" />
                {password && confirm && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                    {password === confirm ? '✅' : '❌'}
                  </span>
                )}
              </div>
            </div>
            {error && (
              <p className="text-sm font-semibold px-4 py-3 rounded-xl border"
                style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
                ❌ {error}
              </p>
            )}
            <button type="submit" disabled={loading}
              className="font-display w-full disabled:opacity-50 font-bold py-3.5 rounded-xl transition-all uppercase tracking-widest text-sm active:scale-95"
              style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
              {loading ? 'Guardando...' : '🔐 Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}