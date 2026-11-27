'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { estado } = useAuth()

  useEffect(() => {
    if (estado === 'sin-sesion') router.replace('/login')
  }, [estado, router])

  if (estado === 'cargando') return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-10 h-10 rounded-full animate-spin"
        style={{ border: '4px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (estado === 'pendiente') return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md rounded-3xl p-8 space-y-6 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 32px 80px -12px rgba(0,0,0,0.5)' }}>

        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto"
          style={{ background: 'rgba(255,194,60,0.12)', border: '1px solid rgba(255,194,60,0.35)' }}>
          ⏳
        </div>

        <div>
          <h2 className="font-display font-bold text-xl uppercase tracking-tight" style={{ color: 'var(--text)' }}>
            Cuenta pendiente de activación
          </h2>
          <p className="text-sm font-semibold mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Tu cuenta fue creada correctamente. Nuestro equipo la está revisando y te activará en breve.
          </p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,194,60,0.06)', border: '1px solid rgba(255,194,60,0.2)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--accent-yellow)' }}>
            ⚡ Tiempo de activación: menos de 24 horas
          </p>
        </div>

        <a
          href="https://wa.me/51925988464?text=Hola%2C%20me%20registré%20en%20AWTU%20y%20necesito%20activar%20mi%20cuenta"
          target="_blank" rel="noopener noreferrer"
          className="font-display flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95"
          style={{ background: '#25D366', color: '#fff' }}>
          💬 Contactar para activar mi cuenta
        </a>

        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
          className="font-display text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  if (estado === 'sin-sesion') return null

  return <>{children}</>
}
