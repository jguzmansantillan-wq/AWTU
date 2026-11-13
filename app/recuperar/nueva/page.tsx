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
    if (password.length < 6) { setError('La contrasena debe tener minimo 6 caracteres'); return }
    if (password !== confirm) { setError('Las contrasenhas no coinciden'); return }
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
          style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.3)' }}>
          ✅
        </div>
        <h2 className="font-display text-xl font-bold uppercase tracking-tighter mb-3" style={{ color: 'var(--text)' }}>
          Contrasena actualizada!
        </h2>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          Redirigiendo al inicio de sesion...
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
          <h1 className="font-display text-2xl font-bold uppercase tracking-tighter mb-2" style={{ color: 'var(--text)' }}>
            Nueva contrasena
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Ingresa tu nueva contrasena para continuar.
          </p>
        </div>

        {!sesionLista && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(255,160,0,0.1)', border: '1px solid rgba(255,160,0,0.3)', color: '#ffa000' }}>
            Verificando enlace de recuperacion...
          </div>
        )}

        <form onSubmit={handleGuardar} className="flex flex-col gap-4">
          <div>
            <label className="lbl">Nueva contrasena</label>
            <div className="relative">
              <input
                type={mostrar ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="inp pr-10"
                placeholder="Minimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {mostrar ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <div>
            <label className="lbl">Confirmar contrasena</label>
            <div className="relative">
              <input
                type={mostrar ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="inp pr-10"
                placeholder="Repite la contrasena"
              />
              {password && confirm && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                  {password === confirm ? '✅' : '❌'}
                </span>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#ff5252' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !sesionLista}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'Guardando...' : 'Guardar contrasena'}
          </button>
        </form>
      </div>
    </main>
  )
}