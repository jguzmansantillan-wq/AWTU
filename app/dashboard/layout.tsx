import Sidebar from '@/components/Sidebar'
import AuthGuard from '@/components/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AuthGuard>
        <Sidebar tallerNombre="Mi Taller" plan="basico" />
        <main
          className="p-4 md:p-6 pb-24 md:pb-6"
          style={{ marginLeft: 'var(--sidebar-w)' }}>
          <style>{`
            @media (max-width: 767px) {
              main { margin-left: 0 !important; }
            }
          `}</style>
          {children}
        </main>
      </AuthGuard>
    </div>
  )
}