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

// Proforma multi-opción (nuevo ModalCotizador)
type OpcionProforma = { titulo: string; items: { descripcion: string; precio: number }[]; total: number }
type Proforma = {
  id: string; nombre: string; telefono: string; placa?: string; items: any[]
  monto: number; fecha: string; created_at: string; tipo: 'proforma'
}

type TallerInfo = { nombre: string; logo_url: string; telefono: string; direccion: string }
type Registro = Servicio | Venta | Proforma
type FiltroTipo = 'todos' | 'servicios' | 'ventas' | 'proformas'

// Detecta si una proforma es multi-opción (nuevo formato)
const esMultiOpcion = (items: any[]): boolean =>
  Array.isArray(items) && items.length > 0 && items[0] && typeof items[0] === 'object' && 'titulo' in items[0]

// Resumen legible de los ítems según el formato
const resumenItems = (items: any[]): string => {
  if (!Array.isArray(items) || items.length === 0) return ''
  if (esMultiOpcion(items)) {
    return items.map((o: OpcionProforma) => o.titulo || 'Opción').join(' · ')
  }
  return items.slice(0, 2).map((i: any) => `${i.cantidad ?? ''}x ${i.nombre ?? i.descripcion ?? ''}`.trim()).join(', ')
}

export default function HistorialPage() {
  const router = useRouter()
  const cartillaRef = useRef<HTMLDivElement>(null)
  const ticketRef = useRef<HTMLDivElement>(null)

  const [registros, setRegistros] = useState<Registro[]>([])
  const [tallerInfo, setTallerInfo] = useState<TallerInfo>({ nombre: 'AWTU', logo_url: '', telefono: '', direccion: '' })
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [ordenFecha, setOrdenFecha] = useState<'desc' | 'asc'>('desc')
  const [cartillaData, setCartillaData] = useState<any>(null)
  const [ticketVenta, setTicketVenta] = useState<Venta | null>(null)
  const [descargandoTicket, setDescargandoTicket] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState<string | null>(null) // id de proforma en proceso

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres')
        .select('id, nombre, logo_url, telefono, direccion')
        .eq('user_id', user.id).single()
      if (!t) return
      setTallerInfo({ nombre: t.nombre || 'AWTU', logo_url: t.logo_url || '', telefono: t.telefono || '', direccion: t.direccion || '' })

      const { data: svcs } = await supabase.from('servicios')
        .select('*').eq('taller_id', t.id).order('created_at', { ascending: false })
      const { data: vnts } = await supabase.from('ventas')
        .select('*').eq('taller_id', t.id).order('created_at', { ascending: false })

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
          : (r.nombre?.toLowerCase().includes(texto) || (r as Proforma).placa?.toLowerCase().includes(texto))
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

  // ── WhatsApp para proforma multi-opción ────────────────────────────────────
  const enviarWhatsAppProforma = (p: Proforma) => {
    if (!p.telefono) { alert('Esta proforma no tiene teléfono registrado'); return }
    const tel = p.telefono.replace(/\D/g, '')
    const fecha = p.fecha ? p.fecha.split('-').reverse().join('/') : new Date(p.created_at).toLocaleDateString('es-PE')
    const items = Array.isArray(p.items) ? p.items : []

    let bloques = ''
    if (esMultiOpcion(items)) {
      bloques = items.map((o: OpcionProforma, idx: number) => {
        const titulo = (o.titulo || `Opción ${idx + 1}`).toUpperCase()
        const lineas = (o.items || [])
          .map(i => `  • ${i.descripcion.toUpperCase()}${i.precio > 0 ? ` — S/ ${i.precio.toFixed(2)}` : ''}`)
          .join('\n')
        return `*${titulo}*\n${lineas}\n  ➤ *Total opción: S/ ${(o.total || 0).toFixed(2)}*`
      }).join('\n\n')
    } else {
      bloques = items.map((i: any) => `  • ${(i.nombre || i.descripcion || '').toUpperCase()}${i.subtotal > 0 ? ` — S/ ${i.subtotal.toFixed(2)}` : ''}`).join('\n')
    }

    const msg = encodeURIComponent(
      `📋 *COTIZACIÓN — ${tallerInfo.nombre.toUpperCase()}*\n` +
      `📅 ${fecha}\n` +
      `👤 ${(p.nombre || '').toUpperCase()}` +
      (p.placa ? `  |  🚗 ${p.placa.toUpperCase()}` : '') +
      `\n\n${bloques}\n\n` +
      `¡Contáctenos para confirmar! 🔧`
    )
    window.open(`https://wa.me/51${tel}?text=${msg}`, '_blank')
  }

  // ── PDF para proforma multi-opción ─────────────────────────────────────────
  const descargarPDFProforma = async (p: Proforma) => {
    setGenerandoPDF(p.id)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210
      const fecha = p.fecha ? p.fecha.split('-').reverse().join('/') : new Date(p.created_at).toLocaleDateString('es-PE')
      const items = Array.isArray(p.items) ? p.items : []

      // ── ENCABEZADO blanco ──
      const headerH = 42
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, W, headerH, 'F')
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.4)
      doc.line(0, headerH, W, headerH)

      // Logo del taller
      let logoLoaded = false
      if (tallerInfo.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
            img.src = tallerInfo.logo_url
          })
          if (img.width > 0) {
            const logoH = 24
            const logoW = (img.width / img.height) * logoH
            doc.addImage(img, 'PNG', 14, 9, Math.min(logoW, 40), logoH)
            logoLoaded = true
          }
        } catch { /* sin logo */ }
      }

      const xText = logoLoaded ? 60 : 14
      doc.setTextColor(10, 10, 10)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(tallerInfo.nombre.toUpperCase(), xText, 18)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      if (tallerInfo.direccion) doc.text(tallerInfo.direccion, xText, 26)
      if (tallerInfo.telefono) doc.text(`Tel: ${tallerInfo.telefono}`, xText, 32)

      // Badge COTIZACIÓN
      doc.setDrawColor(10, 10, 10)
      doc.setLineWidth(1.2)
      doc.rect(W - 54, 8, 40, 16)
      doc.setTextColor(10, 10, 10)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('COTIZACIÓN', W - 49, 19)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`Fecha: ${fecha}`, W - 54, 30)

      // ── Datos cliente ──
      let y = headerH + 10
      const vehiculo = p.placa || ''
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(14, y - 6, W - 28, vehiculo ? 28 : 20, 2, 2, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.roundedRect(14, y - 6, W - 28, vehiculo ? 28 : 20, 2, 2, 'S')
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('CLIENTE', 20, y)
      doc.setTextColor(10, 10, 10)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text((p.nombre || '').toUpperCase(), 20, y + 8)
      if (vehiculo) {
        doc.setFillColor(219, 234, 254)
        doc.roundedRect(W - 56, y - 3, 42, 22, 2, 2, 'F')
        doc.setTextColor(29, 78, 216)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(vehiculo.toUpperCase(), W - 46, y + 9)
      }
      y += vehiculo ? 34 : 26

      // ── Opciones ──
      if (esMultiOpcion(items)) {
        items.forEach((opcion: OpcionProforma, idx: number) => {
          const titulo = opcion.titulo || `Opción ${idx + 1}`
          const itemsFiltrados = (opcion.items || []).filter(i => i.descripcion?.trim())
          if (itemsFiltrados.length === 0) return
          const tot = opcion.total || itemsFiltrados.reduce((s, i) => s + (i.precio || 0), 0)

          if (y > 250) { doc.addPage(); y = 20 }

          // Encabezado negro
          doc.setFillColor(10, 10, 10)
          doc.roundedRect(14, y, W - 28, 9, 1, 1, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'bold')
          doc.text(titulo.toUpperCase(), 20, y + 6.2)
          y += 12

          itemsFiltrados.forEach((item, ii) => {
            if (y > 260) { doc.addPage(); y = 20 }
            if (ii % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(14, y - 1, W - 28, 8, 'F') }
            doc.setTextColor(20, 20, 20)
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'normal')
            const desc = (item.descripcion || '').length > 65 ? (item.descripcion || '').slice(0, 62) + '...' : (item.descripcion || '')
            doc.text('•  ' + desc.toUpperCase(), 20, y + 5)
            if ((item.precio || 0) > 0) {
              doc.setFont('helvetica', 'bold')
              doc.text(`S/ ${(item.precio || 0).toFixed(2)}`, W - 20, y + 5, { align: 'right' })
            }
            y += 9
          })

          // Total opción
          doc.setFillColor(240, 240, 240)
          doc.roundedRect(W - 75, y + 1, 61, 10, 1, 1, 'F')
          doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3)
          doc.roundedRect(W - 75, y + 1, 61, 10, 1, 1, 'S')
          doc.setTextColor(60, 60, 60); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
          doc.text('TOTAL OPCIÓN', W - 68, y + 8)
          doc.setFontSize(10); doc.setTextColor(10, 10, 10)
          doc.text(`S/ ${tot.toFixed(2)}`, W - 20, y + 8, { align: 'right' })
          y += 16

          if (idx < items.length - 1) {
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
            doc.setLineDashPattern([2, 2], 0)
            doc.line(14, y, W - 14, y)
            doc.setLineDashPattern([], 0)
            y += 6
          }
        })
      } else {
        // Formato antiguo (items planos)
        doc.setFillColor(10, 10, 10)
        doc.roundedRect(14, y, W - 28, 9, 1, 1, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
        doc.text('DETALLE', 20, y + 6.2)
        y += 12
        items.forEach((item: any, ii: number) => {
          if (y > 260) { doc.addPage(); y = 20 }
          if (ii % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(14, y - 1, W - 28, 8, 'F') }
          doc.setTextColor(20, 20, 20); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
          const nombre = (item.nombre || item.descripcion || '').toUpperCase()
          doc.text(`•  ${nombre}`, 20, y + 5)
          const sub = item.subtotal || (item.precio * (item.cantidad || 1))
          if (sub > 0) { doc.setFont('helvetica', 'bold'); doc.text(`S/ ${sub.toFixed(2)}`, W - 20, y + 5, { align: 'right' }) }
          y += 9
        })
        const total = p.monto || 0
        if (total > 0) {
          doc.setFillColor(240, 240, 240)
          doc.roundedRect(W - 75, y + 1, 61, 10, 1, 1, 'F')
          doc.setTextColor(10, 10, 10); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
          doc.text(`S/ ${total.toFixed(2)}`, W - 20, y + 8, { align: 'right' })
          y += 16
        }
      }

      y += 8

      // Footer
      const footerY = 277
      doc.setFillColor(245, 245, 245)
      doc.rect(0, footerY, W, 20, 'F')
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
      doc.line(0, footerY, W, footerY)
      doc.setTextColor(120, 120, 120); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(tallerInfo.nombre.toUpperCase(), W / 2, footerY + 7, { align: 'center' })
      const sub = [tallerInfo.telefono, tallerInfo.direccion].filter(Boolean).join('  ·  ')
      if (sub) doc.text(sub, W / 2, footerY + 13, { align: 'center' })

      doc.save(`Cotizacion_${p.placa || p.nombre || 'proforma'}_${p.fecha || ''}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Error al generar el PDF')
    }
    setGenerandoPDF(null)
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

  const compartirTicketWhatsApp = (v: Venta) => {
    if (!v.telefono) { alert('Sin teléfono registrado'); return }
    const tel = v.telefono.replace(/\D/g, '')
    const items = Array.isArray(v.items) ? v.items : []
    const lineas = items.map((i: any) => `  ${i.cantidad}x ${i.nombre} - S/ ${(i.subtotal || i.precio * i.cantidad).toFixed(2)}`).join('\n')
    const fecha = v.fecha || new Date(v.created_at).toLocaleDateString('es-PE')
    const msg = encodeURIComponent(
      `🧾 *TICKET DE VENTA - ${tallerInfo.nombre}*\n📅 Fecha: ${fecha}\n👤 Cliente: ${v.nombre || 'CLIENTE'}\n\n*PRODUCTOS:*\n${lineas}\n\n*TOTAL: S/ ${(v.monto || 0).toFixed(2)}*\n\n¡Gracias por su compra! 🛒`
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
      proximoKm: s.proximo_km, tallerNombre: tallerInfo.nombre, tallerLogo: tallerInfo.logo_url,
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

      {/* Ticket venta oculto para JPG */}
      {ticketVenta && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div ref={ticketRef} style={{ width: '380px', background: '#ffffff', fontFamily: 'Arial, sans-serif', padding: '32px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                {tallerInfo.logo_url
                  ? <img src={tallerInfo.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} crossOrigin="anonymous" />
                  : <span style={{ fontSize: '28px' }}>🛒</span>}
              </div>
              <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tallerInfo.nombre}</div>
              <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px' }}>Ticket de Venta</div>
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
              {tallerInfo.nombre}
            </div>
          </div>
        </div>
      )}

      {/* Modal ticket venta */}
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
                {tallerInfo.logo_url
                  ? <img src={tallerInfo.logo_url} className="w-full h-full object-contain p-2" />
                  : <span className="text-3xl">🛒</span>}
              </div>
              <h3 className="font-display font-bold text-lg uppercase tracking-tight" style={{ color: 'var(--text)' }}>{tallerInfo.nombre}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Ticket de Venta</p>
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
            const p = r as Proforma
            const fecha = r.fecha || new Date(r.created_at).toLocaleDateString('es-PE')
            const ct = colorTipo[r.tipo]
            const multiOp = esProforma && esMultiOpcion(p.items)

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
                    ? <span className="text-xl">📋</span>
                    : <span className="text-xl">🛒</span>}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {esServicio && <span className="font-mono font-bold text-sm uppercase" style={{ color: 'var(--text)' }}>{s.placa}</span>}
                    {esProforma && p.placa && <span className="font-mono font-bold text-sm uppercase" style={{ color: 'var(--text)' }}>{p.placa}</span>}
                    <span className="font-display text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase"
                      style={{ background: ct.bg, color: ct.accent }}>{ct.label}</span>
                    {esServicio && s.estado_facturacion && (
                      <span className="font-display text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase"
                        style={coloresEstado[s.estado_facturacion] || { background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {s.estado_facturacion}
                      </span>
                    )}
                    {multiOp && (
                      <span className="font-display text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase"
                        style={{ background: 'rgba(255,194,60,0.12)', color: 'var(--accent-yellow)' }}>
                        {p.items.length} opciones
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
                    {r.nombre || 'Cliente directo'}{esServicio ? ` · ${s.marca} ${s.modelo}` : ''}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                    {esServicio
                      ? [s.aceite_marca ? `Aceite: ${s.aceite_marca} ${s.aceite_visc || ''}` : '', s.otros_servicios || ''].filter(Boolean).join(' · ')
                      : resumenItems((r as Venta | Proforma).items)
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
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                          style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}>📋</button>
                        <button onClick={() => abrirWhatsAppServicio(s.telefono, s.placa, s.nombre)} title="WhatsApp"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                          style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}>💬</button>
                      </>
                    ) : esProforma ? (
                      <>
                        {/* Ver Proforma PDF */}
                        <button
                          onClick={() => descargarPDFProforma(p)}
                          disabled={generandoPDF === p.id}
                          title="Ver PDF"
                          className="h-8 px-2 rounded-lg flex items-center justify-center text-xs font-bold uppercase tracking-wide gap-1 transition-all disabled:opacity-50"
                          style={{ background: 'rgba(255,194,60,0.12)', color: 'var(--accent-yellow)', border: '1px solid rgba(255,194,60,0.3)' }}>
                          {generandoPDF === p.id ? '⏳' : '📄'} PDF
                        </button>
                        {/* WhatsApp proforma */}
                        <button
                          onClick={() => enviarWhatsAppProforma(p)}
                          title="WhatsApp"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                          style={{ background: 'rgba(37,211,102,0.12)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)' }}>
                          💬
                        </button>
                      </>
                    ) : (
                      /* Venta POS */
                      <button onClick={() => setTicketVenta(r as Venta)} title="Ver ticket"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                        style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}>🎫</button>
                    )}

                    <button onClick={() => router.push('/dashboard/documentos')} title="Emitir comprobante"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>🧾</button>
                    <button onClick={() => eliminar(r.id, r.tipo)} title="Eliminar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
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
