'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NuevaContrasenaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [sesionValida, setSesionValida] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    // Supabase redirige aquí con tokens en el hash de la URL (#access_token=...&type=recovery)
    // El SDK los detecta automáticamente al verificar la sesión
    const verificar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSesionValida(true)
      }
      setVerificando(false)
    }
    verificar()

    // Escuchar el evento de recuperación de contraseña
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSesionValida(true)
        setVerificando(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
      setLoading(false)
      return
    }

    setListo(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  if (verificando) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
      </main>
    )
  }

  if (!sesionValida) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-md card text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
            style={{ background: 'rgba(255,106,31,0.1)', border: '1px solid rgba(255,106,31,0.3)' }}>
            ⛔
          </div>
          <h2 className="font-display text-xl font-bold uppercase tracking-tighter mb-3" style={{ color: 'var(--text)' }}>
            Enlace inválido o expirado
          </h2>
          <p className="text-sm font-semibold mb-8" style={{ color: 'var(--text-muted)' }}>
            Este enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.
          </p>
          <Link href="/recuperar"
            className="font-display inline-block font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
            style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
            Solicitar nuevo enlace
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md card">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="pilot-light" />
          <span className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>AWTU</span>
        </div>

        {!listo ? (
          <>
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.3)' }}>
                🔒
              </div>
              <h1 className="font-display text-2xl font-bold uppercase tracking-tighter mb-1" style={{ color: 'var(--text)' }}>
                Nueva contraseña
              </h1>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                Elige una contraseña segura para tu cuenta.
              </p>
            </div>

            <form onSubmit={handleGuardar} className="space-y-5">
              <div>
                <label className="lbl">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="inp"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="lbl">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  required
                  className="inp"
                  placeholder="Repite la contraseña"
                />
              </div>

              {/* Indicador de fuerza */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(n => (
                      <div key={n} className="h-1 flex-1 rounded-full transition-all"
                        style={{
                          background: password.length >= n * 3
                            ? password.length >= 10 ? '#34d399' : password.length >= 6 ? 'var(--accent-yellow)' : 'var(--accent)'
                            : 'var(--border)'
                        }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: password.length >= 10 ? '#34d399' : password.length >= 6 ? 'var(--accent-yellow)' : 'var(--accent)' }}>
                    {password.length >= 10 ? '✓ Contraseña fuerte' : password.length >= 6 ? '⚠ Contraseña aceptable' : '✗ Muy corta'}
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm font-semibold px-4 py-3 rounded-xl border"
                  style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
                  ❌ {error}
                </p>
              )}

              <button type="submit" disabled={loading}
                className="font-display w-full disabled:opacity-50 font-bold py-3.5 rounded-xl transition-all uppercase tracking-widest text-sm active:scale-95"
                style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
                {loading ? 'Guardando...' : '🔒 Guardar nueva contraseña'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6"
              style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.3)' }}>
              ✅
            </div>
            <h2 className="font-display text-xl font-bold uppercase tracking-tighter mb-3" style={{ color: 'var(--text)' }}>
              ¡Contraseña actualizada!
            </h2>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Redirigiendo a tu panel...
            </p>
            <div className="mt-4 w-6 h-6 rounded-full animate-spin mx-auto" style={{ border: '3px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
          </div>
        )}

      </div>
    </main>
  )
}
