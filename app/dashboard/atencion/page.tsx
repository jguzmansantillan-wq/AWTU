'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import ModalCotizador from '@/components/ModalCotizador'

type ProductoAdicional = { nombre: string; precio: string }
type OtroServicio = { detalle: string; precio: string }
type ItemInventario = { id: string; nombre: string; categoria: string; precio: number; costo: number; stock: number }

const METODOS_PAGO = [
  { key: 'efectivo', icon: '💵', label: 'Efectivo' },
  { key: 'yape', icon: '📱', label: 'Yape/Plin' },
  { key: 'transferencia', icon: '🏦', label: 'Transferencia' },
  { key: 'tarjeta', icon: '💳', label: 'Tarjeta' },
]

function AutocompleteInput({
  value, onChange, onSelect, placeholder, className, items
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (item: ItemInventario) => void
  placeholder: string
  className?: string
  items: ItemInventario[]
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
          position: 'absolute', top: '100%', left: 0, right: 0,
          zIndex: 99999, marginTop: '4px', background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: '12px',
          boxShadow: '0 20px 40px -8px rgba(0,0,0,0.5)',
          maxHeight: '280px', overflowY: 'auto'
        }}>
          {filtrados.map(item => (
            <div
              key={item.id}
              onMouseDown={() => { onSelect(item); setOpen(false) }}
              style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                <p className="font-display" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', margin: 0 }}>{item.nombre}</p>
                <p className="font-display" style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>{item.categoria} · Stock: {item.stock}</p>
              </div>
              <p className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-teal)', flexShrink: 0, margin: 0 }}>S/ {item.precio.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PrecioBox({ color, value, onChange }: { color: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border" style={{ borderColor: color + '40', background: color + '14' }}>
      <span className="font-display font-bold text-sm shrink-0" style={{ color }}>S/</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0.00"
        step="0.10"
        className="font-mono bg-transparent outline-none font-bold text-base w-full"
        style={{ color }}
      />
    </div>
  )
}

