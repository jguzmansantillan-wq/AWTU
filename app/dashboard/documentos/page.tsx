'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Operacion = {
  id: string; tipo: 'servicio' | 'venta'; fecha: string; created_at: string
  nombre: string; telefono?: string; placa?: string; marca?: string
  monto: number; detalle: string; comprobante_emitido?: boolean
  items_detalle?: { descripcion: string; precio: number }[]
}

type Comprobante = {
  id: string; tipo: string; cliente_nombre: string; cliente_doc: string
  cliente_dir: string; monto: number; estado_sunat: string; created_at: string
  serie: string; numero: number; fecha_emision: string; payload?: any
}

type MetodoPago = { tipo: string; numero: string; titular: string }
type Sucursal = { nombre: string; direccion: string; telefono: string }

export default function DocumentosPage() {
  const comprobanteRef = useRef<HTMLDivElement>(null)
  const [tallerID, setTallerID] = useState('')
  const [tallerNombre, setTallerNombre] = useState('AWTU')
  const [tallerLogo, setTallerLogo] = useState('')
  const [tallerRuc, setTallerRuc] = useState('')
  const [tallerDireccion, setTallerDireccion] = useState('')
  const [tallerTelefono, setTallerTelefono] = useState('')
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [operaciones, setOperaciones] = useState<Operacion[]>([])
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [vista, setVista] = useState<'operaciones' | 'emitir' | 'historial'>('operaciones')
  const [opSeleccionada, setOpSeleccionada] = useState<Operacion | null>(null)
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [comprobanteParaDescargar, setComprobanteParaDescargar] = useState<Comprobante | null>(null)
  const [resultadoFactusmart, setResultadoFactusmart] = useState<any>(null)
  const [consultandoDoc, setConsultandoDoc] = useState(false)

  const [form, setForm] = useState({
    tipo: 'boleta', cliente_nombre: '', cliente_doc: '',
    cliente_dir: '', igv: '18', modo: 'demo',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres')
        .select('id, nombre, logo_url, ruc, direccion, telefono, metodos_pago, sucursales')
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
        if (s.caja_marca && s.precio_caja > 0) items.push({ descripcion: `Aceite Caja: ${s.caja_marca}`, precio: s.precio_caja })
        if (s.refrig_marca && s.precio_refrig > 0) items.push({ descripcion: `Refrigerante: ${s.refrig_marca}`, precio: s.precio_refrig })
        if (s.bujia_marca && s.precio_bujias > 0) items.push({ descripcion: `Bujías: ${s.bujia_marca}`, precio: s.precio_bujias })
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
          nombre: s.nombre || '-', telefono: s.telefono,
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
          nombre: v.nombre || 'Cliente directo', telefono: v.telefono,
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
    setForm({ tipo: 'boleta', cliente_nombre: op.nombre !== 'Cliente directo' ? op.nombre : '', cliente_doc: '', cliente_dir: '', igv: '18', modo: 'demo' })
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

  // Consulta automática de DNI/RUC al salir del campo
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
          cliente_nombre: data.nombre || prev.cliente_nombre,
          cliente_dir: data.direccion || prev.cliente_dir,
        }))
      }
    } catch {}
    setConsultandoDoc(false)
  }

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setOk(false); setResultadoFactusmart(null)

    try {
      // 1. Verificar límite
      const { data: limite } = await supabase.rpc('verificar_limite', { p_taller_id: tallerID, p_tipo: 'comprobantes' })
      if (!limite) { setError('Límite mensual de comprobantes alcanzado'); setLoading(false); return }

      // 2. Llamar a Factusmart API
      const itemsParaFS = (opSeleccionada?.items_detalle || []).map(i => ({
        descripcion: i.descripcion,
        cantidad: 1,
        precio_unitario: i.precio,
      }))

      const fsRes = await fetch('/api/factusmart/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: form.tipo,
          cliente_nombre: form.cliente_nombre,
          cliente_doc: form.cliente_doc,
          cliente_dir: form.cliente_dir,
          items: itemsParaFS,
          modo: form.modo,
        }),
      })

      const fsData = await fsRes.json()
      setResultadoFactusmart(fsData)

      if (!fsData.ok) {
        setError(`Error Factusmart: ${JSON.stringify(fsData.detalle || fsData.error)}`)
        setLoading(false)
        return
      }

      // 3. Guardar en Supabase con datos reales de Factusmart
      const igvPct = parseFloat(form.igv)
      const igvRate = igvPct / 100
      const montoNum = opSeleccionada?.monto || 0
      const sub = parseFloat((montoNum / (1 + igvRate)).toFixed(2))
      const igvMon = parseFloat((montoNum - sub).toFixed(2))

      const partes = (fsData.serie_numero || '').split('-')
      const serieFS = partes[0] || (form.tipo === 'factura' ? 'F001' : 'B001')
      const numeroFS = parseInt(partes[1] || '1')

      const { error: dbError } = await supabase.from('comprobantes').insert({
        taller_id: tallerID,
        servicio_id: opSeleccionada?.tipo === 'servicio' ? opSeleccionada.id : null,
        tipo: form.tipo,
        serie: serieFS,
        numero: numeroFS,
        fecha_emision: new Date().toISOString().slice(0, 10),
        cliente_nombre: form.cliente_nombre,
        cliente_doc: form.cliente_doc,
        cliente_dir: form.cliente_dir,
        monto: montoNum,
        estado_sunat: fsData.aceptado_por_sunat ? 'emitido' : 'pendiente',
        payload: {
          items: opSeleccionada?.items_detalle || [],
          igv_pct: igvPct,
          subtotal: sub,
          igv: igvMon,
          telefono: opSeleccionada?.telefono || '',
          external_id: fsData.external_id,
          entorno: fsData.entorno,
          pdf_base64: fsData.pdf_base64,
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

  const descargarPDF = (c: Comprobante) => {
    const pdfBase64 = c.payload?.pdf_base64
    if (!pdfBase64) { alert('PDF no disponible para este comprobante'); return }
    const link = document.createElement('a')
    link.href = pdfBase64
    link.download = `${c.serie}-${String(c.numero).padStart(6, '0')}.pdf`
    link.click()
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
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
    setComprobanteParaDescargar(null)
  }

  const enviarWhatsApp = (c: Comprobante) => {
    const tel = (c.payload?.telefono || '').replace(/\D/g, '')
    const nro = `${c.serie}-${String(c.numero).padStart(6, '0')}`
    const items = Array.isArray(c.payload?.items) ? c.payload.items : []
    const lineas = items.map((i: any) => `  • ${i.descripcion}: S/ ${(i.precio || 0).toFixed(2)}`).join('\n')
    const pagoInfo = metodosPago.length > 0
      ? `\n💳 *MÉTODOS DE PAGO:*\n${metodosPago.map(m => `  • ${m.tipo}: ${m.numero}${m.titular ? ` (${m.titular})` : ''}`).join('\n')}`
      : ''
    const texto =
      `🧾 *COMPROBANTE DE PAGO*\n` +
      `📋 ${nro} (${c.tipo?.toUpperCase()})\n` +
      `🏪 ${tallerNombre}${tallerRuc ? ` · RUC: ${tallerRuc}` : ''}\n` +
      `📍 ${tallerDireccion || ''}${tallerTelefono ? ` · Tel: ${tallerTelefono}` : ''}\n` +
      `📅 ${c.fecha_emision || new Date(c.created_at).toLocaleDateString('es-PE')}\n\n` +
      `👤 Cliente: ${c.cliente_nombre}\n` +
      (c.cliente_doc ? `📌 ${c.tipo === 'factura' ? 'RUC' : 'DNI'}: ${c.cliente_doc}\n` : '') +
      `\n*DETALLE:*\n${lineas}\n\n` +
      `💰 *TOTAL: S/ ${(c.monto || 0).toFixed(2)}*` +
      pagoInfo +
      `\n\n¡Gracias por su preferencia! 🙏`
    if (!tel) {
      const num = prompt('Ingresa el número WhatsApp del cliente (sin código de país):')
      if (!num) return
      window.open(`https://wa.me/51${num.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank')
      return
    }
    window.open(`https://wa.me/51${tel}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const igvRate = parseFloat(form.igv) / 100
  const montoOp = opSeleccionada?.monto || 0
  const subtotalPreview = montoOp / (1 + igvRate)
  const igvPreview = montoOp - subtotalPreview

  const filtradas = operaciones.filter(op =>
    op.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    op.placa?.toLowerCase().includes(busqueda.toLowerCase()) ||
    op.detalle?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const inp = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
  const lbl = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block"

  const EncabezadoComercial = ({ modo }: { modo: 'jpg' }) => (
    <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
        {tallerLogo
          ? <img src={tallerLogo} style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '12px', border: '1px solid #f1f5f9' }} crossOrigin="anonymous" />
          : <div style={{ width: '64px', height: '64px', background: '#0f172a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔧</div>}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{tallerNombre}</div>
          {tallerRuc && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>RUC: {tallerRuc}</div>}
          {tallerDireccion && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>{tallerDireccion}</div>}
          {tallerTelefono && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>Tel: {tallerTelefono}</div>}
        </div>
      </div>
      {(metodosPago.length > 0 || sucursales.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: metodosPago.length && sucursales.length ? '1fr 1fr' : '1fr', gap: '12px', marginTop: '12px' }}>
          {metodosPago.length > 0 && (
            <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>Métodos de Pago</div>
              {metodosPago.map((m, i) => (
                <div key={i} style={{ fontSize: '10px', color: '#334155', fontWeight: 600, marginBottom: '2px' }}>
                  <span style={{ fontWeight: 900, color: '#0f172a' }}>{m.tipo}:</span> {m.numero}{m.titular ? ` — ${m.titular}` : ''}
                </div>
              ))}
            </div>
          )}
          {sucursales.length > 0 && (
            <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>Sucursales</div>
              {sucursales.map((s, i) => (
                <div key={i} style={{ fontSize: '10px', color: '#334155', fontWeight: 600, marginBottom: '2px' }}>
                  <span style={{ fontWeight: 900, color: '#0f172a' }}>{s.nombre}:</span> {s.direccion}{s.telefono ? ` · ${s.telefono}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">

      {comprobanteParaDescargar && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div ref={comprobanteRef} style={{ width: '420px', background: '#ffffff', fontFamily: 'Arial, sans-serif', padding: '40px 32px' }}>
            <EncabezadoComercial modo="jpg" />
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                display: 'inline-block', background: comprobanteParaDescargar.tipo === 'factura' ? '#dbeafe' : '#d1fae5',
                color: comprobanteParaDescargar.tipo === 'factura' ? '#1e40af' : '#065f46',
                fontWeight: 900, fontSize: '13px', textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '8px 20px', borderRadius: '20px',
              }}>
                {comprobanteParaDescargar.tipo === 'factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}
              </div>
              <div style={{ marginTop: '10px', fontWeight: 900, fontSize: '18px', color: '#1e40af', letterSpacing: '0.1em' }}>
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
              {comprobanteParaDescargar.cliente_dir && (
                <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>{comprobanteParaDescargar.cliente_dir}</div>
              )}
            </div>
            <div style={{ marginBottom: '16px', border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#0f172a' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Descripción</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Precio</span>
              </div>
              {(Array.isArray(comprobanteParaDescargar.payload?.items) ? comprobanteParaDescargar.payload.items : []).map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', flex: 1, marginRight: '8px' }}>{item.descripcion}</span>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a', flexShrink: 0 }}>S/ {(item.precio || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '20px' }}>
              {comprobanteParaDescargar.payload?.subtotal != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Subtotal</span>
                  <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: 700 }}>S/ {Number(comprobanteParaDescargar.payload.subtotal).toFixed(2)}</span>
                </div>
              )}
              {comprobanteParaDescargar.payload?.igv != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>IGV ({comprobanteParaDescargar.payload.igv_pct || 18}%)</span>
                  <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: 700 }}>S/ {Number(comprobanteParaDescargar.payload.igv).toFixed(2)}</span>
                </div>
              )}
              <div style={{ background: '#0f172a', borderRadius: '12px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
                <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em' }}>S/ {(comprobanteParaDescargar.monto || 0).toFixed(2)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{
                background: comprobanteParaDescargar.estado_sunat === 'emitido' ? '#d1fae5' : '#fef3c7',
                color: comprobanteParaDescargar.estado_sunat === 'emitido' ? '#065f46' : '#92400e',
                fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.1em', padding: '6px 16px', borderRadius: '20px', display: 'inline-block',
              }}>
                Estado: {comprobanteParaDescargar.estado_sunat?.toUpperCase()}
              </span>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {tallerNombre}{tallerRuc ? ` · RUC ${tallerRuc}` : ''}{tallerTelefono ? ` · ${tallerTelefono}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Documentos</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Emisión de comprobantes electrónicos SUNAT</p>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'operaciones', label: `📋 Operaciones (${operaciones.length})` },
            { key: 'historial', label: `🧾 Comprobantes (${comprobantes.length})` },
          ].map(v => (
            <button key={v.key} onClick={() => setVista(v.key as any)}
              className={`px-4 py-2.5 text-xs rounded-xl font-black uppercase tracking-widest transition-all ${
                vista === v.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>{v.label}</button>
          ))}
        </div>
      </div>

      {ok && <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl font-bold text-sm">✅ Comprobante emitido y registrado correctamente</div>}

      {/* OPERACIONES */}
      {vista === 'operaciones' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 mb-4">
            <span className="text-slate-400">🔍</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, placa o detalle..."
              className="bg-transparent outline-none text-sm font-semibold text-slate-700 flex-1" />
          </div>
          {filtradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-black text-sm text-slate-300 uppercase tracking-widest">Sin operaciones registradas</p>
            </div>
          ) : filtradas.map(op => (
            <div key={op.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 transition-all hover:shadow-md ${
              op.comprobante_emitido ? 'border-green-100' : 'border-slate-100 hover:border-blue-200'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm shadow-lg ${
                op.tipo === 'servicio' ? 'bg-blue-600 shadow-blue-200' : 'bg-emerald-500 shadow-emerald-200'
              }`}>
                {op.tipo === 'servicio' ? (op.placa?.slice(0, 3) || '🔧') : '🛒'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {op.placa && <span className="font-black text-slate-900 uppercase text-sm">{op.placa}</span>}
                  <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase ${
                    op.tipo === 'servicio' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>{op.tipo === 'servicio' ? 'Servicio' : 'Venta POS'}</span>
                  {op.comprobante_emitido && (
                    <span className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase bg-green-100 text-green-700">✓ Facturado</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 font-semibold">{op.nombre}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{op.detalle}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-slate-900 text-lg">S/ {op.monto.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400 font-bold">{op.fecha}</p>
                <button onClick={() => abrirEmision(op)}
                  className={`mt-2 px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    op.comprobante_emitido
                      ? 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 active:scale-95'
                  }`}>
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
            <div className="flex items-center gap-3 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm ${
                opSeleccionada.tipo === 'servicio' ? 'bg-blue-600' : 'bg-emerald-500'
              }`}>
                {opSeleccionada.tipo === 'servicio' ? (opSeleccionada.placa?.slice(0, 3) || '🔧') : '🛒'}
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-800 text-sm uppercase">{opSeleccionada.placa || 'Venta POS'} · {opSeleccionada.nombre}</p>
                <p className="text-xs text-slate-500 font-bold">{opSeleccionada.items_detalle?.length || 0} item(s) · S/ {opSeleccionada.monto.toFixed(2)}</p>
              </div>
              <button onClick={() => setVista('operaciones')} className="text-slate-400 hover:text-slate-600 font-black text-lg">✕</button>
            </div>

            {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-bold text-sm">❌ {error}</div>}

            <form onSubmit={handleEmitir} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-2xl">{form.tipo === 'factura' ? '📄' : '🧾'}</span>
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase">{form.tipo === 'factura' ? 'Factura' : 'Boleta de Venta'}</p>
                  <p className="text-[10px] text-slate-400 font-bold">DNI (8 dígitos) = Boleta · RUC (11 dígitos) = Factura</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Cliente / Razón Social</label>
                  <div className="relative">
                    <input name="cliente_nombre" value={form.cliente_nombre} onChange={handleChange} required
                      placeholder="Nombre del cliente" className={inp} />
                    {consultandoDoc && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className={lbl}>
                    DNI / RUC
                    {consultandoDoc && <span className="ml-2 text-[9px] text-blue-500 font-bold animate-pulse">⏳ Consultando RENIEC/SUNAT...</span>}
                  </label>
                  <input
                    name="cliente_doc"
                    value={form.cliente_doc}
                    onChange={handleChange}
                    onBlur={(e) => consultarCliente(e.target.value)}
                    placeholder="DNI (8) o RUC (11)"
                    maxLength={11}
                    className={inp}
                  />
                  {form.cliente_doc.length === 8 && !consultandoDoc && <p className="text-[10px] text-blue-500 font-bold mt-1">→ Boleta de Venta</p>}
                  {form.cliente_doc.length === 11 && !consultandoDoc && <p className="text-[10px] text-emerald-500 font-bold mt-1">→ Factura</p>}
                </div>
              </div>

              <div>
                <label className={lbl}>Dirección</label>
                <input name="cliente_dir" value={form.cliente_dir} onChange={handleChange}
                  placeholder="Dirección del cliente (se completa automáticamente con RUC)" className={inp} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>IGV (%)</label>
                  <input name="igv" type="number" value={form.igv} onChange={handleChange} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Modo de emisión</label>
                  <select name="modo" value={form.modo} onChange={handleChange} className={inp}>
                    <option value="demo">🧪 Demo (prueba)</option>
                    <option value="produccion">🚀 Producción</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={lbl}>Items del comprobante</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex justify-between px-3 py-2 bg-slate-900">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Descripción</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Precio</span>
                  </div>
                  {(opSeleccionada.items_detalle || []).map((item, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <span className="text-xs font-semibold text-slate-700 uppercase flex-1 mr-4">{item.descripcion}</span>
                      <span className="text-xs font-black text-slate-900 shrink-0">S/ {item.precio.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm shadow-lg shadow-blue-200 active:scale-95">
                {loading ? '⏳ Conectando con SUNAT...' : `🧾 Emitir ${form.tipo === 'factura' ? 'Factura' : 'Boleta'} ${form.modo === 'demo' ? '(Demo)' : ''}`}
              </button>
            </form>

            {/* Resultado Factusmart */}
            {resultadoFactusmart && resultadoFactusmart.ok && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <p className="font-black text-emerald-700 text-sm mb-3">✅ Comprobante emitido por Factusmart</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500 font-bold">Serie/Número:</span> <span className="font-black">{resultadoFactusmart.serie_numero}</span></div>
                  <div><span className="text-slate-500 font-bold">Estado:</span> <span className="font-black">{resultadoFactusmart.estado_descripcion}</span></div>
                  <div><span className="text-slate-500 font-bold">SUNAT:</span> <span className="font-black">{resultadoFactusmart.aceptado_por_sunat ? '✓ Aceptado' : 'Pendiente'}</span></div>
                  <div><span className="text-slate-500 font-bold">Entorno:</span> <span className="font-black capitalize">{resultadoFactusmart.entorno}</span></div>
                </div>
                {resultadoFactusmart.pdf_base64 && (
                  <button
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = resultadoFactusmart.pdf_base64
                      link.download = `${resultadoFactusmart.serie_numero}.pdf`
                      link.click()
                    }}
                    className="mt-3 w-full bg-blue-600 text-white font-black text-xs uppercase tracking-widest py-2.5 rounded-xl">
                    ⬇️ Descargar PDF oficial
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-fit">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vista previa</p>
            <div className="border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                {tallerLogo
                  ? <img src={tallerLogo} className="w-10 h-10 object-contain rounded-lg border border-slate-100" />
                  : <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-sm">🔧</div>}
                <div>
                  <p className="font-black text-slate-800 text-xs uppercase">{tallerNombre}</p>
                  {tallerRuc && <p className="text-[10px] text-slate-500 font-bold">RUC: {tallerRuc}</p>}
                  {tallerDireccion && <p className="text-[10px] text-slate-500 font-bold truncate max-w-40">{tallerDireccion}</p>}
                  {tallerTelefono && <p className="text-[10px] text-slate-500 font-bold">Tel: {tallerTelefono}</p>}
                </div>
              </div>
              {metodosPago.length > 0 && (
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-[8px] font-black text-green-700 uppercase tracking-widest mb-1">Métodos de pago</p>
                  {metodosPago.slice(0, 2).map((m, i) => (
                    <p key={i} className="text-[9px] text-slate-600 font-semibold">{m.tipo}: {m.numero}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 space-y-3">
              <div className="text-center border-b border-slate-100 pb-3">
                <p className="font-black text-slate-700 uppercase text-sm mt-1">{form.tipo === 'boleta' ? 'BOLETA DE VENTA' : 'FACTURA'}</p>
                <p className="text-[10px] text-slate-400 font-bold">
                  {form.tipo === 'boleta' ? 'B001' : 'F001'}-{String(comprobantes.filter(c => c.tipo === form.tipo).length + 1).padStart(6, '0')}
                </p>
              </div>
              {form.cliente_nombre && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold">Cliente</span>
                  <span className="font-black text-slate-800 text-right max-w-32 truncate">{form.cliente_nombre}</span>
                </div>
              )}
              {form.cliente_doc && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-bold">{form.tipo === 'factura' ? 'RUC' : 'DNI'}</span>
                  <span className="font-black text-slate-800">{form.cliente_doc}</span>
                </div>
              )}
              {(opSeleccionada.items_detalle || []).length > 0 && (
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  {(opSeleccionada.items_detalle || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="text-slate-600 font-semibold truncate flex-1 mr-2">{item.descripcion}</span>
                      <span className="font-black text-slate-800 shrink-0">S/ {item.precio.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {montoOp > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span className="font-bold">Subtotal</span>
                    <span className="font-black">S/ {subtotalPreview.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="font-bold">IGV ({form.igv}%)</span>
                    <span className="font-black">S/ {igvPreview.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="font-black text-slate-800">TOTAL</span>
                    <span className="font-black text-blue-600 text-base">S/ {montoOp.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                {form.modo === 'demo' ? '🧪 Modo Demo activo' : '🚀 Modo Producción'}
              </p>
              <p className="text-[10px] text-blue-700 font-bold mt-1">
                {form.modo === 'demo' ? 'El comprobante no tendrá validez fiscal.' : 'El comprobante será enviado a SUNAT.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      {vista === 'historial' && (
        <div className="space-y-3">
          {comprobantes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <p className="text-4xl mb-3">🧾</p>
              <p className="font-black text-sm text-slate-300 uppercase tracking-widest">Sin comprobantes emitidos</p>
              <button onClick={() => setVista('operaciones')}
                className="mt-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl">
                Ver operaciones pendientes
              </button>
            </div>
          ) : comprobantes.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden ${
                c.tipo === 'factura' ? 'bg-blue-100' : 'bg-emerald-100'
              }`}>
                {tallerLogo
                  ? <img src={tallerLogo} className="w-full h-full object-contain p-1" />
                  : (c.tipo === 'factura' ? '📄' : '🧾')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-slate-900 text-sm">{c.serie}-{String(c.numero).padStart(6, '0')}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase ${
                    c.estado_sunat === 'emitido' ? 'bg-green-100 text-green-700' :
                    c.estado_sunat === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{c.estado_sunat}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase bg-slate-100 text-slate-500 capitalize">{c.tipo}</span>
                  {c.payload?.entorno === 'prueba' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-lg font-black uppercase bg-amber-100 text-amber-700">Demo</span>
                  )}
                </div>
                <p className="font-semibold text-slate-700 text-sm">{c.cliente_nombre}</p>
                {c.cliente_doc && (
                  <p className="text-[10px] text-slate-400 font-bold">{c.tipo === 'factura' ? 'RUC' : 'DNI'}: {c.cliente_doc}</p>
                )}
                {Array.isArray(c.payload?.items) && c.payload.items.length > 0 && (
                  <p className="text-[10px] text-slate-400 font-bold truncate">
                    {c.payload.items.slice(0, 2).map((i: any) => i.descripcion).join(' · ')}
                    {c.payload.items.length > 2 ? ` +${c.payload.items.length - 2} más` : ''}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-slate-900 text-lg">S/ {(c.monto || 0).toFixed(2)}</p>
                <p className="text-[10px] text-slate-400 font-bold">
                  {c.fecha_emision || new Date(c.created_at).toLocaleDateString('es-PE')}
                </p>
                <div className="flex items-center gap-1.5 justify-end mt-2">
                  <button onClick={() => enviarWhatsApp(c)} title="Enviar por WhatsApp"
                    className="w-8 h-8 bg-green-100 hover:bg-green-200 rounded-lg flex items-center justify-center text-green-600 transition-all text-sm">
                    💬
                  </button>
                  {c.payload?.pdf_base64 ? (
                    <button onClick={() => descargarPDF(c)} title="Descargar PDF oficial"
                      className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center text-red-600 transition-all text-sm">
                      📄
                    </button>
                  ) : (
                    <button onClick={() => descargarJPG(c)} title="Descargar JPG"
                      className="w-8 h-8 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center text-blue-600 transition-all text-sm">
                      📥
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}