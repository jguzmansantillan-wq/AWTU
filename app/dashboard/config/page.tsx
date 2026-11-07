'use client'

import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

const PLANTILLA_DEFAULT = `🔧 *{taller}*

Hola *{cliente}*, te compartimos el resumen técnico de tu vehículo:

🚗 *VEHÍCULO:* {placa} ({marca})
📍 *KM ACTUAL:* {km} KM

⚙️ *SERVICIOS:*
{servicios}

⚠️ *PRÓXIMO CAMBIO:* A los *{proximo_km} KM*
📅 *Fecha estimada: {fecha_proxima}*

Gracias por confiar en nosotros. 🙏`

const CLAVE_DEFECTO = '1234'

type LogoMarca = { logo_url: string }
type MetodoPago = { tipo: string; numero: string; titular: string }
type Sucursal = { nombre: string; direccion: string; telefono: string }

function Modulo({ icon, iconBg, iconBorder, titulo, subtitulo, children, defaultOpen = false, accion }: {
  icon: string; iconBg: string; iconBorder: string; titulo: string
  subtitulo?: string; children: React.ReactNode; defaultOpen?: boolean; accion?: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden" style={{ padding: 0 }}>
      <button onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all"
        style={{ background: abierto ? 'var(--surface-2)' : 'transparent' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
          style={{ background: iconBg, border: `1px solid ${iconBorder}` }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>{titulo}</p>
          {subtitulo && <p className="text-[10px] font-bold mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{subtitulo}</p>}
        </div>
        {accion && <div onClick={e => e.stopPropagation()}>{accion}</div>}
        <span className="font-bold text-base transition-transform shrink-0"
          style={{ color: 'var(--text-muted)', transform: abierto ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {abierto && (
        <div className="px-5 pb-5 pt-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function ConfigPage() {
  const [tallerID, setTallerID] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [marcas, setMarcas] = useState<LogoMarca[]>([])
  const [subiendoMarca, setSubiendoMarca] = useState(false)
  const [plantilla, setPlantilla] = useState(PLANTILLA_DEFAULT)
  const [claveActualInput, setClaveActualInput] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [claveConfirm, setClaveConfirm] = useState('')
  const [mostrarClaveActualInput, setMostrarClaveActualInput] = useState(false)
  const [mostrarClaveNueva, setMostrarClaveNueva] = useState(false)
  const [guardandoClave, setGuardandoClave] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [apiRuc, setApiRuc] = useState('')
  const [apiModo, setApiModo] = useState('sandbox')
  const [serieFactura, setSerieFactura] = useState('F001')
  const [serieBoleta, setSerieBoleta] = useState('B001')
  const [uso, setUso] = useState<any>(null)
  const [plan, setPlan] = useState('basico')
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [accesoVerificado, setAccesoVerificado] = useState(false)
  const [claveAcceso, setClaveAcceso] = useState('')
  const [errorAcceso, setErrorAcceso] = useState('')
  const [verificandoAcceso, setVerificandoAcceso] = useState(false)
  const [mostrarClaveAcceso, setMostrarClaveAcceso] = useState(false)
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null)
  const [previstaProductos, setPrevistaProductos] = useState<any[]>([])
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState('')

  const lbl = 'block font-display text-[10px] font-bold uppercase tracking-widest mb-1.5'
  const inp = 'w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all outline-none'
  const selectCls = 'w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all outline-none appearance-none cursor-pointer'

  const limitesPlan: Record<string, { servicios: number; comprobantes: number; consultas: number }> = {
    basico: { servicios: 50, comprobantes: 50, consultas: 50 },
    pro: { servicios: 200, comprobantes: 200, consultas: 200 },
    exclusive: { servicios: 999999, comprobantes: 999999, consultas: 999999 },
  }
  const limites = limitesPlan[plan] || limitesPlan.basico

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('*').eq('user_id', user.id).single()
      if (!t) return
      setTallerID(t.id); setNombre(t.nombre || ''); setRuc(t.ruc || '')
      setTelefono(t.telefono || ''); setDireccion(t.direccion || '')
      setLogoUrl(t.logo_url || ''); setLogoPreview(t.logo_url || '')
      setPlantilla(t.whatsapp_plantilla || PLANTILLA_DEFAULT)
      setMarcas((Array.isArray(t.marcas_aceite) ? t.marcas_aceite : []).filter((m: any) => m && m.logo_url))
      setApiToken(t.apisunat_token || ''); setApiRuc(t.apisunat_ruc || '')
      setApiModo(t.apisunat_modo || 'sandbox'); setSerieFactura(t.serie_factura || 'F001')
      setSerieBoleta(t.serie_boleta || 'B001'); setPlan(t.plan || 'basico')
      setMetodosPago(Array.isArray(t.metodos_pago) ? t.metodos_pago : [])
      setSucursales(Array.isArray(t.sucursales) ? t.sucursales : [])
      if (!t.clave_inventario) await supabase.from('talleres').update({ clave_inventario: CLAVE_DEFECTO }).eq('id', t.id)
      const mesActual = new Date().toISOString().slice(0, 7) + '-01'
      const { data: u } = await supabase.from('uso_mensual').select('*').eq('taller_id', t.id).eq('mes', mesActual).maybeSingle()
      setUso(u); setLoading(false)
    }
    init()
  }, [])
    const subirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoLogo(true)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    const ext = file.name.split('.').pop()
    const path = `logos/${tallerID}.${ext}`
    const { error: upError } = await supabase.storage.from('talleres').upload(path, file, { upsert: true })
    if (upError) { setError('Error subiendo logo: ' + upError.message); setSubiendoLogo(false); return }
    const { data: urlData } = supabase.storage.from('talleres').getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()
    setLogoUrl(url)
    await supabase.from('talleres').update({ logo_url: url }).eq('id', tallerID)
    setSubiendoLogo(false)
    setOk('Logo actualizado'); setTimeout(() => setOk(''), 3000)
  }

  const quitarLogo = async () => {
    setLogoUrl(''); setLogoPreview('')
    await supabase.from('talleres').update({ logo_url: null }).eq('id', tallerID)
  }

  const subirLogoMarca = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (marcas.length >= 6) { setError('Máximo 6 logos de marcas'); return }
    setSubiendoMarca(true)
    const ext = file.name.split('.').pop()
    const path = `${tallerID}/${Date.now()}.${ext}`
    const { error: upError } = await supabase.storage.from('marcas').upload(path, file, { upsert: true })
    if (upError) { setError('Error subiendo logo: ' + upError.message); setSubiendoMarca(false); return }
    const { data: urlData } = supabase.storage.from('marcas').getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()
    const nuevasMarcas = [...marcas, { logo_url: url }]
    setMarcas(nuevasMarcas)
    await supabase.from('talleres').update({ marcas_aceite: nuevasMarcas }).eq('id', tallerID)
    setSubiendoMarca(false)
    setOk('Logo agregado'); setTimeout(() => setOk(''), 3000)
  }

  const eliminarMarca = async (index: number) => {
    const nuevasMarcas = marcas.filter((_, i) => i !== index)
    setMarcas(nuevasMarcas)
    await supabase.from('talleres').update({ marcas_aceite: nuevasMarcas }).eq('id', tallerID)
  }

  const agregarMetodoPago = () => setMetodosPago(prev => [...prev, { tipo: 'Yape', numero: '', titular: '' }])
  const actualizarMetodoPago = (i: number, campo: keyof MetodoPago, valor: string) => {
    setMetodosPago(prev => prev.map((m, idx) => idx === i ? { ...m, [campo]: valor } : m))
  }
  const eliminarMetodoPago = (i: number) => setMetodosPago(prev => prev.filter((_, idx) => idx !== i))

  const agregarSucursal = () => setSucursales(prev => [...prev, { nombre: '', direccion: '', telefono: '' }])
  const actualizarSucursal = (i: number, campo: keyof Sucursal, valor: string) => {
    setSucursales(prev => prev.map((s, idx) => idx === i ? { ...s, [campo]: valor } : s))
  }
  const eliminarSucursal = (i: number) => setSucursales(prev => prev.filter((_, idx) => idx !== i))

  const guardarPerfil = async () => {
    setGuardando(true); setError(''); setOk('')
    const { error: e } = await supabase.from('talleres').update({
      nombre, ruc, telefono, direccion,
      whatsapp_plantilla: plantilla,
      metodos_pago: metodosPago,
      sucursales: sucursales,
    }).eq('id', tallerID)
    if (e) { setError(e.message); setGuardando(false); return }
    setOk('Configuración guardada'); setGuardando(false)
    setTimeout(() => setOk(''), 3000)
  }

  const guardarClave = async () => {
    setError('')
    if (!claveActualInput.trim()) { setError('Ingresa la clave actual'); return }
    if (!claveNueva.trim()) { setError('Escribe la nueva clave'); return }
    if (claveNueva.length < 4) { setError('Mínimo 4 caracteres'); return }
    if (claveNueva !== claveConfirm) { setError('Las claves no coinciden'); return }
    setGuardandoClave(true)
    const { data: t, error: fetchErr } = await supabase.from('talleres').select('clave_inventario').eq('id', tallerID).single()
    if (fetchErr) { setError(fetchErr.message); setGuardandoClave(false); return }
    if ((t?.clave_inventario || '') !== claveActualInput.trim()) {
      setError('La clave actual es incorrecta'); setGuardandoClave(false); return
    }
    const { error: e } = await supabase.from('talleres').update({ clave_inventario: claveNueva }).eq('id', tallerID)
    if (e) { setError(e.message); setGuardandoClave(false); return }
    setClaveActualInput(''); setClaveNueva(''); setClaveConfirm('')
    setGuardandoClave(false)
    setOk('Clave actualizada'); setTimeout(() => setOk(''), 3000)
  }

  const guardarSunat = async () => {
    setGuardando(true); setError('')
    const { error: e } = await supabase.from('talleres').update({
      apisunat_token: apiToken, apisunat_ruc: apiRuc,
      apisunat_modo: apiModo, serie_factura: serieFactura, serie_boleta: serieBoleta,
    }).eq('id', tallerID)
    if (e) { setError(e.message); setGuardando(false); return }
    setOk('Config SUNAT guardada'); setGuardando(false)
    setTimeout(() => setOk(''), 3000)
  }

  const descargarPlantillaExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['NOMBRE', 'CATEGORIA', 'STOCK', 'COSTO', 'PRECIO', 'UBICACION'],
      ['ACEITE CASTROL 5W30', 'Aceite de Motor', 10, 45.00, 65.00, 'A1'],
    ])
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla_inventario.xlsx')
  }

  const leerExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivoExcel(file); setResultadoImport('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 })
        if (rows.length < 2) { setError('Archivo vacío'); return }
        const headers: string[] = (rows[0] as string[]).map(h => String(h).toUpperCase().trim())
        const idx = {
          nombre: headers.findIndex(h => h.includes('NOMBRE') || h.includes('PRODUCTO')),
          categoria: headers.findIndex(h => h.includes('CATEG')),
          stock: headers.findIndex(h => h.includes('STOCK') || h.includes('CANTIDAD')),
          costo: headers.findIndex(h => h.includes('COSTO') || h.includes('COMPRA')),
          precio: headers.findIndex(h => h.includes('PRECIO') || h.includes('VENTA')),
          ubicacion: headers.findIndex(h => h.includes('UBIC') || h.includes('ESTANTE')),
        }
        if (idx.nombre === -1) { setError('No se encontró columna NOMBRE'); return }
        const productos = rows.slice(1).filter((row: any) => row[idx.nombre]).map((row: any) => ({
          nombre: String(row[idx.nombre] || '').toUpperCase().trim(),
          categoria: idx.categoria >= 0 ? String(row[idx.categoria] || 'Otros').trim() : 'Otros',
          stock: idx.stock >= 0 ? parseInt(row[idx.stock]) || 0 : 0,
          costo: idx.costo >= 0 ? parseFloat(row[idx.costo]) || 0 : 0,
          precio: idx.precio >= 0 ? parseFloat(row[idx.precio]) || 0 : 0,
          ubicacion: idx.ubicacion >= 0 ? String(row[idx.ubicacion] || 'A1').toUpperCase().trim() : 'A1',
        }))
        setPrevistaProductos(productos); setError('')
      } catch { setError('Error leyendo el archivo') }
    }
    reader.readAsArrayBuffer(file)
  }

  const importarProductos = async () => {
    if (previstaProductos.length === 0) return
    setImportando(true); setResultadoImport('')
    let exitosos = 0; let fallidos = 0
    for (const p of previstaProductos) {
      const { error: e } = await supabase.from('inventario').insert({
        taller_id: tallerID, nombre: p.nombre, categoria: p.categoria,
        stock: p.stock, costo: p.costo, precio: p.precio, ubicacion: p.ubicacion,
      })
      if (e) fallidos++; else exitosos++
    }
    setImportando(false)
    setResultadoImport(`✅ ${exitosos} productos importados${fallidos > 0 ? ` · ❌ ${fallidos} fallidos` : ''}`)
    setPrevistaProductos([]); setArchivoExcel(null)
    setOk(`${exitosos} productos importados`); setTimeout(() => setOk(''), 5000)
  }

  const limpiarImport = () => { setPrevistaProductos([]); setArchivoExcel(null); setResultadoImport('') }

  const verificarAcceso = async () => {
    if (!claveAcceso.trim()) { setErrorAcceso('Ingresa la clave'); return }
    setVerificandoAcceso(true); setErrorAcceso('')
    const { data: t } = await supabase.from('talleres').select('clave_inventario').eq('id', tallerID).single()
    if (claveAcceso.trim() === (t?.clave_inventario || CLAVE_DEFECTO)) {
      setAccesoVerificado(true)
    } else {
      setErrorAcceso('Clave incorrecta')
    }
    setVerificandoAcceso(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid var(--accent-teal)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!accesoVerificado) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm rounded-3xl p-8 space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 32px 80px -12px rgba(0,0,0,0.5)' }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(255,106,31,0.12)', border: '1px solid rgba(255,106,31,0.35)' }}>🔐</div>
          <div>
            <h2 className="font-display font-bold text-lg uppercase tracking-tight" style={{ color: 'var(--text)' }}>Acceso a Configuración</h2>
            <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Ingresa la clave para continuar</p>
          </div>
        </div>
        <div>
          <label className={lbl}>Clave de acceso</label>
          <div className="relative">
            <input type={mostrarClaveAcceso ? 'text' : 'password'} value={claveAcceso}
              onChange={e => { setClaveAcceso(e.target.value); setErrorAcceso('') }}
              onKeyDown={e => e.key === 'Enter' && verificarAcceso()}
              placeholder="Ingresa tu clave..." autoFocus
              className={inp + ' font-mono tracking-widest pr-10'}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <button onClick={() => setMostrarClaveAcceso(!mostrarClaveAcceso)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {mostrarClaveAcceso ? '🙈' : '👁️'}
            </button>
          </div>
          {errorAcceso && <p className="text-xs font-bold mt-2" style={{ color: 'var(--accent)' }}>❌ {errorAcceso}</p>}
        </div>
        <button onClick={verificarAcceso} disabled={verificandoAcceso}
          className="font-display w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          {verificandoAcceso ? '⏳ Verificando...' : '🔓 Ingresar'}
        </button>
        <div className="pt-1 flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>¿Olvidaste tu clave?</p>
          <a href="https://wa.me/51925988464?text=Hola%2C%20necesito%20restablecer%20mi%20clave%20de%20Configuraci%C3%B3n%20en%20AWTU"
            target="_blank" rel="noopener noreferrer"
            className="font-display flex items-center gap-2 font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}>
            💬 Contactar Soporte
          </a>
        </div>
      </div>
    </div>
  )
    return (
    <div className="max-w-4xl mx-auto pb-10 space-y-3">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Configuración del Sistema</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Personaliza tu taller y mensajes</p>
      </div>
      {ok && <div className="px-4 py-3 rounded-xl font-bold text-sm border" style={{ background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>✅ {ok}</div>}
      {error && <div className="px-4 py-3 rounded-xl font-bold text-sm border" style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>❌ {error}</div>}

      <Modulo icon="🏪" iconBg="rgba(33,199,184,0.12)" iconBorder="rgba(33,199,184,0.35)" titulo="Perfil del Negocio" subtitulo="Nombre, logo, teléfono, dirección" defaultOpen={true}>
        <div>
          <label className={lbl}>Logotipo del Taller</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0" style={{ border: '2px dashed var(--border)', background: 'var(--surface-2)' }}>
              {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" /> : <span className="text-3xl">🏪</span>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-display font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl cursor-pointer" style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
                {subiendoLogo ? '⏳ Subiendo...' : '📤 Seleccionar archivo'}
                <input type="file" accept="image/*" onChange={subirLogo} className="hidden" />
              </label>
              {logoPreview && <button onClick={quitarLogo} className="font-display font-bold text-xs uppercase tracking-widest" style={{ color: 'var(--accent)' }}>🗑️ Quitar logo</button>}
            </div>
          </div>
        </div>
        <div>
          <label className={lbl}>Logos de Marcas ({marcas.length}/6)</label>
          {marcas.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {marcas.map((m, i) => (
                <div key={i} className="relative group">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden p-1.5" style={{ border: '2px solid var(--border)', background: 'var(--surface-2)' }}>
                    <img src={m.logo_url} alt="" className="w-full h-full object-contain" />
                  </div>
                  <button onClick={() => eliminarMarca(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {marcas.length < 6 && (
            <label className="font-display flex items-center justify-center gap-2 w-full py-3 rounded-xl cursor-pointer font-bold text-xs uppercase tracking-widest" style={{ background: 'rgba(33,199,184,0.08)', border: '2px dashed rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>
              {subiendoMarca ? '⏳ Subiendo...' : '📤 Subir logo de marca'}
              <input type="file" accept="image/*" onChange={subirLogoMarca} className="hidden" disabled={subiendoMarca} />
            </label>
          )}
        </div>
        <div className="space-y-3">
          <div><label className={lbl}>Nombre del taller</label><input value={nombre} onChange={e => setNombre(e.target.value)} className={inp} placeholder="Nombre del taller" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>RUC</label><input value={ruc} onChange={e => setRuc(e.target.value)} className={inp + ' font-mono'} placeholder="20XXXXXXXXX" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
            <div><label className={lbl}>Teléfono</label><input value={telefono} onChange={e => setTelefono(e.target.value)} className={inp + ' font-mono'} placeholder="9XX XXX XXX" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          </div>
          <div><label className={lbl}>Dirección</label><input value={direccion} onChange={e => setDireccion(e.target.value)} className={inp} placeholder="Av. ..." style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
        </div>
        <div className="flex justify-end">
          <button onClick={guardarPerfil} disabled={guardando} className="font-display disabled:opacity-50 font-bold px-7 py-3 rounded-2xl transition-all uppercase tracking-widest text-sm active:scale-95" style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
            ☁️ {guardando ? 'Guardando...' : 'Guardar Perfil'}
          </button>
        </div>
      </Modulo>

      <Modulo icon="💬" iconBg="rgba(33,199,184,0.12)" iconBorder="rgba(33,199,184,0.35)" titulo="Plantilla WhatsApp" subtitulo="Mensaje automático al cliente">
        <div className="flex flex-wrap gap-1.5">
          {['{cliente}','{placa}','{marca}','{km}','{servicios}','{proximo_km}','{fecha_proxima}','{taller}'].map(v => (
            <button key={v} onClick={() => setPlantilla(prev => prev + v)} className="font-display text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest" style={{ color: 'var(--accent-teal)', background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.3)' }}>{v}</button>
          ))}
        </div>
        <textarea value={plantilla} onChange={e => setPlantilla(e.target.value)} rows={12} className="font-mono w-full text-xs p-4 rounded-xl outline-none resize-none leading-relaxed" style={{ background: 'var(--bg)', color: 'var(--accent-teal)', border: '1px solid var(--border)' }} />
        <div className="flex items-center justify-between">
          <button onClick={() => setPlantilla(PLANTILLA_DEFAULT)} className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>↺ Restaurar</button>
          <button onClick={guardarPerfil} disabled={guardando} className="font-display disabled:opacity-50 font-bold px-7 py-3 rounded-2xl transition-all uppercase tracking-widest text-sm active:scale-95" style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>☁️ {guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </Modulo>

      <Modulo icon="💳" iconBg="rgba(33,199,184,0.12)" iconBorder="rgba(33,199,184,0.35)" titulo="Métodos de Pago" subtitulo={`${metodosPago.length} método(s) registrado(s)`}
        accion={<button onClick={agregarMetodoPago} className="font-display font-bold text-xs uppercase tracking-widest px-3 py-2 rounded-xl" style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>+ Agregar</button>}>
        {metodosPago.length === 0 ? <p className="text-center text-[10px] font-bold uppercase tracking-widest py-4" style={{ color: 'var(--text-muted)' }}>Sin métodos registrados</p> : (
          <div className="space-y-3">
            {metodosPago.map((m, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex gap-2">
                  <select value={m.tipo} onChange={e => actualizarMetodoPago(i, 'tipo', e.target.value)} className={selectCls + ' w-32 shrink-0'} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    <option>Yape</option><option>Plin</option><option>BCP</option><option>BBVA</option><option>Interbank</option><option>Scotiabank</option><option>Otro</option>
                  </select>
                  <input value={m.numero} onChange={e => actualizarMetodoPago(i, 'numero', e.target.value)} placeholder="Número / cuenta" className={inp + ' font-mono flex-1'} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  <button onClick={() => eliminarMetodoPago(i)} className="w-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,106,31,0.1)', color: 'var(--accent)' }}>✕</button>
                </div>
                <input value={m.titular} onChange={e => actualizarMetodoPago(i, 'titular', e.target.value)} placeholder="Titular (opcional)" className={inp} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
            ))}
            <div className="flex justify-end"><button onClick={guardarPerfil} disabled={guardando} className="font-display disabled:opacity-50 font-bold px-7 py-3 rounded-2xl transition-all uppercase tracking-widest text-sm active:scale-95" style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>☁️ {guardando ? 'Guardando...' : 'Guardar'}</button></div>
          </div>
        )}
      </Modulo>

      <Modulo icon="📍" iconBg="rgba(167,139,250,0.14)" iconBorder="rgba(167,139,250,0.35)" titulo="Sucursales" subtitulo={`${sucursales.length} sucursal(es)`}
        accion={<button onClick={agregarSucursal} className="font-display font-bold text-xs uppercase tracking-widest px-3 py-2 rounded-xl" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}>+ Agregar</button>}>
        {sucursales.length === 0 ? <p className="text-center text-[10px] font-bold uppercase tracking-widest py-4" style={{ color: 'var(--text-muted)' }}>Sin sucursales registradas</p> : (
          <div className="space-y-3">
            {sucursales.map((s, i) => (
              <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex gap-2">
                  <input value={s.nombre} onChange={e => actualizarSucursal(i, 'nombre', e.target.value)} placeholder="Nombre sucursal" className={inp + ' flex-1'} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  <button onClick={() => eliminarSucursal(i)} className="w-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,106,31,0.1)', color: 'var(--accent)' }}>✕</button>
                </div>
                <input value={s.direccion} onChange={e => actualizarSucursal(i, 'direccion', e.target.value)} placeholder="Dirección" className={inp} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input value={s.telefono} onChange={e => actualizarSucursal(i, 'telefono', e.target.value)} placeholder="Teléfono" className={inp + ' font-mono'} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
            ))}
            <div className="flex justify-end"><button onClick={guardarPerfil} disabled={guardando} className="font-display disabled:opacity-50 font-bold px-7 py-3 rounded-2xl transition-all uppercase tracking-widest text-sm active:scale-95" style={{ background: '#a78bfa', color: 'var(--bg)' }}>☁️ {guardando ? 'Guardando...' : 'Guardar'}</button></div>
          </div>
        )}
      </Modulo>

      <Modulo icon="📦" iconBg="rgba(33,199,184,0.12)" iconBorder="rgba(33,199,184,0.35)" titulo="Importación Masiva" subtitulo="Carga inventario desde Excel"
        accion={<button onClick={descargarPlantillaExcel} className="font-display font-bold text-xs uppercase tracking-widest px-3 py-2 rounded-xl" style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>📥 Plantilla</button>}>
        {!archivoExcel ? (
          <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl cursor-pointer" style={{ border: '2px dashed var(--border)', background: 'var(--surface-2)' }}>
            <span className="text-4xl mb-2">📊</span>
            <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Seleccionar Excel</p>
            <input type="file" accept=".xlsx,.xls" onChange={leerExcel} className="hidden" />
          </label>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(33,199,184,0.08)', border: '1px solid rgba(33,199,184,0.3)' }}>
            <span className="text-2xl">📊</span>
            <div className="flex-1"><p className="font-display font-bold text-sm" style={{ color: 'var(--accent-teal)' }}>{archivoExcel.name}</p><p className="text-[10px] font-bold" style={{ color: 'var(--accent-teal)' }}>{previstaProductos.length} productos</p></div>
            <button onClick={limpiarImport} className="font-bold text-lg" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
        )}
        {previstaProductos.length > 0 && (
          <div className="flex gap-3 mt-2">
            <button onClick={importarProductos} disabled={importando} className="font-display flex-1 disabled:opacity-50 font-bold py-3.5 rounded-2xl uppercase tracking-widest text-sm active:scale-95" style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
              {importando ? '⏳ Importando...' : `📦 Importar ${previstaProductos.length} productos`}
            </button>
            <button onClick={limpiarImport} className="font-display font-bold px-5 py-3.5 rounded-2xl uppercase tracking-widest text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancelar</button>
          </div>
        )}
        {resultadoImport && <div className="px-4 py-3 rounded-xl font-bold text-sm border" style={{ background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>{resultadoImport}</div>}
      </Modulo>

      <Modulo icon="🔐" iconBg="var(--surface-2)" iconBorder="var(--border)" titulo="Seguridad — Clave de Acceso" subtitulo="Cambia la clave de Configuración e Inventario">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className={lbl}>Clave Actual</label><div className="relative"><input type={mostrarClaveActualInput ? 'text' : 'password'} value={claveActualInput} onChange={e => setClaveActualInput(e.target.value)} placeholder="Clave vigente" className={inp + ' font-mono pr-10 tracking-widest'} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /><button onClick={() => setMostrarClaveActualInput(!mostrarClaveActualInput)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>{mostrarClaveActualInput ? '🙈' : '👁️'}</button></div></div>
          <div><label className={lbl}>Nueva Clave</label><div className="relative"><input type={mostrarClaveNueva ? 'text' : 'password'} value={claveNueva} onChange={e => setClaveNueva(e.target.value)} placeholder="Mín. 4 caracteres" className={inp + ' font-mono pr-10 tracking-widest'} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /><button onClick={() => setMostrarClaveNueva(!mostrarClaveNueva)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>{mostrarClaveNueva ? '🙈' : '👁️'}</button></div></div>
          <div><label className={lbl}>Confirmar Clave</label><div className="relative"><input type={mostrarClaveNueva ? 'text' : 'password'} value={claveConfirm} onChange={e => setClaveConfirm(e.target.value)} placeholder="Repite la clave" className={inp + ' font-mono pr-10 tracking-widest'} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />{claveNueva && claveConfirm && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">{claveNueva === claveConfirm ? '✅' : '❌'}</span>}</div></div>
        </div>
        <div className="flex justify-end"><button onClick={guardarClave} disabled={guardandoClave} className="font-display disabled:opacity-40 font-bold px-6 py-3 rounded-xl uppercase tracking-widest text-xs active:scale-95" style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>{guardandoClave ? '⏳ Guardando...' : '🔑 Cambiar Clave'}</button></div>
      </Modulo>

      <Modulo icon="🇵🇪" iconBg="rgba(255,106,31,0.12)" iconBorder="rgba(255,106,31,0.35)" titulo="Configuración APISunat" subtitulo={`Modo: ${apiModo === 'produccion' ? '🟢 Producción' : '🟡 Sandbox'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={lbl}>RUC</label><input value={apiRuc} onChange={e => setApiRuc(e.target.value)} className={inp + ' font-mono'} placeholder="20XXXXXXXXX" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className={lbl}>Token APISunat</label><input value={apiToken} onChange={e => setApiToken(e.target.value)} className={inp + ' font-mono'} placeholder="Token..." style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className={lbl}>Serie Factura</label><input value={serieFactura} onChange={e => setSerieFactura(e.target.value)} className={inp + ' font-mono'} placeholder="F001" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
          <div><label className={lbl}>Serie Boleta</label><input value={serieBoleta} onChange={e => setSerieBoleta(e.target.value)} className={inp + ' font-mono'} placeholder="B001" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
        </div>
        <div className="flex gap-3">
          {['sandbox','produccion'].map(m => (
            <button key={m} onClick={() => setApiModo(m)} className="font-display px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest border-2" style={apiModo === m ? { borderColor: 'var(--accent-teal)', background: 'rgba(33,199,184,0.08)', color: 'var(--accent-teal)' } : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              {m === 'sandbox' ? '🟡 Sandbox' : '🟢 Producción'}
            </button>
          ))}
        </div>
        <div className="flex justify-end"><button onClick={guardarSunat} disabled={guardando} className="font-display disabled:opacity-50 font-bold px-6 py-3 rounded-xl uppercase tracking-widest text-xs active:scale-95" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>💾 Guardar SUNAT</button></div>
      </Modulo>

      <Modulo icon="📊" iconBg="rgba(167,139,250,0.14)" iconBorder="rgba(167,139,250,0.35)" titulo="Uso Mensual" subtitulo={`Plan ${plan?.toUpperCase()} · ${uso?.servicios || 0} servicios`}>
        <div className="space-y-4">
          {[
            { label: 'Servicios', usado: uso?.servicios || 0, limite: limites.servicios, icon: '🔧', color: 'var(--accent-teal)' },
            { label: 'Comprobantes', usado: uso?.comprobantes || 0, limite: limites.comprobantes, icon: '🧾', color: 'var(--accent)' },
            { label: 'Consultas por placa', usado: uso?.consultas_placa || 0, limite: limites.consultas, icon: '🔍', color: 'var(--accent-yellow)' },
          ].map(item => {
            const pct = plan === 'exclusive' ? 10 : Math.min((item.usado / item.limite) * 100, 100)
            const critico = pct >= 80 && plan !== 'exclusive'
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2"><span>{item.icon}</span><span className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>{item.label}</span></div>
                  <span className="font-mono text-xs font-bold" style={{ color: critico ? 'var(--accent)' : 'var(--text-muted)' }}>{item.usado} / {plan === 'exclusive' ? '∞' : item.limite}</span>
                </div>
                <div className="ruler-track"><div className="ruler-fill" style={{ width: `${pct}%`, background: critico ? 'var(--accent)' : item.color }} /></div>
              </div>
            )
          })}
        </div>
        {plan !== 'exclusive' && (
          <div className="mt-2 rounded-2xl p-4 flex items-center justify-between" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)' }}>
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: '#a78bfa' }}>¿Necesitas más capacidad?</p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Contáctanos para actualizar tu plan</p>
            </div>
            <a href="https://wa.me/51925988464?text=Hola%2C%20quiero%20actualizar%20mi%20plan%20de%20AWTU" target="_blank" rel="noopener noreferrer" className="font-display font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl shrink-0" style={{ background: '#a78bfa', color: 'var(--bg)' }}>⬆️ Actualizar</a>
          </div>
        )}
      </Modulo>

    </div>
  )
}
