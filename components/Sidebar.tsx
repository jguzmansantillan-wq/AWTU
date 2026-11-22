'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Props {
  tallerNombre: string
  plan: string
}

const ADMIN_EMAIL = 'jguzmansantillan@gmail.com'

// Colores de módulos (Keyfacil-style)
const modulos = [
  { id: 'resumen',           label: 'Resumen',       icono: '📊', href: '/dashboard',                    color: '#334FBA' },
  { id: 'atencion',          label: 'Atención',      icono: '🔧', href: '/dashboard/atencion',           color: '#00885C' },
  { id: 'tienda',            label: 'Tienda',        icono: '🛒', href: '/dashboard/tienda',             color: '#BE48CC' },
  { id: 'historial',         label: 'Ventas',        icono: '📋', href: '/dashboard/historial',          color: '#3797C8' },
  { id: 'consulta-placa',    label: 'Placa',         icono: '🔍', href: '/dashboard/consulta-placa',     color: '#F14461' },
  { id: 'reportes',          label: 'Reportes',      icono: '📈', href: '/dashboard/reportes',           color: '#7BB242' },
  { id: 'contactos',         label: 'Contactos',     icono: '👥', href: '/dashboard/contactos',          color: '#0096A7' },
  { id: 'inventario',        label: 'Inventario',    icono: '📦', href: '/dashboard/inventario',         color: '#2E98FB' },
  { id: 'historial-cliente', label: 'Clientes',      icono: '🔗', href: '/dashboard/historial-cliente',  color: '#F56349' },
  { id: 'documentos',        label: 'Docs',          icono: '🧾', href: '/dashboard/documentos',         color: '#E83D80' },
  { id: 'consulta-ia',       label: 'IA',            icono: '🤖', href: '/dashboard/consulta-ia',        color: '#A4AD12' },
  { id: 'config',            label: 'Config',        icono: '⚙️', href: '/dashboard/config',             color: '#168EAD' },
]

const modulosAdmin = [
  { id: 'recordatorios', label: 'Recordatorios', icono: '💬', href: '/dashboard/recordatorios', color: '#FE6599' },
  { id: 'admin',         label: 'Admin',         icono: '🛡️', href: '/admin/suscripciones',    color: '#334FBA' },
]

// Módulos en la barra inferior mobile
const modulosMobile = ['resumen', 'atencion', 'tienda', 'documentos']

const planLabel: Record<string, string> = {
  basico: 'BÁSICO', pro: 'PRO', exclusive: 'EXCLUSIVE'
}
const planColor: Record<string, string> = {
  basico: '#777777', pro: '#0096A7', exclusive: '#F59E0B'
}

