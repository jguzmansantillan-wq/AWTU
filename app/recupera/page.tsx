'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar/nueva`,
    })

    if (error) {
      setError('No se pudo enviar el correo. Verifica el email e intenta de nuevo.')
      setLoading(false)
      return
    }

    setEnviado(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md card">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="pilot-light" />
          <span className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>AWTU</span>
        </div>

        {!enviado ? (
          <>
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.3)' }}>
                🔑
              </div>
              <h1 className="font-display text-2xl font-bold uppercase tracking-tighter mb-1" style={{ color: 'var(--text)' }}>
                Recuperar contraseña
              </h1>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
              </p>
            </div>

            <form onSubmit={handleEnviar} className="space-y-5">
              <div>
                <label className="lbl">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="inp"
                  placeholder="taller@email.com"
                />
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
                {loading ? 'Enviando...' : '📧 Enviar enlace de recuperación'}
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
              ¡Correo enviado!
            </h2>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Revisa tu bandeja de entrada en
            </p>
            <p className="font-mono font-bold text-sm mb-6 px-4 py-2 rounded-xl inline-block"
              style={{ background: 'var(--surface-2)', color: 'var(--accent-teal)', border: '1px solid var(--border)' }}>
              {email}
            </p>
            <p className="text-xs font-semibold mb-8" style={{ color: 'var(--text-muted)' }}>
              Haz clic en el enlace del correo para crear tu nueva contraseña. Si no lo ves, revisa la carpeta de spam.
            </p>
            <button onClick={() => { setEnviado(false); setEmail('') }}
              className="font-display text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl border transition-all"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              Enviar a otro correo
            </button>
          </div>
        )}

        <p className="text-center text-sm font-semibold mt-8" style={{ color: 'var(--text-muted)' }}>
          <Link href="/login" className="font-bold flex items-center justify-center gap-1.5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-teal)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            ← Volver al inicio de sesión
          </Link>
        </p>

      </div>
    </main>
  )
}