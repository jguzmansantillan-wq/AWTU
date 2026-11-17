import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar tallerNombre="Mi Taller" plan="basico" />
      {/* Desktop: margen izquierdo por el sidebar. Mobile: sin margen, padding inferior para la bottom nav */}
      <main
        className="p-4 md:p-6 pb-24 md:pb-6"
        style={{ marginLeft: 'var(--sidebar-w)' }}
      >
        {/* En mobile anulamos el marginLeft del sidebar (que no existe en mobile) */}
        <style>{`
          @media (max-width: 767px) {
            main { margin-left: 0 !important; }
          }
        `}</style>
        {children}
      </main>
    </div>
  )
}