export default function Sidebar({ tallerNombre, plan }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [esAdmin,   setEsAdmin]   = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)

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

  const isActivo = (href: string) =>
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href + '/')) ||
    (href !== '/dashboard' && pathname === href)

  // Botón de módulo estilo Keyfacil (escritorio)
  const renderBoton = (m: typeof modulos[0]) => {
    const activo = isActivo(m.href)
    return (
      <button
        key={m.id}
        onClick={() => router.push(m.href)}
        className="relative flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
        style={{
          background: activo ? m.color : `${m.color}22`,
          borderRadius: '18px',
          padding: '14px 8px',
          border: activo ? `2px solid ${m.color}` : `2px solid ${m.color}44`,
          boxShadow: activo ? `0 4px 14px ${m.color}44` : 'none',
          transform: activo ? 'scale(1.02)' : 'scale(1)',
          cursor: 'pointer',
          minHeight: '76px',
        }}
        onMouseEnter={e => {
          if (!activo) {
            e.currentTarget.style.background = `${m.color}33`
            e.currentTarget.style.borderColor = `${m.color}66`
          }
        }}
        onMouseLeave={e => {
          if (!activo) {
            e.currentTarget.style.background = `${m.color}22`
            e.currentTarget.style.borderColor = `${m.color}44`
          }
        }}>
        <span style={{ fontSize: '24px', lineHeight: 1 }}>{m.icono}</span>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'center',
          lineHeight: 1.2,
          color: activo ? '#FFFFFF' : m.color,
        }}>
          {m.label}
        </span>
      </button>
    )
  }

  const todosModulos = [...modulos, ...(esAdmin ? modulosAdmin : [])]

  // ── MOBILE: bottom nav + drawer ──────────────────────────────────────
  const MobileNav = () => (
    <>
      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Drawer desde abajo */}
      {menuOpen && (
        <div
          className="fixed left-0 right-0 bottom-16 z-50 rounded-t-3xl overflow-hidden"
          style={{
            background: '#FFFFFF',
            borderTop: '1px solid #E0E0E0',
            maxHeight: '75vh',
            overflowY: 'auto',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
          }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#E0E0E0' }} />
          </div>

          {/* Header del drawer */}
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #E0E0E0', background: '#334FBA' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {tallerNombre || 'MI TALLER'}
                </h2>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 500 }}>
                  Plan {planLabel[plan] || plan?.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.15)', color: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer',
                }}>
                ✕
              </button>
            </div>
          </div>

          {/* Grid de módulos */}
          <div className="p-4">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {todosModulos.map(m => {
                const activo = isActivo(m.href)
                return (
                  <button
                    key={m.id}
                    onClick={() => router.push(m.href)}
                    className="flex flex-col items-center justify-center transition-all active:scale-90"
                    style={{
                      background: activo ? m.color : `${m.color}18`,
                      borderRadius: '16px',
                      padding: '12px 6px',
                      border: activo ? `2px solid ${m.color}` : `2px solid ${m.color}33`,
                      minHeight: '72px',
                      cursor: 'pointer',
                      gap: '6px',
                    }}>
                    <span style={{ fontSize: '22px', lineHeight: 1 }}>{m.icono}</span>
                    <span style={{
                      fontSize: '9px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      textAlign: 'center', lineHeight: 1.2,
                      color: activo ? '#FFFFFF' : m.color,
                    }}>
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
                width: '100%', marginTop: '16px', padding: '12px',
                borderRadius: '14px', background: '#EC4C4710',
                color: '#EC4C47', border: '1.5px solid #EC4C4730',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav fija */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{
          background: '#FFFFFF',
          borderTop: '1px solid #E0E0E0',
          height: '64px',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        }}>
        {modulosMobile.map(id => {
          const m = modulos.find(x => x.id === id)!
          const activo = isActivo(m.href)
          return (
            <button
              key={m.id}
              onClick={() => router.push(m.href)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90"
              style={{ color: activo ? m.color : '#AAAAAA', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{m.icono}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {m.label}
              </span>
              {activo && (
                <span style={{
                  position: 'absolute', bottom: 0,
                  width: '28px', height: '3px', borderRadius: '2px',
                  background: m.color,
                }} />
              )}
            </button>
          )
        })}

        {/* Botón "Menú" */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90"
          style={{
            color: menuOpen ? '#334FBA' : '#AAAAAA',
            border: 'none', background: 'transparent', cursor: 'pointer',
          }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>{menuOpen ? '✕' : '☰'}</span>
          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Menú
          </span>
        </button>
      </nav>
    </>
  )

  // ── DESKTOP: sidebar lateral estilo Keyfacil ─────────────────────────
  const DesktopSidebar = () => (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-20"
      style={{
        width: 'var(--sidebar-w)',
        background: '#334FBA',
        borderRight: 'none',
        boxShadow: '2px 0 16px rgba(51,79,186,0.15)',
      }}>

      {/* Logo / Header */}
      <div
        className="px-4 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <div className="flex items-center gap-2 mb-0.5">
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>🔧</div>
          <h1 style={{
            color: '#FFFFFF', fontSize: '20px',
            fontWeight: 900, letterSpacing: '0.08em',
            lineHeight: 1,
          }}>AWTU</h1>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: '10px', fontWeight: 500,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginTop: '2px',
        }}>
          {tallerNombre || 'MI TALLER'}
        </p>
      </div>

      {/* Grid de módulos */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {modulos.map(renderBoton)}
        </div>

        {/* Sección Admin */}
        {esAdmin && (
          <>
            <div style={{
              margin: '12px 0 8px',
              textAlign: 'center',
            }}>
              <span style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '9px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.15em',
              }}>
                — ADMIN —
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {modulosAdmin.map(renderBoton)}
            </div>
          </>
        )}
      </nav>

      {/* Footer: plan + cerrar sesión */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        {/* Info plan */}
        <div style={{
          borderRadius: '12px',
          padding: '8px 12px',
          marginBottom: '8px',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Plan
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: planColor[plan] === '#777777' ? 'rgba(255,255,255,0.8)' : planColor[plan],
            letterSpacing: '0.06em',
          }}>
            {planLabel[plan] || plan?.toUpperCase()}
          </span>
        </div>

        {/* Botón cerrar sesión */}
        <button
          onClick={cerrarSesion}
          style={{
            width: '100%', padding: '10px',
            borderRadius: '12px',
            background: 'rgba(236,76,71,0.15)',
            color: '#FF8080',
            border: '1.5px solid rgba(236,76,71,0.3)',
            fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#EC4C47'
            e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(236,76,71,0.15)'
            e.currentTarget.style.color = '#FF8080'
          }}>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopSidebar />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </>
  )
}