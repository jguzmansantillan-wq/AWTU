'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import LimiteBloqueado from '@/components/LimiteBloqueado'

// ── Tipos ─────────────────────────────────────────────────────────────────
type MetodoPago = { id: string; nombre: string }
type Sucursal   = { id: string; nombre: string }

type Operacion = {
  id: string; tipo: 'servicio' | 'venta'; fecha: string; created_at: string
  nombre: string; telefono: string; placa?: string; marca?: string
  monto: number; detalle: string; comprobante_emitido: boolean
  items_detalle: { descripcion: string; precio: number }[]
}

type Comprobante = {
  id: string; taller_id: string; servicio_id: string | null
  tipo: string; serie: string; numero: number
  fecha_emision: string; cliente_nombre: string; cliente_doc: string
  cliente_dir: string; monto: number; estado_sunat: string; created_at: string
  payload: {
    items: { descripcion: string; precio: number }[]
    igv_pct: number; subtotal: number; igv: number
    telefono: string; external_id: string; entorno: string
    pdf_base64: string; sunat_descripcion: string
  }
}

const toTitleCase = (str: string) =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())

// ── ModalAcciones ─────────────────────────────────────────────────────────
function ModalAcciones({
  c, tallerNombre, tallerRuc, tallerTelefono, onClose, onAnulado,
}: {
  c: Comprobante; tallerNombre: string; tallerRuc: string; tallerTelefono: string
  onClose: () => void; onAnulado: () => void
}) {
  const [loadingAccion, setLoadingAccion] = useState<string | null>(null)
  const [error,         setError]         = useState('')
  const [showAnular,    setShowAnular]    = useState(false)
  const [motivoAnular,  setMotivoAnular]  = useState('')
  const [notaModal,     setNotaModal]     = useState<'credito' | 'debito' | null>(null)

  const nro        = `${c.serie}-${String(c.numero).padStart(6, '0')}`
  const external_id = c.payload?.external_id
  const modo       = c.payload?.entorno === 'produccion' ? 'produccion' : 'demo'
  const hasPDF     = !!c.payload?.pdf_base64

  const descargarPDF = () => {
    if (!hasPDF) return
    const link = document.createElement('a')
    link.href     = c.payload.pdf_base64
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
    const url  = URL.createObjectURL(blob)
    const win  = window.open(url, '_blank')
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
      `🔎 Puede ver su comprobante aquí:\n` +
      `https://awtu-app.vercel.app/comprobante/${c.id}\n\n` +
      `¡Gracias por su preferencia! 🙏`

    if (hasPDF) {
      const link = document.createElement('a')
      link.href     = c.payload.pdf_base64
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
      const res  = await fetch(`/api/factusmart/xml?external_id=${external_id}&modo=${modo}`)
      if (!res.ok) throw new Error('No se pudo obtener el XML')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `${nro}.xml`
      link.click()
    } catch (e: any) { setError(e.message) }
    setLoadingAccion(null)
  }

  const descargarCDR = async () => {
    if (!external_id) { setError('No hay external_id para este comprobante'); return }
    setLoadingAccion('cdr')
    try {
      const res  = await fetch(`/api/factusmart/cdr?external_id=${external_id}&modo=${modo}`)
      if (!res.ok) throw new Error('No se pudo obtener el CDR')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `CDR-${nro}.zip`
      link.click()
    } catch (e: any) { setError(e.message) }
    setLoadingAccion(null)
  }

  const anular = async () => {
    if (!external_id) { setError('No hay external_id'); return }
    if (!motivoAnular.trim()) { setError('Ingresa un motivo de anulación'); return }
    setLoadingAccion('anular')
    setError('')
    try {
      const res  = await fetch('/api/factusmart/anular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_id, motivo: motivoAnular, modo }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(JSON.stringify(data.detalle || data.error))
      await supabase.from('comprobantes').update({ estado_sunat: 'anulado' }).eq('id', c.id)
      onAnulado()
      onClose()
    } catch (e: any) { setError(e.message) }
    setLoadingAccion(null)
  }

  const btnBase = "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

        <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-black text-base" style={{ color: 'var(--text)' }}>Comprobante electrónico</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--teal)' }}>{nro}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-all" style={{ background: 'var(--teal-muted)', color: 'var(--teal)' }}>✕</button>
        </div>

        <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs px-3 py-1 rounded-full font-black uppercase" style={{
              background: c.tipo === 'factura' ? 'var(--teal-muted)' : 'rgba(57,185,128,0.12)',
              color: c.tipo === 'factura' ? 'var(--teal)' : 'var(--success)',
            }}>{c.tipo === 'factura' ? 'Factura Electrónica' : 'Boleta de Venta'}</span>
            <span className="text-xs px-3 py-1 rounded-full font-black uppercase" style={{
              background: c.estado_sunat === 'emitido' ? 'rgba(57,185,128,0.12)' : c.estado_sunat === 'anulado' ? 'var(--danger-muted)' : 'var(--amber-muted)',
              color: c.estado_sunat === 'emitido' ? 'var(--success)' : c.estado_sunat === 'anulado' ? 'var(--danger)' : 'var(--amber)',
            }}>{c.estado_sunat?.toUpperCase()}</span>
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
              <p className="font-semibold text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.fecha_emision || new Date(c.created_at).toLocaleDateString('es-PE')}</p>
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
              <button onClick={descargarPDF} disabled={!hasPDF} className={btnBase} style={{ background: 'var(--teal)', color: '#000' }}>
                📄 Ver PDF
              </button>
              <button onClick={descargarPDF} disabled={!hasPDF} className={btnBase} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                📥 Descargar PDF
              </button>
              <button onClick={enviarWhatsApp} className={btnBase} style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: 'rgb(37,211,102)' }}>
                💬 WhatsApp
              </button>
              <button onClick={imprimir} disabled={!hasPDF} className={btnBase} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                🖨️ Imprimir
              </button>
              <button onClick={descargarXML} disabled={loadingAccion === 'xml'} className={btnBase} style={{ background: 'var(--amber-muted)', border: '1px solid var(--amber-border)', color: 'var(--amber)' }}>
                {loadingAccion === 'xml' ? '⏳' : '📋'} XML
              </button>
              <button onClick={descargarCDR} disabled={loadingAccion === 'cdr'} className={btnBase} style={{ background: 'var(--teal-muted)', border: '1px solid var(--teal-border)', color: 'var(--teal)' }}>
                {loadingAccion === 'cdr' ? '⏳' : '📦'} CDR
              </button>
            </div>
            {(c.tipo === 'factura' || c.tipo === 'boleta') && c.estado_sunat !== 'anulado' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setNotaModal('credito')} className={btnBase} style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgb(167,139,250)' }}>
                  📋 Nota Crédito
                </button>
                <button onClick={() => setNotaModal('debito')} className={btnBase} style={{ background: 'var(--amber-muted)', border: '1px solid var(--amber-border)', color: 'var(--amber)' }}>
                  📋 Nota Débito
                </button>
              </div>
            )}
            {c.estado_sunat !== 'anulado' && (
              <button onClick={() => setShowAnular(true)} className={`${btnBase} w-full mt-1`} style={{ background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
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
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-subtle)' }}>Motivo de anulación *</label>
              <input
                value={motivoAnular}
                onChange={e => setMotivoAnular(e.target.value)}
                placeholder="Ej: Error en el monto, cliente incorrecto..."
                className="inp"
              />
            </div>
            {error && <p className="text-xs font-bold" style={{ color: 'var(--danger)' }}>{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowAnular(false)} className={btnBase} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={anular} disabled={loadingAccion === 'anular'} className={btnBase} style={{ background: 'var(--danger)', color: '#fff' }}>
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
  tipo: 'credito' | 'debito'
  comprobante: Comprobante
  modo: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [motivo,  setMotivo]  = useState('')
  const [codigo,  setCodigo]  = useState('01')
  const [monto,   setMonto]   = useState(String(comprobante.monto))
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

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
          tipo_nota:        tipo === 'credito' ? '07' : '08',
          external_id_ref:  comprobante.payload?.external_id,
          serie_numero_ref: nroRef,
          tipo_doc_ref:     comprobante.tipo === 'factura' ? '01' : '03',
          codigo_motivo:    codigo,
          motivo,
          items: [{ descripcion: motivo, cantidad: 1, precio_unitario: parseFloat(monto) || comprobante.monto }],
          modo,
          cliente_nombre: comprobante.cliente_nombre,
          cliente_doc:    comprobante.cliente_doc,
          cliente_dir:    comprobante.cliente_dir,
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
        <button onClick={onClose} className="text-lg font-black transition-all" style={{ color: 'var(--text-muted)' }}>✕</button>
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

// ── Tipos de filtro para comprobantes ─────────────────────────────────────
type FiltroComp = 'todos' | 'factura' | 'boleta' | 'nota_credito' | 'nota_debito' | 'guia'

// ── Página principal ───────────────────────────────────────────────────────
export default function DocumentosPage() {
  const comprobanteRef = useRef<HTMLDivElement>(null)
  const [tallerID,        setTallerID]        = useState('')
  const [tallerNombre,    setTallerNombre]    = useState('AWTU')
  const [tallerLogo,      setTallerLogo]      = useState('')
  const [tallerRuc,       setTallerRuc]       = useState('')
  const [tallerDireccion, setTallerDireccion] = useState('')
  const [tallerTelefono,  setTallerTelefono]  = useState('')
  const [metodosPago,     setMetodosPago]     = useState<MetodoPago[]>([])
  const [sucursales,      setSucursales]      = useState<Sucursal[]>([])
  const [operaciones,     setOperaciones]     = useState<Operacion[]>([])
  const [comprobantes,    setComprobantes]    = useState<Comprobante[]>([])
  const [vista,           setVista]           = useState<'operaciones' | 'emitir' | 'historial'>('historial')
  const [opSeleccionada,  setOpSeleccionada]  = useState<Operacion | null>(null)
  const [loading,         setLoading]         = useState(false)
  const [ok,              setOk]              = useState(false)
  const [error,           setError]           = useState('')
  const [busqueda,        setBusqueda]        = useState('')
  const [comprobanteParaDescargar, setComprobanteParaDescargar] = useState<Comprobante | null>(null)
  const [resultadoFactusmart,      setResultadoFactusmart]      = useState<any>(null)
  const [consultandoDoc,           setConsultandoDoc]           = useState(false)
  const [modalComprobante,         setModalComprobante]         = useState<Comprobante | null>(null)
  const [showLimite,               setShowLimite]               = useState(false)
  const [planActual,               setPlanActual]               = useState('basico')

  // items editables
  const [itemsEditables, setItemsEditables] = useState<{ descripcion: string; precio: number }[]>([])

  const [form, setForm] = useState({
    tipo: 'boleta', cliente_nombre: '', cliente_doc: '',
    cliente_dir: '', igv: '18', modo: 'demo',
  })

  // ── NUEVOS: filtro y orden en historial ──
  const [filtroComp,  setFiltroComp]  = useState<FiltroComp>('todos')
  const [ordenComp,   setOrdenComp]   = useState<'desc' | 'asc'>('desc')
  const [busqComp,    setBusqComp]    = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres')
        .select('id, nombre, logo_url, ruc, direccion, telefono, metodos_pago, sucursales, plan')
        .eq('user_id', user.id).single()
      if (!t) return
      setTallerID(t.id)
      setTallerNombre(t.nombre || 'AWTU')
      setTallerLogo(t.logo_url || '')
      setTallerRuc(t.ruc || '')
      setTallerDireccion(t.direccion || '')
      setTallerTelefono(t.telefono || '')
      setMetodosPago(Array.isArray(t.metodos_pago) ? t.metodos_pago : [])
      setSucursales(Array.isArray(t.sucursales) ? t.sucursales : [])
      setPlanActual(t.plan || 'basico')
      await cargarTodo(t.id)
    }
    init()
  }, [])

  const cargarTodo = async (tid: string) => {
    const { data: svcs } = await supabase.from('servicios')
      .select('id, fecha, nombre, telefono, placa, marca, modelo, monto, aceite_marca, aceite_visc, aceite_cantidad, filtro_aceite, filtro_aire, precio_aceite, caja_marca, precio_caja, refrig_marca, precio_refrig, bujia_marca, precio_bujias, otros_servicios, precio_otros, productos_adicionales, estado_facturacion, created_at')
      .eq('taller_id', tid).order('created_at', { ascending: false })

    const { data: vnts } = await supabase.from('ventas')
      .select('id, fecha, nombre, telefono, items, monto, created_at')
      .eq('taller_id', tid).order('created_at', { ascending: false })

    const ops: Operacion[] = [
      ...(svcs || []).map(s => {
        const items: { descripcion: string; precio: number }[] = []
        if (s.aceite_marca && s.precio_aceite > 0) items.push({ descripcion: `Aceite Motor: ${s.aceite_marca} ${s.aceite_visc || ''}${s.aceite_cantidad ? ` ${s.aceite_cantidad}LT` : ''}`.trim(), precio: s.precio_aceite })
        if (s.caja_marca   && s.precio_caja   > 0) items.push({ descripcion: `Aceite Caja: ${s.caja_marca}`,    precio: s.precio_caja })
        if (s.refrig_marca && s.precio_refrig > 0) items.push({ descripcion: `Refrigerante: ${s.refrig_marca}`,  precio: s.precio_refrig })
        if (s.bujia_marca  && s.precio_bujias > 0) items.push({ descripcion: `Bujías: ${s.bujia_marca}`,         precio: s.precio_bujias })
        if (Array.isArray(s.productos_adicionales)) {
          s.productos_adicionales.forEach((p: any) => {
            if (p.nombre && parseFloat(p.precio) > 0) items.push({ descripcion: p.nombre, precio: parseFloat(p.precio) })
          })
        }
        if (s.otros_servicios && s.precio_otros > 0) {
          s.otros_servicios.split(',').forEach((srv: string, idx: number) => {
            if (srv.trim()) items.push({ descripcion: srv.trim(), precio: idx === 0 ? s.precio_otros : 0 })
          })
        }
        if (items.length === 0) items.push({ descripcion: 'Servicio de taller', precio: s.monto || 0 })
        return {
          id: s.id, tipo: 'servicio' as const,
          fecha: s.fecha || new Date(s.created_at).toLocaleDateString('es-PE'),
          created_at: s.created_at,
          nombre: s.nombre ? toTitleCase(s.nombre) : '-', telefono: s.telefono,
          placa: s.placa, marca: s.marca, monto: s.monto || 0,
          detalle: items.map(i => i.descripcion).slice(0, 2).join(' · '),
          comprobante_emitido: s.estado_facturacion === 'Facturado',
          items_detalle: items,
        }
      }),
      ...(vnts || []).map(v => {
        const items = (Array.isArray(v.items) ? v.items : []).map((i: any) => ({
          descripcion: `${i.nombre}${i.cantidad > 1 ? ` x${i.cantidad}` : ''}`,
          precio: i.subtotal || i.precio * i.cantidad,
        }))
        return {
          id: v.id, tipo: 'venta' as const,
          fecha: v.fecha || new Date(v.created_at).toLocaleDateString('es-PE'),
          created_at: v.created_at,
          nombre: v.nombre ? toTitleCase(v.nombre) : 'Cliente Directo', telefono: v.telefono,
          monto: v.monto || 0,
          detalle: items.slice(0, 2).map((i: any) => i.descripcion).join(', '),
          comprobante_emitido: false,
          items_detalle: items,
        }
      }),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setOperaciones(ops)
    const { data: comps } = await supabase.from('comprobantes')
      .select('*').eq('taller_id', tid).order('created_at', { ascending: false })
    setComprobantes(comps || [])
  }

  const abrirEmision = (op: Operacion) => {
    setOpSeleccionada(op)
    setResultadoFactusmart(null)
    setItemsEditables(op.items_detalle ? op.items_detalle.map(i => ({ ...i })) : [])
    setForm({ tipo: 'boleta', cliente_nombre: op.nombre !== 'Cliente Directo' ? op.nombre : '', cliente_doc: '', cliente_dir: '', igv: '18', modo: 'demo' })
    setVista('emitir')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'cliente_doc') {
      setForm(prev => ({ ...prev, cliente_doc: value, tipo: value.length === 11 ? 'factura' : 'boleta' }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleNombreBlur = () => {
    if (form.cliente_nombre.trim()) {
      setForm(prev => ({ ...prev, cliente_nombre: toTitleCase(prev.cliente_nombre.trim()) }))
    }
  }

  const consultarCliente = async (doc: string) => {
    const docLimpio = doc.trim().replace(/\D/g, '')
    if (docLimpio.length !== 8 && docLimpio.length !== 11) return
    setConsultandoDoc(true)
    try {
      const res = await fetch(`/api/consulta-cliente?doc=${docLimpio}`)
      if (res.ok) {
        const data = await res.json()
        setForm(prev => ({
          ...prev,
          cliente_nombre: data.nombre    ? toTitleCase(data.nombre)    : prev.cliente_nombre,
          cliente_dir:    data.direccion ? toTitleCase(data.direccion) : prev.cliente_dir,
        }))
      }
    } catch {}
    setConsultandoDoc(false)
  }

  const editarItemDesc = (i: number, val: string) => {
    setItemsEditables(prev => prev.map((item, idx) => idx === i ? { ...item, descripcion: val } : item))
  }

  const editarItemPrecio = (i: number, val: string) => {
    setItemsEditables(prev => prev.map((item, idx) => idx === i ? { ...item, precio: parseFloat(val) || 0 } : item))
  }

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setOk(false); setResultadoFactusmart(null)
    const nombreFinal = toTitleCase(form.cliente_nombre.trim())
    try {
      const { data: limite } = await supabase.rpc('verificar_limite', { p_taller_id: tallerID, p_tipo: 'comprobantes' })
      if (!limite) {
        setShowLimite(true)
        setLoading(false)
        return
      }

      const itemsParaFS = itemsEditables.map(i => ({
        descripcion:     i.descripcion,
        cantidad:        1,
        precio_unitario: i.precio,
      }))

      const fsRes = await fetch('/api/factusmart/emitir', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tipo:           form.tipo,
          cliente_nombre: nombreFinal,
          cliente_doc:    form.cliente_doc,
          cliente_dir:    form.cliente_dir,
          items:          itemsParaFS,
          modo:           form.modo,
        }),
      })

      const fsData = await fsRes.json()
      setResultadoFactusmart(fsData)

      if (!fsData.ok) {
        setError(`Error Factusmart: ${JSON.stringify(fsData.detalle || fsData.error)}`)
        setLoading(false); return
      }

      const igvPct  = parseFloat(form.igv)
      const igvRate = igvPct / 100
      const montoNum = opSeleccionada?.monto || 0
      const sub      = parseFloat((montoNum / (1 + igvRate)).toFixed(2))
      const igvMon   = parseFloat((montoNum - sub).toFixed(2))

      const partes   = (fsData.serie_numero || '').split('-')
      const serieFS  = partes[0] || (form.tipo === 'factura' ? 'F001' : 'B001')
      const numeroFS = parseInt(partes[1] || '1')

      const { error: dbError } = await supabase.from('comprobantes').insert({
        taller_id:      tallerID,
        servicio_id:    opSeleccionada?.tipo === 'servicio' ? opSeleccionada.id : null,
        tipo:           form.tipo,
        serie:          serieFS,
        numero:         numeroFS,
        fecha_emision:  new Date().toISOString().slice(0, 10),
        cliente_nombre: nombreFinal,
        cliente_doc:    form.cliente_doc,
        cliente_dir:    form.cliente_dir,
        monto:          montoNum,
        estado_sunat:   fsData.aceptado_por_sunat ? 'emitido' : 'pendiente',
        payload: {
          items:             itemsEditables,
          igv_pct:           igvPct,
          subtotal:          sub,
          igv:               igvMon,
          telefono:          opSeleccionada?.telefono || '',
          external_id:       fsData.external_id,
          entorno:           fsData.entorno,
          pdf_base64:        fsData.pdf_base64,
          sunat_descripcion: fsData.sunat_descripcion,
        },
      })

      if (dbError) { setError(dbError.message); setLoading(false); return }

      await supabase.rpc('incrementar_uso', { p_taller_id: tallerID, p_tipo: 'comprobantes' })
      if (opSeleccionada?.tipo === 'servicio') {
        await supabase.from('servicios').update({ estado_facturacion: 'Facturado' }).eq('id', opSeleccionada.id)
      }

      await cargarTodo(tallerID)
      setOk(true)
      setVista('historial')
      setTimeout(() => setOk(false), 4000)

    } catch (err: any) {
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const descargarJPG = async (c: Comprobante) => {
    setComprobanteParaDescargar(c)
    await new Promise(r => setTimeout(r, 600))
    const { default: html2canvas } = await import('html2canvas')
    if (!comprobanteRef.current) return
    const canvas = await html2canvas(comprobanteRef.current, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      width: 420, height: comprobanteRef.current.offsetHeight,
    })
    const link = document.createElement('a')
    link.download = `${c.serie}-${String(c.numero).padStart(6, '0')}.jpg`
    link.href     = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
    setComprobanteParaDescargar(null)
  }

  const igvRate         = parseFloat(form.igv) / 100
  const montoOp         = opSeleccionada?.monto || 0
  const subtotalPreview = montoOp / (1 + igvRate)
  const igvPreview      = montoOp - subtotalPreview

  const filtradas = operaciones.filter(op =>
    op.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    op.placa?.toLowerCase().includes(busqueda.toLowerCase()) ||
    op.detalle?.toLowerCase().includes(busqueda.toLowerCase())
  )

  // ── Filtrado y ordenamiento de comprobantes ──
  const comprobantesFiltrados = comprobantes
    .filter(c => {
      // Filtro por tipo
      if (filtroComp !== 'todos') {
        const tipo = c.tipo?.toLowerCase() || ''
        if (filtroComp === 'factura'      && tipo !== 'factura')      return false
        if (filtroComp === 'boleta'       && tipo !== 'boleta')       return false
        if (filtroComp === 'nota_credito' && !tipo.includes('nota') && tipo !== 'nota_credito' && tipo !== '07') return false
        if (filtroComp === 'nota_debito'  && !tipo.includes('nota') && tipo !== 'nota_debito'  && tipo !== '08') return false
        if (filtroComp === 'guia'         && !tipo.includes('guia'))  return false
        // Refinamiento adicional para notas
        if (filtroComp === 'nota_credito') {
          const esNC = tipo === 'nota_credito' || tipo === '07' || tipo.includes('crédito') || tipo.includes('credito') || tipo.includes('nc')
          if (!esNC) return false
        }
        if (filtroComp === 'nota_debito') {
          const esND = tipo === 'nota_debito' || tipo === '08' || tipo.includes('débito') || tipo.includes('debito') || tipo.includes('nd')
          if (!esND) return false
        }
        if (filtroComp === 'guia') {
          const esGR = tipo === 'guia' || tipo.includes('guia') || tipo.includes('remision')
          if (!esGR) return false
        }
      }
      // Búsqueda por cliente
      if (busqComp.trim()) {
        const b = busqComp.toLowerCase()
        const coincide =
          c.cliente_nombre?.toLowerCase().includes(b) ||
          c.cliente_doc?.includes(b) ||
          `${c.serie}-${String(c.numero).padStart(6, '0')}`.toLowerCase().includes(b)
        if (!coincide) return false
      }
      return true
    })
    .sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return ordenComp === 'desc' ? diff : -diff
    })

  // Conteos por tipo para los tabs
  const cuentas = {
    todos:        comprobantes.length,
    factura:      comprobantes.filter(c => c.tipo?.toLowerCase() === 'factura').length,
    boleta:       comprobantes.filter(c => c.tipo?.toLowerCase() === 'boleta').length,
    nota_credito: comprobantes.filter(c => {
      const t = c.tipo?.toLowerCase() || ''
      return t === 'nota_credito' || t === '07' || t.includes('crédito') || t.includes('credito') || t.includes('nc')
    }).length,
    nota_debito: comprobantes.filter(c => {
      const t = c.tipo?.toLowerCase() || ''
      return t === 'nota_debito' || t === '08' || t.includes('débito') || t.includes('debito') || t.includes('nd')
    }).length,
    guia: comprobantes.filter(c => {
      const t = c.tipo?.toLowerCase() || ''
      return t === 'guia' || t.includes('guia') || t.includes('remision')
    }).length,
  }

  const EncabezadoComercial = () => (
    <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
        {tallerLogo
          ? <img src={tallerLogo} style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '12px', border: '1px solid #f1f5f9' }} crossOrigin="anonymous" />
          : <div style={{ width: '64px', height: '64px', background: '#0f172a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔧</div>}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a', textTransform: 'uppercase' }}>{tallerNombre}</div>
          {tallerRuc       && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>RUC: {tallerRuc}</div>}
          {tallerDireccion && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>{tallerDireccion}</div>}
          {tallerTelefono  && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>Tel: {tallerTelefono}</div>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">

      {/* Modal límite alcanzado */}
      {showLimite && (
        <LimiteBloqueado
          tipo="comprobantes"
          planActual={planActual}
          onCerrar={() => setShowLimite(false)}
        />
      )}

      {modalComprobante && (
        <ModalAcciones
          c={modalComprobante}
          tallerNombre={tallerNombre}
          tallerRuc={tallerRuc}
          tallerTelefono={tallerTelefono}
          onClose={() => setModalComprobante(null)}
          onAnulado={() => cargarTodo(tallerID)}
        />
      )}

      {comprobanteParaDescargar && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div ref={comprobanteRef} style={{ width: '420px', background: '#ffffff', fontFamily: 'Arial, sans-serif', padding: '40px 32px' }}>
            <EncabezadoComercial />
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                display: 'inline-block',
                background: comprobanteParaDescargar.tipo === 'factura' ? '#dbeafe' : '#d1fae5',
                color: comprobanteParaDescargar.tipo === 'factura' ? '#1e40af' : '#065f46',
                fontWeight: 900, fontSize: '13px', textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '8px 20px', borderRadius: '20px',
              }}>
                {comprobanteParaDescargar.tipo === 'factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}
              </div>
              <div style={{ marginTop: '10px', fontWeight: 900, fontSize: '18px', color: '#1e40af' }}>
                {comprobanteParaDescargar.serie}-{String(comprobanteParaDescargar.numero).padStart(6, '0')}
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                Fecha: {comprobanteParaDescargar.fecha_emision || new Date(comprobanteParaDescargar.created_at).toLocaleDateString('es-PE')}
              </div>
            </div>
            <div style={{ marginBottom: '20px', borderLeft: '3px solid #3b82f6', paddingLeft: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>Datos del Cliente</div>
              <div style={{ fontWeight: 900, fontSize: '15px', color: '#0f172a', textTransform: 'uppercase' }}>{comprobanteParaDescargar.cliente_nombre}</div>
              {comprobanteParaDescargar.cliente_doc && (
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                  {comprobanteParaDescargar.tipo === 'factura' ? 'RUC' : 'DNI'}: {comprobanteParaDescargar.cliente_doc}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '16px', border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#0f172a' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>Descripción</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>Precio</span>
              </div>
              {(Array.isArray(comprobanteParaDescargar.payload?.items) ? comprobanteParaDescargar.payload.items : []).map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', flex: 1, marginRight: '8px' }}>{item.descripcion}</span>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a' }}>S/ {(item.precio || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Total</span>
              <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900 }}>S/ {(comprobanteParaDescargar.monto || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter font-display" style={{ color: 'var(--text)' }}>Documentos</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Comprobantes electrónicos emitidos · SUNAT</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{comprobantes.length} emitidos</span>
        </div>
      </div>

      {ok && <div className="mb-5 px-4 py-3 rounded-xl font-bold text-sm" style={{ background: 'rgba(57,185,128,0.12)', border: '1px solid rgba(57,185,128,0.25)', color: 'var(--success)' }}>✅ Comprobante emitido y registrado correctamente</div>}

      {/* OPERACIONES */}
      {vista === 'operaciones' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-subtle)' }}>🔍</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, placa o detalle..."
              className="bg-transparent outline-none text-sm font-semibold flex-1"
              style={{ color: 'var(--text)', '--placeholder-color': 'var(--text-subtle)' } as React.CSSProperties} />
          </div>
          {filtradas.length === 0 ? (
            <div className="card rounded-2xl p-16 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-black text-sm uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>Sin operaciones registradas</p>
            </div>
          ) : filtradas.map(op => (
            <div key={op.id} className="card rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-md" style={{
              border: op.comprobante_emitido ? '1px solid rgba(57,185,128,0.25)' : '1px solid var(--border)',
            }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-sm" style={{
                background: op.tipo === 'servicio' ? 'var(--teal-muted)' : 'rgba(57,185,128,0.12)',
                color: op.tipo === 'servicio' ? 'var(--teal)' : 'var(--success)',
                border: op.tipo === 'servicio' ? '1px solid var(--teal-border)' : '1px solid rgba(57,185,128,0.25)',
              }}>
                {op.tipo === 'servicio' ? (op.placa?.slice(0, 3) || '🔧') : '🛒'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {op.placa && <span className="font-black uppercase text-sm" style={{ color: 'var(--text)' }}>{op.placa}</span>}
                  <span className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase" style={{
                    background: op.tipo === 'servicio' ? 'var(--teal-muted)' : 'rgba(57,185,128,0.12)',
                    color: op.tipo === 'servicio' ? 'var(--teal)' : 'var(--success)',
                  }}>{op.tipo === 'servicio' ? 'Servicio' : 'Venta POS'}</span>
                  {op.comprobante_emitido && (
                    <span className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase" style={{ background: 'rgba(57,185,128,0.12)', color: 'var(--success)' }}>✓ Facturado</span>
                  )}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{op.nombre}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-subtle)' }}>{op.detalle}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-lg" style={{ color: 'var(--text)' }}>S/ {op.monto.toFixed(2)}</p>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-subtle)' }}>{op.fecha}</p>
                <button onClick={() => abrirEmision(op)}
                  className="mt-2 px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                  style={op.comprobante_emitido
                    ? { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-subtle)' }
                    : { background: 'var(--teal)', color: '#000' }}>
                  {op.comprobante_emitido ? 'Re-emitir' : '🧾 Emitir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMITIR */}
      {vista === 'emitir' && opSeleccionada && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4 p-4 rounded-2xl" style={{ background: 'var(--teal-muted)', border: '1px solid var(--teal-border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: 'var(--teal)', color: '#000' }}>
                {opSeleccionada.tipo === 'servicio' ? (opSeleccionada.placa?.slice(0, 3) || '🔧') : '🛒'}
              </div>
              <div className="flex-1">
                <p className="font-black text-sm uppercase" style={{ color: 'var(--text)' }}>{opSeleccionada.placa || 'Venta POS'} · {opSeleccionada.nombre}</p>
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{itemsEditables.length} item(s) · S/ {opSeleccionada.monto.toFixed(2)}</p>
              </div>
              <button onClick={() => setVista('operaciones')} className="font-black text-lg transition-all" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            {error && <div className="mb-4 px-4 py-3 rounded-xl font-bold text-sm" style={{ background: 'var(--danger-muted)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>{error}</div>}

            <form onSubmit={handleEmitir} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="lbl">
                    DNI / RUC {consultandoDoc && <span className="normal-case font-bold" style={{ color: 'var(--teal)' }}>⏳ Consultando...</span>}
                  </label>
                  <input
                    name="cliente_doc"
                    value={form.cliente_doc}
                    onChange={handleChange}
                    onBlur={(e) => consultarCliente(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        consultarCliente(form.cliente_doc)
                      }
                    }}
                    placeholder="DNI (8) o RUC (11)"
                    maxLength={11}
                    className="inp"
                  />
                  {form.cliente_doc.length === 8  && !consultandoDoc && <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--teal)' }}>→ Boleta de Venta</p>}
                  {form.cliente_doc.length === 11 && !consultandoDoc && <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--success)' }}>→ Factura</p>}
                </div>
                <div>
                  <label className="lbl">Nombre / Razón social</label>
                  <input
                    name="cliente_nombre"
                    value={form.cliente_nombre}
                    onChange={handleChange}
                    onBlur={handleNombreBlur}
                    placeholder="Nombre del cliente"
                    className="inp"
                  />
                </div>
              </div>

              <div>
                <label className="lbl">Dirección</label>
                <input name="cliente_dir" value={form.cliente_dir} onChange={handleChange}
                  placeholder="Dirección del cliente" className="inp" />
              </div>

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
                  <div className="flex justify-between px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>Descripción</span>
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>Precio</span>
                  </div>
                  {itemsEditables.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 transition-colors" style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                      <input
                        value={item.descripcion}
                        onChange={e => editarItemDesc(i, e.target.value)}
                        className="flex-1 text-xs font-semibold bg-transparent focus:outline-none py-1 uppercase transition-colors min-w-0"
                        style={{ color: 'var(--text)', borderBottom: '1px solid transparent' }}
                        placeholder="Descripción del item"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-subtle)' }}>S/</span>
                        <input
                          type="number"
                          value={item.precio}
                          onChange={e => editarItemPrecio(i, e.target.value)}
                          step="0.01"
                          className="w-20 text-xs font-black bg-transparent focus:outline-none py-1 text-right transition-colors"
                          style={{ color: 'var(--text)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold mt-1.5" style={{ color: 'var(--text-subtle)' }}>✏️ Haz click en cualquier campo para editarlo</p>
              </div>

              <button type="submit" disabled={loading}
                className="w-full disabled:opacity-50 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm active:scale-95"
                style={{ background: 'var(--teal)', color: '#000' }}>
                {loading ? '⏳ Conectando con SUNAT...' : `🧾 Emitir ${form.tipo === 'factura' ? 'Factura' : 'Boleta'} ${form.modo === 'demo' ? '(Demo)' : ''}`}
              </button>
            </form>

            {resultadoFactusmart && resultadoFactusmart.ok && (
              <div className="mt-4 rounded-2xl p-5" style={{ background: 'rgba(57,185,128,0.12)', border: '1px solid rgba(57,185,128,0.25)' }}>
                <p className="font-black text-sm mb-3" style={{ color: 'var(--success)' }}>✅ Comprobante emitido por Factusmart</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="font-bold" style={{ color: 'var(--text-muted)' }}>Serie/Número:</span> <span className="font-black" style={{ color: 'var(--text)' }}>{resultadoFactusmart.serie_numero}</span></div>
                  <div><span className="font-bold" style={{ color: 'var(--text-muted)' }}>SUNAT:</span> <span className="font-black" style={{ color: 'var(--text)' }}>{resultadoFactusmart.aceptado_por_sunat ? '✓ Aceptado' : 'Pendiente'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="card rounded-2xl p-5 h-fit">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-subtle)' }}>Vista previa</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '2px dashed var(--border)' }}>
              <div className="px-4 py-3 text-center" style={{ background: 'var(--surface-2)' }}>
                <p className="font-black uppercase text-xs tracking-widest" style={{ color: 'var(--text)' }}>
                  {form.tipo === 'boleta' ? 'BOLETA DE VENTA' : 'FACTURA ELECTRÓNICA'}
                </p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                  {form.tipo === 'boleta' ? 'B001' : 'F001'}-{String(comprobantes.filter(c => c.tipo === form.tipo).length + 1).padStart(6, '0')}
                </p>
              </div>

              <div className="p-4 space-y-3">
                {form.cliente_nombre && (
                  <div className="flex justify-between text-xs gap-2">
                    <span className="font-bold shrink-0" style={{ color: 'var(--text-subtle)' }}>Cliente</span>
                    <span className="font-black text-right truncate" style={{ color: 'var(--text)' }}>{form.cliente_nombre}</span>
                  </div>
                )}

                {itemsEditables.length > 0 && (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {itemsEditables.map((item, i) => (
                      <div key={i} className="flex justify-between items-center px-2.5 py-1.5 gap-2" style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                        <span className="text-[10px] font-semibold uppercase flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{item.descripcion}</span>
                        <span className="text-[10px] font-black shrink-0" style={{ color: 'var(--text)' }}>S/ {item.precio.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {montoOp > 0 && (
                  <div className="pt-2 space-y-1 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                      <span className="font-bold">Subtotal</span>
                      <span className="font-black">S/ {subtotalPreview.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                      <span className="font-bold">IGV ({form.igv}%)</span>
                      <span className="font-black">S/ {igvPreview.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                      <span className="font-black" style={{ color: 'var(--text)' }}>TOTAL</span>
                      <span className="font-black text-base" style={{ color: 'var(--teal)' }}>S/ {montoOp.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      {vista === 'historial' && (
        <div className="space-y-3">

          {/* ── TABS de filtro por tipo ── */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {([
              { key: 'todos',        label: 'Todos',           icon: '🧾' },
              { key: 'factura',      label: 'Facturas',        icon: '📄' },
              { key: 'boleta',       label: 'Boletas',         icon: '🧾' },
              { key: 'nota_credito', label: 'Notas Crédito',   icon: '📋' },
              { key: 'nota_debito',  label: 'Notas Débito',    icon: '📋' },
              { key: 'guia',         label: 'Guías Remisión',  icon: '🚚' },
            ] as { key: FiltroComp; label: string; icon: string }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFiltroComp(tab.key)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl font-black uppercase tracking-widest transition-all"
                style={filtroComp === tab.key
                  ? { background: 'var(--teal)', color: '#000' }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md" style={
                  filtroComp === tab.key
                    ? { background: 'rgba(0,0,0,0.15)', color: '#000' }
                    : { background: 'var(--surface-2)', color: 'var(--text-subtle)' }
                }>
                  {cuentas[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* ── Búsqueda + ordenamiento ── */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 rounded-xl px-4 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-subtle)' }}>🔍</span>
              <input
                value={busqComp}
                onChange={e => setBusqComp(e.target.value)}
                placeholder="Buscar por cliente, DNI/RUC o número..."
                className="bg-transparent outline-none text-sm font-semibold flex-1"
                style={{ color: 'var(--text)' }}
              />
              {busqComp && (
                <button onClick={() => setBusqComp('')} className="font-black transition-all" style={{ color: 'var(--text-muted)' }}>✕</button>
              )}
            </div>
            <button
              onClick={() => setOrdenComp(o => o === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', width: 'auto' }}>
              {ordenComp === 'desc' ? '↓ Más reciente' : '↑ Más antiguo'}
            </button>
          </div>

          {comprobantesFiltrados.length === 0 ? (
            <div className="card rounded-2xl p-16 text-center">
              <p className="text-4xl mb-3">🧾</p>
              <p className="font-black text-sm uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>
                {comprobantes.length === 0 ? 'Sin comprobantes emitidos' : 'No hay resultados para este filtro'}
              </p>
              {comprobantes.length === 0 && (
                <button onClick={() => setVista('operaciones')}
                  className="mt-4 font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all"
                  style={{ background: 'var(--teal)', color: '#000' }}>
                  Ver operaciones pendientes
                </button>
              )}
              {comprobantes.length > 0 && (
                <button onClick={() => { setFiltroComp('todos'); setBusqComp('') }}
                  className="mt-4 font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : comprobantesFiltrados.map(c => (
            <div key={c.id}
              onClick={() => setModalComprobante(c)}
              className="card rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
              style={{
                opacity: c.estado_sunat === 'anulado' ? 0.6 : 1,
                border: c.estado_sunat === 'anulado' ? '1px solid var(--danger-border)' : '1px solid var(--border)',
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden" style={{
                background: c.tipo === 'factura' ? 'var(--teal-muted)' : 'rgba(57,185,128,0.12)',
                border: c.tipo === 'factura' ? '1px solid var(--teal-border)' : '1px solid rgba(57,185,128,0.25)',
              }}>
                {tallerLogo
                  ? <img src={tallerLogo} className="w-full h-full object-contain p-1" />
                  : (c.tipo === 'factura' ? '📄' : '🧾')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-black text-sm" style={{ color: 'var(--text)' }}>{c.serie}-{String(c.numero).padStart(6, '0')}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase" style={{
                    background: c.estado_sunat === 'emitido' ? 'rgba(57,185,128,0.12)' : c.estado_sunat === 'anulado' ? 'var(--danger-muted)' : 'var(--amber-muted)',
                    color: c.estado_sunat === 'emitido' ? 'var(--success)' : c.estado_sunat === 'anulado' ? 'var(--danger)' : 'var(--amber)',
                  }}>{c.estado_sunat}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase capitalize" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-subtle)' }}>{c.tipo}</span>
                  {c.payload?.entorno === 'prueba' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase" style={{ background: 'var(--amber-muted)', border: '1px solid var(--amber-border)', color: 'var(--amber)' }}>Demo</span>
                  )}
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-muted)' }}>{toTitleCase(c.cliente_nombre || '')}</p>
                {c.cliente_doc && (
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-subtle)' }}>{c.tipo === 'factura' ? 'RUC' : 'DNI'}: {c.cliente_doc}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-lg" style={{ color: 'var(--text)' }}>S/ {(c.monto || 0).toFixed(2)}</p>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-subtle)' }}>
                  {c.fecha_emision || new Date(c.created_at).toLocaleDateString('es-PE')}
                </p>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--teal)' }}>Ver acciones →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}