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

type TallerInfo = { id: string; nombre: string; logo_url: string; telefono: string; direccion: string; ruc: string }
type Registro = Servicio | Venta | Proforma
type FiltroTipo = 'todos' | 'servicios' | 'ventas' | 'proformas'

type Comprobante = {
  id: string; taller_id: string; servicio_id: string | null; tipo: string
  serie: string; numero: number; fecha_emision: string
  cliente_nombre: string; cliente_doc: string; cliente_dir: string
  monto: number; estado_sunat: string; created_at: string
  payload: {
    items: { descripcion: string; precio: number }[]
    igv_pct: number; subtotal: number; igv: number
    telefono: string; external_id: string; entorno: string
    pdf_base64: string; sunat_descripcion: string
  }
}

// Detecta si una proforma es multi-opción (nuevo formato)
const esMultiOpcion = (items: any[]): boolean =>
  Array.isArray(items) && items.length > 0 && items[0] && typeof items[0] === 'object' && 'titulo' in items[0]

// Resumen legible de los ítems según el formato
const resumenItems = (items: any[]): string => {
  if (!Array.isArray(items) || items.length === 0) return ''
  if (esMultiOpcion(items)) {
    // Para multi-opción: muestra los primeros items de la primera opción
    const primeraOpcion: OpcionProforma = items[0]
    const subItems = primeraOpcion?.items || []
    const detalle = subItems
      .filter((i: any) => i.descripcion?.trim())
      .slice(0, 3)
      .map((i: any) => i.descripcion.trim())
      .join(' · ')
    const sufijo = items.length > 1 ? ` +${items.length - 1} opción(es)` : ''
    return detalle + sufijo || items.map((o: OpcionProforma) => o.titulo || 'Opción').join(' · ')
  }
  return items.slice(0, 2).map((i: any) => `${i.cantidad ? i.cantidad + 'x ' : ''}${i.nombre ?? i.descripcion ?? ''}`.trim()).join(', ')
}

// Monto total de una proforma (multi-opción o clásica)
const montoProforma = (p: Proforma): number => {
  if (!p.monto || p.monto === 0) {
    if (esMultiOpcion(p.items)) {
      // Suma de todos los totales de las opciones, o el mayor
      const totales = p.items.map((o: OpcionProforma) =>
        o.total || (o.items || []).reduce((s: number, i: any) => s + (i.precio || 0), 0)
      )
      return totales.reduce((a: number, b: number) => a + b, 0)
    }
  }
  return p.monto || 0
}

const toTitleCase = (str: string) =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())

