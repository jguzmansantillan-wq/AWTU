export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
      {children}
    </div>
  )
}
