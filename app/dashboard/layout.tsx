import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar tallerNombre="Mi Taller" plan="basico" />
      <main className="p-6" style={{ marginLeft: 'var(--sidebar-w)' }}>
        {children}
      </main>
    </div>
  )
}