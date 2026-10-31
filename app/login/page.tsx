'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Correo o contraseña incorrectos'); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md card">
        <div className="flex items-center gap-2 mb-6">
          <div className="pilot-light" />
          <span className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>AWTU</span>
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tighter mb-1" style={{ color: 'var(--text)' }}>Iniciar sesión</h1>
        <p className="text-sm font-semibold mb-8" style={{ color: 'var(--text-muted)' }}>Accede a tu panel de taller</p>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="lbl">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="inp"
              placeholder="taller@email.com" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="lbl" style={{ marginBottom: 0 }}>Contraseña</label>
              <Link href="/recuperar"
                className="font-display text-[10px] font-bold uppercase tracking-widest transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-teal)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="inp"
              placeholder="••••••••" />
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
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-sm font-semibold mt-6" style={{ color: 'var(--text-muted)' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="font-bold" style={{ color: 'var(--accent-teal)' }}>Regístrate</Link>
        </p>
      </div>
    </main>
  )
}
