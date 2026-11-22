'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import AuthGuard from '@/components/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [tallerNombre, setTallerNombre] = useState('Mi Taller')
  const [plan, setPlan] = useState('basico')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('nombre, plan').eq('user_id', user.id).single()
      if (t) {
        setTallerNombre(t.nombre || 'Mi Taller')
        setPlan(t.plan || 'basico')
      }
    }
    load()
  }, [])

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar tallerNombre={tallerNombre} plan={plan} />
        <main
          id="main-content"
          className="page-enter"
          style={{
            /* En desktop respeta el sidebar; en móvil no tiene margen lateral */
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

      {/* Ajuste responsivo: sin margen en móvil */}
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