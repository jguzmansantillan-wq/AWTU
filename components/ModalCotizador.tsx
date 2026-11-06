'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Tipos ──────────────────────────────────────────────────────────────────
type ItemOpcion = { descripcion: string; precio: string }
type Opcion = { titulo: string; items: ItemOpcion[] }

type MarcaAceite = {
  nombre: string
  logo_url: string
}

type TallerInfo = {
  logo_url: string
  telefono: string
  direccion: string
  marcas_aceite: MarcaAceite[] | null
}

type ModalCotizadorProps = {
  tallerID: string
  tallerNombre: string
  onClose: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const totalOpcion = (items: ItemOpcion[]) =>
  items.reduce((s, i) => s + (parseFloat(i.precio) || 0), 0)

const opcionVacia = (): Opcion => ({
  titulo: '',
  items: [{ descripcion: '', precio: '' }],
})

// ─── Componente principal ────────────────────────────────────────────────────
export default function ModalCotizador({ tallerID, tallerNombre, onClose }: ModalCotizadorProps) {
  // Datos del taller (para PDF)
  const [tallerInfo, setTallerInfo] = useState<TallerInfo>({ logo_url: '', telefono: '', direccion: '', marcas_aceite: null })

  // Datos del cliente / vehículo
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [placa, setPlaca] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [fecha] = useState(new Date().toISOString().slice(0, 10))

  // Opciones de cotización
  const [opciones, setOpciones] = useState<Opcion[]>([opcionVacia()])

  // Campos extra para PDF
  const [condiciones, setCondiciones] = useState('')
  const [nota, setNota] = useState('')

  // Estado UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [guardada, setGuardada] = useState(false)

  // Cargar info del taller al montar
  useEffect(() => {
    if (!tallerID) return
    supabase
      .from('talleres')
      .select('logo_url, telefono, direccion, marcas_aceite')
      .eq('id', tallerID)
      .single()
      .then(({ data }) => {
        if (data) setTallerInfo({
          logo_url: data.logo_url || '',
          telefono: data.telefono || '',
          direccion: data.direccion || '',
          marcas_aceite: data.marcas_aceite || null,
        })
      })
  }, [tallerID])

  // ── Mutadores de opciones ──────────────────────────────────────────────────
  const agregarOpcion = () => setOpciones(prev => [...prev, opcionVacia()])
  const eliminarOpcion = (oi: number) => setOpciones(prev => prev.filter((_, i) => i !== oi))
  const setTituloOpcion = (oi: number, val: string) =>
    setOpciones(prev => prev.map((o, i) => i === oi ? { ...o, titulo: val } : o))
  const agregarItem = (oi: number) =>
    setOpciones(prev => prev.map((o, i) =>
      i === oi ? { ...o, items: [...o.items, { descripcion: '', precio: '' }] } : o
    ))
  const eliminarItem = (oi: number, ii: number) =>
    setOpciones(prev => prev.map((o, i) =>
      i === oi ? { ...o, items: o.items.filter((_, j) => j !== ii) } : o
    ))
  const setItemField = (oi: number, ii: number, field: 'descripcion' | 'precio', val: string) =>
    setOpciones(prev => prev.map((o, i) =>
      i === oi ? { ...o, items: o.items.map((item, j) => j === ii ? { ...item, [field]: val } : item) } : o
    ))

  // ── Guardar en Supabase ────────────────────────────────────────────────────
  const guardar = async () => {
    if (!nombre.trim()) { setError('El nombre del cliente es obligatorio'); return }
    const tieneItems = opciones.some(o => o.items.some(i => i.descripcion.trim()))
    if (!tieneItems) { setError('Agrega al menos un ítem en alguna opción'); return }
    setLoading(true); setError('')
    const payload = opciones.map((o, idx) => ({
      titulo: o.titulo || `Opción ${idx + 1}`,
      items: o.items.filter(i => i.descripcion.trim()).map(i => ({
        descripcion: i.descripcion,
        precio: parseFloat(i.precio) || 0,
      })),
      total: totalOpcion(o.items),
    }))
    const { error: e } = await supabase.from('proformas').insert({
      taller_id: tallerID,
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      placa: placa.trim().toUpperCase() || null,
      items: payload,
      monto: 0,
      fecha,
      tipo: 'cotizacion',
    })
    if (e) { setError('Error al guardar: ' + e.message); setLoading(false); return }
    setGuardada(true)
    setLoading(false)
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const enviarWhatsApp = () => {
    if (!telefono.trim()) { alert('Ingresa el teléfono del cliente para enviar por WhatsApp'); return }
    const tel = telefono.replace(/\D/g, '')
    const fechaFmt = fecha.split('-').reverse().join('/')
    const vehiculo = [marca, modelo].filter(Boolean).join(' ')

    const bloques = opciones.map((o, idx) => {
      const titulo = (o.titulo || `Opción ${idx + 1}`).toUpperCase()
      const lineas = o.items
        .filter(i => i.descripcion.trim())
        .map(i => `  • ${i.descripcion.toUpperCase()}${parseFloat(i.precio) > 0 ? ` — S/ ${parseFloat(i.precio).toFixed(2)}` : ''}`)
        .join('\n')
      const tot = totalOpcion(o.items)
      return `*${titulo}*\n${lineas}\n  ➤ *Total opción: S/ ${tot.toFixed(2)}*`
    }).join('\n\n')

    const msg = encodeURIComponent(
      `📋 *COTIZACIÓN — ${tallerNombre.toUpperCase()}*\n` +
      `📅 ${fechaFmt}\n` +
      `👤 ${nombre.toUpperCase()}` +
      (placa ? `  |  🚗 ${placa.toUpperCase()}` : '') +
      (vehiculo ? `  |  ${vehiculo.toUpperCase()}` : '') +
      `\n\n${bloques}\n\n` +
      (condiciones.trim() ? `📌 *CONDICIONES:*\n${condiciones.trim()}\n\n` : '') +
      (nota.trim() ? `📝 *NOTA:*\n${nota.trim()}\n\n` : '') +
      `¡Contáctenos para confirmar! 🔧`
    )
    window.open(`https://wa.me/51${tel}?text=${msg}`, '_blank')
  }

  // ── Cargar imagen como base64 ──────────────────────────────────────────────
  const loadImageAsBase64 = (url: string): Promise<{ img: HTMLImageElement; ok: boolean }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve({ img, ok: img.width > 0 })
      img.onerror = () => resolve({ img, ok: false })
      img.src = url
    })
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  const descargarPDF = async () => {
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210
      const MARGIN = 14
      const CONTENT_W = W - MARGIN * 2

      const fechaFmt = fecha.split('-').reverse().join('/')
      const vehiculo = [marca, modelo].filter(Boolean).join(' ')

      // ── Colores blanco/negro/gris ──
      const C_BLACK  = [10,  10,  10]  as [number, number, number]
      const C_WHITE  = [255, 255, 255] as [number, number, number]
      const C_GRAY_L = [245, 245, 245] as [number, number, number]  // fondo claro
      const C_GRAY_M = [200, 200, 200] as [number, number, number]  // bordes
      const C_GRAY_T = [120, 120, 120] as [number, number, number]  // texto secundario
      const C_BLUE   = [219, 234, 254] as [number, number, number]  // badge placa fondo
      const C_BLUE_T = [ 29,  78, 216] as [number, number, number]  // badge placa texto

      // ═══════════════════════════════════════════════════════
      // HEADER — fondo blanco, logo izquierda, nombre, badge borde negro
      // ═══════════════════════════════════════════════════════
      const headerH = 44

      doc.setFillColor(...C_WHITE)
      doc.rect(0, 0, W, headerH, 'F')

      // Badge "COTIZACIÓN" — borde negro, fondo blanco, texto negro
      const badgeW = 44
      const badgeH = 18
      const badgeX = W - MARGIN - badgeW
      const badgeY = (headerH - badgeH) / 2
      doc.setDrawColor(...C_BLACK)
      doc.setLineWidth(1.2)
      doc.rect(badgeX, badgeY, badgeW, badgeH)
      doc.setTextColor(...C_BLACK)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('COTIZACIÓN', badgeX + badgeW / 2, badgeY + 7.5, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C_GRAY_T)
      doc.text(`Fecha: ${fechaFmt}`, badgeX + badgeW / 2, badgeY + 14, { align: 'center' })

      // Logo del taller
      let logoEndX = MARGIN
      if (tallerInfo.logo_url) {
        const { img, ok } = await loadImageAsBase64(tallerInfo.logo_url)
        if (ok) {
          const logoH = 24
          const logoW = Math.min((img.width / img.height) * logoH, 40)
          doc.addImage(img, 'PNG', MARGIN, (headerH - logoH) / 2, logoW, logoH)
          logoEndX = MARGIN + logoW + 6
        }
      }

      // Nombre del taller — se ajusta para no pisar el badge
      const maxNameW = badgeX - logoEndX - 6
      doc.setTextColor(...C_BLACK)
      doc.setFont('helvetica', 'bold')
      let fs = 20
      doc.setFontSize(fs)
      while (doc.getTextWidth(tallerNombre.toUpperCase()) > maxNameW && fs > 10) {
        fs -= 1
        doc.setFontSize(fs)
      }
      // Centrar verticalmente: si hay subtítulo, subir un poco
      const hasSub = !!(tallerInfo.direccion || tallerInfo.telefono)
      doc.text(tallerNombre.toUpperCase(), logoEndX, hasSub ? headerH / 2 - 1 : headerH / 2 + 3)

      // Subtítulo: dirección y teléfono
      if (hasSub) {
        const sub = [tallerInfo.direccion, tallerInfo.telefono ? `Tel: ${tallerInfo.telefono}` : ''].filter(Boolean).join('  ·  ')
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C_GRAY_T)
        const subLines = doc.splitTextToSize(sub, maxNameW)
        doc.text(subLines[0], logoEndX, headerH / 2 + 7)
      }

      // Línea separadora del header
      doc.setDrawColor(...C_GRAY_M)
      doc.setLineWidth(0.4)
      doc.line(0, headerH, W, headerH)

      // ═══════════════════════════════════════════════════════
      // DATOS DEL CLIENTE
      // ═══════════════════════════════════════════════════════
      let y = headerH + 10
      const clienteH = vehiculo ? 28 : 20

      doc.setFillColor(...C_GRAY_L)
      doc.roundedRect(MARGIN, y, CONTENT_W, clienteH, 2, 2, 'F')
      doc.setDrawColor(...C_GRAY_M)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGIN, y, CONTENT_W, clienteH, 2, 2, 'S')

      doc.setTextColor(...C_GRAY_T)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('CLIENTE', MARGIN + 6, y + 7)

      doc.setTextColor(...C_BLACK)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(nombre.toUpperCase(), MARGIN + 6, y + 15)

      if (vehiculo) {
        doc.setTextColor(...C_GRAY_T)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.text(vehiculo.toUpperCase(), MARGIN + 6, y + 22)
      }

      // Placa — badge azul
      if (placa.trim()) {
        const placaW = 42
        const placaH = vehiculo ? 22 : 14
        doc.setFillColor(...C_BLUE)
        doc.roundedRect(W - MARGIN - placaW, y + 3, placaW, placaH, 2, 2, 'F')
        doc.setDrawColor(147, 197, 253)
        doc.setLineWidth(0.5)
        doc.roundedRect(W - MARGIN - placaW, y + 3, placaW, placaH, 2, 2, 'S')
        doc.setTextColor(...C_BLUE_T)
        doc.setFontSize(vehiculo ? 14 : 11)
        doc.setFont('helvetica', 'bold')
        doc.text(placa.toUpperCase(), W - MARGIN - placaW / 2, y + 3 + placaH / 2 + 3, { align: 'center' })
      }

      y += clienteH + 8

      // ═══════════════════════════════════════════════════════
      // OPCIONES — header negro, ítems con filas alternas grises
      // ═══════════════════════════════════════════════════════
      opciones.forEach((opcion, idx) => {
        const itemsFiltrados = opcion.items.filter(i => i.descripcion.trim())
        if (itemsFiltrados.length === 0) return
        const tot = totalOpcion(opcion.items)

        if (y > 240) { doc.addPage(); y = 20 }

        // Header opción — negro sólido
        doc.setFillColor(...C_BLACK)
        doc.roundedRect(MARGIN, y, CONTENT_W, 10, 1, 1, 'F')
        doc.rect(MARGIN, y + 7, CONTENT_W, 3, 'F') // cierra esquinas inferiores

        doc.setTextColor(...C_WHITE)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        const headerTxt = opcion.titulo
          ? `OPCIÓN ${idx + 1}  —  ${opcion.titulo.toUpperCase()}`
          : `OPCIÓN ${idx + 1}`
        doc.text(headerTxt, MARGIN + 5, y + 7)
        y += 11

        // Ítems
        itemsFiltrados.forEach((item, ii) => {
          if (y > 265) { doc.addPage(); y = 20 }
          if (ii % 2 === 0) {
            doc.setFillColor(...C_GRAY_L)
            doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
          }
          doc.setTextColor(...C_BLACK)
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'normal')
          const desc = item.descripcion.length > 68
            ? item.descripcion.slice(0, 65) + '...'
            : item.descripcion
          doc.text('•  ' + desc.toUpperCase(), MARGIN + 4, y + 6)
          if (parseFloat(item.precio) > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text(`S/ ${parseFloat(item.precio).toFixed(2)}`, W - MARGIN - 3, y + 6, { align: 'right' })
          }
          y += 9
        })

        // Fila TOTAL — fondo gris claro, borde gris
        doc.setFillColor(240, 240, 240)
        doc.roundedRect(W - MARGIN - 65, y + 1, 65, 11, 1, 1, 'F')
        doc.setDrawColor(...C_GRAY_M)
        doc.setLineWidth(0.3)
        doc.roundedRect(W - MARGIN - 65, y + 1, 65, 11, 1, 1, 'S')
        doc.setTextColor(...C_GRAY_T)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL OPCIÓN', W - MARGIN - 59, y + 8)
        doc.setFontSize(10)
        doc.setTextColor(...C_BLACK)
        doc.text(`S/ ${tot.toFixed(2)}`, W - MARGIN - 3, y + 9, { align: 'right' })
        y += 16

        // Separador punteado entre opciones
        if (idx < opciones.length - 1) {
          doc.setDrawColor(...C_GRAY_M)
          doc.setLineWidth(0.3)
          doc.setLineDashPattern([2, 2], 0)
          doc.line(MARGIN, y, W - MARGIN, y)
          doc.setLineDashPattern([], 0)
          y += 6
        } else {
          y += 4
        }
      })

      y += 6

      // ═══════════════════════════════════════════════════════
      // CONDICIONES DEL SERVICIO — siempre visible
      // ═══════════════════════════════════════════════════════
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFillColor(...C_WHITE)
      doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2, 2, 'F')
      doc.setDrawColor(...C_GRAY_M)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2, 2, 'S')
      doc.setTextColor(...C_GRAY_T)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('CONDICIONES DEL SERVICIO', MARGIN + 5, y + 6)
      if (condiciones.trim()) {
        doc.setTextColor(...C_BLACK)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        const condLines = doc.splitTextToSize(condiciones.trim(), CONTENT_W - 10)
        doc.text(condLines.slice(0, 2), MARGIN + 5, y + 14)
      }
      y += 34

      // ═══════════════════════════════════════════════════════
      // NOTA — siempre visible
      // ═══════════════════════════════════════════════════════
      if (y > 248) { doc.addPage(); y = 20 }
      doc.setFillColor(...C_WHITE)
      doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, 'F')
      doc.setDrawColor(...C_GRAY_M)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, 'S')
      doc.setTextColor(...C_GRAY_T)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('NOTA', MARGIN + 5, y + 6)
      if (nota.trim()) {
        doc.setTextColor(...C_BLACK)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        const notaLines = doc.splitTextToSize(nota.trim(), CONTENT_W - 10)
        doc.text(notaLines.slice(0, 1), MARGIN + 5, y + 14)
      }
      y += 28

      // ═══════════════════════════════════════════════════════
      // LOGOS DE MARCAS — antes del footer
      // ═══════════════════════════════════════════════════════
      const marcas = tallerInfo.marcas_aceite
      if (marcas && marcas.length > 0) {
        const marcasConLogo = marcas.filter(m => m.logo_url)
        if (marcasConLogo.length > 0) {
          const logoSectionY = Math.max(y + 8, 232)
          if (logoSectionY < 262) {
            doc.setDrawColor(...C_GRAY_M)
            doc.setLineWidth(0.3)
            doc.line(MARGIN, logoSectionY, W - MARGIN, logoSectionY)
            doc.setTextColor(...C_GRAY_T)
            doc.setFontSize(6.5)
            doc.setFont('helvetica', 'bold')
            doc.text('PRODUCTOS DE CONFIANZA', W / 2, logoSectionY + 5, { align: 'center' })
            const logoH = 12
            const logoMaxW = 28
            const logoGap = 10
            const totalLogosW = marcasConLogo.length * logoMaxW + (marcasConLogo.length - 1) * logoGap
            let logoX = (W - totalLogosW) / 2
            for (const m of marcasConLogo) {
              try {
                const { img, ok } = await loadImageAsBase64(m.logo_url)
                if (ok) {
                  const aspectW = Math.min((img.width / img.height) * logoH, logoMaxW)
                  doc.addImage(img, 'PNG', logoX, logoSectionY + 8, aspectW, logoH)
                  logoX += logoMaxW + logoGap
                }
              } catch { /* skip */ }
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════
      // FOOTER — gris claro, datos del taller centrados
      // ═══════════════════════════════════════════════════════
      const footerY = 277
      doc.setFillColor(...C_GRAY_L)
      doc.rect(0, footerY, W, 20, 'F')
      doc.setDrawColor(...C_GRAY_M)
      doc.setLineWidth(0.3)
      doc.line(0, footerY, W, footerY)
      doc.setTextColor(...C_BLACK)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(tallerNombre.toUpperCase(), W / 2, footerY + 8, { align: 'center' })
      if (tallerInfo.telefono || tallerInfo.direccion) {
        const sub = [tallerInfo.telefono, tallerInfo.direccion].filter(Boolean).join('  ·  ')
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C_GRAY_T)
        doc.text(sub, W / 2, footerY + 15, { align: 'center' })
      }

      doc.save(`Cotizacion_${placa || nombre}_${fecha}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Error al generar el PDF')
    }
    setLoading(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full rounded-3xl my-4"
        style={{
          maxWidth: '680px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 32px 80px -12px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header modal ── */}
        <div
          className="flex items-center justify-between px-6 py-5 rounded-t-3xl"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}
            >📋</div>
            <div>
              <h2
                className="font-display font-bold text-base uppercase tracking-tight leading-none"
                style={{ color: 'var(--text)' }}
              >Nueva Cotización</h2>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >Arma las opciones y comparte con el cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg transition-all"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >✕</button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Datos del cliente ── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}
            >
              <span className="text-base">👤</span>
              <p className="font-display font-bold text-xs uppercase tracking-widest" style={{ color: 'var(--text)' }}>
                Datos del Cliente y Vehículo
              </p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3" style={{ background: 'var(--surface)' }}>
              <div>
                <label className="lbl">Nombre del cliente *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo..." className="inp uppercase" />
              </div>
              <div>
                <label className="lbl">Teléfono</label>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="9XX XXX XXX" className="inp font-mono" />
              </div>
              <div>
                <label className="lbl">Placa del vehículo</label>
                <input value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-123" className="inp font-mono uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }} />
              </div>
              <div>
                <label className="lbl">Marca / Modelo</label>
                <div className="flex gap-2">
                  <input value={marca} onChange={e => setMarca(e.target.value)} placeholder="Toyota" className="inp uppercase flex-1" />
                  <input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Corolla" className="inp uppercase flex-1" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Opciones ── */}
          <div className="space-y-4">
            {opciones.map((opcion, oi) => {
              const totOp = totalOpcion(opcion.items)
              const colores = [
                { ring: 'rgba(33,199,184,0.4)', bg: 'rgba(33,199,184,0.07)', accent: 'var(--accent-teal)', badge: 'rgba(33,199,184,0.15)' },
                { ring: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.07)', accent: '#f59e0b', badge: 'rgba(245,158,11,0.15)' },
                { ring: 'rgba(167,139,250,0.4)', bg: 'rgba(167,139,250,0.07)', accent: '#a78bfa', badge: 'rgba(167,139,250,0.15)' },
                { ring: 'rgba(52,211,153,0.4)', bg: 'rgba(52,211,153,0.07)', accent: '#34d399', badge: 'rgba(52,211,153,0.15)' },
                { ring: 'rgba(251,146,60,0.4)', bg: 'rgba(251,146,60,0.07)', accent: '#fb923c', badge: 'rgba(251,146,60,0.15)' },
              ]
              const col = colores[oi % colores.length]
              return (
                <div key={oi} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${col.ring}`, background: col.bg }}>
                  {/* Header opción */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${col.ring}` }}>
                    <div
                      className="font-display w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: col.badge, color: col.accent, border: `1px solid ${col.ring}` }}
                    >{oi + 1}</div>
                    <input
                      value={opcion.titulo}
                      onChange={e => setTituloOpcion(oi, e.target.value)}
                      placeholder={`Nombre de la opción (ej: Castrol 5W-30, Liqui Moly...)`}
                      className="bg-transparent outline-none flex-1 font-display font-bold text-sm uppercase tracking-wide"
                      style={{ color: 'var(--text)' }}
                    />
                    {totOp > 0 && (
                      <span className="font-mono font-bold text-sm shrink-0" style={{ color: col.accent }}>
                        S/ {totOp.toFixed(2)}
                      </span>
                    )}
                    {opciones.length > 1 && (
                      <button
                        onClick={() => eliminarOpcion(oi)}
                        className="font-bold text-sm transition-colors shrink-0 ml-1"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >✕</button>
                    )}
                  </div>

                  {/* Ítems */}
                  <div className="p-4 space-y-2">
                    {opcion.items.map((item, ii) => (
                      <div key={ii} className="flex gap-2 items-center">
                        <input
                          value={item.descripcion}
                          onChange={e => setItemField(oi, ii, 'descripcion', e.target.value)}
                          placeholder="Descripción del producto o servicio..."
                          className="inp flex-1 text-sm"
                          style={{ minWidth: 0 }}
                        />
                        <div
                          className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 shrink-0"
                          style={{ background: col.badge, border: `1px solid ${col.ring}`, width: '110px' }}
                        >
                          <span className="font-display font-bold text-xs shrink-0" style={{ color: col.accent }}>S/</span>
                          <input
                            type="number"
                            value={item.precio}
                            onChange={e => setItemField(oi, ii, 'precio', e.target.value)}
                            placeholder="0.00"
                            step="0.50"
                            className="font-mono bg-transparent outline-none font-bold text-sm w-full"
                            style={{ color: col.accent }}
                          />
                        </div>
                        <button
                          onClick={() => eliminarItem(oi, ii)}
                          disabled={opcion.items.length === 1}
                          className="font-bold text-sm transition-colors shrink-0 disabled:opacity-20"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { if (opcion.items.length > 1) e.currentTarget.style.color = 'var(--accent)' }}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >✕</button>
                      </div>
                    ))}

                    <button
                      onClick={() => agregarItem(oi)}
                      className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition-all mt-1"
                      style={{ color: col.accent, background: col.badge, border: `1px dashed ${col.ring}` }}
                    >+ Agregar ítem</button>

                    {totOp > 0 && (
                      <div
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl mt-2"
                        style={{ background: col.badge, border: `1px solid ${col.ring}` }}
                      >
                        <span className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                          Total {opcion.titulo || `Opción ${oi + 1}`}
                        </span>
                        <span className="font-mono font-bold text-xl" style={{ color: col.accent }}>
                          S/ {totOp.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <button
              onClick={agregarOpcion}
              className="font-display w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; e.currentTarget.style.color = '#f59e0b' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >＋ Agregar otra opción / alternativa</button>
          </div>

          {/* ── Condiciones y Nota (para PDF) ── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}
            >
              <span className="text-base">📄</span>
              <p className="font-display font-bold text-xs uppercase tracking-widest" style={{ color: 'var(--text)' }}>
                Condiciones y Nota (aparecen en el PDF)
              </p>
            </div>
            <div className="p-4 space-y-3" style={{ background: 'var(--surface)' }}>
              <div>
                <label className="lbl">Condiciones del servicio</label>
                <textarea
                  value={condiciones}
                  onChange={e => setCondiciones(e.target.value)}
                  placeholder="Ej: Precio incluye mano de obra. Garantía de 1,000 km o 1 mes..."
                  rows={2}
                  className="inp w-full text-sm resize-none"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label className="lbl">Nota</label>
                <textarea
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Información adicional para el cliente..."
                  rows={2}
                  className="inp w-full text-sm resize-none"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-xl font-bold text-sm"
              style={{ background: 'rgba(255,106,31,0.08)', border: '1px solid rgba(255,106,31,0.3)', color: 'var(--accent)' }}
            >❌ {error}</div>
          )}

          {/* Éxito + botones de acción */}
          {guardada ? (
            <div className="space-y-3">
              <div
                className="px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
                style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}
              >✅ Cotización guardada en Proformas</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={enviarWhatsApp}
                  className="font-display font-bold py-4 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  style={{ background: '#25d366', color: '#fff' }}
                >💬 Enviar WhatsApp</button>
                <button
                  onClick={descargarPDF}
                  disabled={loading}
                  className="font-display font-bold py-4 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}
                >{loading ? '⏳ Generando...' : '📥 Descargar PDF'}</button>
              </div>
              <button
                onClick={() => {
                  setGuardada(false)
                  setNombre(''); setTelefono(''); setPlaca(''); setMarca(''); setModelo('')
                  setOpciones([opcionVacia()]); setCondiciones(''); setNota('')
                }}
                className="font-display w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >↺ Nueva cotización</button>
            </div>
          ) : (
            <button
              onClick={guardar}
              disabled={loading}
              className="font-display w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              style={{ background: 'rgba(245,158,11,0.9)', color: '#fff' }}
            >{loading ? '⏳ Guardando...' : '📋 Guardar Cotización'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
