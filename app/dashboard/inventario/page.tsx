'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Item = {
  id: string; nombre: string; categoria: string; stock: number
  precio: number; costo: number; ubicacion: string
}

const CATEGORIAS = [
  'Aceite de Motor', 'Filtro Aire', 'Filtro Aceite', 'Filtro Cabina',
  'Refrigerante', 'Bujías', 'Frenos / Pastillas', 'Correas', 'Otros'
]

export default function InventarioPage() {
  const [items, setItems] = useState<Item[]>([])
  const [tallerID, setTallerID] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [okMsg, setOkMsg] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 10

  // Clave de acceso
  const [claveRequerida, setClaveRequerida] = useState(false)
  const [claveIngresada, setClaveIngresada] = useState('')
  const [claveError, setClaveError] = useState('')
  const [accesoConcedido, setAccesoConcedido] = useState(false)
  const [claveGuardada, setClaveGuardada] = useState('')
  const [mostrarClave, setMostrarClave] = useState(false)
  const [verificando, setVerificando] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '', categoria: 'Aceite de Motor', ubicacion: 'A1',
    stock: '0', costo: '0', precio: '0',
  })

  // Modal editor
  const [modalItem, setModalItem] = useState<Item | null>(null)
  const [modalData, setModalData] = useState<Partial<Item>>({})
  const [guardandoModal, setGuardandoModal] = useState(false)
  const [modalOk, setModalOk] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres')
        .select('id, clave_inventario').eq('user_id', user.id).single()
      if (!t) return
      setTallerID(t.id)

      if (t.clave_inventario) {
        setClaveRequerida(true)
        setClaveGuardada(t.clave_inventario)
      } else {
        setAccesoConcedido(true)
        fetchItems(t.id)
      }
    }
    init()
  }, [])

  const verificarClave = async () => {
    setVerificando(true)
    setClaveError('')
    await new Promise(r => setTimeout(r, 400))
    if (claveIngresada === claveGuardada) {
      setAccesoConcedido(true)
      setClaveRequerida(false)
      fetchItems(tallerID)
    } else {
      setClaveError('Clave incorrecta. Intenta de nuevo.')
    }
    setVerificando(false)
  }

  const fetchItems = async (tid: string) => {
    const { data, error } = await supabase.from('inventario')
      .select('*').eq('taller_id', tid).order('nombre')
    if (error) { setErrMsg(error.message); return }
    setItems(data || [])
  }

  const onFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) { setErrMsg('El nombre es obligatorio'); return }
    setGuardando(true); setErrMsg(''); setOkMsg(false)

    const { error } = await supabase.from('inventario').insert({
      taller_id: tallerID,
      nombre: formData.nombre.toUpperCase(),
      categoria: formData.categoria,
      ubicacion: formData.ubicacion.toUpperCase(),
      stock: parseInt(formData.stock) || 0,
      costo: parseFloat(formData.costo) || 0,
      precio: parseFloat(formData.precio) || 0,
    })

    if (error) { setErrMsg(error.message); setGuardando(false); return }
    setFormData({ nombre: '', categoria: 'Aceite de Motor', ubicacion: 'A1', stock: '0', costo: '0', precio: '0' })
    setOkMsg(true)
    setTimeout(() => setOkMsg(false), 3000)
    fetchItems(tallerID)
    setGuardando(false)
  }

  const eliminarItem = async (id: string) => {
    if (!confirm('¿Eliminar este producto del inventario?')) return
    await supabase.from('inventario').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const abrirModal = (item: Item) => {
    setModalItem(item)
    setModalData({ ...item })
    setModalOk(false)
  }

  const cerrarModal = () => {
    setModalItem(null)
    setModalData({})
    setModalOk(false)
  }

  const guardarModal = async () => {
    if (!modalItem) return
    setGuardandoModal(true)

    const payload = {
      nombre: (modalData.nombre ?? modalItem.nombre).toString().toUpperCase().trim(),
      categoria: modalData.categoria ?? modalItem.categoria,
      ubicacion: (modalData.ubicacion ?? modalItem.ubicacion).toString().toUpperCase().trim(),
      stock: Number.isFinite(Number(modalData.stock)) ? Number(modalData.stock) : modalItem.stock,
      costo: Number.isFinite(Number(modalData.costo)) ? Number(modalData.costo) : modalItem.costo,
      precio: Number.isFinite(Number(modalData.precio)) ? Number(modalData.precio) : modalItem.precio,
    }

    const { error } = await supabase.from('inventario').update(payload).eq('id', modalItem.id)

    if (error) {
      setErrMsg('Error al guardar: ' + error.message)
      setGuardandoModal(false)
      return
    }

    setItems(prev => prev.map(i => i.id === modalItem.id ? { ...i, ...payload } : i))
    setModalOk(true)
    setGuardandoModal(false)
    setTimeout(() => cerrarModal(), 1000)
  }

  const ajustarStock = async (item: Item, delta: number) => {
    const nuevo = Math.max(0, item.stock + delta)
    await supabase.from('inventario').update({ stock: nuevo }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: nuevo } : i))
  }

  const filtrados = items.filter(i =>
    i.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.categoria?.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.ubicacion?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalPags = Math.ceil(filtrados.length / POR_PAGINA)
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const margen = (precio: number, costo: number) => {
    if (!costo || costo === 0) return 0
    return Math.round(((precio - costo) / precio) * 100)
  }

  const coloresUbic = ['var(--text-muted)', 'var(--accent-teal)', '#34d399', 'var(--accent-yellow)', '#a78bfa', 'var(--accent)', '#22d3ee']
  const colorUbic = (u: string) => coloresUbic[(u?.charCodeAt(0) || 0) % coloresUbic.length]

  // PANTALLA DE CLAVE
  if (claveRequerida && !accesoConcedido) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="card text-center p-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <span className="text-4xl">🔐</span>
          </div>
          <h2 className="font-display text-xl font-bold uppercase tracking-tighter mb-1" style={{ color: 'var(--text)' }}>Acceso Restringido</h2>
          <p className="text-xs font-bold mb-8 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Ingresa la clave para continuar</p>

          <div className="relative mb-4">
            <input
              type={mostrarClave ? 'text' : 'password'}
              value={claveIngresada}
              onChange={e => setClaveIngresada(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verificarClave()}
              placeholder="••••••••"
              className="inp text-center text-xl tracking-widest pr-12"
            />
            <button
              type="button"
              onClick={() => setMostrarClave(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--text-muted)' }}>
              {mostrarClave ? '🙈' : '👁️'}
            </button>
          </div>

          {claveError && (
            <p className="text-xs font-bold mb-4 px-3 py-2 rounded-xl border"
              style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
              ⚠ {claveError}
            </p>
          )}

          <button
            onClick={verificarClave}
            disabled={!claveIngresada || verificando}
            className="font-display w-full disabled:opacity-40 font-bold py-4 rounded-2xl transition-all uppercase tracking-widest text-sm active:scale-95 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
            {verificando ? '⏳ Verificando...' : '🔓 Ingresar al Inventario'}
          </button>

          <p className="text-[10px] font-bold mt-6 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            La clave se configura en el módulo de Configuración
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* MODAL EDITOR */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'rgba(33,199,184,0.15)', border: '1px solid rgba(33,199,184,0.4)' }}>✏️</div>
                <div>
                  <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Editar Producto</p>
                  <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{modalItem.nombre}</p>
                </div>
              </div>
              <button onClick={cerrarModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg transition-all"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                ×
              </button>
            </div>

            {/* Body modal */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="lbl">Nombre del Producto</label>
                  <input
                    value={modalData.nombre ?? ''}
                    onChange={e => setModalData(p => ({ ...p, nombre: e.target.value }))}
                    className="inp uppercase"
                    placeholder="Nombre del producto"
                  />
                </div>

                <div className="col-span-2">
                  <label className="lbl">Categoría</label>
                  <select
                    value={modalData.categoria ?? ''}
                    onChange={e => setModalData(p => ({ ...p, categoria: e.target.value }))}
                    className="inp">
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="lbl">Ubicación</label>
                  <input
                    value={modalData.ubicacion ?? ''}
                    onChange={e => setModalData(p => ({ ...p, ubicacion: e.target.value.toUpperCase() }))}
                    className="inp uppercase text-center"
                    placeholder="A1"
                  />
                </div>

                <div>
                  <label className="lbl">Stock (unidades)</label>
                  <input
                    type="number"
                    min="0"
                    value={modalData.stock ?? 0}
                    onChange={e => setModalData(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))}
                    className="inp text-center font-mono"
                  />
                </div>

                <div>
                  <label className="lbl">Costo (S/)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm" style={{ color: 'var(--text-muted)' }}>S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={modalData.costo ?? 0}
                      onChange={e => setModalData(p => ({ ...p, costo: parseFloat(e.target.value) || 0 }))}
                      className="inp pl-9 text-right font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="lbl">Precio de Venta (S/)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm" style={{ color: 'var(--text-muted)' }}>S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={modalData.precio ?? 0}
                      onChange={e => setModalData(p => ({ ...p, precio: parseFloat(e.target.value) || 0 }))}
                      className="inp pl-9 text-right font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Margen en tiempo real */}
              {(modalData.precio !== undefined && modalData.costo !== undefined) && (
                <div className="px-4 py-3 rounded-2xl flex items-center justify-between"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Margen de ganancia</span>
                  <span className="font-mono font-bold text-lg"
                    style={{
                      color: margen(Number(modalData.precio), Number(modalData.costo)) >= 30
                        ? 'var(--accent-teal)'
                        : margen(Number(modalData.precio), Number(modalData.costo)) >= 10
                          ? 'var(--accent-yellow)'
                          : 'var(--accent)'
                    }}>
                    {margen(Number(modalData.precio), Number(modalData.costo))}%
                  </span>
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={cerrarModal}
                className="flex-1 font-display font-bold text-sm uppercase tracking-widest py-3 rounded-2xl transition-all"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Cancelar
              </button>
              <button onClick={guardarModal}
                disabled={guardandoModal}
                className="flex-2 font-display font-bold text-sm uppercase tracking-widest py-3 px-6 rounded-2xl transition-all disabled:opacity-50"
                style={{ background: modalOk ? 'var(--accent-teal)' : 'var(--accent-teal)', color: 'var(--bg)', flex: 2 }}>
                {guardandoModal ? '⏳ Guardando...' : modalOk ? '✓ Guardado' : '💾 Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Control de Inventario</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Gestión de stock de productos</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
          style={{ background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)' }}>
          <span className="text-sm" style={{ color: 'var(--accent-teal)' }}>🛡️</span>
          <span className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-teal)' }}>Sesión Admin Activa</span>
          <button
            onClick={() => { setAccesoConcedido(false); setClaveRequerida(true); setClaveIngresada('') }}
            className="font-display ml-2 text-[9px] font-bold uppercase tracking-widest transition-all"
            style={{ color: 'var(--accent)' }}>
            🔒 Bloquear
          </button>
        </div>
      </div>

      {errMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl font-bold text-sm border"
          style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
          ⚠ {errMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* FORMULARIO AGREGAR */}
        <div className="xl:col-span-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                style={{ background: 'rgba(255,106,31,0.12)', border: '1px solid rgba(255,106,31,0.3)' }}>➕</div>
              <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Nuevo Producto</p>
            </div>

            <form onSubmit={submitForm} className="space-y-4">
              <div>
                <label className="lbl">Nombre del producto</label>
                <input name="nombre" value={formData.nombre} onChange={onFieldChange} required
                  className="inp uppercase" placeholder="CASTROL 5W30 1L" />
              </div>
              <div>
                <label className="lbl">Categoría</label>
                <select name="categoria" value={formData.categoria} onChange={onFieldChange} className="inp">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl">Ubicación</label>
                  <input name="ubicacion" value={formData.ubicacion} onChange={onFieldChange}
                    className="inp uppercase text-center" placeholder="A1" />
                </div>
                <div>
                  <label className="lbl">Stock inicial</label>
                  <input name="stock" type="number" min="0" value={formData.stock} onChange={onFieldChange}
                    className="inp text-center" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl">Costo (S/)</label>
                  <input name="costo" type="number" step="0.01" min="0" value={formData.costo} onChange={onFieldChange}
                    className="inp text-right font-mono" />
                </div>
                <div>
                  <label className="lbl">P. Venta (S/)</label>
                  <input name="precio" type="number" step="0.01" min="0" value={formData.precio} onChange={onFieldChange}
                    className="inp text-right font-mono" />
                </div>
              </div>

              {okMsg && (
                <p className="text-xs font-bold px-3 py-2 rounded-xl border text-center"
                  style={{ background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>
                  ✓ Producto agregado
                </p>
              )}

              <button type="submit" disabled={guardando}
                className="w-full font-display font-bold text-sm uppercase tracking-widest py-4 rounded-2xl transition-all disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                {guardando ? '⏳ Guardando...' : '💾 Guardar Producto'}
              </button>
            </form>
          </div>
        </div>

        {/* TABLA */}
        <div className="xl:col-span-8">
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.35)' }}>📦</div>
                <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Stock Actual</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
                <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
                  placeholder="Buscar producto..."
                  className="bg-transparent outline-none text-sm font-semibold w-40" style={{ color: 'var(--text)' }} />
              </div>
            </div>

            {filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-muted)' }}>
                <p className="text-5xl mb-4">📦</p>
                <p className="font-display font-bold text-sm uppercase tracking-widest">Sin productos en inventario</p>
                <p className="text-xs mt-2 font-bold">Agrega tu primer producto con el formulario</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-2 px-4 py-2" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { label: 'Producto', span: 'col-span-4' },
                    { label: 'Ubic.', span: 'col-span-1 text-center' },
                    { label: 'Categoría', span: 'col-span-2' },
                    { label: 'Stock', span: 'col-span-2 text-center' },
                    { label: 'Costo', span: 'col-span-1 text-right' },
                    { label: 'P.Vta', span: 'col-span-1 text-right' },
                    { label: 'Acc.', span: 'col-span-1 text-center' },
                  ].map(h => (
                    <div key={h.label} className={`font-display text-[9px] font-bold uppercase tracking-widest ${h.span}`} style={{ color: 'var(--text-muted)' }}>{h.label}</div>
                  ))}
                </div>

                <div>
                  {paginados.map(item => {
                    const mg = margen(item.precio, item.costo)
                    const stockBajo = item.stock <= 3
                    const ubicColor = colorUbic(item.ubicacion)
                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center transition-all"
                        style={{ borderBottom: '1px solid var(--border)' }}>

                        {/* Nombre — click abre modal */}
                        <div className="col-span-4">
                          <button
                            onClick={() => abrirModal(item)}
                            className="text-left w-full group"
                            title="Click para editar">
                            <p className="font-display font-bold text-xs uppercase leading-tight transition-colors"
                              style={{ color: 'var(--text)' }}>
                              {item.nombre}
                            </p>
                            <p className="font-display text-[8px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: 'var(--accent-teal)' }}>
                              ✏ editar
                            </p>
                          </button>
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <span className="font-display min-w-7 h-7 px-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold uppercase"
                            style={{ background: ubicColor + '1a', border: `1px solid ${ubicColor}50`, color: ubicColor }}>
                            {item.ubicacion}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="font-display text-[9px] font-bold uppercase leading-tight" style={{ color: 'var(--text-muted)' }}>{item.categoria}</span>
                        </div>

                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button onClick={() => ajustarStock(item, -1)}
                            className="w-6 h-6 rounded-lg font-bold text-sm flex items-center justify-center transition-all"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>−</button>
                          <div className="text-center w-8">
                            <p className="font-mono font-bold text-sm" style={{ color: stockBajo ? 'var(--accent)' : 'var(--text)' }}>{item.stock}</p>
                            {stockBajo && <p className="font-display text-[7px] font-bold uppercase" style={{ color: 'var(--accent)' }}>bajo</p>}
                          </div>
                          <button onClick={() => ajustarStock(item, 1)}
                            className="w-6 h-6 rounded-lg font-bold text-sm flex items-center justify-center transition-all"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>+</button>
                        </div>

                        <div className="col-span-1 text-right">
                          <p className="font-mono font-bold text-xs" style={{ color: 'var(--accent)' }}>
                            S/ {(item.costo || 0).toFixed(2)}
                          </p>
                        </div>

                        <div className="col-span-1 text-right">
                          <p className="font-mono font-bold text-xs" style={{ color: 'var(--text)' }}>
                            S/ {(item.precio || 0).toFixed(2)}
                          </p>
                          <p className="font-mono text-[9px] font-bold"
                            style={{ color: mg >= 30 ? 'var(--accent-teal)' : mg >= 10 ? 'var(--accent-yellow)' : 'var(--accent)' }}>
                            {mg}%
                          </p>
                        </div>

                        <div className="col-span-1 flex items-center justify-center gap-1">
                          <button onClick={() => abrirModal(item)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                            style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}
                            title="Editar">✏️</button>
                          <button onClick={() => eliminarItem(item.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                            style={{ background: 'rgba(255,106,31,0.12)', color: 'var(--accent)' }}
                            title="Eliminar">🗑️</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <p className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {filtrados.length} productos · Pág {pagina} de {totalPags || 1}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                      className="font-display text-[10px] font-bold disabled:opacity-30 transition-all uppercase tracking-widest px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>← Ant</button>
                    <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina >= totalPags}
                      className="font-display text-[10px] font-bold disabled:opacity-30 transition-all uppercase tracking-widest px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Sig →</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
