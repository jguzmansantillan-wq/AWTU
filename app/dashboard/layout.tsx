'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import AuthGuard from '@/components/AuthGuard'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

// Contenido interno que ya puede consumir el contexto
function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { taller } = useAuth()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar
          tallerNombre={taller?.nombre || 'Mi Taller'}
          plan={taller?.plan || 'basico'}
        />
        <main
          id="main-content"
          style={{
            marginLeft: 'var(--sidebar-w)',
            minHeight: '100vh',
            background: 'var(--bg)',
            padding: '24px 28px',
            paddingBottom: '48px',
            transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          #main-content {
            margin-left: 0 !important;
            padding: 16px 16px 80px !important;
          }
        }
      `}</style>
    </AuthGuard>
  )
}

// Layout raíz: provee el contexto una sola vez para toda la sesión
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardContent>
        {children}
      </DashboardContent>
    </AuthProvider>
  )
}