// ── Modal de acciones para comprobante emitido ─────────────────────────────
function ModalAcciones({
  c, tallerNombre, tallerRuc, tallerTelefono, onClose, onAnulado,
}: {
  c: Comprobante; tallerNombre: string; tallerRuc: string; tallerTelefono: string
  onClose: () => void; onAnulado: () => void
}) {
  const [loadingAccion, setLoadingAccion] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAnular, setShowAnular] = useState(false)
  const [motivoAnular, setMotivoAnular] = useState('')
  const [notaModal, setNotaModal] = useState<'credito' | 'debito' | null>(null)

  const nro = `${c.serie}-${String(c.numero).padStart(6, '0')}`
  const external_id = c.payload?.external_id
  const modo = c.payload?.entorno === 'produccion' ? 'produccion' : 'demo'
  const hasPDF = !!c.payload?.pdf_base64

  const descargarPDF = () => {
    if (!hasPDF) return
    const link = document.createElement('a')
    link.href = c.payload.pdf_base64
    link.download = `${nro}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const imprimir = () => {
    if (!hasPDF) return
    const byteString = atob(c.payload.pdf_base64.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
    const blob = new Blob([ab], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    win?.addEventListener('load', () => win.print())
  }

  const enviarWhatsApp = async () => {
    const tel = (c.payload?.telefono || '').replace(/\D/g, '')
    const texto =
      `🧾 *COMPROBANTE: ${nro}*\n` +
      `🏪 ${tallerNombre}${tallerRuc ? ` · RUC: ${tallerRuc}` : ''}\n` +
      `📅 ${c.fecha_emision || new Date(c.created_at).toLocaleDateString('es-PE')}\n` +
      `👤 ${toTitleCase(c.cliente_nombre || '')}\n` +
      `💰 *Total: S/ ${(c.monto || 0).toFixed(2)}*\n\n` +
      `¡Gracias por su preferencia! 🙏`

    if (hasPDF) {
      const link = document.createElement('a')
      link.href = c.payload.pdf_base64
      link.download = `${nro}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      await new Promise(r => setTimeout(r, 800))
    }

    const num = tel || prompt('Ingresa el número WhatsApp del cliente:')?.replace(/\D/g, '')
    if (!num) return
    window.open(`https://wa.me/51${num}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const descargarXML = async () => {
    if (!external_id) { setError('No hay external_id para este comprobante'); return }
    setLoadingAccion('xml')
    try {
      const res = await fetch(`/api/factusmart/xml?external_id=${external_id}&modo=${modo}`)
      if (!res.ok) throw new Error('No se pudo obtener el XML')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `${nro}.xml`; link.click()
    } catch (e: any) { setError(e.message) }
    setLoadingAccion(null)
  }

  const descargarCDR = async () => {
    if (!external_id) { setError('No hay external_id para este comprobante'); return }
    setLoadingAccion('cdr')
    try {
      const res = await fetch(`/api/factusmart/cdr?external_id=${external_id}&modo=${modo}`)
      if (!res.ok) throw new Error('No se pudo obtener el CDR')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `CDR-${nro}.zip`; link.click()
    } catch (e: any) { setError(e.message) }
    setLoadingAccion(null)
  }

  const anular = async () => {
    if (!external_id) { setError('No hay external_id'); return }
    if (!motivoAnular.trim()) { setError('Ingresa un motivo de anulación'); return }
    setLoadingAccion('anular'); setError('')
    try {
      const res = await fetch('/api/factusmart/anular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_id, motivo: motivoAnular, modo }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(JSON.stringify(data.detalle || data.error))
      await supabase.from('comprobantes').update({ estado_sunat: 'anulado' }).eq('id', c.id)
      onAnulado(); onClose()
    } catch (e: any) { setError(e.message) }
    setLoadingAccion(null)
  }

  const btnBase = "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

        <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-black text-base" style={{ color: 'var(--text)' }}>Comprobante electrónico</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--teal)' }}>{nro}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-all" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}
          <div className="flex items-center justify-between">
            <span className="text-xs px-3 py-1 rounded-full font-black uppercase"
              style={c.tipo === 'factura'
                ? { background: 'var(--teal-muted)', color: 'var(--teal)' }
                : { background: 'rgba(57,185,128,0.12)', color: 'var(--success)' }}>
              {c.tipo === 'factura' ? 'Factura Electrónica' : 'Boleta de Venta'}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-black uppercase"
              style={c.estado_sunat === 'emitido'
                ? { background: 'rgba(57,185,128,0.12)', color: 'var(--success)' }
                : c.estado_sunat === 'anulado'
                ? { background: 'var(--danger-muted)', color: 'var(--danger)' }
                : { background: 'var(--amber-muted)', color: 'var(--amber)' }}>
              {c.estado_sunat?.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-bold uppercase tracking-wider text-[9px]" style={{ color: 'var(--text-subtle)' }}>Cliente</p>
              <p className="font-black mt-0.5" style={{ color: 'var(--text)' }}>{toTitleCase(c.cliente_nombre || '')}</p>
              {c.cliente_doc && <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>{c.tipo === 'factura' ? 'RUC' : 'DNI'}: {c.cliente_doc}</p>}
            </div>
            <div className="text-right">
              <p className="font-bold uppercase tracking-wider text-[9px]" style={{ color: 'var(--text-subtle)' }}>Total</p>
              <p className="font-black text-xl mt-0.5" style={{ color: 'var(--teal)' }}>S/ {(c.monto || 0).toFixed(2)}</p>
              <p className="font-semibold text-[10px]" style={{ color: 'var(--text-subtle)' }}>{c.fecha_emision || new Date(c.created_at).toLocaleDateString('es-PE')}</p>
            </div>
          </div>

          {modo === 'demo' && (
            <div className="rounded-lg px-3 py-1.5 text-center" style={{ background: 'var(--amber-muted)', border: '1px solid var(--amber-border)' }}>
              <p className="font-black text-[10px] uppercase tracking-wider" style={{ color: 'var(--amber)' }}>🧪 Modo Demo — Sin validez fiscal</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--danger-muted)', border: '1px solid var(--danger-border)' }}>
              <p className="font-bold text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
          )}
        </div>

        {!showAnular && !notaModal && (
          <div className="px-5 py-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={descargarPDF} disabled={!hasPDF} className={btnBase}
                style={{ background: 'var(--teal)', color: '#000' }}>
                📄 Ver PDF
              </button>
              <button onClick={descargarPDF} disabled={!hasPDF} className={btnBase}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                📥 Descargar PDF
              </button>
              <button onClick={enviarWhatsApp} className={btnBase}
                style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: 'rgb(37,211,102)' }}>
                💬 WhatsApp
              </button>
              <button onClick={imprimir} disabled={!hasPDF} className={btnBase}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                🖨️ Imprimir
              </button>
              <button onClick={descargarXML} disabled={loadingAccion === 'xml'} className={btnBase}
                style={{ background: 'var(--amber-muted)', border: '1px solid var(--amber-border)', color: 'var(--amber)' }}>
                {loadingAccion === 'xml' ? '⏳' : '📋'} XML
              </button>
              <button onClick={descargarCDR} disabled={loadingAccion === 'cdr'} className={btnBase}
                style={{ background: 'var(--teal-muted)', border: '1px solid var(--teal-border)', color: 'var(--teal)' }}>
                {loadingAccion === 'cdr' ? '⏳' : '📦'} CDR
              </button>
            </div>
            {(c.tipo === 'factura' || c.tipo === 'boleta') && c.estado_sunat !== 'anulado' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setNotaModal('credito')} className={btnBase}
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgb(167,139,250)' }}>
                  📋 Nota Crédito
                </button>
                <button onClick={() => setNotaModal('debito')} className={btnBase}
                  style={{ background: 'var(--amber-muted)', border: '1px solid var(--amber-border)', color: 'var(--amber)' }}>
                  📋 Nota Débito
                </button>
              </div>
            )}
            {c.estado_sunat !== 'anulado' && (
              <button onClick={() => setShowAnular(true)} className={`${btnBase} w-full mt-1`}
                style={{ background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
                🗑️ Dar de Baja
              </button>
            )}
          </div>
        )}

        {showAnular && (
          <div className="px-5 py-4 space-y-3">
            <p className="font-black text-sm" style={{ color: 'var(--text)' }}>¿Anular comprobante {nro}?</p>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Esta acción no se puede deshacer. El comprobante quedará marcado como anulado ante SUNAT.</p>
            <div>
              <label className="lbl">Motivo de anulación *</label>
              <input
                value={motivoAnular}
                onChange={e => setMotivoAnular(e.target.value)}
                placeholder="Ej: Error en el monto, cliente incorrecto..."
                className="inp"
              />
            </div>
            {error && <p className="text-xs font-bold" style={{ color: 'var(--danger)' }}>{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowAnular(false)} className={btnBase}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={anular} disabled={loadingAccion === 'anular'} className={btnBase}
                style={{ background: 'var(--danger)', color: '#fff' }}>
                {loadingAccion === 'anular' ? '⏳ Anulando...' : '🗑️ Confirmar Anulación'}
              </button>
            </div>
          </div>
        )}

        {notaModal && (
          <NotaForm
            tipo={notaModal}
            comprobante={c}
            modo={modo}
            onClose={() => setNotaModal(null)}
            onSuccess={onClose}
          />
        )}
      </div>
    </div>
  )
}

// ── Formulario para Nota de Crédito / Débito ──────────────────────────────
function NotaForm({
  tipo, comprobante, modo, onClose, onSuccess,
}: {
  tipo: 'credito' | 'debito'; comprobante: Comprobante; modo: string
  onClose: () => void; onSuccess: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [codigo, setCodigo] = useState('01')
  const [monto, setMonto] = useState(String(comprobante.monto))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const motivosCredito = [
    { value: '01', label: '01 – Anulación de la operación' },
    { value: '02', label: '02 – Anulación por error en el RUC' },
    { value: '03', label: '03 – Corrección por error en la descripción' },
    { value: '04', label: '04 – Descuento global' },
    { value: '06', label: '06 – Devolución total' },
    { value: '07', label: '07 – Devolución por item' },
    { value: '13', label: '13 – Ajuste en operación de exportación' },
  ]
  const motivosDebito = [
    { value: '01', label: '01 – Intereses por mora' },
    { value: '02', label: '02 – Aumento en el valor' },
    { value: '03', label: '03 – Penalidades / otros conceptos' },
  ]

  const motivos = tipo === 'credito' ? motivosCredito : motivosDebito

  const emitir = async () => {
    if (!motivo.trim()) { setError('Ingresa una descripción del motivo'); return }
    setLoading(true); setError('')
    try {
      const nroRef = `${comprobante.serie}-${String(comprobante.numero).padStart(6, '0')}`
      const res = await fetch('/api/factusmart/nota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_nota: tipo === 'credito' ? '07' : '08',
          external_id_ref: comprobante.payload?.external_id,
          serie_numero_ref: nroRef,
          tipo_doc_ref: comprobante.tipo === 'factura' ? '01' : '03',
          codigo_motivo: codigo,
          motivo,
          items: [{ descripcion: motivo, cantidad: 1, precio_unitario: parseFloat(monto) || comprobante.monto }],
          modo,
          cliente_nombre: comprobante.cliente_nombre,
          cliente_doc: comprobante.cliente_doc,
          cliente_dir: comprobante.cliente_dir,
          tipo_doc_cliente: comprobante.tipo === 'factura' ? '6' : '1',
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(JSON.stringify(data.detalle || data.error))
      alert(`✅ Nota de ${tipo} emitida: ${data.serie_numero}`)
      onSuccess()
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-black text-sm" style={{ color: 'var(--text)' }}>
          {tipo === 'credito' ? '📋 Nota de Crédito' : '📋 Nota de Débito'}
        </p>
        <button onClick={onClose} className="text-lg font-black transition-colors" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>
      <div>
        <label className="lbl">Código Motivo</label>
        <select value={codigo} onChange={e => setCodigo(e.target.value)} className="inp">
          {motivos.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="lbl">Descripción</label>
        <input value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Describe el motivo..."
          className="inp" />
      </div>
      <div>
        <label className="lbl">Monto</label>
        <input type="number" value={monto} onChange={e => setMonto(e.target.value)} step="0.01"
          className="inp" />
      </div>
      {error && <p className="text-xs font-bold" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button onClick={emitir} disabled={loading}
        className="w-full disabled:opacity-50 font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
        style={{ background: 'rgba(139,92,246,0.9)', color: '#fff' }}>
        {loading ? '⏳ Emitiendo...' : `Emitir Nota`}
      </button>
    </div>
  )
}

// ── Modal de emisión de comprobante desde historial ────────────────────────
function ModalEmitir({
  registro, tallerInfo, onClose, onEmitido,
}: {
  registro: Registro; tallerInfo: TallerInfo
  onClose: () => void; onEmitido: (c: Comprobante) => void
}) {
  const [form, setForm] = useState({
    tipo: 'boleta', cliente_nombre: '', cliente_doc: '', cliente_dir: '', igv: '18', modo: 'demo',
  })
  const [itemsEditables, setItemsEditables] = useState<{ descripcion: string; precio: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consultando, setConsultando] = useState(false)

  // Precarga items desde el registro
  useEffect(() => {
    const r = registro
    // Nombre inicial
    const nombreInit = r.nombre || ''
    setForm(f => ({ ...f, cliente_nombre: nombreInit !== 'Cliente Directo' ? toTitleCase(nombreInit) : '' }))

    if (r.tipo === 'servicio') {
      const s = r as Servicio
      const items: { descripcion: string; precio: number }[] = []
      // Intentar construir items con precios — si no hay, usar monto total
      if ((s as any).aceite_marca && (s as any).precio_aceite > 0)
        items.push({ descripcion: `Aceite Motor: ${(s as any).aceite_marca} ${(s as any).aceite_visc || ''}`.trim(), precio: (s as any).precio_aceite })
      if ((s as any).caja_marca && (s as any).precio_caja > 0)
        items.push({ descripcion: `Aceite Caja: ${(s as any).caja_marca}`, precio: (s as any).precio_caja })
      if ((s as any).refrig_marca && (s as any).precio_refrig > 0)
        items.push({ descripcion: `Refrigerante: ${(s as any).refrig_marca}`, precio: (s as any).precio_refrig })
      if ((s as any).bujia_marca && (s as any).precio_bujias > 0)
        items.push({ descripcion: `Bujías: ${(s as any).bujia_marca}`, precio: (s as any).precio_bujias })
      if (Array.isArray((s as any).productos_adicionales)) {
        for (const p of (s as any).productos_adicionales) {
          if (p.nombre && parseFloat(p.precio) > 0) items.push({ descripcion: p.nombre, precio: parseFloat(p.precio) })
        }
      }
      if ((s as any).otros_servicios && (s as any).precio_otros > 0) {
        const srvs = (s as any).otros_servicios.split(',')
        srvs.forEach((srv: string, idx: number) => {
          if (srv.trim()) items.push({ descripcion: srv.trim(), precio: idx === 0 ? (s as any).precio_otros : 0 })
        })
      }
      if (items.length === 0) items.push({ descripcion: 'Servicio de taller', precio: s.monto || 0 })
      setItemsEditables(items)
    } else if (r.tipo === 'venta') {
      const v = r as Venta
      const items = (Array.isArray(v.items) ? v.items : []).map((i: any) => ({
        descripcion: `${i.nombre}${i.cantidad > 1 ? ` x${i.cantidad}` : ''}`,
        precio: i.subtotal || i.precio * i.cantidad,
      }))
      setItemsEditables(items.length ? items : [{ descripcion: 'Venta de productos', precio: v.monto || 0 }])
    } else {
      // proforma — no aplica emisión por items complejos, usar monto
      setItemsEditables([{ descripcion: `Cotización — ${r.nombre || ''}`, precio: r.monto || 0 }])
    }
  }, [registro])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'cliente_doc') {
      setForm(prev => ({ ...prev, cliente_doc: value, tipo: value.length === 11 ? 'factura' : 'boleta' }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const consultarCliente = async (doc: string) => {
    const d = doc.trim().replace(/\D/g, '')
    if (d.length !== 8 && d.length !== 11) return
    setConsultando(true)
    try {
      const res = await fetch(`/api/consulta-cliente?doc=${d}`)
      if (res.ok) {
        const data = await res.json()
        setForm(prev => ({
          ...prev,
          cliente_nombre: data.nombre ? toTitleCase(data.nombre) : prev.cliente_nombre,
          cliente_dir: data.direccion ? toTitleCase(data.direccion) : prev.cliente_dir,
        }))
      }
    } catch {}
    setConsultando(false)
  }

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const nombreFinal = toTitleCase(form.cliente_nombre.trim())
    try {
      // Verificar límite
      const { data: limite } = await supabase.rpc('verificar_limite', { p_taller_id: tallerInfo.id, p_tipo: 'comprobantes' })
      if (!limite) { setError('Límite mensual de comprobantes alcanzado'); setLoading(false); return }

      const itemsParaFS = itemsEditables.map(i => ({
        descripcion: i.descripcion,
        cantidad: 1,
        precio_unitario: i.precio,
      }))

      const fsRes = await fetch('/api/factusmart/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: form.tipo,
          cliente_nombre: nombreFinal,
          cliente_doc: form.cliente_doc,
          cliente_dir: form.cliente_dir,
          items: itemsParaFS,
          modo: form.modo,
        }),
      })

      const fsData = await fsRes.json()
      if (!fsData.ok) {
        setError(`Error Factusmart: ${JSON.stringify(fsData.detalle || fsData.error)}`)
        setLoading(false); return
      }

      const igvPct = parseFloat(form.igv)
      const igvRate = igvPct / 100
      const montoNum = registro.monto || 0
      const sub = parseFloat((montoNum / (1 + igvRate)).toFixed(2))
      const igvMon = parseFloat((montoNum - sub).toFixed(2))

      const partes = (fsData.serie_numero || '').split('-')
      const serieFS = partes[0] || (form.tipo === 'factura' ? 'F001' : 'B001')
      const numeroFS = parseInt(partes[1] || '1')

      const { data: comp, error: dbError } = await supabase.from('comprobantes').insert({
        taller_id: tallerInfo.id,
        servicio_id: registro.tipo === 'servicio' ? registro.id : null,
        tipo: form.tipo,
        serie: serieFS,
        numero: numeroFS,
        fecha_emision: new Date().toISOString().slice(0, 10),
        cliente_nombre: nombreFinal,
        cliente_doc: form.cliente_doc,
        cliente_dir: form.cliente_dir,
        monto: montoNum,
        estado_sunat: fsData.aceptado_por_sunat ? 'emitido' : 'pendiente',
        payload: {
          items: itemsEditables,
          igv_pct: igvPct,
          subtotal: sub,
          igv: igvMon,
          telefono: (registro as any).telefono || '',
          external_id: fsData.external_id,
          entorno: fsData.entorno,
          pdf_base64: fsData.pdf_base64,
          sunat_descripcion: fsData.sunat_descripcion,
        },
      }).select().single()

      if (dbError) { setError(dbError.message); setLoading(false); return }

      await supabase.rpc('incrementar_uso', { p_taller_id: tallerInfo.id, p_tipo: 'comprobantes' })
      if (registro.tipo === 'servicio') {
        await supabase.from('servicios').update({ estado_facturacion: 'Facturado' }).eq('id', registro.id)
      }

      onEmitido(comp as Comprobante)
    } catch (err: any) {
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const montoTotal = itemsEditables.reduce((s, i) => s + (i.precio || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-black text-base" style={{ color: 'var(--text)' }}>🧾 Emitir Comprobante</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--teal)' }}>
              {registro.tipo === 'servicio' ? `Servicio · ${(registro as Servicio).placa}` :
               registro.tipo === 'venta' ? 'Venta POS' : 'Proforma'}
               {registro.nombre ? ` · ${toTitleCase(registro.nombre)}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-all" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          <form onSubmit={handleEmitir} className="space-y-4">

            {error && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'var(--danger-muted)', border: '1px solid var(--danger-border)' }}>
                <p className="font-bold text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
              </div>
            )}

            {/* DNI / RUC */}
            <div>
              <label className="lbl">
                DNI / RUC {consultando && <span className="normal-case font-bold" style={{ color: 'var(--teal)' }}>⏳ Consultando...</span>}
              </label>
              <input
                name="cliente_doc"
                value={form.cliente_doc}
                onChange={handleChange}
                onBlur={e => consultarCliente(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); consultarCliente(form.cliente_doc) } }}
                placeholder="DNI (8 dígitos) o RUC (11 dígitos)"
                maxLength={11}
                className="inp"
              />
              {form.cliente_doc.length === 8 && !consultando && <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--teal)' }}>→ Boleta de Venta</p>}
              {form.cliente_doc.length === 11 && !consultando && <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--success)' }}>→ Factura Electrónica</p>}
            </div>

            {/* Nombre */}
            <div>
              <label className="lbl">Nombre / Razón social</label>
              <input name="cliente_nombre" value={form.cliente_nombre} onChange={handleChange}
                placeholder="Nombre del cliente" className="inp" />
            </div>

            {/* Dirección */}
            <div>
              <label className="lbl">Dirección</label>
              <input name="cliente_dir" value={form.cliente_dir} onChange={handleChange}
                placeholder="Dirección del cliente" className="inp" />
            </div>

            {/* IGV y modo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="lbl">IGV (%)</label>
                <input name="igv" type="number" value={form.igv} onChange={handleChange} className="inp" />
              </div>
              <div>
                <label className="lbl">Modo de emisión</label>
                <select name="modo" value={form.modo} onChange={handleChange} className="inp">
                  <option value="demo">🧪 Demo (prueba)</option>
                  <option value="produccion">🚀 Producción</option>
                </select>
              </div>
            </div>

            {/* Items editables */}
            <div>
              <label className="lbl">Items del comprobante <span className="normal-case font-bold" style={{ color: 'var(--teal)' }}>(puedes editar)</span></label>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex justify-between px-3 py-2" style={{ background: 'var(--bg)' }}>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Descripción</span>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Precio</span>
                </div>
                {itemsEditables.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 transition-colors" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <input
                      value={item.descripcion}
                      onChange={e => setItemsEditables(prev => prev.map((it, idx) => idx === i ? { ...it, descripcion: e.target.value } : it))}
                      className="flex-1 text-xs font-semibold bg-transparent border-b border-transparent focus:outline-none py-1 uppercase transition-colors min-w-0"
                      style={{ color: 'var(--text)', borderBottomColor: 'transparent' }}
                      onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--teal)'}
                      onBlur={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                      placeholder="Descripción"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-subtle)' }}>S/</span>
                      <input
                        type="number" step="0.01"
                        value={item.precio}
                        onChange={e => setItemsEditables(prev => prev.map((it, idx) => idx === i ? { ...it, precio: parseFloat(e.target.value) || 0 } : it))}
                        className="w-20 text-xs font-black bg-transparent border-b border-transparent focus:outline-none py-1 text-right transition-colors"
                        style={{ color: 'var(--text)' }}
                        onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--teal)'}
                        onBlur={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-bold mt-1.5" style={{ color: 'var(--text-subtle)' }}>✏️ Haz click en cualquier campo para editarlo</p>
            </div>

            {/* Total */}
            <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total estimado</span>
              <span className="font-black text-lg" style={{ color: 'var(--teal)' }}>S/ {montoTotal.toFixed(2)}</span>
            </div>

            <button type="submit" disabled={loading}
              className="w-full disabled:opacity-50 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm active:scale-95"
              style={{ background: 'var(--teal)', color: '#000' }}>
              {loading ? '⏳ Conectando con SUNAT...' : `🧾 Emitir ${form.tipo === 'factura' ? 'Factura' : 'Boleta'} ${form.modo === 'demo' ? '(Demo)' : ''}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function HistorialPage() {
  const router = useRouter()
  const cartillaRef = useRef<HTMLDivElement>(null)
  const ticketRef = useRef<HTMLDivElement>(null)

  const [registros, setRegistros] = useState<Registro[]>([])
  const [tallerInfo, setTallerInfo] = useState<TallerInfo>({ id: '', nombre: 'AWTU', logo_url: '', telefono: '', direccion: '', ruc: '' })
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [ordenFecha, setOrdenFecha] = useState<'desc' | 'asc'>('desc')
  const [cartillaData, setCartillaData] = useState<any>(null)
  const [ticketVenta, setTicketVenta] = useState<Venta | null>(null)
  const [descargandoTicket, setDescargandoTicket] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState<string | null>(null)

  // ── Estados para emisión inline ──
  const [modalEmitir, setModalEmitir] = useState<Registro | null>(null)
  const [modalAcciones, setModalAcciones] = useState<Comprobante | null>(null)

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres')
        .select('id, nombre, logo_url, telefono, direccion, ruc')
        .eq('user_id', user.id).single()
      if (!t) return
      setTallerInfo({
        id: t.id,
        nombre: t.nombre || 'AWTU',
        logo_url: t.logo_url || '',
        telefono: t.telefono || '',
        direccion: t.direccion || '',
        ruc: t.ruc || '',
      })

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

  // Recargar estado de facturación de un servicio
  const recargarServicio = async (id: string) => {
    const { data } = await supabase.from('servicios').select('estado_facturacion').eq('id', id).single()
    if (data) {
      setRegistros(prev => prev.map(r =>
        r.id === id && r.tipo === 'servicio' ? { ...r, estado_facturacion: data.estado_facturacion } as Servicio : r
      ))
    }
  }

  // Al hacer click en 🧾: siempre abre el modal de emisión (igual que Ventas POS)
  const handleClickComprobante = (r: Registro) => {
    setModalEmitir(r)
  }

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

  const descargarPDFProforma = async (p: Proforma) => {
    setGenerandoPDF(p.id)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210
      const fecha = p.fecha ? p.fecha.split('-').reverse().join('/') : new Date(p.created_at).toLocaleDateString('es-PE')
      const items = Array.isArray(p.items) ? p.items : []

      const headerH = 42
      doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, headerH, 'F')
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4); doc.line(0, headerH, W, headerH)

      let logoLoaded = false
      if (tallerInfo.logo_url) {
        try {
          const img = new Image(); img.crossOrigin = 'anonymous'
          await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); img.src = tallerInfo.logo_url })
          if (img.width > 0) { const logoH = 24; const logoW = (img.width / img.height) * logoH; doc.addImage(img, 'PNG', 14, 9, Math.min(logoW, 40), logoH); logoLoaded = true }
        } catch {}
      }

      const xText = logoLoaded ? 60 : 14
      doc.setTextColor(10, 10, 10); doc.setFontSize(20); doc.setFont('helvetica', 'bold')
      doc.text(tallerInfo.nombre.toUpperCase(), xText, 18)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
      if (tallerInfo.direccion) doc.text(tallerInfo.direccion, xText, 26)
      if (tallerInfo.telefono) doc.text(`Tel: ${tallerInfo.telefono}`, xText, 32)

      doc.setDrawColor(10, 10, 10); doc.setLineWidth(1.2); doc.rect(W - 54, 8, 40, 16)
      doc.setTextColor(10, 10, 10); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('COTIZACIÓN', W - 49, 19)
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
      doc.text(`Fecha: ${fecha}`, W - 54, 30)

      let y = headerH + 10
      const vehiculo = p.placa || ''
      doc.setFillColor(245, 245, 245); doc.roundedRect(14, y - 6, W - 28, vehiculo ? 28 : 20, 2, 2, 'F')
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.roundedRect(14, y - 6, W - 28, vehiculo ? 28 : 20, 2, 2, 'S')
      doc.setTextColor(120, 120, 120); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('CLIENTE', 20, y)
      doc.setTextColor(10, 10, 10); doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text((p.nombre || '').toUpperCase(), 20, y + 8)
      if (vehiculo) {
        doc.setFillColor(219, 234, 254); doc.roundedRect(W - 56, y - 3, 42, 22, 2, 2, 'F')
        doc.setTextColor(29, 78, 216); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
        doc.text(vehiculo.toUpperCase(), W - 46, y + 9)
      }
      y += vehiculo ? 34 : 26

      if (esMultiOpcion(items)) {
        items.forEach((opcion: OpcionProforma, idx: number) => {
          const titulo = opcion.titulo || `Opción ${idx + 1}`
          const itemsFiltrados = (opcion.items || []).filter(i => i.descripcion?.trim())
          if (itemsFiltrados.length === 0) return
          const tot = opcion.total || itemsFiltrados.reduce((s, i) => s + (i.precio || 0), 0)
          if (y > 250) { doc.addPage(); y = 20 }
          doc.setFillColor(10, 10, 10); doc.roundedRect(14, y, W - 28, 9, 1, 1, 'F')
          doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
          doc.text(titulo.toUpperCase(), 20, y + 6.2); y += 12
          itemsFiltrados.forEach((item, ii) => {
            if (y > 260) { doc.addPage(); y = 20 }
            if (ii % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(14, y - 1, W - 28, 8, 'F') }
            doc.setTextColor(20, 20, 20); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
            const desc = (item.descripcion || '').length > 65 ? (item.descripcion || '').slice(0, 62) + '...' : (item.descripcion || '')
            doc.text('•  ' + desc.toUpperCase(), 20, y + 5)
            if ((item.precio || 0) > 0) { doc.setFont('helvetica', 'bold'); doc.text(`S/ ${(item.precio || 0).toFixed(2)}`, W - 20, y + 5, { align: 'right' }) }
            y += 9
          })
          doc.setFillColor(240, 240, 240); doc.roundedRect(W - 75, y + 1, 61, 10, 1, 1, 'F')
          doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.roundedRect(W - 75, y + 1, 61, 10, 1, 1, 'S')
          doc.setTextColor(60, 60, 60); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.text('TOTAL OPCIÓN', W - 68, y + 8)
          doc.setFontSize(10); doc.setTextColor(10, 10, 10); doc.text(`S/ ${tot.toFixed(2)}`, W - 20, y + 8, { align: 'right' }); y += 16
          if (idx < items.length - 1) {
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0)
            doc.line(14, y, W - 14, y); doc.setLineDashPattern([], 0); y += 6
          }
        })
      } else {
        doc.setFillColor(10, 10, 10); doc.roundedRect(14, y, W - 28, 9, 1, 1, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text('DETALLE', 20, y + 6.2); y += 12
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
          doc.setFillColor(240, 240, 240); doc.roundedRect(W - 75, y + 1, 61, 10, 1, 1, 'F')
          doc.setTextColor(10, 10, 10); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
          doc.text(`S/ ${total.toFixed(2)}`, W - 20, y + 8, { align: 'right' }); y += 16
        }
      }

      const footerY = 277
      doc.setFillColor(245, 245, 245); doc.rect(0, footerY, W, 20, 'F')
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(0, footerY, W, footerY)
      doc.setTextColor(120, 120, 120); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(tallerInfo.nombre.toUpperCase(), W / 2, footerY + 7, { align: 'center' })
      const sub2 = [tallerInfo.telefono, tallerInfo.direccion].filter(Boolean).join('  ·  ')
      if (sub2) doc.text(sub2, W / 2, footerY + 13, { align: 'center' })
      doc.save(`Cotizacion_${p.placa || p.nombre || 'proforma'}_${p.fecha || ''}.pdf`)
    } catch (err) {
      console.error('PDF error:', err); alert('Error al generar el PDF')
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
    link.href = canvas.toDataURL('image/jpeg', 0.95); link.click()
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
      aceiteMarca: s.aceite_marca, aceiteVisc: s.aceite_visc, aceiteCantidad: s.aceite_cantidad,
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
    link.href = canvas.toDataURL('image/jpeg', 0.95); link.click()
    setCartillaData(null)
  }

  const coloresEstado: Record<string, React.CSSProperties> = {
    Pendiente: { background: 'var(--amber-muted)', color: 'var(--amber)' },
    Facturado: { background: 'var(--teal-muted)',  color: 'var(--teal)'  },
  }

  const colorTipo = {
    servicio: { accent: 'var(--teal)',  bg: 'var(--teal-muted)',  border: 'var(--teal-border)',  label: 'Servicio'  },
    venta:    { accent: 'var(--amber)', bg: 'var(--amber-muted)', border: 'var(--amber-border)', label: 'Venta POS' },
    proforma: { accent: 'var(--amber)', bg: 'var(--amber-muted)', border: 'var(--amber-border)', label: 'Proforma'  },
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

      {/* ── Modal emisión inline ── */}
      {modalEmitir && (
        <ModalEmitir
          registro={modalEmitir}
          tallerInfo={tallerInfo}
          onClose={() => setModalEmitir(null)}
          onEmitido={(comp) => {
            setModalEmitir(null)
            setModalAcciones(comp)
            // Actualizar estado del servicio en la lista
            if (modalEmitir.tipo === 'servicio') recargarServicio(modalEmitir.id)
          }}
        />
      )}

      {/* ── Modal acciones comprobante ── */}
      {modalAcciones && (
        <ModalAcciones
          c={modalAcciones}
          tallerNombre={tallerInfo.nombre}
          tallerRuc={tallerInfo.ruc}
          tallerTelefono={tallerInfo.telefono}
          onClose={() => setModalAcciones(null)}
          onAnulado={() => {}}
        />
      )}

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
              <span className="font-mono font-bold text-2xl" style={{ color: 'var(--teal)' }}>S/ {(ticketVenta.monto || 0).toFixed(2)}</span>
            </div>
            <div className="space-y-3">
              <button onClick={descargarTicketJPG} disabled={descargandoTicket}
                className="font-display w-full disabled:opacity-50 active:scale-95 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                style={{ background: 'var(--teal)', color: '#000' }}>
                📥 {descargandoTicket ? 'Generando...' : 'Descargar JPG'}
              </button>
              <button onClick={() => compartirTicketWhatsApp(ticketVenta)}
                className="font-display w-full active:scale-95 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                style={{ background: 'var(--teal-muted)', color: 'var(--teal)', border: '1px solid var(--teal-border)' }}>
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
          style={{ background: 'var(--teal)', color: '#000' }}>
          + Nueva Atención
        </button>
      </div>

      {/* ── TABS DE FILTRO ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filtros.map(f => (
          <button key={f.key} onClick={() => setFiltroTipo(f.key)}
            className="font-display px-4 py-2.5 text-xs rounded-xl font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            style={filtroTipo === f.key
              ? { background: 'var(--teal)', color: '#000' }
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
            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>✕</button>
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
            const yaFacturado = esServicio && s.estado_facturacion === 'Facturado'

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
                        style={{ background: 'var(--amber-muted)', color: 'var(--amber)' }}>
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
                    S/ {(esProforma ? montoProforma(p) : (r.monto || 0)).toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{fecha}</p>
                  {esServicio && s.km && (
                    <p className="font-mono text-[10px] font-bold" style={{ color: 'var(--teal)' }}>{Number(s.km).toLocaleString()} km</p>
                  )}

                  <div className="flex items-center gap-1.5 justify-end mt-2">
                    {esServicio ? (
                      <>
                        <button onClick={() => descargarCartilla(s)} title="Descargar cartilla"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                          style={{ background: 'var(--teal-muted)', color: 'var(--teal)' }}>📋</button>
                        <button onClick={() => abrirWhatsAppServicio(s.telefono, s.placa, s.nombre)} title="WhatsApp"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                          style={{ background: 'rgba(37,211,102,0.15)', color: 'rgb(37,211,102)' }}>💬</button>
                      </>
                    ) : esProforma ? (
                      <>
                        <button
                          onClick={() => descargarPDFProforma(p)}
                          disabled={generandoPDF === p.id}
                          title="Ver PDF"
                          className="h-8 px-2 rounded-lg flex items-center justify-center text-xs font-bold uppercase tracking-wide gap-1 transition-all disabled:opacity-50"
                          style={{ background: 'var(--amber-muted)', color: 'var(--amber)', border: '1px solid var(--amber-border)' }}>
                          {generandoPDF === p.id ? '⏳' : '📄'} PDF
                        </button>
                        <button
                          onClick={() => enviarWhatsAppProforma(p)}
                          title="WhatsApp"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                          style={{ background: 'rgba(37,211,102,0.12)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)' }}>
                          💬
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setTicketVenta(r as Venta)} title="Ver ticket"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                        style={{ background: 'var(--teal-muted)', color: 'var(--teal)' }}>🎫</button>
                    )}

                    {/* Botón 🧾 — siempre abre modal de emisión */}
                    <button
                      onClick={() => handleClickComprobante(r)}
                      title="Emitir comprobante"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                      🧾
                    </button>

                    <button onClick={() => eliminar(r.id, r.tipo)} title="Eliminar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                      style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>🗑️</button>
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