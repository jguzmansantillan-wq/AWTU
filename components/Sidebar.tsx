'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Props {
  tallerNombre: string
  plan: string
}

const ADMIN_EMAIL = 'jguzmansantillan@gmail.com'

const modulos = [
  { id: 'resumen',           label: 'Resumen',       icono: '📊', href: '/dashboard'                   },
  { id: 'atencion',          label: 'Atención',      icono: '🔧', href: '/dashboard/atencion'          },
  { id: 'tienda',            label: 'Tienda',        icono: '🛒', href: '/dashboard/tienda'            },
  { id: 'historial',         label: 'Ventas',        icono: '📋', href: '/dashboard/historial'         },
  { id: 'consulta-placa',    label: 'Placa',         icono: '🔍', href: '/dashboard/consulta-placa'    },
  { id: 'reportes',          label: 'Reportes',      icono: '📈', href: '/dashboard/reportes'          },
  { id: 'contactos',         label: 'Contactos',     icono: '👥', href: '/dashboard/contactos'         },
  { id: 'inventario',        label: 'Inventario',    icono: '📦', href: '/dashboard/inventario'        },
  { id: 'historial-cliente', label: 'Clientes',      icono: '🔗', href: '/dashboard/historial-cliente' },
  { id: 'documentos',        label: 'Docs',          icono: '🧾', href: '/dashboard/documentos'        },
  { id: 'consulta-ia',       label: 'IA',            icono: '🤖', href: '/dashboard/consulta-ia'       },
  { id: 'config',            label: 'Config',        icono: '⚙️', href: '/dashboard/config'            },
]

const modulosAdmin = [
  { id: 'recordatorios', label: 'Recordatorios', icono: '💬', href: '/dashboard/recordatorios' },
  { id: 'admin',         label: 'Admin',         icono: '🛡️', href: '/admin/suscripciones'    },
]

// Módulos que aparecen en la barra inferior mobile (los más usados)
const modulosMobile = ['resumen', 'atencion', 'tienda', 'documentos']

const planLabel: Record<string, string> = {
  basico: 'BÁSICO', pro: 'PRO', exclusive: 'EXCLUSIVE'
}
const planColor: Record<string, string> = {
  basico: 'var(--text-muted)', pro: 'var(--accent-teal)', exclusive: 'var(--accent-yellow)'
}