function SecHead({ icon, title, sub, accent }: { icon: string; title: string; sub: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-t-2xl" style={{ background: 'var(--surface-2)', borderBottom: `1px solid ${accent}40` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: accent + '1f', border: `1px solid ${accent}40` }}>{icon}</div>
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-widest leading-none" style={{ color: 'var(--text)' }}>{title}</p>
        <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────

export default function AtencionPage() {
  const [tallerID, setTallerID] = useState('')
  const [tallerNombre, setTallerNombre] = useState('')
  const [tallerLogo, setTallerLogo] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')
  const [datosCartilla, setDatosCartilla] = useState<any>(null)
  const cartillaRef = useRef<HTMLDivElement>(null)
  const [inventario, setInventario] = useState<ItemInventario[]>([])
  const [showCotizador, setShowCotizador] = useState(false)

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [placa, setPlaca] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [cumpleanos, setCumpleanos] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [anio, setAnio] = useState('')
  const [km, setKm] = useState('')
  const [frecuencia, setFrecuencia] = useState('5000')
  const [kmDiarios, setKmDiarios] = useState('30')

  const [aceiteMarca, setAceiteMarca] = useState('')
  const [aceiteVisc, setAceiteVisc] = useState('')
  const [aceiteCantidad, setAceiteCantidad] = useState('')
  const [filtroAceite, setFiltroAceite] = useState('')
  const [filtroAire, setFiltroAire] = useState('')
  const [precioAceite, setPrecioAceite] = useState('')

  const [cajaMarca, setCajaMarca] = useState('')
  const [cajaTipo, setCajaTipo] = useState('Mecánica')
  const [precioCaja, setPrecioCaja] = useState('')

  const [refrigMarca, setRefrigMarca] = useState('')
  const [refrigColor, setRefrigColor] = useState('')
  const [precioRefrig, setPrecioRefrig] = useState('')

  const [bujaMarca, setBujaMarca] = useState('')
  const [bujaModelo, setBujaModelo] = useState('')
  const [precioBujias, setPrecioBujias] = useState('')

  const [productosAd, setProductosAd] = useState<ProductoAdicional[]>([])
  const [otrosServicios, setOtrosServicios] = useState<OtroServicio[]>([])

  const [metodoPago, setMetodoPago] = useState('efectivo')

  const total =
    (parseFloat(precioAceite) || 0) +
    (parseFloat(precioCaja) || 0) +
    (parseFloat(precioRefrig) || 0) +
    (parseFloat(precioBujias) || 0) +
    productosAd.reduce((s, p) => s + (parseFloat(p.precio) || 0), 0) +
    otrosServicios.reduce((s, o) => s + (parseFloat(o.precio) || 0), 0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('id, nombre, logo_url').eq('user_id', user.id).single()
      if (t) {
        setTallerID(t.id)
        setTallerNombre(t.nombre || 'AWTU')
        setTallerLogo(t.logo_url || '')
        const { data: inv } = await supabase.from('inventario')
          .select('id, nombre, categoria, precio, costo, stock')
          .eq('taller_id', t.id).order('nombre')
        setInventario(inv || [])
      }
    }
    init()
  }, [])

  const buscarPlaca = async () => {
    if (!placa || !tallerID) return
    const { data } = await supabase.from('servicios')
      .select('nombre, telefono, marca, modelo, anio, km, frecuencia, km_diarios')
      .eq('taller_id', tallerID).eq('placa', placa.toUpperCase())
      .order('created_at', { ascending: false }).limit(1)
    if (data && data.length > 0) {
      const s = data[0]
      setNombre(s.nombre || '')
      setTelefono(s.telefono || '')
      setMarca(s.marca || '')
      setModelo(s.modelo || '')
      setAnio(s.anio ? String(s.anio) : '')
      setKm(s.km ? String(s.km) : '')
      setFrecuencia(s.frecuencia ? String(s.frecuencia) : '5000')
      setKmDiarios(s.km_diarios ? String(s.km_diarios) : '30')
    }
  }

  const limpiar = () => {
    setPlaca(''); setNombre(''); setTelefono(''); setCumpleanos('')
    setMarca(''); setModelo(''); setAnio(''); setKm('')
    setFrecuencia('5000'); setKmDiarios('30')
    setFecha(new Date().toISOString().slice(0, 10))
    setAceiteMarca(''); setAceiteVisc(''); setAceiteCantidad('')
    setFiltroAceite(''); setFiltroAire(''); setPrecioAceite('')
    setCajaMarca(''); setCajaTipo('Mecánica'); setPrecioCaja('')
    setRefrigMarca(''); setRefrigColor(''); setPrecioRefrig('')
    setBujaMarca(''); setBujaModelo(''); setPrecioBujias('')
    setProductosAd([]); setOtrosServicios([])
    setMetodoPago('efectivo')
  }

  const generarCartillaJPG = async (datos: any) => {
    const { default: html2canvas } = await import('html2canvas')
    await new Promise(r => setTimeout(r, 500))
    if (!cartillaRef.current) return
    const canvas = await html2canvas(cartillaRef.current, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      width: 400, height: cartillaRef.current.offsetHeight,
    })
    const link = document.createElement('a')
    link.download = `Cartilla_${datos.placa}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
  }

  const guardar = async () => {
    if (!placa || !nombre) { setError('Placa y nombre del cliente son obligatorios'); return }
    setLoading(true); setError(''); setOk(false)

    const { data: limite } = await supabase.rpc('verificar_limite', { p_taller_id: tallerID, p_tipo: 'servicios' })
    if (!limite) { setError('Límite mensual alcanzado'); setLoading(false); return }

    const kmNum = km ? parseInt(km) : null
    const frecNum = frecuencia ? parseInt(frecuencia) : 5000
    const kmDiarNum = kmDiarios ? parseInt(kmDiarios) : 30
    const proximoKm = kmNum ? kmNum + frecNum : null
    const diasParaProximo = Math.round(frecNum / kmDiarNum)
    const fechaProx = new Date()
    fechaProx.setDate(fechaProx.getDate() + diasParaProximo)

    const otrosTexto = otrosServicios.map(o => o.detalle).filter(Boolean).join(', ')
    const precioOtrosTotal = otrosServicios.reduce((s, o) => s + (parseFloat(o.precio) || 0), 0)

    const { error: e } = await supabase.from('servicios').insert({
      taller_id: tallerID, fecha,
      placa: placa.toUpperCase(), nombre, telefono,
      cumpleanos: cumpleanos || null,
      marca: marca.toUpperCase(), modelo: modelo.toUpperCase(),
      anio: anio || null, km: kmNum,
      frecuencia: frecNum, km_diarios: kmDiarNum,
      proximo_km: proximoKm,
      fecha_proxima: fechaProx.toISOString().slice(0, 10),
      aceite_marca: aceiteMarca.toUpperCase(), aceite_visc: aceiteVisc.toUpperCase(),
      aceite_cantidad: aceiteCantidad ? parseFloat(aceiteCantidad) : null,
      filtro_aceite: filtroAceite.toUpperCase(), filtro_aire: filtroAire.toUpperCase(),
      precio_aceite: parseFloat(precioAceite) || 0,
      caja_marca: cajaMarca.toUpperCase(), caja_tipo: cajaTipo,
      precio_caja: parseFloat(precioCaja) || 0,
      refrig_marca: refrigMarca.toUpperCase(), refrig_color: refrigColor,
      precio_refrig: parseFloat(precioRefrig) || 0,
      bujia_marca: bujaMarca.toUpperCase(), bujia_modelo: bujaModelo,
      precio_bujias: parseFloat(precioBujias) || 0,
      otros_servicios: otrosTexto,
      precio_otros: precioOtrosTotal,
      productos_adicionales: productosAd,
      monto: total, estado_facturacion: 'Pendiente',
      metodo_pago: metodoPago,
    })

    if (e) { setError(e.message); setLoading(false); return }
    await supabase.rpc('incrementar_uso', { p_taller_id: tallerID, p_tipo: 'servicios' })

    const datos = {
      placa: placa.toUpperCase(), nombre, marca: marca.toUpperCase(),
      modelo: modelo.toUpperCase(), anio, fecha,
      aceiteMarca: aceiteMarca.toUpperCase(), aceiteVisc: aceiteVisc.toUpperCase(),
      aceiteCantidad, filtroAceite: filtroAceite.toUpperCase(),
      filtroAire: filtroAire.toUpperCase(), cajaMarca: cajaMarca.toUpperCase(),
      cajaTipo, refrigMarca: refrigMarca.toUpperCase(), refrigColor,
      bujaMarca: bujaMarca.toUpperCase(), bujaModelo,
      otrosServicios: otrosTexto, proximoKm, tallerNombre, tallerLogo,
    }

    setDatosCartilla(datos)
    setOk(true)
    limpiar()
    setLoading(false)
    setTimeout(async () => { await generarCartillaJPG(datos) }, 800)
  }

  const inp = "inp"
  const lbl = "lbl"

  const metodoActual = METODOS_PAGO.find(m => m.key === metodoPago)

  const invAceites = inventario.filter(i => i.categoria?.toLowerCase().includes('aceite') && !i.categoria?.toLowerCase().includes('caja'))
  const invFiltros = inventario.filter(i => i.categoria?.toLowerCase().includes('filtro'))
  const invCaja = inventario.filter(i => i.categoria?.toLowerCase().includes('caja'))
  const invRefrig = inventario.filter(i => i.categoria?.toLowerCase().includes('refrig'))
  const invBujias = inventario.filter(i => i.categoria?.toLowerCase().includes('buj'))
  const invTodos = inventario

  return (
    <div className="max-w-6xl mx-auto pb-10">

      {/* Modal cotización multi-opción */}
      {showCotizador && <ModalCotizador tallerID={tallerID} tallerNombre={tallerNombre} onClose={() => setShowCotizador(false)} />}

      {/* Cartilla oculta */}
      {datosCartilla && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div ref={cartillaRef} style={{ width: '400px', background: '#ffffff', fontFamily: 'Arial, sans-serif', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', overflow: 'hidden', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {datosCartilla.tallerLogo
                  ? <img src={datosCartilla.tallerLogo} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} crossOrigin="anonymous" />
                  : <span style={{ fontSize: '24px' }}>🔧</span>}
              </div>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{datosCartilla.tallerNombre}</div>
                <div style={{ color: '#60a5fa', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Control de Mantenimiento</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '20px', color: '#0f172a', textTransform: 'uppercase' }}>{datosCartilla.nombre}</div>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>{datosCartilla.marca} {datosCartilla.modelo} {datosCartilla.anio ? `(${datosCartilla.anio})` : ''}</div>
                <div style={{ color: '#2563eb', fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>{datosCartilla.fecha?.split('-').reverse().join('/')}</div>
              </div>
              <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '12px', padding: '8px 16px' }}>
                <div style={{ color: '#1d4ed8', fontWeight: 900, fontSize: '18px', letterSpacing: '0.1em' }}>{datosCartilla.placa}</div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '🛢️', label: 'Aceite Motor', value: datosCartilla.aceiteMarca ? `${datosCartilla.aceiteMarca} ${datosCartilla.aceiteVisc || ''}${datosCartilla.aceiteCantidad ? ` · ${datosCartilla.aceiteCantidad}LT` : ''}` : '-', bg: '#f8fafc', color: '#0f172a' },
                { icon: '🔵', label: 'Filtros', value: [datosCartilla.filtroAceite ? `AC:${datosCartilla.filtroAceite}` : '', datosCartilla.filtroAire ? `AI:${datosCartilla.filtroAire}` : ''].filter(Boolean).join(' | ') || '-', bg: '#f8fafc', color: '#0f172a' },
                { icon: '🌡️', label: 'Refrig.', value: datosCartilla.refrigMarca ? `${datosCartilla.refrigMarca}${datosCartilla.refrigColor ? ` ${datosCartilla.refrigColor}` : ''}` : '-', bg: datosCartilla.refrigMarca ? '#fff1f2' : '#f8fafc', color: datosCartilla.refrigMarca ? '#dc2626' : '#cbd5e1' },
                { icon: '⚙️', label: 'Aceite Caja', value: datosCartilla.cajaMarca || '-', bg: '#f8fafc', color: datosCartilla.cajaMarca ? '#0f172a' : '#cbd5e1' },
                { icon: '⚡', label: 'Bujías', value: datosCartilla.bujaMarca || '-', bg: datosCartilla.bujaMarca ? '#fefce8' : '#f8fafc', color: datosCartilla.bujaMarca ? '#92400e' : '#cbd5e1' },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{item.icon}</span>
                    <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</span>
                  </div>
                  <span style={{ color: item.color, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>{item.value}</span>
                </div>
              ))}
              {datosCartilla.otrosServicios && (
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🔧</span>
                    <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Servicio</span>
                  </div>
                  <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', textAlign: 'right', maxWidth: '220px' }}>{datosCartilla.otrosServicios}</span>
                </div>
              )}
            </div>
            <div style={{ background: '#0f172a', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#2563eb', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Retornar a los</div>
                <div style={{ color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kilómetros</div>
              </div>
              <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '36px', letterSpacing: '-0.02em' }}>
                {datosCartilla.proximoKm ? Number(datosCartilla.proximoKm).toLocaleString() : '---'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Nueva Atención</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Registro técnico completo del vehículo</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: '1 Identificación', accent: 'var(--accent-teal)' },
            { label: '2 Insumos', accent: 'var(--accent)' },
            { label: '3 Cierre', accent: 'var(--accent-yellow)' },
          ].map((s, i) => (
            <span key={s.label} className="font-display flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border"
              style={{ background: s.accent + '14', borderColor: s.accent + '40', color: s.accent }}>
              <span className="font-display w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: s.accent, color: 'var(--bg)' }}>{i + 1}</span>
              {s.label.slice(2)}
            </span>
          ))}
          <button onClick={limpiar} className="font-display ml-2 px-4 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest border"
            style={{ background: 'rgba(255,106,31,0.08)', color: 'var(--accent)', borderColor: 'rgba(255,106,31,0.25)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--bg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,106,31,0.08)'; e.currentTarget.style.color = 'var(--accent)' }}>
            ↺ Limpiar
          </button>
        </div>
      </div>

      {ok && (
        <div className="mb-5 px-5 py-4 rounded-2xl font-bold text-sm flex items-center justify-between border"
          style={{ background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>
          <span>✅ Atención registrada — Descargando cartilla...</span>
          <button onClick={() => datosCartilla && generarCartillaJPG(datosCartilla)}
            className="font-display font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
            style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
            📥 Descargar cartilla
          </button>
        </div>
      )}
      {error && (
        <div className="mb-5 px-5 py-4 rounded-2xl font-bold text-sm border"
          style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-8 flex flex-col gap-5">

          {/* PASO 1 */}
          <div className="card">
            <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.35)' }}>🚗</div>
              <div>
                <h3 className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>Paso 1 — Identificación del Vehículo y Cliente</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Ingresa la placa para autocompletar datos históricos</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={lbl}>Fecha de Servicio</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inp} />
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Placa del Vehículo</label>
                <div className="flex gap-2">
                  <input value={placa} onChange={e => setPlaca(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscarPlaca()}
                    placeholder="ABC-123"
                    className={inp + ' font-mono uppercase text-lg tracking-widest flex-1'}
                    style={{ color: 'var(--accent-teal)' }} />
                  <button onClick={buscarPlaca}
                    className="font-display shrink-0 px-5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                    style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
                    🔍 Buscar
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={lbl}>Nombre del Cliente</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo..." className={inp + ' uppercase'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Teléfono</label>
                  <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="900 000 000" className={inp + ' font-mono'} />
                </div>
                <div>
                  <label className={lbl}>Cumpleaños</label>
                  <input type="date" value={cumpleanos} onChange={e => setCumpleanos(e.target.value)} className={inp} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={lbl}>Marca</label><input value={marca} onChange={e => setMarca(e.target.value)} placeholder="Toyota" className={inp + ' uppercase'} /></div>
              <div><label className={lbl}>Modelo</label><input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Corolla" className={inp + ' uppercase'} /></div>
              <div><label className={lbl}>Año</label><input value={anio} onChange={e => setAnio(e.target.value)} placeholder="2022" className={inp + ' font-mono'} /></div>
            </div>
          </div>

          {/* MOTOR Y FILTROS */}
          <div className="rounded-2xl" style={{ border: '1px solid var(--border)' }}>
            <SecHead icon="🛢️" title="Motor y Filtros" sub="Aceite, viscosidad y filtros del motor" accent="var(--accent-teal)" />
            <div className="p-5" style={{ background: 'var(--surface)', borderRadius: '0 0 16px 16px' }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={lbl}>Aceite Motor</label>
                  <AutocompleteInput value={aceiteMarca} onChange={setAceiteMarca}
                    onSelect={item => { setAceiteMarca(item.nombre); setPrecioAceite(String(item.precio)) }}
                    placeholder="Marca de aceite..." className={inp + ' uppercase'}
                    items={invAceites.length > 0 ? invAceites : invTodos} />
                </div>
                <div>
                  <label className={lbl}>Viscosidad</label>
                  <input value={aceiteVisc} onChange={e => setAceiteVisc(e.target.value)} placeholder="5W-30" className={inp + ' uppercase font-mono'} />
                </div>
                <div>
                  <label className={lbl}>Cantidad (Lt)</label>
                  <input type="number" value={aceiteCantidad} onChange={e => setAceiteCantidad(e.target.value)} placeholder="4" min="0.5" step="0.5" className={inp + ' font-mono text-center text-lg'} />
                </div>
                <div>
                  <label className={lbl}>Filtro Aceite</label>
                  <AutocompleteInput value={filtroAceite} onChange={setFiltroAceite}
                    onSelect={item => { setFiltroAceite(item.nombre); setPrecioAceite(prev => String((parseFloat(prev) || 0) + item.precio)) }}
                    placeholder="Código filtro..." className={inp + ' uppercase'}
                    items={invFiltros.length > 0 ? invFiltros : invTodos} />
                </div>
                <div>
                  <label className={lbl}>Filtro Aire</label>
                  <AutocompleteInput value={filtroAire} onChange={setFiltroAire}
                    onSelect={item => { setFiltroAire(item.nombre); setPrecioAceite(prev => String((parseFloat(prev) || 0) + item.precio)) }}
                    placeholder="Código filtro..." className={inp + ' uppercase'}
                    items={invFiltros.length > 0 ? invFiltros : invTodos} />
                </div>
              </div>
              <div className="mt-4 pt-4 flex items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                  <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }}>Precio — Motor y Filtros</p>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Total cobrado por aceite + filtros</p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 min-w-40" style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.3)' }}>
                  <span className="font-display font-bold text-base" style={{ color: 'var(--accent-teal)' }}>S/</span>
                  <input type="number" value={precioAceite} onChange={e => setPrecioAceite(e.target.value)} placeholder="0.00" step="0.10"
                    className="font-mono bg-transparent outline-none font-bold text-xl text-right flex-1" style={{ color: 'var(--accent-teal)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* CAJA · REFRIGERANTE · BUJÍAS */}
          <div className="rounded-2xl" style={{ border: '1px solid var(--border)' }}>
            <SecHead icon="⚙️" title="Aceite de Caja · Refrigerante · Bujías" sub="Insumos adicionales del vehículo" accent="var(--accent)" />
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5" style={{ background: 'var(--surface)', borderRadius: '0 0 16px 16px' }}>
              <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,106,31,0.06)', border: '1px solid rgba(255,106,31,0.2)' }}>
                <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>⚙️ Aceite de Caja</p>
                <div>
                  <label className={lbl}>Producto</label>
                  <AutocompleteInput value={cajaMarca} onChange={setCajaMarca}
                    onSelect={item => { setCajaMarca(item.nombre); setPrecioCaja(String(item.precio)) }}
                    placeholder="Marca..." className={inp + ' uppercase'}
                    items={invCaja.length > 0 ? invCaja : invTodos} />
                </div>
                <div>
                  <label className={lbl}>Tipo</label>
                  <select value={cajaTipo} onChange={e => setCajaTipo(e.target.value)} className={inp}>
                    <option>Mecánica</option><option>Automática</option><option>CVT</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Precio (S/)</label>
                  <PrecioBox color="#FF6A1F" value={precioCaja} onChange={setPrecioCaja} />
                </div>
              </div>
              <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: '#f87171' }}>🌡️ Refrigerante</p>
                <div>
                  <label className={lbl}>Producto</label>
                  <AutocompleteInput value={refrigMarca} onChange={setRefrigMarca}
                    onSelect={item => { setRefrigMarca(item.nombre); setPrecioRefrig(String(item.precio)) }}
                    placeholder="Marca..." className={inp + ' uppercase'}
                    items={invRefrig.length > 0 ? invRefrig : invTodos} />
                </div>
                <div>
                  <label className={lbl}>Color / Tipo</label>
                  <input value={refrigColor} onChange={e => setRefrigColor(e.target.value)} placeholder="Rojo, verde..." className={inp} />
                </div>
                <div>
                  <label className={lbl}>Precio (S/)</label>
                  <PrecioBox color="#f87171" value={precioRefrig} onChange={setPrecioRefrig} />
                </div>
              </div>
              <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,194,60,0.06)', border: '1px solid rgba(255,194,60,0.25)' }}>
                <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-yellow)' }}>⚡ Bujías</p>
                <div>
                  <label className={lbl}>Marca</label>
                  <AutocompleteInput value={bujaMarca} onChange={setBujaMarca}
                    onSelect={item => { setBujaMarca(item.nombre); setPrecioBujias(String(item.precio)) }}
                    placeholder="Marca..." className={inp + ' uppercase'}
                    items={invBujias.length > 0 ? invBujias : invTodos} />
                </div>
                <div>
                  <label className={lbl}>Modelo</label>
                  <input value={bujaModelo} onChange={e => setBujaModelo(e.target.value)} placeholder="Iridium, Platinum..." className={inp} />
                </div>
                <div>
                  <label className={lbl}>Precio (S/)</label>
                  <PrecioBox color="#FFC23C" value={precioBujias} onChange={setPrecioBujias} />
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCTOS ADICIONALES */}
          <div className="rounded-2xl" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ background: 'var(--surface-2)', borderBottom: '1px solid rgba(167,139,250,0.3)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.35)' }}>📦</div>
                <div>
                  <p className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>Productos Adicionales</p>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Agrega los productos que se usaron</p>
                </div>
              </div>
              <button onClick={() => setProductosAd([...productosAd, { nombre: '', precio: '' }])}
                className="font-display text-[10px] font-bold px-4 py-2 rounded-xl uppercase tracking-widest transition-all"
                style={{ background: 'rgba(167,139,250,0.14)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)' }}>
                + Agregar
              </button>
            </div>
            <div className="p-5" style={{ background: 'var(--surface)', borderRadius: '0 0 16px 16px' }}>
              {productosAd.length === 0 ? (
                <p className="text-center text-[10px] font-bold uppercase tracking-widest py-4" style={{ color: 'var(--text-muted)' }}>Presiona "+ Agregar" para añadir productos</p>
              ) : (
                <div className="space-y-3">
                  {productosAd.map((p, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <AutocompleteInput
                          value={p.nombre}
                          onChange={v => { const a = [...productosAd]; a[i].nombre = v; setProductosAd(a) }}
                          onSelect={item => { const a = [...productosAd]; a[i].nombre = item.nombre; a[i].precio = String(item.precio); setProductosAd(a) }}
                          placeholder="Nombre del producto..."
                          className={inp + ' uppercase'}
                          items={invTodos} />
                      </div>
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 min-w-32" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)' }}>
                        <span className="font-display font-bold text-sm" style={{ color: '#a78bfa' }}>S/</span>
                        <input type="number" value={p.precio}
                          onChange={e => { const a = [...productosAd]; a[i].precio = e.target.value; setProductosAd(a) }}
                          placeholder="0.00" step="0.10" className="font-mono bg-transparent outline-none font-bold text-base w-full" style={{ color: '#a78bfa' }} />
                      </div>
                      <button onClick={() => setProductosAd(productosAd.filter((_, j) => j !== i))} className="font-bold text-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* OTROS SERVICIOS */}
          <div className="rounded-2xl" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>🔧</div>
                <div>
                  <p className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>Otros Servicios / Mano de Obra</p>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Trabajos adicionales realizados</p>
                </div>
              </div>
              <button onClick={() => setOtrosServicios([...otrosServicios, { detalle: '', precio: '' }])}
                className="font-display text-[10px] font-bold px-4 py-2 rounded-xl uppercase tracking-widest transition-all"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                + Agregar
              </button>
            </div>
            <div className="p-5" style={{ background: 'var(--surface)', borderRadius: '0 0 16px 16px' }}>
              {otrosServicios.length === 0 ? (
                <p className="text-center text-[10px] font-bold uppercase tracking-widest py-4" style={{ color: 'var(--text-muted)' }}>Presiona "+ Agregar" para añadir servicios</p>
              ) : (
                <div className="space-y-3">
                  {otrosServicios.map((o, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <input value={o.detalle}
                        onChange={e => { const a = [...otrosServicios]; a[i].detalle = e.target.value; setOtrosServicios(a) }}
                        placeholder="Ej: Cambio de pastillas, alineación..."
                        className={inp + ' flex-1'} />
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 min-w-32" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <span className="font-display font-bold text-sm" style={{ color: 'var(--text-muted)' }}>S/</span>
                        <input type="number" value={o.precio}
                          onChange={e => { const a = [...otrosServicios]; a[i].precio = e.target.value; setOtrosServicios(a) }}
                          placeholder="0.00" step="0.10" className="font-mono bg-transparent outline-none font-bold text-base w-full" style={{ color: 'var(--text)' }} />
                      </div>
                      <button onClick={() => setOtrosServicios(otrosServicios.filter((_, j) => j !== i))} className="font-bold text-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO FLOTANTE */}
        <div className="xl:col-span-4 self-start sticky top-4">
          <div className="rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>⚡ Paso 3 — Cierre</p>
              <h3 className="font-display font-bold text-lg uppercase tracking-tighter mt-1" style={{ color: 'var(--text)' }}>Datos de Servicio</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="font-display text-[9px] font-bold uppercase tracking-widest text-center mb-2" style={{ color: 'var(--text-muted)' }}>Kilometraje de Ingreso</p>
                <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <input value={km} onChange={e => setKm(e.target.value)} placeholder="000000"
                    className="font-mono bg-transparent border-none outline-none w-full text-center font-bold text-4xl tracking-widest"
                    style={{ color: 'var(--text)' }} />
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>km actuales del vehículo</p>
                </div>
              </div>
              <div>
                <p className="font-display text-[9px] font-bold uppercase tracking-widest text-center mb-2" style={{ color: 'var(--text-muted)' }}>Total del Servicio</p>
                <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.3)' }}>
                  <p className="font-mono font-bold text-4xl tracking-tight" style={{ color: 'var(--accent-teal)' }}>{total.toFixed(2)}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>soles — calculado automático</p>
                </div>
              </div>
              {total > 0 && (
                <div className="rounded-2xl p-3 space-y-1 text-[10px] font-bold" style={{ background: 'var(--surface-2)' }}>
                  <p className="font-display text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Desglose</p>
                  {precioAceite && <div className="flex justify-between"><span style={{ color: 'var(--accent-teal)' }}>🔵 Motor y filtros</span><span className="font-mono" style={{ color: 'var(--text)' }}>S/ {precioAceite}</span></div>}
                  {precioCaja && <div className="flex justify-between"><span style={{ color: 'var(--accent)' }}>🟠 Aceite caja</span><span className="font-mono" style={{ color: 'var(--text)' }}>S/ {precioCaja}</span></div>}
                  {precioRefrig && <div className="flex justify-between"><span style={{ color: '#f87171' }}>🔴 Refrigerante</span><span className="font-mono" style={{ color: 'var(--text)' }}>S/ {precioRefrig}</span></div>}
                  {precioBujias && <div className="flex justify-between"><span style={{ color: 'var(--accent-yellow)' }}>🟡 Bujías</span><span className="font-mono" style={{ color: 'var(--text)' }}>S/ {precioBujias}</span></div>}
                  {productosAd.filter(p => p.precio).map((p, i) => (
                    <div key={i} className="flex justify-between"><span style={{ color: '#a78bfa' }}>🟣 {p.nombre || 'Adicional'}</span><span className="font-mono" style={{ color: 'var(--text)' }}>S/ {p.precio}</span></div>
                  ))}
                  {otrosServicios.filter(o => o.precio).map((o, i) => (
                    <div key={i} className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>⚪ {o.detalle || 'Servicio'}</span><span className="font-mono" style={{ color: 'var(--text)' }}>S/ {o.precio}</span></div>
                  ))}
                </div>
              )}

              {/* MÉTODO DE PAGO */}
              <div>
                <p className="font-display text-[9px] font-bold uppercase tracking-widest text-center mb-2" style={{ color: 'var(--text-muted)' }}>Método de Pago</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {METODOS_PAGO.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setMetodoPago(m.key)}
                      className="font-display flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      style={metodoPago === m.key
                        ? { background: 'rgba(33,199,184,0.15)', border: '1px solid rgba(33,199,184,0.5)', color: 'var(--accent-teal)' }
                        : { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)' }} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-display text-[9px] font-bold uppercase tracking-widest text-center mb-2" style={{ color: 'var(--text-muted)' }}>🔄 Frecuencia</p>
                  <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <input value={frecuencia} onChange={e => setFrecuencia(e.target.value)}
                      className="font-mono bg-transparent border-none outline-none w-full text-center font-bold text-2xl" style={{ color: 'var(--accent-teal)' }} />
                    <p className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>km por cambio</p>
                  </div>
                </div>
                <div>
                  <p className="font-display text-[9px] font-bold uppercase tracking-widest text-center mb-2" style={{ color: 'var(--text-muted)' }}>🕐 Diario</p>
                  <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <input value={kmDiarios} onChange={e => setKmDiarios(e.target.value)}
                      className="font-mono bg-transparent border-none outline-none w-full text-center font-bold text-2xl" style={{ color: 'var(--accent-yellow)' }} />
                    <p className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>km al día</p>
                  </div>
                </div>
              </div>

              {/* ── BOTONES PRINCIPALES ───────────────────────────────── */}
              <div className="flex flex-col gap-2">
                {/* Cotizar */}
                <button onClick={() => setShowCotizador(true)}
                  className="font-display w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}>
                  📋 Cotizar
                </button>
                {/* Guardar servicio */}
                <button onClick={guardar} disabled={loading}
                  className="font-display w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                  {metodoActual?.icon} {loading ? 'Guardando...' : `Guardar · ${metodoActual?.label}`}
                </button>
              </div>
              {/* ─────────────────────────────────────────────────────── */}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}