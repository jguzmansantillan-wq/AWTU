'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { ReactElement } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Props {
  tallerNombre: string
  plan: string
}

const ADMIN_EMAIL = 'jguzmansantillan@gmail.com'

// ── SVG Icons ──────────────────────────────────────────────────────────────
const icons: Record<string, ReactElement> = {
  resumen: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <path d="M14 17.5h7M17.5 14v7"/>
    </svg>
  ),
  atencion: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  ),
  tienda: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  historial: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
    </svg>
  ),
  placa: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M6 10h1M17 10h1M7 14h10"/>
    </svg>
  ),
  reportes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  contactos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  inventario: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  clientes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  docs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  ia: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h1a2 2 0 0 1 2 2v7H7v-7a2 2 0 0 1 2-2h1V9.5A4 4 0 0 1 8 6a4 4 0 0 1 4-4z"/>
      <path d="M9 14h6M9 17h6"/>
    </svg>
  ),
  config: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  recordatorios: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  admin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
}

// ── Módulos ─────────────────────────────────────────────────────────────────
const modulos = [
  { id: 'resumen',           label: 'Resumen',    href: '/dashboard',                   grupo: 'principal' },
  { id: 'atencion',          label: 'Atención',   href: '/dashboard/atencion',          grupo: 'operaciones' },
  { id: 'tienda',            label: 'Tienda',     href: '/dashboard/tienda',            grupo: 'operaciones' },
  { id: 'historial',         label: 'Ventas',     href: '/dashboard/historial',         grupo: 'operaciones' },
  { id: 'placa',             label: 'Placa',      href: '/dashboard/consulta-placa',    grupo: 'operaciones' },
  { id: 'reportes',          label: 'Reportes',   href: '/dashboard/reportes',          grupo: 'analisis' },
  { id: 'contactos',         label: 'Contactos',  href: '/dashboard/contactos',         grupo: 'analisis' },
  { id: 'inventario',        label: 'Inventario', href: '/dashboard/inventario',        grupo: 'analisis' },
  { id: 'clientes',          label: 'Clientes',   href: '/dashboard/historial-cliente', grupo: 'analisis' },
  { id: 'docs',              label: 'Docs',       href: '/dashboard/documentos',        grupo: 'sistema' },
  { id: 'ia',                label: 'IA',         href: '/dashboard/consulta-ia',       grupo: 'sistema' },
  { id: 'config',            label: 'Config',     href: '/dashboard/config',            grupo: 'sistema' },
]

const modulosAdmin = [
  { id: 'recordatorios', label: 'Recordatorios', href: '/dashboard/recordatorios', grupo: 'admin' },
  { id: 'admin',         label: 'Admin',         href: '/admin/suscripciones',     grupo: 'admin' },
]

// Módulos en la barra inferior mobile
const modulosMobile = ['resumen', 'atencion', 'tienda', 'docs']

const grupos = [
  { key: 'principal',   label: null },
  { key: 'operaciones', label: 'Operaciones' },
  { key: 'analisis',    label: 'Análisis' },
  { key: 'sistema',     label: 'Sistema' },
]