export default function Sidebar({ tallerNombre, plan }: Props) {
  const router    = useRouter()
  const pathname  = usePathname()
  const [esAdmin, setEsAdmin]       = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) setEsAdmin(true)
    })
  }, [])

  // Cierra el menú al navegar
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActivo = (href: string) =>
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href + '/')) ||
    (href !== '/dashboard' && pathname === href)

  const renderBoton = (m: typeof modulos[0]) => {
    const activo = isActivo(m.href)
    return (
      <button key={m.id} onClick={() => router.push(m.href)}
        className="relative flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all active:scale-95"
        style={{
          background: 'var(--surface)',
          border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
          borderBottom: activo ? '2px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: activo ? '0 0 0 1px rgba(255,106,31,0.15), 0 4px 16px rgba(255,106,31,0.12)' : 'none',
        }}>
        {activo && <span className="absolute top-1.5 right-1.5 pilot-light" />}
        <span className="text-2xl leading-none">{m.icono}</span>
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.15em] text-center leading-tight"
          style={{ color: activo ? 'var(--text)' : 'var(--text-muted)' }}>
          {m.label}
        </span>
      </button>
    )
  }

  const todosModulos = [...modulos, ...(esAdmin ? modulosAdmin : [])]

  // ── MOBILE: bottom nav + drawer ──────────────────────────────────────────
  const MobileNav = () => (
    <>
      {/* Overlay del menú completo */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Drawer deslizante desde abajo */}
      {menuOpen && (
        <div
          className="fixed left-0 right-0 bottom-16 z-50 rounded-t-3xl overflow-hidden"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderBottom: 'none', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
          </div>

          {/* Taller info */}
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>{tallerNombre}</h2>
                <span className="font-display text-[10px] font-bold tracking-widest"
                  style={{ color: planColor[plan] || 'var(--text)' }}>
                  Plan {planLabel[plan] || plan?.toUpperCase()}
                </span>
              </div>
              <button onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Grid de todos los módulos */}
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3">
              {todosModulos.map(m => {
                const activo = isActivo(m.href)
                return (
                  <button key={m.id} onClick={() => router.push(m.href)}
                    className="relative flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1 transition-all active:scale-95"
                    style={{
                      background: activo ? 'rgba(255,106,31,0.1)' : 'var(--surface)',
                      border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {activo && <span className="absolute top-1.5 right-1.5 pilot-light" />}
                    <span className="text-2xl leading-none">{m.icono}</span>
                    <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-center leading-tight"
                      style={{ color: activo ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {m.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Cerrar sesión */}
            <button onClick={cerrarSesion}
              className="w-full mt-4 py-3 rounded-2xl font-display text-[11px] font-semibold uppercase tracking-[0.15em] transition-all"
              style={{ background: 'rgba(255,106,31,0.08)', color: 'var(--accent)', border: '1px solid rgba(255,106,31,0.2)' }}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Bottom navigation bar fija */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          height: '64px',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}>
        {/* Botones principales */}
        {modulosMobile.map(id => {
          const m = modulos.find(x => x.id === id)!
          const activo = isActivo(m.href)
          return (
            <button key={m.id} onClick={() => router.push(m.href)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90"
              style={{ color: activo ? 'var(--accent)' : 'var(--text-muted)' }}>
              <span className="text-xl leading-none">{m.icono}</span>
              <span className="font-display text-[9px] font-bold uppercase tracking-widest">{m.label}</span>
              {activo && (
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          )
        })}

        {/* Botón "más" abre el drawer */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90"
          style={{ color: menuOpen ? 'var(--accent)' : 'var(--text-muted)' }}>
          <span className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
          <span className="font-display text-[9px] font-bold uppercase tracking-widest">Menú</span>
        </button>
      </nav>
    </>
  )

  // ── DESKTOP: sidebar lateral ──────────────────────────────────────────────
  const DesktopSidebar = () => (
    <aside className="fixed left-0 top-0 h-full flex flex-col z-20"
      style={{ width: 'var(--sidebar-w)', background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="pilot-light" />
          <h1 className="font-display text-2xl font-bold tracking-tighter" style={{ color: 'var(--text)' }}>AWTU</h1>
        </div>
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] truncate"
          style={{ color: 'var(--text-muted)' }}>
          {tallerNombre}
        </p>
      </div>

      {/* Grid de módulos */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {modulos.map(renderBoton)}
        </div>

        {esAdmin && (
          <>
            <div className="mt-3 mb-2 px-1">
              <p className="font-display text-[9px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--accent-teal)', opacity: 0.6 }}>
                — Admin —
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {modulosAdmin.map(renderBoton)}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="rounded-xl px-3 py-2 flex items-center justify-between"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="font-display text-[9px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: 'var(--text-muted)' }}>Plan</span>
          <span className="font-display text-xs font-bold tracking-widest"
            style={{ color: planColor[plan] || 'var(--text)' }}>
            {planLabel[plan] || plan?.toUpperCase()}
          </span>
        </div>
        <button onClick={cerrarSesion}
          className="w-full py-2 rounded-xl font-display text-[10px] font-semibold uppercase tracking-[0.15em] transition-all"
          style={{ background: 'rgba(255,106,31,0.08)', color: 'var(--accent)', border: '1px solid rgba(255,106,31,0.2)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#14171C' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,106,31,0.08)'; e.currentTarget.style.color = 'var(--accent)' }}>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: visible desde md en adelante */}
      <div className="hidden md:block">
        <DesktopSidebar />
      </div>

      {/* Mobile: visible solo en pantallas pequeñas */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </>
  )
}