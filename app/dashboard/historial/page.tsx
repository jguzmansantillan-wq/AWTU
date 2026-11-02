'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Servicio = {
  id: string; placa: string; nombre: string; marca: string; modelo: string
  monto: number; fecha: string; created_at: string; estado_facturacion: string
  otros_servicios: string; aceite_marca: string; aceite_visc: string
  aceite_cantidad: number; filtro_aceite: string; filtro_aire: string
  caja_marca: string; caja_tipo: string; refrig_marca: string; refrig_color: string
  bujia_marca: string; km: number; proximo_km: number; telefono: string; anio: string
  tipo: 'servicio'
}

type Venta = {
  id: string; nombre: string; telefono: string; items: any[]
  monto: number; fecha: string; created_at: string; tipo: 'venta'
}

type Proforma = {
  id: string; nombre: string; telefono: string; placa?: string; items: any[]
  monto: number; fecha: string; created_at: string; tipo: 'proforma'
}

type Registro = Servicio | Venta | Proforma
type FiltroTipo = 'todos' | 'servicios' | 'ventas' | 'proformas'

export default function HistorialPage() {
  const router = useRouter()
  const cartillaRef = useRef<HTMLDivElement>(null)
  const ticketRef = useRef<HTMLDivElement>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [tallerNombre, setTallerNombre] = useState('AWTU')
  const [tallerLogo, setTallerLogo] = useState('')
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [ordenFecha, setOrdenFecha] = useState<'desc' | 'asc'>('desc')
  const [cartillaData, setCartillaData] = useState<any>(null)
  const [ticketVenta, setTicketVenta] = useState<Venta | Proforma | null>(null)
  const [descargandoTicket, setDescargandoTicket] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('id, nombre, logo_url').eq('user_id', user.id).single()
      if (!t) return
      setTallerNombre(t.nombre || 'AWTU')
      setTallerLogo(t.logo_url || '')

      const { data: svcs } = await supabase.from('servicios')
        .select('*').eq('taller_id', t.id).order('created_at', { ascending: false })
      const { data: vnts } = await supabase.from('ventas')
        .select('*').eq('taller_id', t.id).order('created_at', { ascending: false })

      // Intenta cargar proformas — si la tabla no existe, simplemente queda vacío
      let profs: any[] = []
      try {
        const { data: p } = await supabase.from('proformas')
          .select('*').eq('taller_id', t.id).order('created_at', { ascending: false })
        profs = p || []
      } catch (_) {}

      const todos: Registro[] = [
        ...(svcs || []).map(s => ({ ...s, tipo: 'servicio' as const })),
        ...(vnts || []).map(v => ({ ...v, tipo: 'venta' as const })),
        ...profs.map(p => ({ ...p, tipo: 'proforma' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setRegistros(todos)
      setLoading(false)
    }
    cargar()
  }, [])

  const filtrados = registros
    .filter(r => {
      if (filtroTipo === 'servicios' && r.tipo !== 'servicio') return false
      if (filtroTipo === 'ventas'    && r.tipo !== 'venta')    return false
      if (filtroTipo === 'proformas' && r.tipo !== 'proforma') return false
      const texto = busqueda.toLowerCase()
      if (texto) {
        const coincide = r.tipo === 'servicio'
          ? ((r as Servicio).placa?.toLowerCase().includes(texto) || r.nombre?.toLowerCase().includes(texto) || (r as Servicio).marca?.toLowerCase().includes(texto))
          : (r.nombre?.toLowerCase().includes(texto))
        if (!coincide) return false
      }
      if (desde && new Date(r.created_at) < new Date(desde)) return false
      if (hasta) {
        const h = new Date(hasta); h.setHours(23, 59, 59)
        if (new Date(r.created_at) > h) return false
      }
      return true
    })
    .sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return ordenFecha === 'desc' ? diff : -diff
    })

  const totalServicios = registros.filter(r => r.tipo === 'servicio').length
  const totalVentas    = registros.filter(r => r.tipo === 'venta').length
  const totalProformas = registros.filter(r => r.tipo === 'proforma').length
  const ingresoTotal   = registros.reduce((s, r) => s + (r.monto || 0), 0)

  const eliminar = async (id: string, tipo: string) => {
    if (!confirm('¿Eliminar este registro?')) return
    if (tipo === 'venta') {
      const venta = registros.find(r => r.id === id) as Venta
      if (venta && Array.isArray(venta.items)) {
        for (const item of venta.items) {
          if (!item.producto_id) continue
          const { data: prod } = await supabase.from('inventario').select('stock').eq('id', item.producto_id).single()
          if (prod) await supabase.from('inventario').update({ stock: prod.stock + item.cantidad }).eq('id', item.producto_id)
        }
      }
    }
    const tabla = tipo === 'servicio' ? 'servicios' : tipo === 'proforma' ? 'proformas' : 'ventas'
    await supabase.from(tabla).delete().eq('id', id)
    setRegistros(prev => prev.filter(r => r.id !== id))
  }

  const abrirWhatsAppServicio = (telefono: string, placa: string, nombre: string) => {
    if (!telefono) { alert('Este cliente no tiene teléfono registrado'); return }
    const tel = telefono.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hola ${nombre}, le informamos que su vehículo con placa *${placa}* ya fue atendido en nuestro taller. Adjuntamos su cartilla de mantenimiento. ¡Gracias por su preferencia! 🔧`)
    window.open(`https://wa.me/51${tel}?text=${msg}`, '_blank')
  }

  const descargarTicketJPG = async () => {
    setDescargandoTicket(true)
    await new Promise(r => setTimeout(r, 400))
    const { default: html2canvas } = await import('html2canvas')
    if (!ticketRef.current) { setDescargandoTicket(false); return }
    const canvas = await html2canvas(ticketRef.current, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      width: 380, height: ticketRef.current.offsetHeight,
    })
    const link = document.createElement('a')
    link.download = `Ticket_${ticketVenta?.nombre || 'Venta'}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
    setDescargandoTicket(false)
  }

  const compartirTicketWhatsApp = (v: Venta | Proforma) => {
    if (!v.telefono) { alert('Sin teléfono registrado'); return }
    const tel = v.telefono.replace(/\D/g, '')
    const items = Array.isArray(v.items) ? v.items : []
    const lineas = items.map((i: any) => `  ${i.cantidad}x ${i.nombre} - S/ ${(i.subtotal || i.precio * i.cantidad).toFixed(2)}`).join('\n')
    const fecha = v.fecha || new Date(v.created_at).toLocaleDateString('es-PE')
    const esProforma = v.tipo === 'proforma'
    const msg = encodeURIComponent(
      `${esProforma ? '📄' : '🧾'} *${esProforma ? 'PROFORMA' : 'TICKET DE VENTA'} - ${tallerNombre}*\n📅 Fecha: ${fecha}\n👤 Cliente: ${v.nombre || 'CLIENTE'}\n\n*PRODUCTOS:*\n${lineas}\n\n*TOTAL: S/ ${(v.monto || 0).toFixed(2)}*\n\n${esProforma ? 'Cotización válida por 7 días.' : '¡Gracias por su compra! 🛒'}`
    )
    window.open(`https://wa.me/51${tel}?text=${msg}`, '_blank')
  }

  const descargarCartilla = async (s: Servicio) => {
    setCartillaData({
      placa: s.placa, nombre: s.nombre, marca: s.marca,
      modelo: s.modelo, anio: s.anio, fecha: s.fecha,
      aceiteMarca: s.aceite_marca, aceiteVisc: s.aceite_visc,
      aceiteCantidad: s.aceite_cantidad,
      filtroAceite: s.filtro_aceite, filtroAire: s.filtro_aire,
      cajaMarca: s.caja_marca, cajaTipo: s.caja_tipo,
      refrigMarca: s.refrig_marca, refrigColor: s.refrig_color,
      bujaMarca: s.bujia_marca, otrosServicios: s.otros_servicios,
      proximoKm: s.proximo_km, tallerNombre, tallerLogo,
    })
    await new Promise(r => setTimeout(r, 600))
    const { default: html2canvas } = await import('html2canvas')
    if (!cartillaRef.current) return
    const canvas = await html2canvas(cartillaRef.current, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      width: 400, height: cartillaRef.current.offsetHeight,
    })
    const link = document.createElement('a')
    link.download = `Cartilla_${s.placa}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
    setCartillaData(null)
  }

  const coloresEstado: Record<string, { bg: string; color: string }> = {
    Pendiente: { bg: 'rgba(255,194,60,0.12)', color: 'var(--accent-yellow)' },
    Facturado: { bg: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' },
  }

  const colorTipo = {
    servicio: { accent: 'var(--accent-teal)',  bg: 'rgba(33,199,184,0.12)', label: 'Servicio'  },
    venta:    { accent: 'var(--accent)',        bg: 'rgba(255,106,31,0.12)', label: 'Venta POS' },
    proforma: { accent: 'var(--accent-yellow)', bg: 'rgba(255,194,60,0.12)', label: 'Proforma'  },
  }

  const filtros: { key: FiltroTipo; label: string; count: number }[] = [
    { key: 'todos',     label: 'Todos',      count: registros.length },
    { key: 'servicios', label: 'Servicios',  count: totalServicios   },
    { key: 'ventas',    label: 'Ventas POS', count: totalVentas      },
    { key: 'proformas', label: 'Proformas',  count: totalProformas   },
  ]

  const LogoHeader = ({ logo, nombre }: { logo: string; nombre: string }) => (
    <div style={{ width: '52px', height: '52px', borderRadius: '12px', overflow: 'hidden', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {logo
        ? <img src={logo} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} crossOrigin="anonymous" />
        : <span style={{ fontSize: '24px' }}>🔧</span>}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">

      {/* Cartilla oculta */}
      {cartillaData && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div ref={cartillaRef} style={{ width: '400px', background: '#ffffff', fontFamily: 'Arial, sans-serif', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <LogoHeader logo={cartillaData.tallerLogo} nombre={cartillaData.tallerNombre} />
              <div>
                <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{cartillaData.tallerNombre}</div>
                <div style={{ color: '#60a5fa', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Control de Mantenimiento</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '20px', color: '#0f172a', textTransform: 'uppercase' }}>{cartillaData.nombre}</div>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>{cartillaData.marca} {cartillaData.modelo} {cartillaData.anio ? `(${cartillaData.anio})` : ''}</div>
                <div style={{ color: '#2563eb', fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>{cartillaData.fecha?.split('-').reverse().join('/')}</div>
              </div>
              <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '12px', padding: '8px 16px' }}>
                <div style={{ color: '#1d4ed8', fontWeight: 900, fontSize: '18px', letterSpacing: '0.1em' }}>{cartillaData.placa}</div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🛢️', label: 'Aceite Motor', value: cartillaData.aceiteMarca ? `${cartillaData.aceiteMarca} ${cartillaData.aceiteVisc || ''}${cartillaData.aceiteCantidad ? ` · ${cartillaData.aceiteCantidad}LT` : ''}` : '-', bg: '#f8fafc', color: '#0f172a' },
                { icon: '🔵', label: 'Filtros', value: [cartillaData.filtroAceite ? `AC:${cartillaData.filtroAceite}` : '', cartillaData.filtroAire ? `AI:${cartillaData.filtroAire}` : ''].filter(Boolean).join(' | ') || '-', bg: '#f8fafc', color: '#0f172a' },
                { icon: '🌡️', label: 'Refrig.', value: cartillaData.refrigMarca ? `${cartillaData.refrigMarca}${cartillaData.refrigColor ? ` ${cartillaData.refrigColor}` : ''}` : '-', bg: cartillaData.refrigMarca ? '#fff1f2' : '#f8fafc', color: cartillaData.refrigMarca ? '#dc2626' : '#cbd5e1' },
                { icon: '⚙️', label: 'Aceite Caja', value: cartillaData.cajaMarca || '-', bg: '#f8fafc', color: cartillaData.cajaMarca ? '#0f172a' : '#cbd5e1' },
                { icon: '⚡', label: 'Bujías', value: cartillaData.bujaMarca || '-', bg: cartillaData.bujaMarca ? '#fefce8' : '#f8fafc', color: cartillaData.bujaMarca ? '#92400e' : '#cbd5e1' },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{item.icon}</span>
                    <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</span>
                  </div>
                  <span style={{ color: item.color, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>{item.value}</span>
                </div>
              ))}
              {cartillaData.otrosServicios && (
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🔧</span>
                    <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Servicio</span>
                  </div>
                  <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', textAlign: 'right', maxWidth: '220px' }}>{cartillaData.otrosServicios}</span>
                </div>
              )}
            </div>
            <div style={{ background: '#0f172a', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#2563eb', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Retornar a los</div>
                <div style={{ color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kilómetros</div>
              </div>
              <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '36px', letterSpacing: '-0.02em' }}>
                {cartillaData.proximoKm ? Number(cartillaData.proximoKm).toLocaleString() : '---'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket / Proforma oculto para JPG */}
      {ticketVenta && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div ref={ticketRef} style={{ width: '380px', background: '#ffffff', fontFamily: 'Arial, sans-serif', padding: '32px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                {tallerLogo
                  ? <img src={tallerLogo} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} crossOrigin="anonymous" />
                  : <span style={{ fontSize: '28px' }}>{ticketVenta.tipo === 'proforma' ? '📄' : '🛒'}</span>}
              </div>
              <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tallerNombre}</div>
              <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px' }}>
                {ticketVenta.tipo === 'proforma' ? 'Proforma / Cotización' : 'Ticket de Venta'}
              </div>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginTop: '6px' }}>{ticketVenta.fecha || new Date(ticketVenta.created_at).toLocaleDateString('es-PE')}</div>
            </div>
            <div style={{ borderTop: '1.5px dashed #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Cliente</div>
              <div style={{ fontWeight: 900, fontSize: '15px', color: '#0f172a', textTransform: 'uppercase' }}>{ticketVenta.nombre || 'CLIENTE'}</div>
            </div>
            <div style={{ borderTop: '1.5px dashed #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cant &nbsp; Producto</span>
                <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Importe</span>
              </div>
              {(Array.isArray(ticketVenta.items) ? ticketVenta.items : []).map((i: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', minWidth: '16px' }}>{i.cantidad}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase' }}>{i.nombre}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>S/ {(i.subtotal || i.precio * i.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1.5px dashed #e2e8f0', paddingTop: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 900, color: '#475569', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
              <span style={{ fontWeight: 900, color: '#10b981', fontSize: '28px', letterSpacing: '-0.02em' }}>S/ {(ticketVenta.monto || 0).toFixed(2)}</span>
            </div>
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {ticketVenta.tipo === 'proforma' ? 'Cotización válida por 7 días · ' : ''}{tallerNombre}
            </div>
          </div>
        </div>
      )}

      {/* Modal ticket / proforma */}
      {ticketVenta && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setTicketVenta(null)}>
          <div className="rounded-3xl p-8 max-w-sm w-full relative" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setTicketVenta(null)}
              className="absolute top-4 right-4 font-bold text-xl transition-colors" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>✕</button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {tallerLogo
                  ? <img src={tallerLogo} className="w-full h-full object-contain p-2" />
                  : <span className="text-3xl">{ticketVenta.tipo === 'proforma' ? '📄' : '🛒'}</span>}
              </div>
              <h3 className="font-display font-bold text-lg uppercase tracking-tight" style={{ color: 'var(--text)' }}>{tallerNombre}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {ticketVenta.tipo === 'proforma' ? 'Proforma / Cotización' : 'Ticket de Venta'}
              </p>
              <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-muted)' }}>
                {ticketVenta.fecha || new Date(ticketVenta.created_at).toLocaleDateString('es-PE')}
              </p>
            </div>
            <div className="pt-4 mb-4" style={{ borderTop: '1px dashed var(--border)' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Cliente</p>
              <p className="font-display font-bold uppercase" style={{ color: 'var(--text)' }}>{ticketVenta.nombre || 'CLIENTE'}</p>
            </div>
            <div className="pt-4 mb-4" style={{ borderTop: '1px dashed var(--border)' }}>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                <span>Cant &nbsp; Producto</span><span>Importe</span>
              </div>
              <div className="space-y-2">
                {(Array.isArray(ticketVenta.items) ? ticketVenta.items : []).map((i: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono text-xs font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>{i.cantidad}</span>
                      <span className="text-xs font-semibold uppercase truncate" style={{ color: 'var(--text)' }}>{i.nombre}</span>
                    </div>
                    <span className="font-mono text-xs font-bold shrink-0 ml-2" style={{ color: 'var(--text)' }}>
                      S/ {(i.subtotal || i.precio * i.cantidad).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 mb-6 flex items-center justify-between" style={{ borderTop: '1px dashed var(--border)' }}>
              <span className="font-display font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-muted)' }}>Total</span>
              <span className="font-mono font-bold text-2xl" style={{ color: 'var(--accent-teal)' }}>S/ {(ticketVenta.monto || 0).toFixed(2)}</span>
            </div>
            <div className="space-y-3">
              <button onClick={descargarTicketJPG} disabled={descargandoTicket}
                className="font-display w-full disabled:opacity-50 active:scale-95 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
                📥 {descargandoTicket ? 'Generando...' : 'Descargar JPG'}
              </button>
              <button onClick={() => compartirTicketWhatsApp(ticketVenta)}
                className="font-display w-full active:scale-95 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)', border: '1px solid rgba(33,199,184,0.35)' }}>
                💬 Compartir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Ventas</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {totalServicios} servicios · {totalVentas} ventas POS · {totalProformas} proformas · S/ {ingresoTotal.toFixed(2)} total
          </p>
        </div>
        <button onClick={() => router.push('/dashboard/atencion')}
          className="font-display font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95"
          style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
          + Nueva Atención
        </button>
      </div>

      {/* ── TABS DE FILTRO ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filtros.map(f => (
          <button key={f.key} onClick={() => setFiltroTipo(f.key)}
            className="font-display px-4 py-2.5 text-xs rounded-xl font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            style={filtroTipo === f.key
              ? { background: 'var(--accent-teal)', color: 'var(--bg)' }
              : { background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
            {f.label}
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md"
              style={filtroTipo === f.key
                ? { background: 'rgba(0,0,0,0.2)', color: 'inherit' }
                : { background: 'var(--border)', color: 'var(--text-muted)' }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── BARRA BÚSQUEDA + FECHAS ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por placa, cliente o marca..."
          className="inp flex-1 min-w-48" />
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
          <span className="font-display text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Desde</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="outline-none text-sm font-semibold bg-transparent" style={{ color: 'var(--text)' }} />
        </div>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
          <span className="font-display text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="outline-none text-sm font-semibold bg-transparent" style={{ color: 'var(--text)' }} />
        </div>
        <button onClick={() => setOrdenFecha(o => o === 'desc' ? 'asc' : 'desc')}
          className="font-display px-4 py-2.5 text-xs rounded-xl font-bold uppercase tracking-widest transition-all flex items-center gap-2"
          style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
          {ordenFecha === 'desc' ? '↓ Más reciente' : '↑ Más antiguo'}
        </button>
        {(busqueda || desde || hasta || filtroTipo !== 'todos') && (
          <button onClick={() => { setBusqueda(''); setDesde(''); setHasta(''); setFiltroTipo('todos') }}
            className="font-bold text-lg transition-colors" style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>✕</button>
        )}
      </div>

      {/* ── LISTA ── */}
      {loading ? (
        <div className="text-center py-20 font-bold" style={{ color: 'var(--text-muted)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card p-16 text-center" style={{ color: 'var(--text-muted)' }}>
          <p className="text-4xl mb-3">📋</p>
          <p className="font-display font-bold text-sm uppercase tracking-widest">No se encontraron registros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(r => {
            const esServicio = r.tipo === 'servicio'
            const esProforma = r.tipo === 'proforma'
            const s = r as Servicio
            const fecha = r.fecha || new Date(r.created_at).toLocaleDateString('es-PE')
            const ct = colorTipo[r.tipo]
            return (
              <div key={r.id} className="card flex items-center gap-4 transition-all"
                style={{ borderColor: 'var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = ct.accent + '60'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>

                {/* Ícono / placa */}
                <div className="font-display w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold"
                  style={{ background: ct.bg, border: `1px solid ${ct.accent}50`, color: ct.accent }}>
                  {esServicio
                    ? <span className="text-[11px] font-mono font-black">{s.placa?.slice(0, 4)}</span>
                    : esProforma
                    ? <span className="text-xl">📄</span>
                    : <span className="text-xl">🛒</span>}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {esServicio && <span className="font-mono font-bold text-sm uppercase" style={{ color: 'var(--text)' }}>{s.placa}</span>}
                    <span className="font-display text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase"
                      style={{ background: ct.bg, color: ct.accent }}>{ct.label}</span>
                    {esServicio && s.estado_facturacion && (
                      <span className="font-display text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase"
                        style={coloresEstado[s.estado_facturacion] || { background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {s.estado_facturacion}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
                    {r.nombre || 'Cliente directo'}{esServicio ? ` · ${s.marca} ${s.modelo}` : ''}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                    {esServicio
                      ? [s.aceite_marca ? `Aceite: ${s.aceite_marca} ${s.aceite_visc || ''}` : '', s.otros_servicios || ''].filter(Boolean).join(' · ')
                      : (Array.isArray((r as Venta).items) ? (r as Venta).items : []).slice(0, 2).map((i: any) => `${i.cantidad}x ${i.nombre}`).join(', ')
                    }
                  </p>
                </div>

                {/* Monto + acciones */}
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-lg" style={{ color: ct.accent }}>
                    S/ {(r.monto || 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{fecha}</p>
                  {esServicio && s.km && (
                    <p className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent-teal)' }}>{Number(s.km).toLocaleString()} km</p>
                  )}
                  <div className="flex items-center gap-1.5 justify-end mt-2">
                    {esServicio ? (
                      <>
                        <button onClick={() => descargarCartilla(s)} title="Descargar cartilla"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}>📋</button>
                        <button onClick={() => abrirWhatsAppServicio(s.telefono, s.placa, s.nombre)} title="WhatsApp"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}>💬</button>
                      </>
                    ) : (
                      <button onClick={() => setTicketVenta(r as Venta | Proforma)} title="Ver ticket"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}>🎫</button>
                    )}
                    <button onClick={() => router.push('/dashboard/documentos')} title="Emitir comprobante"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>🧾</button>
                    <button onClick={() => eliminar(r.id, r.tipo)} title="Eliminar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: 'rgba(255,106,31,0.12)', color: 'var(--accent)' }}>🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