const planLabel: Record<string, string> = {
  basico: 'Básico', pro: 'Pro', exclusive: 'Exclusive'
}
const planDot: Record<string, string> = {
  basico: '#6B7E8C', pro: '#16B8A6', exclusive: '#E6A94A'
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (!collapsed) return null
  return (
    <div style={{
      position: 'absolute',
      left: 'calc(100% + 10px)',
      top: '50%',
      transform: 'translateY(-50%)',
      background: '#263746',
      color: '#F2F5F7',
      fontSize: '11px',
      fontWeight: 600,
      padding: '4px 10px',
      borderRadius: '6px',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {label}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function Sidebar({ tallerNombre, plan }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [esAdmin,    setEsAdmin]    = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const [hovered,    setHovered]    = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) setEsAdmin(true)
    })
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActivo = useCallback((href: string) =>
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href + '/')) ||
    (href !== '/dashboard' && pathname === href),
  [pathname])

  const todosModulos = [...modulos, ...(esAdmin ? modulosAdmin : [])]

  // ── Botón de módulo (desktop) ─────────────────────────────────────────────
  const NavItem = ({ m }: { m: typeof modulos[0] }) => {
    const activo = isActivo(m.href)
    const isHov = hovered === m.id

    return (
      <button
        key={m.id}
        onClick={() => router.push(m.href)}
        onMouseEnter={() => setHovered(m.id)}
        onMouseLeave={() => setHovered(null)}
        title={collapsed ? m.label : undefined}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          width: '100%',
          padding: collapsed ? '10px' : '9px 12px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          transition: `background ${200}ms cubic-bezier(0.16, 1, 0.3, 1), color ${200}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          background: activo
            ? 'rgba(22,184,166,0.12)'
            : isHov
              ? 'rgba(255,255,255,0.05)'
              : 'transparent',
          color: activo ? '#16B8A6' : isHov ? '#F2F5F7' : '#A6B3BF',
        }}>

        {/* Indicador activo */}
        {activo && (
          <span style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '18px',
            background: '#16B8A6',
            borderRadius: '0 3px 3px 0',
          }} />
        )}

        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: activo ? 1 : isHov ? 1 : 0.7,
          transition: `opacity ${200}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}>
          {icons[m.id] || icons['resumen']}
        </span>

        {!collapsed && (
          <span style={{
            fontSize: '15px',
            fontWeight: activo ? 600 : 500,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: `opacity ${150}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}>
            {m.label}
          </span>
        )}

        {/* Tooltip en modo colapsado */}
        {collapsed && isHov && <Tooltip label={m.label} collapsed={collapsed} />}
      </button>
    )
  }

  // ── MOBILE: bottom nav + drawer ───────────────────────────────────────────
  const MobileNav = () => (
    <>
      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Drawer desde abajo */}
      {menuOpen && (
        <div
          className="fixed left-0 right-0 bottom-16 z-50"
          style={{
            background: '#182633',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px 20px 0 0',
            maxHeight: '75vh',
            overflowY: 'auto',
            boxShadow: '0 -16px 48px rgba(0,0,0,0.5)',
            animation: 'slideUp 200ms cubic-bezier(0.16,1,0.3,1) both',
          }}>

          <style>{`
            @keyframes slideUp {
              from { transform: translateY(24px); opacity: 0; }
              to   { transform: translateY(0); opacity: 1; }
            }
          `}</style>

          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div style={{ width: '32px', height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Header */}
          <div style={{
            padding: '8px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: '#F2F5F7', fontSize: '14px', fontWeight: 700, margin: 0 }}>{tallerNombre || 'MI TALLER'}</p>
              <p style={{ color: '#6B7E8C', fontSize: '11px', fontWeight: 500, margin: 0 }}>Plan {planLabel[plan] || plan?.toUpperCase()}</p>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)', color: '#A6B3BF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
              }}>
              {icons.close}
            </button>
          </div>

          {/* Grid de módulos */}
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {todosModulos.map(m => {
                const activo = isActivo(m.href)
                return (
                  <button
                    key={m.id}
                    onClick={() => router.push(m.href)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: '6px',
                      padding: '12px 6px',
                      borderRadius: '12px',
                      border: activo ? '1.5px solid rgba(22,184,166,0.4)' : '1.5px solid rgba(255,255,255,0.06)',
                      background: activo ? 'rgba(22,184,166,0.1)' : 'rgba(255,255,255,0.03)',
                      color: activo ? '#16B8A6' : '#A6B3BF',
                      cursor: 'pointer',
                      minHeight: '72px',
                      transition: 'all 150ms',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {icons[m.id] || icons['resumen']}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', lineHeight: 1.2 }}>
                      {m.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Cerrar sesión */}
            <button
              onClick={cerrarSesion}
              style={{
                width: '100%', marginTop: '12px', padding: '12px',
                borderRadius: '10px',
                background: 'rgba(229,107,111,0.08)',
                color: '#E56B6F',
                border: '1px solid rgba(229,107,111,0.2)',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
              {icons.logout}
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav fija */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center',
        background: '#131F2B',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        height: '60px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
      }}>
        {modulosMobile.map(id => {
          const m = modulos.find(x => x.id === id)!
          if (!m) return null
          const activo = isActivo(m.href)
          return (
            <button
              key={m.id}
              onClick={() => router.push(m.href)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '3px', height: '100%',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: activo ? '#16B8A6' : '#6B7E8C',
                transition: 'color 150ms',
                position: 'relative',
              }}>
              {activo && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px', height: '2px',
                  background: '#16B8A6', borderRadius: '99px',
                }} />
              )}
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icons[m.id] || icons['resumen']}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {m.label}
              </span>
            </button>
          )
        })}

        {/* Botón Menú */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '3px', height: '100%',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: menuOpen ? '#16B8A6' : '#6B7E8C',
            transition: 'color 150ms',
            position: 'relative',
          }}>
          {menuOpen && (
            <span style={{
              position: 'absolute', top: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: '20px', height: '2px',
              background: '#16B8A6', borderRadius: '99px',
            }} />
          )}
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? icons.close : icons.menu}
          </span>
          <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Menú
          </span>
        </button>
      </nav>
    </>
  )

  // Renderizar DesktopSidebar inline (no como <DesktopSidebar />) para que
  // el nav conserve su scrollTop entre renders causados por hover, etc.
  const desktopJSX = (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      height: '100%',
      width: collapsed ? '64px' : '240px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
      background: '#131F2B',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      transition: `width ${220}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '18px 0' : '16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        minHeight: '60px',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #16B8A6 0%, #0F9A8B 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
              </svg>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: '#F2F5F7', fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.2, margin: 0 }}>AWTU</p>
              <p style={{ color: '#6B7E8C', fontSize: '10px', fontWeight: 500, lineHeight: 1.2, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tallerNombre || 'Mi Taller'}
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #16B8A6 0%, #0F9A8B 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
            </svg>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              width: '28px', height: '28px', borderRadius: '7px', border: 'none',
              background: 'transparent', color: '#6B7E8C', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: `color ${150}ms, background ${150}ms`, flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F2F5F7'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B7E8C'; e.currentTarget.style.background = 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Botón expandir (cuando colapsado) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            width: '32px', height: '32px', margin: '8px auto 4px',
            borderRadius: '8px', border: 'none',
            background: 'transparent', color: '#6B7E8C', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: `color ${150}ms, background ${150}ms`,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F2F5F7'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6B7E8C'; e.currentTarget.style.background = 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      {/* Navegación — inline JSX para conservar scrollTop entre re-renders */}
      <nav
        ref={navRef}
        style={{
          flex: 1,
          overflowY: 'scroll',
          overflowX: 'hidden',
          padding: collapsed ? '8px 8px' : '8px 10px',
          scrollbarWidth: 'none',
        }}
      >
        {grupos.map(grupo => {
          const items = todosModulos.filter(m => m.grupo === grupo.key)
          if (items.length === 0) return null
          return (
            <div key={grupo.key} style={{ marginBottom: '4px' }}>
              {grupo.label && !collapsed && (
                <p style={{
                  fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: '#6B7E8C',
                  padding: '10px 12px 4px', margin: 0,
                }}>
                  {grupo.label}
                </p>
              )}
              {grupo.label && collapsed && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 4px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {items.map(m => <NavItem key={m.id} m={m} />)}
              </div>
            </div>
          )
        })}

        {esAdmin && (
          <div style={{ marginTop: '4px' }}>
            {!collapsed && (
              <p style={{
                fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#E6A94A',
                padding: '10px 12px 4px', margin: 0,
              }}>
                Admin
              </p>
            )}
            {collapsed && <div style={{ height: '1px', background: 'rgba(230,169,74,0.2)', margin: '8px 4px' }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {modulosAdmin.map(m => <NavItem key={m.id} m={m} />)}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '8px',
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: planDot[plan] || '#6B7E8C', flexShrink: 0,
              boxShadow: `0 0 6px ${planDot[plan] || '#6B7E8C'}`,
            }} />
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#A6B3BF', flex: 1 }}>Plan</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: planDot[plan] || '#A6B3BF' }}>
              {planLabel[plan] || (plan || '').toUpperCase()}
            </span>
          </div>
        )}
        <button
          onClick={cerrarSesion}
          title={collapsed ? 'Cerrar sesión' : undefined}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px', padding: collapsed ? '10px' : '9px 10px',
            borderRadius: '8px', border: 'none', background: 'transparent',
            color: '#6B7E8C', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
            transition: `background ${150}ms, color ${150}ms`,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229,107,111,0.1)'; e.currentTarget.style.color = '#E56B6F' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7E8C' }}>
          {icons.logout}
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden md:block">
        {desktopJSX}
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </>
  )
}