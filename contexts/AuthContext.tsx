'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface TallerInfo {
  id: string
  nombre: string
  plan: string
  suscripcion_activa: boolean
  logo_url: string
}

interface AuthContextValue {
  user: User | null
  taller: TallerInfo | null
  estado: 'cargando' | 'activo' | 'pendiente' | 'sin-sesion'
  refrescar: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  taller: null,
  estado: 'cargando',
  refrescar: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null)
  const [taller, setTaller] = useState<TallerInfo | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'activo' | 'pendiente' | 'sin-sesion'>('cargando')

  const cargarTaller = useCallback(async (uid: string) => {
    const { data: t } = await supabase
      .from('talleres')
      .select('id, nombre, plan, suscripcion_activa, logo_url')
      .eq('user_id', uid)
      .single()

    if (!t) { setEstado('sin-sesion'); return }
    setTaller(t)
    setEstado(t.suscripcion_activa ? 'activo' : 'pendiente')
  }, [])

  const refrescar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setEstado('sin-sesion'); return }
    setUser(session.user)
    await cargarTaller(session.user.id)
  }, [cargarTaller])

  useEffect(() => {
    // Carga inicial usando sesión local (sin round-trip al servidor)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setEstado('sin-sesion'); return }
      setUser(session.user)
      cargarTaller(session.user.id)
    })

    // Escucha cambios de sesión (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
        setTaller(null)
        setEstado('sin-sesion')
        return
      }
      setUser(session.user)
      cargarTaller(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [cargarTaller])

  return (
    <AuthContext.Provider value={{ user, taller, estado, refrescar }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
