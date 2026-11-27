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

// ─── Sub-componente: Modal de Vista Previa ───────────────────────────────────
function ModalVistaPrevia({
  tallerNombre,
  fecha,
  nombre,
  telefono,
  placa,
  marca,
  modelo,
  opciones,
  condiciones,
  nota,
  loading,
  onConfirmar,
  onVolver,
}: {
  tallerNombre: string
  fecha: string
  nombre: string
  telefono: string
  placa: string
  marca: string
  modelo: string
  opciones: Opcion[]
  condiciones: string
  nota: string
  loading: boolean
  onConfirmar: () => void
  onVolver: () => void
}) {
  const vehiculo = [marca, modelo].filter(Boolean).join(' ')
  const fechaFmt = fecha.split('-').reverse().join('/')

  const colores = [
    { ring: '#21c7b8', bg: 'rgba(33,199,184,0.08)', accent: '#21c7b8', badge: 'rgba(33,199,184,0.15)', header: 'rgba(33,199,184,0.2)' },
    { ring: '#f59e0b', bg: 'rgba(245,158,11,0.08)', accent: '#f59e0b', badge: 'rgba(245,158,11,0.15)', header: 'rgba(245,158,11,0.2)' },
    { ring: '#a78bfa', bg: 'rgba(167,139,250,0.08)', accent: '#a78bfa', badge: 'rgba(167,139,250,0.15)', header: 'rgba(167,139,250,0.2)' },
    { ring: '#34d399', bg: 'rgba(52,211,153,0.08)', accent: '#34d399', badge: 'rgba(52,211,153,0.15)', header: 'rgba(52,211,153,0.2)' },
    { ring: '#fb923c', bg: 'rgba(251,146,60,0.08)', accent: '#fb923c', badge: 'rgba(251,146,60,0.15)', header: 'rgba(251,146,60,0.2)' },
  ]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full my-4 rounded-3xl overflow-hidden"
        style={{
          maxWidth: '620px',
          background: '#fff',
          boxShadow: '0 40px 100px -12px rgba(0,0,0,0.8)',
        }}
      >
        {/* ── Barra superior (simula ventana de documento) ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ background: '#1a1a2e', borderBottom: '2px solid #f59e0b' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-3 font-mono text-xs font-bold" style={{ color: '#f59e0b' }}>
              COTIZACIÓN — VISTA PREVIA
            </span>
          </div>
          <button
            onClick={onVolver}
            className="font-bold text-sm transition-opacity"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >✕</button>
        </div>

        {/* ── Contenido del documento (fondo blanco simulando papel) ── */}
        <div style={{ background: '#ffffff', color: '#111' }}>

          {/* HEADER DEL DOCUMENTO — 3 columnas fijas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '0',
              padding: '20px 24px 16px',
              borderBottom: '2px solid #e5e7eb',
            }}
          >
            {/* Columna izquierda: nombre taller + dirección/tel */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <p style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px', color: '#111', textTransform: 'uppercase', lineHeight: 1.1 }}>
                {tallerNombre}
              </p>
            </div>

            {/* Columna derecha: badge COTIZACIÓN + fecha */}
            <div
              style={{
                border: '2px solid #111',
                borderRadius: '6px',
                padding: '8px 16px',
                textAlign: 'center',
                minWidth: '120px',
              }}
            >
              <p style={{ fontWeight: 900, fontSize: '12px', letterSpacing: '2px', color: '#111', textTransform: 'uppercase' }}>
                COTIZACIÓN
              </p>
              <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                Fecha: {fechaFmt}
              </p>
            </div>
          </div>

          {/* DATOS DEL CLIENTE */}
          <div style={{ padding: '16px 24px' }}>
            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                  CLIENTE
                </p>
                <p style={{ fontWeight: 800, fontSize: '15px', color: '#111', textTransform: 'uppercase' }}>
                  {nombre || '—'}
                </p>
                {vehiculo && (
                  <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', textTransform: 'uppercase' }}>
                    🚗 {vehiculo}
                  </p>
                )}
                {telefono && (
                  <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                    📞 {telefono}
                  </p>
                )}
              </div>
              {placa && (
                <div
                  style={{
                    background: '#dbeafe',
                    border: '1px solid #93c5fd',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    textAlign: 'center',
                    minWidth: '90px',
                  }}
                >
                  <p style={{ fontWeight: 900, fontSize: '16px', color: '#1d4ed8', fontFamily: 'monospace', letterSpacing: '2px' }}>
                    {placa.toUpperCase()}
                  </p>
                  <p style={{ fontSize: '8px', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    PLACA
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* OPCIONES */}
          <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {opciones.map((opcion, idx) => {
              const itemsFiltrados = opcion.items.filter(i => i.descripcion.trim())
              if (itemsFiltrados.length === 0) return null
              const tot = totalOpcion(opcion.items)
              const col = colores[idx % colores.length]
              return (
                <div
                  key={idx}
                  style={{ border: `1.5px solid ${col.ring}`, borderRadius: '8px', overflow: 'hidden' }}
                >
                  {/* Header opción — negro sólido */}
                  <div
                    style={{
                      background: '#111',
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <p style={{ fontWeight: 800, fontSize: '11px', color: '#fff', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                      {opcion.titulo
                        ? `OPCIÓN ${idx + 1}  —  ${opcion.titulo.toUpperCase()}`
                        : `OPCIÓN ${idx + 1}`}
                    </p>
                    {tot > 0 && (
                      <p style={{ fontWeight: 800, fontSize: '12px', color: col.accent, fontFamily: 'monospace' }}>
                        S/ {tot.toFixed(2)}
                      </p>
                    )}
                  </div>
                  {/* Ítems */}
                  <div style={{ background: '#fff' }}>
                    {itemsFiltrados.map((item, ii) => (
                      <div
                        key={ii}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '7px 14px',
                          background: ii % 2 === 0 ? '#f9fafb' : '#fff',
                          borderTop: ii === 0 ? 'none' : '1px solid #f3f4f6',
                        }}
                      >
                        <p style={{ fontSize: '12px', color: '#374151' }}>
                          •&nbsp;&nbsp;{item.descripcion.toUpperCase()}
                        </p>
                        {parseFloat(item.precio) > 0 && (
                          <p style={{ fontWeight: 700, fontSize: '12px', color: '#111', fontFamily: 'monospace', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                            S/ {parseFloat(item.precio).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                    {/* Total fila */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 14px',
                        background: '#f3f4f6',
                        borderTop: '1px solid #e5e7eb',
                      }}
                    >
                      <p style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        TOTAL OPCIÓN
                      </p>
                      <p style={{ fontWeight: 900, fontSize: '15px', color: '#111', fontFamily: 'monospace' }}>
                        S/ {tot.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CONDICIONES Y NOTA */}
          {(condiciones.trim() || nota.trim()) && (
            <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {condiciones.trim() && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '8px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                    📌 CONDICIONES DEL SERVICIO
                  </p>
                  <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.5 }}>{condiciones.trim()}</p>
                </div>
              )}
              {nota.trim() && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '8px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                    📝 NOTA
                  </p>
                  <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.5 }}>{nota.trim()}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Botones de acción (fuera del área blanca) ── */}
        <div
          style={{ background: '#1a1a2e', padding: '16px 24px', display: 'flex', gap: '12px' }}
        >
          <button
            onClick={onVolver}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
            }}
          >← Volver y editar</button>
          <button
            onClick={onConfirmar}
            disabled={loading}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              background: loading ? 'rgba(245,158,11,0.5)' : '#f59e0b',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >{loading ? '⏳ Guardando...' : '✅ Confirmar y Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

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
  const [vistaPrevia, setVistaPrevia] = useState(false)
  const [correlativo, setCorrelativo] = useState<number | null>(null)

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
    setLoading(true); setError('')

    // Obtener correlativo: contar cotizaciones previas del taller
    const { count } = await supabase
      .from('proformas')
      .select('*', { count: 'exact', head: true })
      .eq('taller_id', tallerID)
      .eq('tipo', 'cotizacion')
    const nro = (count ?? 0) + 1
    setCorrelativo(nro)

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
    setVistaPrevia(false)
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

    const nroStr = correlativo ? `COT-${String(correlativo).padStart(4, '0')}` : ''
    const msg = encodeURIComponent(
      `📋 *COTIZACIÓN${nroStr ? ' ' + nroStr : ''} — ${tallerNombre.toUpperCase()}*\n` +
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
      const nroStr = correlativo ? `COT-${String(correlativo).padStart(4, '0')}` : ''

      // ── Colores ──
      const C_BLACK  = [10,  10,  10]  as [number, number, number]
      const C_WHITE  = [255, 255, 255] as [number, number, number]
      const C_GRAY_L = [245, 245, 245] as [number, number, number]
      const C_GRAY_M = [200, 200, 200] as [number, number, number]
      const C_GRAY_T = [120, 120, 120] as [number, number, number]
      const C_BLUE   = [219, 234, 254] as [number, number, number]
      const C_BLUE_T = [ 29,  78, 216] as [number, number, number]

      // ═══════════════════════════════════════════════════════
      // HEADER — layout de 3 zonas con anchos fijos:
      //   LOGO (40mm) | NOMBRE+SUBTÍTULO (relleno) | BADGE (52mm)
      // ═══════════════════════════════════════════════════════
      const headerH = 46
      const LOGO_ZONE  = 44  // ancho reservado para logo
      const BADGE_ZONE = 52  // ancho reservado para badge derecho

      doc.setFillColor(...C_WHITE)
      doc.rect(0, 0, W, headerH, 'F')

      // ── Zona BADGE (columna derecha fija) ──
      const badgeW  = 44
      const badgeH  = 20
      const badgeX  = W - MARGIN - badgeW
      const badgeY  = (headerH - badgeH) / 2

      doc.setDrawColor(...C_BLACK)
      doc.setLineWidth(1.4)
      doc.rect(badgeX, badgeY, badgeW, badgeH)

      doc.setTextColor(...C_BLACK)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('COTIZACIÓN', badgeX + badgeW / 2, badgeY + 8, { align: 'center' })

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C_GRAY_T)
      doc.text(`Fecha: ${fechaFmt}`, badgeX + badgeW / 2, badgeY + 13.5, { align: 'center' })
      if (nroStr) {
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'bold')
        doc.text(nroStr, badgeX + badgeW / 2, badgeY + 18, { align: 'center' })
      }

      // ── Zona LOGO (columna izquierda fija) ──
      let logoEndX = MARGIN
      if (tallerInfo.logo_url) {
        const { img, ok } = await loadImageAsBase64(tallerInfo.logo_url)
        if (ok) {
          const maxLogoH = 28
          const maxLogoW = LOGO_ZONE - 6
          const aspectRatio = img.width / img.height
          let logoH = maxLogoH
          let logoW = aspectRatio * logoH
          if (logoW > maxLogoW) { logoW = maxLogoW; logoH = logoW / aspectRatio }
          const logoY = (headerH - logoH) / 2
          doc.addImage(img, 'PNG', MARGIN, logoY, logoW, logoH)
          logoEndX = MARGIN + LOGO_ZONE
        }
      }

      // ── Zona NOMBRE (columna central — entre logo y badge) ──
      const nameZoneX = logoEndX + 4
      const nameZoneW = badgeX - nameZoneX - 4  // espacio disponible garantizado

      doc.setTextColor(...C_BLACK)
      doc.setFont('helvetica', 'bold')

      // Ajustar tamaño para que quepa en nameZoneW
      let fs = 18
      doc.setFontSize(fs)
      while (doc.getTextWidth(tallerNombre.toUpperCase()) > nameZoneW && fs > 9) {
        fs -= 0.5
        doc.setFontSize(fs)
      }

      const hasSub = !!(tallerInfo.direccion || tallerInfo.telefono)
      const nameY = hasSub ? headerH / 2 - 2 : headerH / 2 + 3
      doc.text(tallerNombre.toUpperCase(), nameZoneX, nameY)

      if (hasSub) {
        const sub = [tallerInfo.direccion, tallerInfo.telefono ? `Tel: ${tallerInfo.telefono}` : ''].filter(Boolean).join('  ·  ')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C_GRAY_T)
        const subLines = doc.splitTextToSize(sub, nameZoneW)
        doc.text(subLines[0], nameZoneX, headerH / 2 + 6)
      }

      // Línea separadora
      doc.setDrawColor(...C_GRAY_M)
      doc.setLineWidth(0.4)
      doc.line(0, headerH, W, headerH)

      // ═══════════════════════════════════════════════════════
      // DATOS DEL CLIENTE — nombre + placa + marca/modelo
      // ═══════════════════════════════════════════════════════
      let y = headerH + 10

      // Altura dinámica: si hay vehículo, necesita más espacio
      const hasVehiculo = !!vehiculo
      const clienteH = hasVehiculo ? 32 : 22

      doc.setFillColor(...C_GRAY_L)
      doc.roundedRect(MARGIN, y, CONTENT_W, clienteH, 2, 2, 'F')
      doc.setDrawColor(...C_GRAY_M)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGIN, y, CONTENT_W, clienteH, 2, 2, 'S')

      // Label CLIENTE
      doc.setTextColor(...C_GRAY_T)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('CLIENTE', MARGIN + 6, y + 7)

      // Nombre del cliente
      doc.setTextColor(...C_BLACK)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      // Limitar ancho del nombre para no pisar la placa
      const nameMaxW = placa.trim() ? CONTENT_W - 60 : CONTENT_W - 10
      let nameFontSize = 13
      doc.setFontSize(nameFontSize)
      while (doc.getTextWidth(nombre.toUpperCase()) > nameMaxW && nameFontSize > 8) {
        nameFontSize -= 0.5
        doc.setFontSize(nameFontSize)
      }
      doc.text(nombre.toUpperCase(), MARGIN + 6, y + 15)

      // Vehículo (marca + modelo) debajo del nombre
      if (hasVehiculo) {
        doc.setTextColor(...C_GRAY_T)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.text(`🚗 ${vehiculo.toUpperCase()}`, MARGIN + 6, y + 23)
      }

      // Badge PLACA (derecha)
      if (placa.trim()) {
        const placaW  = 50
        const placaH  = hasVehiculo ? 24 : 16
        const placaX  = W - MARGIN - placaW - 2
        const placaBY = y + (clienteH - placaH) / 2

        doc.setFillColor(...C_BLUE)
        doc.roundedRect(placaX, placaBY, placaW, placaH, 3, 3, 'F')
        doc.setDrawColor(147, 197, 253)
        doc.setLineWidth(0.6)
        doc.roundedRect(placaX, placaBY, placaW, placaH, 3, 3, 'S')

        // Texto PLACA
        doc.setTextColor(...C_BLUE_T)
        doc.setFontSize(hasVehiculo ? 13 : 10)
        doc.setFont('helvetica', 'bold')
        doc.text(placa.toUpperCase(), placaX + placaW / 2, placaBY + placaH / 2 + (hasVehiculo ? 2 : 1.5), { align: 'center' })

        // Label pequeño
        if (hasVehiculo) {
          doc.setFontSize(6)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(100, 150, 240)
          doc.text('PLACA', placaX + placaW / 2, placaBY + placaH - 3, { align: 'center' })
        }
      }

      y += clienteH + 10

      // ═══════════════════════════════════════════════════════
      // OPCIONES
      // ═══════════════════════════════════════════════════════
      opciones.forEach((opcion, idx) => {
        const itemsFiltrados = opcion.items.filter(i => i.descripcion.trim())
        if (itemsFiltrados.length === 0) return
        const tot = totalOpcion(opcion.items)

        if (y > 240) { doc.addPage(); y = 20 }

        // Header opción — negro sólido
        doc.setFillColor(...C_BLACK)
        doc.roundedRect(MARGIN, y, CONTENT_W, 10, 1, 1, 'F')
        doc.rect(MARGIN, y + 7, CONTENT_W, 3, 'F')

        doc.setTextColor(...C_WHITE)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        const headerTxt = opcion.titulo
          ? `OPCIÓN ${idx + 1}  —  ${opcion.titulo.toUpperCase()}`
          : `OPCIÓN ${idx + 1}`
        doc.text(headerTxt, MARGIN + 5, y + 7)
        if (tot > 0) {
          doc.text(`S/ ${tot.toFixed(2)}`, W - MARGIN - 3, y + 7, { align: 'right' })
        }
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

        // Fila TOTAL
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
      // CONDICIONES
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
      // NOTA
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
      // LOGOS DE MARCAS
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
      // FOOTER
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

      const filename = nroStr
        ? `${nroStr}_${placa || nombre}_${fecha}.pdf`
        : `Cotizacion_${placa || nombre}_${fecha}.pdf`
      doc.save(filename)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Error al generar el PDF')
    }
    setLoading(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modal vista previa — encima del cotizador */}
      {vistaPrevia && !guardada && (
        <ModalVistaPrevia
          tallerNombre={tallerNombre}
          fecha={fecha}
          nombre={nombre}
          telefono={telefono}
          placa={placa}
          marca={marca}
          modelo={modelo}
          opciones={opciones}
          condiciones={condiciones}
          nota={nota}
          loading={loading}
          onConfirmar={guardar}
          onVolver={() => setVistaPrevia(false)}
        />
      )}

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

            {/* ── Condiciones y Nota ── */}
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

            {/* Botones finales */}
            {guardada ? (
              <div className="space-y-3">
                <div
                  className="px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
                  style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}
                >✅ Cotización guardada en Proformas{correlativo ? ` — COT-${String(correlativo).padStart(4, '0')}` : ''}</div>
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
                    setVistaPrevia(false)
                    setCorrelativo(null)
                    setNombre(''); setTelefono(''); setPlaca(''); setMarca(''); setModelo('')
                    setOpciones([opcionVacia()]); setCondiciones(''); setNota('')
                  }}
                  className="font-display w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >↺ Nueva cotización</button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (!nombre.trim()) { setError('El nombre del cliente es obligatorio'); return }
                  const tieneItems = opciones.some(o => o.items.some(i => i.descripcion.trim()))
                  if (!tieneItems) { setError('Agrega al menos un ítem en alguna opción'); return }
                  setError('')
                  setVistaPrevia(true)
                }}
                className="font-display w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95"
                style={{ background: 'rgba(245,158,11,0.9)', color: '#fff' }}
              >👁 Vista Previa</button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}