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
  { id: 'resumen',           label: 'Resumen',          icono: '📊', href: '/dashboard'                   },
  { id: 'atencion',          label: 'Atención',         icono: '🔧', href: '/dashboard/atencion'          },
  { id: 'tienda',            label: 'Tienda / POS',     icono: '🛒', href: '/dashboard/tienda'            },
  { id: 'historial',         label: 'Ventas',           icono: '📋', href: '/dashboard/historial'         },
  { id: 'consulta-placa',    label: 'Consulta Placa',   icono: '🔍', href: '/dashboard/consulta-placa'    },
  { id: 'reportes',          label: 'Reportes',         icono: '📈', href: '/dashboard/reportes'          },
  { id: 'contactos',         label: 'Contactos',        icono: '👥', href: '/dashboard/contactos'         },
  { id: 'inventario',        label: 'Inventario',       icono: '📦', href: '/dashboard/inventario'        },
  { id: 'historial-cliente', label: 'Hist. Cliente',    icono: '🔗', href: '/dashboard/historial-cliente' },
  { id: 'documentos',        label: 'Documentos',       icono: '🧾', href: '/dashboard/documentos'        },
  { id: 'consulta-ia',       label: 'Consulta IA',      icono: '🤖', href: '/dashboard/consulta-ia'       },
  { id: 'config',            label: 'Config',           icono: '⚙️', href: '/dashboard/config'            },
]

const modulosAdmin = [
  { id: 'recordatorios', label: 'Recordatorios', icono: '💬', href: '/dashboard/recordatorios' },
  { id: 'admin',         label: 'Admin',          icono: '🛡️', href: '/admin/suscripciones'    },
]

const planLabel: Record<string, string> = {
  basico: 'BÁSICO', pro: 'PRO', exclusive: 'EXCLUSIVE'
}
const planColor: Record<string, string> = {
  basico: 'var(--text-muted)', pro: 'var(--accent-teal)', exclusive: 'var(--accent-yellow)'
}

export default function Sidebar({ tallerNombre, plan }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) setEsAdmin(true)
    })
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const renderBoton = (m: typeof modulos[0]) => {
    const activo = pathname === m.href ||
      (m.href !== '/dashboard' && pathname.startsWith(m.href + '/')) ||
      (m.href !== '/dashboard' && pathname === m.href)
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

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col z-20"
      style={{ width: 'var(--sidebar-w)', background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="pilot-light" />
          <h1 className="font-display text-2xl font-bold tracking-tighter" style={{ color: 'var(--text)' }}>AWTU</h1>
        </div>
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] truncate" style={{ color: 'var(--text-muted)' }}>
          {tallerNombre}
        </p>
      </div>

      {/* Grid de módulos */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {modulos.map(renderBoton)}
        </div>

        {/* Módulos solo para admin */}
        {esAdmin && (
          <>
            <div className="mt-3 mb-2 px-1">
              <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)', opacity: 0.6 }}>
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
        <div className="rounded-xl px-3 py-2 flex items-center justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="font-display text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>Plan</span>
          <span className="font-display text-xs font-bold tracking-widest" style={{ color: planColor[plan] || 'var(--text)' }}>
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
}