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

  const [editID, setEditID] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Item>>({})

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
    await supabase.from('inventario').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const iniciarEdit = (item: Item) => {
    setEditID(item.id)
    setEditData({ ...item })
  }

  const saveEdit = async (id: string) => {
    const original = items.find(i => i.id === id)
    if (!original) return

    const payload = {
      nombre: (editData.nombre ?? original.nombre).toString().toUpperCase().trim(),
      ubicacion: (editData.ubicacion ?? original.ubicacion).toString().toUpperCase().trim(),
      stock: Number.isFinite(Number(editData.stock)) ? Number(editData.stock) : original.stock,
      costo: Number.isFinite(Number(editData.costo)) ? Number(editData.costo) : original.costo,
      precio: Number.isFinite(Number(editData.precio)) ? Number(editData.precio) : original.precio,
    }

    const { error } = await supabase.from('inventario').update(payload).eq('id', id)

    if (error) {
      setErrMsg('Error al guardar: ' + error.message)
      return
    }

    setItems(prev => prev.map(i => i.id === id ? { ...i, ...payload } : i))
    setEditID(null)
    setEditData({})
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

  const inp = "inp"
  const lbl = "lbl"

  // PANTALLA DE CLAVE
  if (claveRequerida && !accesoConcedido) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="card text-center p-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <span className="text-4xl">🔐</span>
          </div>
          <h2 className="font-display text-xl font-bold uppercase tracking-tighter mb-2" style={{ color: 'var(--text)' }}>Acceso Restringido</h2>
          <p className="text-sm font-semibold mb-8" style={{ color: 'var(--text-muted)' }}>
            Este módulo está protegido. Ingresa la clave de acceso para continuar.
          </p>

          {claveError && (
            <div className="mb-4 px-4 py-3 rounded-xl font-bold text-sm border"
              style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
              ❌ {claveError}
            </div>
          )}

          <div className="relative mb-4">
            <input
              type={mostrarClave ? 'text' : 'password'}
              value={claveIngresada}
              onChange={e => setClaveIngresada(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verificarClave()}
              placeholder="Ingresa tu clave..."
              className="font-mono w-full rounded-2xl px-5 py-4 text-center text-xl font-bold tracking-widest outline-none transition-all pr-12"
              style={{ background: 'var(--surface-2)', border: '2px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-teal)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => setMostrarClave(!mostrarClave)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              {mostrarClave ? '🙈' : '👁️'}
            </button>
          </div>

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
          ❌ {errMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* FORMULARIO */}
        <div className="xl:col-span-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="font-display w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.35)', color: 'var(--accent-teal)' }}>+</div>
              <div>
                <h3 className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>Añadir Producto</h3>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Ingresa los datos del nuevo item</p>
              </div>
            </div>

            {okMsg && (
              <div className="mb-4 px-3 py-2 rounded-xl font-bold text-xs border"
                style={{ background: 'rgba(33,199,184,0.08)', borderColor: 'rgba(33,199,184,0.3)', color: 'var(--accent-teal)' }}>
                ✅ Producto guardado
              </div>
            )}

            <form onSubmit={submitForm} className="space-y-4">
              <div>
                <label className={lbl}>Nombre del Producto</label>
                <input name="nombre" value={formData.nombre} onChange={onFieldChange}
                  placeholder="Ej: Aceite Castrol 5W-30" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Ubicación</label>
                  <input name="ubicacion" value={formData.ubicacion} onChange={onFieldChange}
                    placeholder="A1" className={inp + ' font-mono text-center text-lg uppercase'} />
                  <p className="text-[9px] font-bold mt-1 text-center" style={{ color: 'var(--text-muted)' }}>Estante/Zona</p>
                </div>
                <div>
                  <label className={lbl}>Categoría</label>
                  <select name="categoria" value={formData.categoria} onChange={onFieldChange} className={inp}>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Stock Inicial</label>
                <input name="stock" type="number" value={formData.stock} onChange={onFieldChange}
                  min="0" className={inp + ' font-mono text-center text-2xl'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Costo (S/)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-bold text-sm" style={{ color: 'var(--accent)' }}>S/</span>
                    <input name="costo" type="number" step="0.01" value={formData.costo} onChange={onFieldChange}
                      className={inp + ' font-mono pl-8 font-bold'} style={{ color: 'var(--accent)' }} placeholder="0.00" />
                  </div>
                  <p className="text-[9px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>Lo que pagas</p>
                </div>
                <div>
                  <label className={lbl}>Precio Venta (S/)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-bold text-sm" style={{ color: 'var(--accent-teal)' }}>S/</span>
                    <input name="precio" type="number" step="0.01" value={formData.precio} onChange={onFieldChange}
                      className={inp + ' font-mono pl-8 font-bold'} style={{ color: 'var(--accent-teal)' }} placeholder="0.00" />
                  </div>
                  <p className="text-[9px] font-bold mt-1" style={{ color: 'var(--text-muted)' }}>Lo que cobras</p>
                </div>
              </div>
              <button type="submit" disabled={guardando}
                className="font-display w-full disabled:opacity-50 font-bold py-3.5 rounded-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95"
                style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
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
                    { label: 'Producto', span: 'col-span-3' },
                    { label: 'Ubic.', span: 'col-span-1 text-center' },
                    { label: 'Categoría', span: 'col-span-2' },
                    { label: 'Stock', span: 'col-span-2 text-center' },
                    { label: 'Costo', span: 'col-span-1 text-right' },
                    { label: 'P. Venta', span: 'col-span-1 text-right' },
                    { label: 'Margen', span: 'col-span-1 text-right' },
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
                        <div className="col-span-3">
                          {editID === item.id ? (
                            <input value={editData.nombre || ''} onChange={e => setEditData(p => ({ ...p, nombre: e.target.value }))}
                              className="inp w-full px-2 py-1 text-xs" />
                          ) : (
                            <p className="font-display font-bold text-xs uppercase leading-tight" style={{ color: 'var(--text)' }}>{item.nombre}</p>
                          )}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {editID === item.id ? (
                            <input value={editData.ubicacion ?? ''}
                              onChange={e => setEditData(p => ({ ...p, ubicacion: e.target.value.toUpperCase() }))}
                              className="inp w-full px-1 py-1 text-[10px] text-center uppercase" />
                          ) : (
                            <span className="font-display min-w-7 h-7 px-1.5 rounded-lg flex items-center justify-center text-[9px] font-bold uppercase"
                              style={{ background: ubicColor + '1a', border: `1px solid ${ubicColor}50`, color: ubicColor }}>
                              {item.ubicacion}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className="font-display text-[9px] font-bold uppercase leading-tight" style={{ color: 'var(--text-muted)' }}>{item.categoria}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button onClick={() => ajustarStock(item, -1)}
                            className="w-6 h-6 rounded-lg font-bold text-sm flex items-center justify-center transition-all"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>−</button>
                          <div className="text-center w-8">
                            {editID === item.id ? (
                              <input type="number" value={editData.stock || 0}
                                onChange={e => setEditData(p => ({ ...p, stock: parseInt(e.target.value) }))}
                                className="inp w-full px-1 py-0.5 text-xs text-center" />
                            ) : (
                              <div>
                                <p className="font-mono font-bold text-sm" style={{ color: stockBajo ? 'var(--accent)' : 'var(--text)' }}>{item.stock}</p>
                                {stockBajo && <p className="font-display text-[7px] font-bold uppercase" style={{ color: 'var(--accent)' }}>Stock bajo</p>}
                              </div>
                            )}
                          </div>
                          <button onClick={() => ajustarStock(item, 1)}
                            className="w-6 h-6 rounded-lg font-bold text-sm flex items-center justify-center transition-all"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>+</button>
                        </div>
                        <div className="col-span-1 text-right">
                          {editID === item.id ? (
                            <input type="number" step="0.01" value={editData.costo || 0}
                              onChange={e => setEditData(p => ({ ...p, costo: parseFloat(e.target.value) }))}
                              className="inp w-full px-1 py-0.5 text-xs text-right" />
                          ) : (
                            <p className="font-mono font-bold text-xs" style={{ color: 'var(--accent)' }}>S/<br />{(item.costo || 0).toFixed(2)}</p>
                          )}
                        </div>
                        <div className="col-span-1 text-right">
                          {editID === item.id ? (
                            <input type="number" step="0.01" value={editData.precio || 0}
                              onChange={e => setEditData(p => ({ ...p, precio: parseFloat(e.target.value) }))}
                              className="inp w-full px-1 py-0.5 text-xs text-right" />
                          ) : (
                            <p className="font-mono font-bold text-xs" style={{ color: 'var(--text)' }}>S/<br />{(item.precio || 0).toFixed(2)}</p>
                          )}
                        </div>
                        <div className="col-span-1 text-right">
                          <span className="font-mono text-xs font-bold"
                            style={{ color: mg >= 30 ? 'var(--accent-teal)' : mg >= 10 ? 'var(--accent-yellow)' : 'var(--accent)' }}>
                            {mg}%
                          </span>
                        </div>
                        <div className="col-span-1 flex items-center justify-center gap-1">
                          {editID === item.id ? (
                            <button onClick={() => saveEdit(item.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                              style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>✓</button>
                          ) : (
                            <button onClick={() => iniciarEdit(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                              style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)' }}>✏️</button>
                          )}
                          <button onClick={() => eliminarItem(item.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                            style={{ background: 'rgba(255,106,31,0.12)', color: 'var(--accent)' }}>🗑️</button>
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
