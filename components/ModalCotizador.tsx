'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Tipos ──────────────────────────────────────────────────────────────────
type ItemOpcion = { descripcion: string; precio: string }
type Opcion = { titulo: string; items: ItemOpcion[] }

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
  // Datos del cliente / vehículo
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [placa, setPlaca] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [fecha] = useState(new Date().toISOString().slice(0, 10))

  // Opciones de cotización
  const [opciones, setOpciones] = useState<Opcion[]>([opcionVacia()])

  // Estado UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [guardada, setGuardada] = useState(false)

  // ── Mutadores de opciones ──────────────────────────────────────────────────
  const agregarOpcion = () =>
    setOpciones(prev => [...prev, opcionVacia()])

  const eliminarOpcion = (oi: number) =>
    setOpciones(prev => prev.filter((_, i) => i !== oi))

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
      i === oi ? {
        ...o,
        items: o.items.map((item, j) => j === ii ? { ...item, [field]: val } : item),
      } : o
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
      items: payload,           // estructura de opciones completa
      monto: 0,                 // no hay total único — es por opción
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
      const titulo = o.titulo || `Opción ${idx + 1}`
      const lineas = o.items
        .filter(i => i.descripcion.trim())
        .map(i => `  • ${i.descripcion}${parseFloat(i.precio) > 0 ? ` — S/ ${parseFloat(i.precio).toFixed(2)}` : ''}`)
        .join('\n')
      const tot = totalOpcion(o.items)
      return `*${titulo.toUpperCase()}*\n${lineas}\n  ➤ *Total opción: S/ ${tot.toFixed(2)}*`
    }).join('\n\n')

    const msg = encodeURIComponent(
      `📋 *COTIZACIÓN — ${tallerNombre}*\n` +
      `📅 ${fechaFmt}\n` +
      `👤 ${nombre}` +
      (placa ? `  |  🚗 ${placa.toUpperCase()}` : '') +
      (vehiculo ? `  |  ${vehiculo}` : '') +
      `\n\n${bloques}\n\n` +
      `⚠️ _Cotización válida por 7 días._\n¡Contáctenos para confirmar! 🔧`
    )
    window.open(`https://wa.me/51${tel}?text=${msg}`, '_blank')
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  const descargarPDF = async () => {
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210
      const fechaFmt = fecha.split('-').reverse().join('/')
      const vehiculo = [marca, modelo].filter(Boolean).join(' ')

      // ── Header ──
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, W, 40, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(tallerNombre.toUpperCase(), 20, 17)

      doc.setTextColor(96, 165, 250)
      doc.setFontSize(8)
      doc.text('COTIZACIÓN DE SERVICIOS / PRODUCTOS', 20, 24)

      doc.setTextColor(200, 200, 200)
      doc.setFontSize(7.5)
      doc.text(`Fecha: ${fechaFmt}`, 20, 31)

      // Badge
      doc.setFillColor(245, 158, 11)
      doc.roundedRect(W - 52, 10, 38, 13, 3, 3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('COTIZACIÓN', W - 48, 18.5)

      // ── Datos cliente ──
      let y = 54
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(14, y - 8, W - 28, vehiculo ? 30 : 22, 4, 4, 'F')

      doc.setTextColor(100, 116, 139)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('CLIENTE', 20, y)

      doc.setTextColor(15, 23, 42)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(nombre.toUpperCase(), 20, y + 8)

      if (vehiculo) {
        doc.setTextColor(71, 85, 105)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(vehiculo.toUpperCase(), 20, y + 16)
      }

      if (placa.trim()) {
        doc.setFillColor(219, 234, 254)
        doc.roundedRect(W - 56, y - 4, 42, vehiculo ? 24 : 18, 3, 3, 'F')
        doc.setTextColor(29, 78, 216)
        doc.setFontSize(vehiculo ? 16 : 14)
        doc.setFont('helvetica', 'bold')
        doc.text(placa.toUpperCase(), W - 46, vehiculo ? y + 10 : y + 7)
      }

      y += vehiculo ? 36 : 28

      // ── Opciones ──
      opciones.forEach((opcion, idx) => {
        const titulo = opcion.titulo || `Opción ${idx + 1}`
        const itemsFiltrados = opcion.items.filter(i => i.descripcion.trim())
        if (itemsFiltrados.length === 0) return

        const tot = totalOpcion(opcion.items)

        // Color de acento por opción (cicla entre varios)
        const acentos: [number, number, number][] = [
          [33, 199, 184],   // teal
          [245, 158, 11],   // amber
          [167, 139, 250],  // violet
          [52, 211, 153],   // emerald
          [251, 146, 60],   // orange
        ]
        const [r, g, b] = acentos[idx % acentos.length]

        // Título de opción
        doc.setFillColor(r, g, b)
        doc.roundedRect(14, y, W - 28, 9, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(titulo.toUpperCase(), 20, y + 6)
        y += 12

        // Ítems
        itemsFiltrados.forEach((item, ii) => {
          if (ii % 2 === 0) {
            doc.setFillColor(248, 250, 252)
            doc.rect(14, y - 1, W - 28, 8, 'F')
          }
          doc.setTextColor(15, 23, 42)
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'normal')
          const desc = item.descripcion.length > 60
            ? item.descripcion.slice(0, 57) + '...'
            : item.descripcion
          doc.text('•  ' + desc.toUpperCase(), 20, y + 5)
          if (parseFloat(item.precio) > 0) {
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(r, g, b)
            doc.text(`S/ ${parseFloat(item.precio).toFixed(2)}`, W - 20, y + 5, { align: 'right' })
          }
          y += 9
        })

        // Total de la opción
        doc.setFillColor(r, g, b, 0.15)
        doc.setFillColor(Math.min(r + 180, 255), Math.min(g + 180, 255), Math.min(b + 180, 255))
        doc.roundedRect(W - 75, y, 61, 10, 2, 2, 'F')
        doc.setTextColor(r, g, b)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL OPCIÓN', W - 68, y + 7)
        doc.setFontSize(10)
        doc.text(`S/ ${tot.toFixed(2)}`, W - 20, y + 7, { align: 'right' })

        y += 16

        // Separador entre opciones
        if (idx < opciones.length - 1) {
          doc.setDrawColor(226, 232, 240)
          doc.setLineWidth(0.4)
          doc.setLineDashPattern([2, 2], 0)
          doc.line(14, y, W - 14, y)
          doc.setLineDashPattern([], 0)
          y += 6
        }
      })

      // ── Nota de validez ──
      y += 4
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFillColor(255, 251, 235)
      doc.roundedRect(14, y, W - 28, 12, 3, 3, 'F')
      doc.setTextColor(146, 64, 14)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('⚠  Cotización válida por 7 días a partir de la fecha de emisión.', 20, y + 8)

      // ── Footer ──
      doc.setFillColor(241, 245, 249)
      doc.rect(0, 277, W, 20, 'F')
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `${tallerNombre} · Cotización generada el ${fechaFmt}`,
        W / 2, 287, { align: 'center' }
      )

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
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}
            >
              <span className="text-base">👤</span>
              <p
                className="font-display font-bold text-xs uppercase tracking-widest"
                style={{ color: 'var(--text)' }}
              >Datos del Cliente y Vehículo</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3" style={{ background: 'var(--surface)' }}>
              <div>
                <label className="lbl">Nombre del cliente *</label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre completo..."
                  className="inp uppercase"
                />
              </div>
              <div>
                <label className="lbl">Teléfono</label>
                <input
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="9XX XXX XXX"
                  className="inp font-mono"
                />
              </div>
              <div>
                <label className="lbl">Placa del vehículo</label>
                <input
                  value={placa}
                  onChange={e => setPlaca(e.target.value.toUpperCase())}
                  placeholder="ABC-123"
                  className="inp font-mono uppercase tracking-widest"
                  style={{ color: 'var(--accent-teal)' }}
                />
              </div>
              <div>
                <label className="lbl">Marca / Modelo</label>
                <div className="flex gap-2">
                  <input
                    value={marca}
                    onChange={e => setMarca(e.target.value)}
                    placeholder="Toyota"
                    className="inp uppercase flex-1"
                  />
                  <input
                    value={modelo}
                    onChange={e => setModelo(e.target.value)}
                    placeholder="Corolla"
                    className="inp uppercase flex-1"
                  />
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
                <div
                  key={oi}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${col.ring}`, background: col.bg }}
                >
                  {/* Header opción */}
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: `1px solid ${col.ring}` }}
                  >
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
                      <span
                        className="font-mono font-bold text-sm shrink-0"
                        style={{ color: col.accent }}
                      >S/ {totOp.toFixed(2)}</span>
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

                  {/* Ítems de la opción */}
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
                          <span
                            className="font-display font-bold text-xs shrink-0"
                            style={{ color: col.accent }}
                          >S/</span>
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

                    {/* Agregar ítem */}
                    <button
                      onClick={() => agregarItem(oi)}
                      className="font-display text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition-all mt-1"
                      style={{ color: col.accent, background: col.badge, border: `1px dashed ${col.ring}` }}
                    >+ Agregar ítem</button>

                    {/* Subtotal opción */}
                    {totOp > 0 && (
                      <div
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl mt-2"
                        style={{ background: col.badge, border: `1px solid ${col.ring}` }}
                      >
                        <span
                          className="font-display text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: 'var(--text-muted)' }}
                        >Total {opcion.titulo || `Opción ${oi + 1}`}</span>
                        <span
                          className="font-mono font-bold text-xl"
                          style={{ color: col.accent }}
                        >S/ {totOp.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Agregar opción */}
            <button
              onClick={agregarOpcion}
              className="font-display w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              style={{
                background: 'var(--surface-2)',
                border: '1px dashed var(--border)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; e.currentTarget.style.color = '#f59e0b' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >＋ Agregar otra opción / alternativa</button>
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
                  setOpciones([opcionVacia()])
                }}
                className="font-display w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >↺ Nueva cotización</button>
            </div>
          ) : (
            /* Botón guardar */
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
