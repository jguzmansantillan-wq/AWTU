'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RegistroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ nombre: '', email: '', password: '', plan: 'basico' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const planURL = searchParams.get('plan')
    if (planURL && ['basico', 'pro', 'exclusive'].includes(planURL)) {
      setForm(prev => ({ ...prev, plan: planURL }))
    }
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (authError || !data.user) { setError(authError?.message || 'Error al registrar'); setLoading(false); return }
    const { error: dbError } = await supabase.from('talleres').insert({ user_id: data.user.id, nombre: form.nombre, plan: form.plan })
    if (dbError) { setError('Error al guardar taller: ' + dbError.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md card">
        <div className="flex items-center gap-2 mb-6">
          <div className="pilot-light" />
          <span className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>AWTU</span>
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tighter mb-1" style={{ color: 'var(--text)' }}>Crear cuenta</h1>
        <p className="text-sm font-semibold mb-8" style={{ color: 'var(--text-muted)' }}>Empieza a gestionar tu taller hoy</p>
        <form onSubmit={handleRegistro} className="space-y-5">
          <div>
            <label className="lbl">Nombre del taller</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              className="inp" placeholder="Taller San Martín" />
          </div>
          <div>
            <label className="lbl">Correo electrónico</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="inp" placeholder="taller@email.com" />
          </div>
          <div>
            <label className="lbl">Contraseña</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required
              className="inp" placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="lbl">Plan</label>
            <select name="plan" value={form.plan} onChange={handleChange} className="inp">
              <option value="basico">Básico — S/ 49/mes</option>
              <option value="pro">Pro — S/ 99/mes</option>
              <option value="exclusive">Exclusive — S/ 199/mes</option>
            </select>
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
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="text-center text-sm font-semibold mt-6" style={{ color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-bold" style={{ color: 'var(--accent-teal)' }}>Inicia sesión</Link>
        </p>
      </div>
    </main>
  )
}
