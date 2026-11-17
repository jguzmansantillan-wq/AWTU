'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type ItemCotizacion = { descripcion: string; cantidad: number; precio: number; subtotal: number }
type Cotizacion = {
  id: string; cliente_nombre: string; cliente_telefono: string; cliente_ruc: string
  cliente_dni: string; cliente_placa: string; cliente_modelo: string
  items: ItemCotizacion[]; subtotal: number; igv: number; total: number
  notas: string; estado: string; created_at: string
}
type ItemInventario = { id: string; nombre: string; categoria: string; precio: number; stock: number }
type MarcaAceite = { logo_url: string }
type MetodoPago = { tipo: string; numero: string; titular: string }
type Sucursal = { nombre: string; direccion: string; telefono: string }

// ── Autocomplete ────────────────────────────────────────────────────────────
function AutocompleteInput({ value, onChange, onSelect, placeholder, className, items }: {
  value: string; onChange: (v: string) => void; onSelect: (item: ItemInventario) => void
  placeholder: string; className?: string; items: ItemInventario[]
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const filtrados = value.length >= 1
    ? items.filter(i => i.nombre.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { if (value.length >= 1) setOpen(true) }}
        placeholder={placeholder}
        className={className}
      />
      {open && filtrados.length > 0 && (
        <div style={{
          position: 'fixed', zIndex: 99999, background: 'white',
          border: '1.5px solid #e2e8f0', borderRadius: '14px',
          boxShadow: '0 24px 48px -8px rgba(0,0,0,0.18)',
          maxHeight: '260px', overflowY: 'auto', minWidth: '320px',
          top: wrapRef.current ? wrapRef.current.getBoundingClientRect().bottom + 6 : 0,
          left: wrapRef.current ? wrapRef.current.getBoundingClientRect().left : 0,
        }}>
          {filtrados.map(item => (
            <div key={item.id}
              onMouseDown={() => { onSelect(item); setOpen(false) }}
              style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>{item.nombre}</p>
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>{item.categoria}</p>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 900, color: '#0d9488', margin: 0, flexShrink: 0 }}>S/ {item.precio.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fila item ───────────────────────────────────────────────────────────────
function FilaItem({ item, index, inventario, onChange, onSelect, onDelete, canDelete }: {
  item: ItemCotizacion; index: number; inventario: ItemInventario[]
  onChange: (i: number, campo: keyof ItemCotizacion, valor: any) => void
  onSelect: (i: number, inv: ItemInventario) => void
  onDelete: (i: number) => void; canDelete: boolean
}) {
  return (
    <div className="grid gap-3 items-center" style={{ gridTemplateColumns: '1fr 80px 120px 100px 36px' }}>
      <AutocompleteInput
        value={item.descripcion}
        onChange={v => onChange(index, 'descripcion', v)}
        onSelect={inv => onSelect(index, inv)}
        placeholder="Buscar o escribir producto/servicio..."
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-teal-500 transition-all uppercase"
        items={inventario}
      />
      <input
        type="number" value={item.cantidad} min="1"
        onChange={e => onChange(index, 'cantidad', parseInt(e.target.value) || 1)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-black text-center focus:outline-none focus:border-teal-500 transition-all"
      />
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 focus-within:border-teal-500 transition-all">
        <span className="text-xs text-slate-400 font-black shrink-0">S/</span>
        <input
          type="number" value={item.precio} step="0.50"
          onChange={e => onChange(index, 'precio', parseFloat(e.target.value) || 0)}
          className="bg-transparent outline-none text-sm font-black w-full text-right"
        />
      </div>
      <p className="text-sm font-black text-teal-600 text-right pr-1">S/ {item.subtotal.toFixed(2)}</p>
      <button onClick={() => onDelete(index)} disabled={!canDelete}
        className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center text-red-500 text-xs transition-all disabled:opacity-30">
        ✕
      </button>
    </div>
  )
}

// ── InfoPagoSucursales ──────────────────────────────────────────────────────
function InfoPagoSucursales({ metodos, sucursales, modo }: {
  metodos: MetodoPago[]; sucursales: Sucursal[]; modo: 'pdf' | 'web'
}) {
  if ((!metodos || metodos.length === 0) && (!sucursales || sucursales.length === 0)) return null

  if (modo === 'pdf') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: metodos.length && sucursales.length ? '1fr 1fr' : '1fr', gap: '16px', marginTop: '24px' }}>
        {metodos.length > 0 && (
          <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: '10px', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>Métodos de Pago</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {metodos.map((m, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
                  <span style={{ fontWeight: 900, color: '#0f172a' }}>{m.tipo}:</span> {m.numero}{m.titular ? ` — ${m.titular}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
        {sucursales.length > 0 && (
          <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: '10px', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>Sucursales</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sucursales.map((s, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
                  <span style={{ fontWeight: 900, color: '#0f172a' }}>{s.nombre}:</span> {s.direccion}{s.telefono ? ` · Tel: ${s.telefono}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`grid gap-4 mt-4 ${metodos.length && sucursales.length ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {metodos.length > 0 && (
        <div className="border border-slate-200 rounded-2xl p-4">
          <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-2">Métodos de Pago</p>
          <div className="space-y-1">
            {metodos.map((m, i) => (
              <p key={i} className="text-xs text-slate-600 font-semibold">
                <span className="font-black text-slate-900">{m.tipo}:</span> {m.numero}{m.titular ? ` — ${m.titular}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}
      {sucursales.length > 0 && (
        <div className="border border-slate-200 rounded-2xl p-4">
          <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-2">Sucursales</p>
          <div className="space-y-1">
            {sucursales.map((s, i) => (
              <p key={i} className="text-xs text-slate-600 font-semibold">
                <span className="font-black text-slate-900">{s.nombre}:</span> {s.direccion}{s.telefono ? ` · Tel: ${s.telefono}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────
export default function CotizacionesPage() {
  const [tallerID,        setTallerID]        = useState('')
  const [tallerNombre,    setTallerNombre]    = useState('')
  const [tallerLogo,      setTallerLogo]      = useState('')
  const [tallerRuc,       setTallerRuc]       = useState('')
  const [tallerDireccion, setTallerDireccion] = useState('')
  const [tallerTelefono,  setTallerTelefono]  = useState('')
  const [marcasAceite,    setMarcasAceite]    = useState<MarcaAceite[]>([])
  const [metodosPago,     setMetodosPago]     = useState<MetodoPago[]>([])
  const [sucursales,      setSucursales]      = useState<Sucursal[]>([])
  const [inventario,      setInventario]      = useState<ItemInventario[]>([])
  const [cotizaciones,    setCotizaciones]    = useState<Cotizacion[]>([])
  const [vista,           setVista]           = useState<'lista' | 'nueva' | 'ver' | 'editar'>('lista')
  const [cotSeleccionada, setCotSeleccionada] = useState<Cotizacion | null>(null)
  const [loading,         setLoading]         = useState(false)
  const [ok,              setOk]              = useState('')
  const [error,           setError]           = useState('')
  const pdfRef = useRef<HTMLDivElement>(null)

  const [clienteNombre,   setClienteNombre]   = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteRuc,      setClienteRuc]      = useState('')
  const [clienteDni,      setClienteDni]      = useState('')
  const [clientePlaca,    setClientePlaca]    = useState('')
  const [clienteModelo,   setClienteModelo]   = useState('')
  const [notas,           setNotas]           = useState('')
  const [igvPct,          setIgvPct]          = useState(18)
  const [items,           setItems]           = useState<ItemCotizacion[]>([{ descripcion: '', cantidad: 1, precio: 0, subtotal: 0 }])
  const [editandoID,      setEditandoID]      = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres')
        .select('id, nombre, logo_url, ruc, direccion, telefono, marcas_aceite, metodos_pago, sucursales')
        .eq('user_id', user.id).single()
      if (!t) return
      setTallerID(t.id); setTallerNombre(t.nombre || ''); setTallerLogo(t.logo_url || '')
      setTallerRuc(t.ruc || ''); setTallerDireccion(t.direccion || ''); setTallerTelefono(t.telefono || '')
      setMarcasAceite((Array.isArray(t.marcas_aceite) ? t.marcas_aceite : []).filter((m: any) => m && m.logo_url))
      setMetodosPago(Array.isArray(t.metodos_pago) ? t.metodos_pago : [])
      setSucursales(Array.isArray(t.sucursales) ? t.sucursales : [])
      const { data: inv } = await supabase.from('inventario')
        .select('id, nombre, categoria, precio, stock').eq('taller_id', t.id).order('nombre')
      setInventario(inv || [])
      await cargarCotizaciones(t.id)
    }
    init()
  }, [])

  const cargarCotizaciones = async (tid: string) => {
    const { data } = await supabase.from('cotizaciones').select('*').eq('taller_id', tid).order('created_at', { ascending: false })
    setCotizaciones(data || [])
  }

  const actualizarItem = (i: number, campo: keyof ItemCotizacion, valor: any) => {
    setItems(prev => {
      const a = [...prev]
      a[i] = { ...a[i], [campo]: valor }
      if (campo === 'cantidad' || campo === 'precio') {
        const cant   = campo === 'cantidad' ? (parseFloat(valor) || 0) : (parseFloat(String(a[i].cantidad)) || 0)
        const precio = campo === 'precio'   ? (parseFloat(valor) || 0) : (parseFloat(String(a[i].precio)) || 0)
        a[i].subtotal = cant * precio
      }
      return a
    })
  }

  const seleccionarDelInventario = (i: number, inv: ItemInventario) => {
    setItems(prev => {
      const a = [...prev]
      a[i] = { ...a[i], descripcion: inv.nombre, precio: inv.precio, subtotal: inv.precio * a[i].cantidad }
      return a
    })
  }

  const agregarItem  = () => setItems(prev => [...prev, { descripcion: '', cantidad: 1, precio: 0, subtotal: 0 }])
  const eliminarItem = (i: number) => setItems(prev => prev.filter((_, j) => j !== i))

  const subtotalCalc = items.reduce((s, i) => s + (i.subtotal || 0), 0)
  const igvCalc      = subtotalCalc * (igvPct / 100)
  const totalCalc    = subtotalCalc + igvCalc

  const cargarParaEditar = (c: Cotizacion) => {
    setEditandoID(c.id)
    setClienteNombre(c.cliente_nombre || '')
    setClienteTelefono(c.cliente_telefono || '')
    setClienteRuc(c.cliente_ruc || '')
    setClienteDni(c.cliente_dni || '')
    setClientePlaca(c.cliente_placa || '')
    setClienteModelo(c.cliente_modelo || '')
    setNotas(c.notas || '')
    setIgvPct(c.igv > 0 && c.subtotal > 0 ? Math.round((c.igv / c.subtotal) * 100) : 18)
    setItems(Array.isArray(c.items) && c.items.length > 0 ? c.items : [{ descripcion: '', cantidad: 1, precio: 0, subtotal: 0 }])
    setVista('editar')
  }

  const guardarCotizacion = async () => {
    if (!clienteNombre.trim()) { setError('El nombre del cliente es obligatorio'); return }
    if (items.every(i => !i.descripcion.trim())) { setError('Agrega al menos un producto o servicio'); return }
    setLoading(true); setError('')
    const itemsLimpios = items.filter(i => i.descripcion.trim())

    if (editandoID) {
      const { error: e } = await supabase.from('cotizaciones').update({
        cliente_nombre: clienteNombre, cliente_telefono: clienteTelefono,
        cliente_ruc: clienteRuc, cliente_dni: clienteDni,
        cliente_placa: clientePlaca.toUpperCase(), cliente_modelo: clienteModelo,
        items: itemsLimpios, subtotal: subtotalCalc, igv: igvCalc, total: totalCalc,
        notas, updated_at: new Date().toISOString(),
      }).eq('id', editandoID)
      if (e) { setError(e.message); setLoading(false); return }
      await cargarCotizaciones(tallerID)
      const { data: updated } = await supabase.from('cotizaciones').select('*').eq('id', editandoID).single()
      setCotSeleccionada(updated)
      setVista('ver')
      setOk('Cotización actualizada'); setTimeout(() => setOk(''), 3000)
    } else {
      const { data, error: e } = await supabase.from('cotizaciones').insert({
        taller_id: tallerID, cliente_nombre: clienteNombre, cliente_telefono: clienteTelefono,
        cliente_ruc: clienteRuc, cliente_dni: clienteDni,
        cliente_placa: clientePlaca.toUpperCase(), cliente_modelo: clienteModelo,
        items: itemsLimpios, subtotal: subtotalCalc, igv: igvCalc, total: totalCalc,
        notas, estado: 'emitida',
      }).select().single()
      if (e) { setError(e.message); setLoading(false); return }
      await cargarCotizaciones(tallerID)
      setCotSeleccionada(data)
      setVista('ver')
      setOk('Cotización guardada'); setTimeout(() => setOk(''), 3000)
    }
    limpiarForm(); setLoading(false)
  }

  const limpiarForm = () => {
    setClienteNombre(''); setClienteTelefono(''); setClienteRuc(''); setClienteDni('')
    setClientePlaca(''); setClienteModelo(''); setNotas(''); setIgvPct(18)
    setItems([{ descripcion: '', cantidad: 1, precio: 0, subtotal: 0 }])
    setEditandoID(null)
  }

  const descargarPDF = async () => {
    if (!pdfRef.current) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF }       = await import('jspdf')
    const canvas  = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: pdfRef.current.offsetWidth })
    const imgData = canvas.toDataURL('image/png')
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfW    = pdf.internal.pageSize.getWidth()
    const pdfH    = (canvas.height * pdfW) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
    pdf.save(`Cotizacion_${cotSeleccionada?.cliente_placa || cotSeleccionada?.cliente_nombre || 'AWTU'}.pdf`)
  }

  const compartirWhatsApp = (c: Cotizacion) => {
    if (!c.cliente_telefono) { alert('Esta cotización no tiene teléfono registrado'); return }
    const tel    = c.cliente_telefono.replace(/\D/g, '')
    const lineas = (Array.isArray(c.items) ? c.items : []).map((i: ItemCotizacion) =>
      `  • ${i.descripcion} x${i.cantidad} — S/ ${i.subtotal.toFixed(2)}`).join('\n')
    const msg = encodeURIComponent(
      `📋 *COTIZACIÓN - ${tallerNombre}*\n\n` +
      `👤 Cliente: ${c.cliente_nombre}\n` +
      (c.cliente_placa ? `🚗 Vehículo: ${c.cliente_placa} ${c.cliente_modelo || ''}\n` : '') +
      `📅 Fecha: ${new Date(c.created_at).toLocaleDateString('es-PE')}\n\n` +
      `*DETALLE:*\n${lineas}\n\n` +
      `Subtotal: S/ ${c.subtotal.toFixed(2)}\nIGV (18%): S/ ${c.igv.toFixed(2)}\n` +
      `*TOTAL: S/ ${c.total.toFixed(2)}*\n\n` +
      (c.notas ? `📝 Notas: ${c.notas}\n\n` : '') +
      `¡Gracias por su preferencia! 🔧`)
    window.open(`https://wa.me/51${tel}?text=${msg}`, '_blank')
  }

  const nroCotizacion = (c: Cotizacion) => {
    const idx = [...cotizaciones].reverse().findIndex(x => x.id === c.id)
    return `COT-${String(idx + 1).padStart(4, '0')}`
  }

  const inp = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
  const lbl = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block"

  const BloquesMarcas = ({ marcas }: { marcas: MarcaAceite[] }) => {
    if (!marcas || marcas.length === 0) return null
    return (
      <div style={{ marginTop: '24px', borderTop: '1.5px solid #f1f5f9', paddingTop: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '12px', textAlign: 'center' }}>
          Marcas de Aceite que Trabajamos
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {marcas.map((m, i) => (
            <img key={i} src={m.logo_url} alt="" crossOrigin="anonymous"
              style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px' }} />
          ))}
        </div>
      </div>
    )
  }

  // ── PDF TEMPLATE ──────────────────────────────────────────────────────────
  const PdfTemplate = ({ c }: { c: Cotizacion }) => (
    <div ref={pdfRef} style={{ width: '794px', background: '#ffffff', fontFamily: '"Arial", sans-serif', padding: '0' }}>
      {/* Barra top */}
      <div style={{ background: '#0f172a', height: '6px', width: '100%' }} />

      <div style={{ padding: '44px 56px 40px' }}>

        {/* ── ENCABEZADO: 3 columnas fijas ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 200px', gap: '20px', alignItems: 'start', marginBottom: '28px' }}>

          {/* Col 1: logo */}
          <div style={{ width: '64px', height: '64px', flexShrink: 0 }}>
            {tallerLogo
              ? <img src={tallerLogo} crossOrigin="anonymous"
                  style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #f1f5f9' }} />
              : <div style={{ width: '64px', height: '64px', background: '#0f172a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔧</div>}
          </div>

          {/* Col 2: datos taller */}
          <div style={{ paddingTop: '4px' }}>
            <div style={{ fontWeight: 900, fontSize: '20px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
              {tallerNombre}
            </div>
            {tallerRuc       && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>RUC: {tallerRuc}</div>}
            {tallerDireccion && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>{tallerDireccion}</div>}
            {tallerTelefono  && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tel: {tallerTelefono}</div>}
          </div>

          {/* Col 3: badge COTIZACIÓN + número + fecha */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block', background: '#0d9488', color: 'white',
              fontWeight: 900, fontSize: '15px', letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '8px 20px', borderRadius: '10px',
              marginBottom: '10px',
            }}>
              COTIZACIÓN
            </div>
            <div style={{ fontWeight: 900, fontSize: '14px', color: '#0f172a', marginBottom: '3px' }}>
              {nroCotizacion(c)}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
              {new Date(c.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Válido por 30 días</div>
          </div>
        </div>

        {/* Línea separadora */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, #0d9488 0%, #0f172a 100%)', borderRadius: '2px', marginBottom: '24px' }} />

        {/* ── CLIENTE + VEHÍCULO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {/* Cliente */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '10px' }}>
              Cliente
            </div>
            <div style={{ fontWeight: 900, fontSize: '14px', color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', lineHeight: 1.2 }}>
              {c.cliente_nombre}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {c.cliente_ruc      && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>RUC: {c.cliente_ruc}</div>}
              {c.cliente_dni      && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>DNI: {c.cliente_dni}</div>}
              {c.cliente_telefono && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tel: {c.cliente_telefono}</div>}
            </div>
          </div>

          {/* Vehículo */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '10px' }}>
              Vehículo
            </div>
            {c.cliente_placa
              ? <>
                  <div style={{ fontWeight: 900, fontSize: '22px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: 1, marginBottom: '6px' }}>
                    {c.cliente_placa}
                  </div>
                  {c.cliente_modelo && (
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{c.cliente_modelo}</div>
                  )}
                </>
              : <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, fontStyle: 'italic' }}>No especificado</div>
            }
          </div>
        </div>

        {/* ── TABLA ITEMS ── */}
        <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={{ padding: '11px 18px', textAlign: 'left',   fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', width: '52%' }}>Descripción</th>
                <th style={{ padding: '11px 14px', textAlign: 'center', fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', width: '10%' }}>Cant.</th>
                <th style={{ padding: '11px 14px', textAlign: 'right',  fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', width: '19%' }}>P. Unit.</th>
                <th style={{ padding: '11px 18px', textAlign: 'right',  fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', width: '19%' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(c.items) ? c.items : []).map((item: ItemCotizacion, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 18px', fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{item.descripcion}</td>
                  <td style={{ padding: '11px 14px', fontSize: '12px', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>{item.cantidad}</td>
                  <td style={{ padding: '11px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>S/ {(item.precio || 0).toFixed(2)}</td>
                  <td style={{ padding: '11px 18px', fontSize: '12px', fontWeight: 900, color: '#0d9488', textAlign: 'right' }}>S/ {(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── TOTALES ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{ width: '260px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Subtotal</span>
              <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: 800 }}>S/ {c.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>IGV (18%)</span>
              <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: 800 }}>S/ {c.igv.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#0f172a' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</span>
              <span style={{ fontSize: '24px', color: '#2dd4bf', fontWeight: 900, letterSpacing: '-0.02em' }}>S/ {c.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── NOTAS ── */}
        {c.notas && (
          <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 800, fontSize: '9px', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '5px' }}>Notas y Condiciones</div>
            <div style={{ fontSize: '11px', color: '#134e4a', fontWeight: 600, lineHeight: 1.6 }}>{c.notas}</div>
          </div>
        )}

        {/* Métodos de pago y sucursales */}
        <InfoPagoSucursales metodos={metodosPago} sucursales={sucursales} modo="pdf" />

        {/* ── FIRMAS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px', marginBottom: '24px' }}>
          <div style={{ border: '1.5px dashed #e2e8f0', borderRadius: '10px', padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Firma del Cliente</div>
            <div style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 600, marginTop: '8px', textTransform: 'uppercase' }}>{c.cliente_nombre}</div>
          </div>
          <div style={{ border: '1.5px dashed #e2e8f0', borderRadius: '10px', padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Firma Autorizada</div>
            <div style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 600, marginTop: '8px', textTransform: 'uppercase' }}>{tallerNombre}</div>
          </div>
        </div>

        {/* Marcas de aceite */}
        <BloquesMarcas marcas={marcasAceite} />

        {/* Footer */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Esta cotización es válida por 30 días desde la fecha de emisión.</div>
          <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>{tallerNombre}{tallerRuc ? ` · RUC ${tallerRuc}` : ''}{tallerTelefono ? ` · ${tallerTelefono}` : ''}</div>
        </div>
      </div>

      {/* Barra bottom */}
      <div style={{ background: '#0d9488', height: '5px', width: '100%' }} />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-10">

      {/* PDF oculto */}
      {cotSeleccionada && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <PdfTemplate c={cotSeleccionada} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Cotizaciones</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            {vista === 'lista'  ? `${cotizaciones.length} cotizaciones registradas` :
             vista === 'nueva'  ? 'Nueva cotización' :
             vista === 'editar' ? 'Editar cotización' : 'Detalle de cotización'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {vista !== 'lista' && (
            <button onClick={() => { setVista('lista'); setCotSeleccionada(null); limpiarForm() }}
              className="px-4 py-2.5 text-xs rounded-xl font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
              ← Volver
            </button>
          )}
          {vista === 'lista' && (
            <button onClick={() => { limpiarForm(); setVista('nueva') }}
              className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-lg shadow-teal-200 active:scale-95">
              + Nueva Cotización
            </button>
          )}
          {vista === 'ver' && cotSeleccionada && (
            <>
              <button onClick={descargarPDF}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-lg shadow-teal-200 active:scale-95">
                📄 PDF
              </button>
              <button onClick={() => compartirWhatsApp(cotSeleccionada)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-200 active:scale-95">
                💬 WhatsApp
              </button>
              <button onClick={() => cargarParaEditar(cotSeleccionada)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-lg shadow-amber-200 active:scale-95">
                ✏️ Editar
              </button>
            </>
          )}
        </div>
      </div>

      {ok    && <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl font-bold text-sm">✅ {ok}</div>}
      {error && <div className="mb-5 bg-red-50    border border-red-200    text-red-700    px-4 py-3 rounded-xl font-bold text-sm">❌ {error}</div>}

      {/* ── LISTA ── */}
      {vista === 'lista' && (
        <div className="space-y-3">
          {cotizaciones.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <p className="text-5xl mb-4">💼</p>
              <p className="font-black text-sm text-slate-300 uppercase tracking-widest">Sin cotizaciones aún</p>
              <button onClick={() => setVista('nueva')}
                className="mt-4 bg-teal-600 text-white font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl">
                Crear primera cotización
              </button>
            </div>
          ) : cotizaciones.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-teal-200 shrink-0">💼</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-black text-slate-900 uppercase">{c.cliente_nombre}</span>
                  {c.cliente_placa && <span className="text-[9px] px-2 py-0.5 bg-teal-100 text-teal-700 rounded-lg font-black uppercase">{c.cliente_placa}</span>}
                </div>
                <p className="text-xs text-slate-500 font-semibold">{c.cliente_modelo || 'Sin modelo'} · {(Array.isArray(c.items) ? c.items : []).length} item(s)</p>
                <p className="text-[10px] text-slate-400 font-bold">{new Date(c.created_at).toLocaleDateString('es-PE')}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-teal-600 text-xl">S/ {c.total.toFixed(2)}</p>
                <div className="flex items-center gap-1.5 justify-end mt-2">
                  <button onClick={() => { setCotSeleccionada(c); setVista('ver') }}
                    className="w-8 h-8 bg-teal-100 hover:bg-teal-200 rounded-lg flex items-center justify-center text-teal-600 transition-all text-sm">👁️</button>
                  <button onClick={() => cargarParaEditar(c)}
                    className="w-8 h-8 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center justify-center text-amber-600 transition-all text-sm">✏️</button>
                  <button onClick={() => compartirWhatsApp(c)}
                    className="w-8 h-8 bg-green-100 hover:bg-green-200 rounded-lg flex items-center justify-center text-green-600 transition-all text-sm">💬</button>
                  <button onClick={async () => {
                    if (!confirm('¿Eliminar esta cotización?')) return
                    await supabase.from('cotizaciones').delete().eq('id', c.id)
                    await cargarCotizaciones(tallerID)
                  }} className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center text-red-500 transition-all text-sm">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── NUEVA / EDITAR ── */}
      {(vista === 'nueva' || vista === 'editar') && (
        <div className="space-y-5">
          {/* Datos cliente */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
              <div className="w-7 h-7 bg-teal-600 rounded-xl flex items-center justify-center text-white text-xs">👤</div>
              <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Datos del Cliente</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Nombre del Cliente *</label><input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Nombre completo..." className={inp + ' uppercase'} /></div>
              <div><label className={lbl}>Teléfono</label><input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} placeholder="9XX XXX XXX" className={inp} /></div>
              <div><label className={lbl}>RUC</label><input value={clienteRuc} onChange={e => setClienteRuc(e.target.value)} placeholder="20XXXXXXXXX" className={inp} /></div>
              <div><label className={lbl}>DNI</label><input value={clienteDni} onChange={e => setClienteDni(e.target.value)} placeholder="XXXXXXXX" className={inp} /></div>
              <div><label className={lbl}>Placa del Vehículo</label><input value={clientePlaca} onChange={e => setClientePlaca(e.target.value)} placeholder="ABC-123" className={inp + ' uppercase font-black text-teal-700'} /></div>
              <div><label className={lbl}>Marca / Modelo</label><input value={clienteModelo} onChange={e => setClienteModelo(e.target.value)} placeholder="Toyota Corolla 2022..." className={inp + ' uppercase'} /></div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-teal-600 rounded-xl flex items-center justify-center text-white text-xs">📋</div>
                <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Productos y Servicios</p>
              </div>
              <button onClick={agregarItem}
                className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95">
                + Agregar línea
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid gap-3 px-1" style={{ gridTemplateColumns: '1fr 80px 120px 100px 36px' }}>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción / Producto</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">P. Unitario</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</div>
                <div />
              </div>
              {items.map((item, i) => (
                <FilaItem key={i} item={item} index={i} inventario={inventario}
                  onChange={actualizarItem} onSelect={seleccionarDelInventario}
                  onDelete={eliminarItem} canDelete={items.length > 1} />
              ))}
            </div>
          </div>

          {/* Totales + notas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div>
                <label className={lbl}>Notas / Condiciones</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={5}
                  placeholder="Condiciones de pago, tiempo de entrega, garantía..."
                  className={inp + ' resize-none'} />
              </div>
              <div>
                <label className={lbl}>IGV (%)</label>
                <input type="number" value={igvPct} onChange={e => setIgvPct(parseFloat(e.target.value) || 0)} className={inp} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Resumen de Totales</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500 font-bold">Subtotal</span>
                  <span className="font-black text-slate-800 text-base">S/ {subtotalCalc.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500 font-bold">IGV ({igvPct}%)</span>
                  <span className="font-black text-slate-800 text-base">S/ {igvCalc.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3">
                  <span className="font-black text-slate-900 text-lg uppercase">Total</span>
                  <span className="font-black text-teal-600 text-4xl tracking-tighter">S/ {totalCalc.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={guardarCotizacion} disabled={loading}
                className="w-full mt-6 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm shadow-lg shadow-teal-200 active:scale-95 flex items-center justify-center gap-2">
                💾 {loading ? 'Guardando...' : editandoID ? 'Actualizar Cotización' : 'Guardar Cotización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VER ── */}
      {vista === 'ver' && cotSeleccionada && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-teal-600 to-slate-900" />
          <div className="p-8">

            {/* Encabezado — 3 columnas estables */}
            <div className="grid gap-5 items-start mb-7 pb-6 border-b-2 border-slate-100" style={{ gridTemplateColumns: '56px 1fr 180px' }}>
              {/* Logo */}
              <div className="w-14 h-14 shrink-0">
                {tallerLogo
                  ? <img src={tallerLogo} className="w-14 h-14 object-contain rounded-xl border border-slate-100" />
                  : <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-2xl">🔧</div>}
              </div>
              {/* Datos taller */}
              <div>
                <h3 className="font-black text-slate-900 text-xl uppercase tracking-tight leading-tight">{tallerNombre}</h3>
                {tallerRuc       && <p className="text-xs text-slate-500 font-bold mt-1">RUC: {tallerRuc}</p>}
                {tallerDireccion && <p className="text-xs text-slate-500 font-bold">{tallerDireccion}</p>}
                {tallerTelefono  && <p className="text-xs text-slate-500 font-bold">Tel: {tallerTelefono}</p>}
              </div>
              {/* Badge + número + fecha */}
              <div className="text-right">
                <div className="bg-teal-600 text-white font-black text-sm px-5 py-2 rounded-xl uppercase tracking-widest inline-block mb-2">Cotización</div>
                <p className="font-black text-slate-800 text-sm">{nroCotizacion(cotSeleccionada)}</p>
                <p className="text-xs text-slate-400 font-bold">{new Date(cotSeleccionada.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Válido por 30 días</p>
              </div>
            </div>

            {/* Cliente + vehículo */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-3">Cliente</p>
                <p className="font-black text-slate-900 text-base uppercase leading-tight">{cotSeleccionada.cliente_nombre}</p>
                <div className="mt-2 space-y-1">
                  {cotSeleccionada.cliente_ruc      && <p className="text-xs text-slate-500 font-bold">RUC: {cotSeleccionada.cliente_ruc}</p>}
                  {cotSeleccionada.cliente_dni      && <p className="text-xs text-slate-500 font-bold">DNI: {cotSeleccionada.cliente_dni}</p>}
                  {cotSeleccionada.cliente_telefono && <p className="text-xs text-slate-500 font-bold">Tel: {cotSeleccionada.cliente_telefono}</p>}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-3">Vehículo</p>
                {cotSeleccionada.cliente_placa
                  ? <>
                      <p className="font-black text-slate-900 text-2xl uppercase tracking-widest leading-tight">{cotSeleccionada.cliente_placa}</p>
                      {cotSeleccionada.cliente_modelo && <p className="text-sm text-slate-600 font-bold uppercase mt-1">{cotSeleccionada.cliente_modelo}</p>}
                    </>
                  : <p className="text-sm text-slate-400 font-bold italic">No especificado</p>}
              </div>
            </div>

            {/* Tabla */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 mb-6">
              <div className="grid gap-2 px-5 py-3 bg-slate-900" style={{ gridTemplateColumns: '1fr 80px 120px 120px' }}>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">P. Unit.</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</div>
              </div>
              {(Array.isArray(cotSeleccionada.items) ? cotSeleccionada.items : []).map((item: ItemCotizacion, i: number) => (
                <div key={i} className={`grid gap-2 px-5 py-3.5 items-center border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`} style={{ gridTemplateColumns: '1fr 80px 120px 120px' }}>
                  <div className="font-semibold text-slate-800 text-sm uppercase">{item.descripcion}</div>
                  <div className="font-black text-slate-700 text-sm text-center">{item.cantidad}</div>
                  <div className="font-black text-slate-500 text-sm text-right">S/ {(item.precio || 0).toFixed(2)}</div>
                  <div className="font-black text-teal-600 text-sm text-right">S/ {(item.subtotal || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="flex justify-end mb-6">
              <div className="w-72 rounded-2xl overflow-hidden border border-slate-200">
                <div className="flex justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="text-sm text-slate-500 font-bold">Subtotal</span>
                  <span className="font-black text-slate-800">S/ {cotSeleccionada.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="text-sm text-slate-500 font-bold">IGV (18%)</span>
                  <span className="font-black text-slate-800">S/ {cotSeleccionada.igv.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-4 bg-slate-900">
                  <span className="font-black text-white text-sm uppercase tracking-widest">Total</span>
                  <span className="font-black text-teal-400 text-2xl tracking-tighter">S/ {cotSeleccionada.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notas */}
            {cotSeleccionada.notas && (
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 mb-6">
                <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-2">Notas y Condiciones</p>
                <p className="text-sm text-teal-800 font-semibold leading-relaxed">{cotSeleccionada.notas}</p>
              </div>
            )}

            {/* Métodos de pago y sucursales */}
            <InfoPagoSucursales metodos={metodosPago} sucursales={sucursales} modo="web" />

            {/* Firmas */}
            <div className="grid grid-cols-2 gap-6 mb-6 mt-6">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Firma del Cliente</p>
                <p className="text-xs text-slate-300 font-bold mt-2 uppercase">{cotSeleccionada.cliente_nombre}</p>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Firma Autorizada</p>
                <p className="text-xs text-slate-300 font-bold mt-2 uppercase">{tallerNombre}</p>
              </div>
            </div>

            {/* Marcas de aceite */}
            {marcasAceite.length > 0 && (
              <div className="border-t border-slate-100 pt-6 mb-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Marcas de Aceite que Trabajamos</p>
                <div className="flex justify-center items-center gap-6 flex-wrap">
                  {marcasAceite.map((m, i) => (
                    <img key={i} src={m.logo_url} alt="" className="w-12 h-12 object-contain rounded-lg" />
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[10px] text-slate-400 font-bold">Esta cotización es válida por 30 días desde la fecha de emisión.</p>
              <p className="text-[10px] text-slate-400 font-bold">{tallerNombre}{tallerTelefono ? ` · ${tallerTelefono}` : ''}</p>
            </div>
          </div>
          <div className="h-1.5 bg-teal-600" />
        </div>
      )}
    </div>
  )
}