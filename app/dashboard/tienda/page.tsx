'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Producto = { id: string; nombre: string; categoria: string; precio: number; stock: number; ubicacion: string }
type ItemCarrito = Producto & { cantidad: number; precioEditado: number }
type TicketData = { nombre: string; telefono: string; fecha: string; items: any[]; total: number; tallerNombre: string }

export default function TiendaPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [tallerID, setTallerID] = useState('')
  const [tallerNombre, setTallerNombre] = useState('AWTU')
  const [tallerLogo, setTallerLogo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState<TicketData | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('id, nombre, logo_url').eq('user_id', user.id).single()
      if (!t) return
      setTallerID(t.id)
      setTallerNombre(t.nombre || 'AWTU')
      setTallerLogo(t.logo_url || '')
      const { data } = await supabase.from('inventario')
        .select('id, nombre, categoria, precio, stock, ubicacion')
        .eq('taller_id', t.id).order('nombre')
      setProductos(data || [])
    }
    init()
  }, [])

  const filtrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const agregarAlCarrito = (p: Producto) => {
    if (p.stock <= 0) return
    setCarrito(prev => {
      const existe = prev.find(i => i.id === p.id)
      if (existe) {
        if (existe.cantidad >= p.stock) return prev
        return prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { ...p, cantidad: 1, precioEditado: p.precio }]
    })
  }

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(i => {
      if (i.id !== id) return i
      const nueva = i.cantidad + delta
      if (nueva <= 0) return i
      if (nueva > i.stock) return i
      return { ...i, cantidad: nueva }
    }))
  }

  const cambiarPrecio = (id: string, nuevoPrecio: string) => {
    setCarrito(prev => prev.map(i =>
      i.id === id ? { ...i, precioEditado: parseFloat(nuevoPrecio) || 0 } : i
    ))
  }

  const quitarDelCarrito = (id: string) => setCarrito(prev => prev.filter(i => i.id !== id))

  const total = carrito.reduce((s, i) => s + i.precioEditado * i.cantidad, 0)
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)

  const handleVender = async () => {
    if (carrito.length === 0) return
    setLoading(true); setError('')

    const items = carrito.map(i => ({
      producto_id: i.id, nombre: i.nombre,
      cantidad: i.cantidad, precio: i.precioEditado,
      subtotal: i.precioEditado * i.cantidad,
    }))

    const { error: ventaError } = await supabase.from('ventas').insert({
      taller_id: tallerID, items, monto: total,
      nombre: clienteNombre || null,
      telefono: clienteTelefono || null, fecha,
    })

    if (ventaError) { setError('Error: ' + ventaError.message); setLoading(false); return }

    for (const i of carrito) {
      const p = productos.find(p => p.id === i.id)
      if (p) await supabase.from('inventario').update({ stock: p.stock - i.cantidad }).eq('id', i.id)
    }

    setProductos(prev => prev.map(p => {
      const item = carrito.find(i => i.id === p.id)
      return item ? { ...p, stock: p.stock - item.cantidad } : p
    }))

    setTicket({
      nombre: clienteNombre || 'CLIENTE AL CONTADO',
      telefono: clienteTelefono,
      fecha: fecha.split('-').reverse().join('/'),
      items, total, tallerNombre,
    })

    setCarrito([])
    setClienteNombre('')
    setClienteTelefono('')
    setFecha(new Date().toISOString().slice(0, 10))
    setLoading(false)
  }

  const compartirTicketWhatsApp = (t: TicketData) => {
    if (!t.telefono) { alert('Este cliente no tiene teléfono registrado'); return }
    const tel = t.telefono.replace(/\D/g, '')
    const lineas = t.items.map((i: any) => `  ${i.cantidad}x ${i.nombre} - S/ ${i.subtotal.toFixed(2)}`).join('\n')
    const msg = encodeURIComponent(
      `🧾 *TICKET DE VENTA - ${t.tallerNombre}*\n📅 Fecha: ${t.fecha}\n👤 Cliente: ${t.nombre}\n\n*PRODUCTOS:*\n${lineas}\n\n*TOTAL: S/ ${t.total.toFixed(2)}*\n\n¡Gracias por su compra! 🛒`
    )
    window.open(`https://wa.me/51${tel}?text=${msg}`, '_blank')
  }

  const coloresUbic = ['var(--text-muted)', 'var(--accent-teal)', '#34d399', 'var(--accent-yellow)', '#a78bfa', 'var(--accent)', '#22d3ee', '#f472b6']
  const colorUbic = (u: string) => coloresUbic[(u?.charCodeAt(0) || 0) % coloresUbic.length]

  const colorCategoria = (cat: string) => {
    const c = (cat || '').toLowerCase()
    if (c.includes('aceite') && !c.includes('caja')) return 'var(--accent-yellow)'
    if (c.includes('filtro')) return 'var(--accent-teal)'
    if (c.includes('refrig')) return '#22d3ee'
    if (c.includes('bujia') || c.includes('bujía')) return 'var(--accent-yellow)'
    if (c.includes('freno') || c.includes('pastilla')) return 'var(--accent)'
    if (c.includes('caja')) return 'var(--accent)'
    return 'var(--text-muted)'
  }

  return (
    <div className="max-w-7xl mx-auto">

      {/* Modal ticket */}
      {ticket && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div className="rounded-3xl p-8 max-w-sm w-full relative" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={() => setTicket(null)}
              className="absolute top-4 right-4 font-bold text-xl transition-colors" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>✕</button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {tallerLogo
                  ? <img src={tallerLogo} className="w-full h-full object-contain p-2" />
                  : <span className="text-3xl">🛒</span>}
              </div>
              <h3 className="font-display font-bold text-lg uppercase tracking-tight" style={{ color: 'var(--text)' }}>{ticket.tallerNombre}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Ticket de Venta</p>
              <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-muted)' }}>{ticket.fecha}</p>
            </div>
            <div className="pt-4 mb-4" style={{ borderTop: '1px dashed var(--border)' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Cliente</p>
              <p className="font-display font-bold uppercase" style={{ color: 'var(--text)' }}>{ticket.nombre}</p>
            </div>
            <div className="pt-4 mb-4" style={{ borderTop: '1px dashed var(--border)' }}>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                <span>Cant &nbsp; Producto</span><span>Importe</span>
              </div>
              <div className="space-y-2">
                {ticket.items.map((i: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono text-xs font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>{i.cantidad}</span>
                      <span className="text-xs font-semibold uppercase truncate" style={{ color: 'var(--text)' }}>{i.nombre}</span>
                    </div>
                    <span className="font-mono text-xs font-bold shrink-0 ml-2" style={{ color: 'var(--text)' }}>S/ {i.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 mb-6 flex items-center justify-between" style={{ borderTop: '1px dashed var(--border)' }}>
              <span className="font-display font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-muted)' }}>Total</span>
              <span className="font-mono font-bold text-2xl" style={{ color: 'var(--accent-teal)' }}>S/ {ticket.total.toFixed(2)}</span>
            </div>
            <p className="text-center text-[10px] font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
              ¡Gracias por su compra en {ticket.tallerNombre}!
            </p>
            <button onClick={() => compartirTicketWhatsApp(ticket)}
              className="font-display w-full active:scale-95 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
              💬 Compartir por WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Tienda / Punto de Venta</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Venta directa de productos y repuestos</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 min-w-64" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar en catálogo..."
            className="bg-transparent outline-none text-sm font-semibold flex-1" style={{ color: 'var(--text)' }} />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl font-bold text-sm border"
          style={{ background: 'rgba(255,106,31,0.08)', borderColor: 'rgba(255,106,31,0.3)', color: 'var(--accent)' }}>
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* CATÁLOGO */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs"
              style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.35)' }}>🛍️</div>
            <p className="font-display font-bold text-xs uppercase tracking-widest" style={{ color: 'var(--text)' }}>Catálogo de Productos</p>
            <span className="font-display ml-auto text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>{filtrados.length} productos</span>
          </div>

          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-muted)' }}>
              <p className="text-5xl mb-4">📦</p>
              <p className="font-display font-bold text-sm uppercase tracking-widest text-center">
                {busqueda ? 'Sin resultados' : 'Sin productos en inventario'}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto p-4" style={{ maxHeight: '75vh' }}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filtrados.map(p => {
                  const enCarrito = carrito.find(i => i.id === p.id)
                  const sinStock = p.stock <= 0
                  const ubicColor = colorUbic(p.ubicacion)
                  return (
                    <div key={p.id} className="rounded-2xl p-3 flex flex-col gap-2 transition-all"
                      style={sinStock
                        ? { border: '1px solid var(--border)', opacity: 0.5, background: 'var(--surface-2)' }
                        : enCarrito
                        ? { border: '1px solid rgba(33,199,184,0.4)', background: 'rgba(33,199,184,0.06)' }
                        : { border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[9px] font-bold uppercase tracking-widest" style={{ color: colorCategoria(p.categoria) }}>
                          {p.categoria || 'General'}
                        </span>
                        <div className="font-display w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{ background: ubicColor + '1a', border: `1px solid ${ubicColor}50`, color: ubicColor }}>
                          {p.ubicacion?.slice(0, 2) || 'A1'}
                        </div>
                      </div>
                      <p className="font-display font-bold text-xs leading-tight uppercase flex-1" style={{ color: 'var(--text)' }}>{p.nombre}</p>
                      <div>
                        <p className="font-mono font-bold text-base" style={{ color: 'var(--text)' }}>S/ {(p.precio || 0).toFixed(2)}</p>
                        <p className="text-[9px] font-bold" style={{ color: sinStock ? 'var(--accent)' : 'var(--text-muted)' }}>
                          Stock: {p.stock}{sinStock ? ' · Sin stock' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => agregarAlCarrito(p)}
                        disabled={sinStock}
                        className="font-display w-full h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all active:scale-95"
                        style={sinStock
                          ? { background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'not-allowed' }
                          : enCarrito
                          ? { background: 'var(--accent-teal)', color: 'var(--bg)' }
                          : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                        {sinStock ? '—' : enCarrito ? `✓ ${enCarrito.cantidad}` : '+'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* CARRITO */}
        <div className="self-start sticky top-4 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', minHeight: '500px' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg" style={{ color: 'var(--accent-teal)' }}>🛒</span>
              <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Carrito</p>
            </div>
            {totalItems > 0 && (
              <span className="font-display w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>{totalItems}</span>
            )}
          </div>

          <div className="px-5 py-3 space-y-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>👤</span>
              <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente (opcional)"
                className="bg-transparent outline-none text-xs font-bold flex-1" style={{ color: 'var(--text)' }} />
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>📞</span>
              <input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
                placeholder="Teléfono (opcional)"
                className="font-mono bg-transparent outline-none text-xs font-bold flex-1" style={{ color: 'var(--text)' }} />
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>📅</span>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="font-mono bg-transparent outline-none text-xs font-bold flex-1" style={{ color: 'var(--text)', colorScheme: 'dark' }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {carrito.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-25 py-10">
                <p className="text-5xl mb-3">🛒</p>
                <p className="font-display text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: 'var(--text)' }}>Carrito vacío</p>
              </div>
            ) : carrito.map(i => (
              <div key={i.id} className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-display text-xs font-bold uppercase leading-tight flex-1 mr-2" style={{ color: 'var(--text)' }}>{i.nombre}</p>
                  <button onClick={() => quitarDelCarrito(i.id)} className="text-xs transition-colors shrink-0" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>✕</button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>Precio:</span>
                      <div className="flex items-center gap-1 rounded-lg px-2 py-0.5" style={{ background: 'var(--surface)' }}>
                        <span className="font-display text-[9px] font-bold" style={{ color: 'var(--accent-teal)' }}>S/</span>
                        <input
                          type="number"
                          value={i.precioEditado}
                          onChange={e => cambiarPrecio(i.id, e.target.value)}
                          step="0.50"
                          className="font-mono bg-transparent outline-none text-xs font-bold w-14"
                          style={{ color: 'var(--text)' }}
                        />
                        {i.precioEditado !== i.precio && (
                          <span className="text-[8px] font-bold" style={{ color: 'var(--accent-yellow)' }}>✏️</span>
                        )}
                      </div>
                    </div>
                    <p className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent-teal)' }}>Sub: S/ {(i.precioEditado * i.cantidad).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cambiarCantidad(i.id, -1)}
                      className="w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center transition-all"
                      style={{ background: 'var(--surface)', color: 'var(--text)' }}>−</button>
                    <span className="font-mono font-bold text-sm w-5 text-center" style={{ color: 'var(--text)' }}>{i.cantidad}</span>
                    <button onClick={() => cambiarCantidad(i.id, 1)}
                      className="w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center transition-all"
                      style={{ background: 'var(--surface)', color: 'var(--text)' }}>+</button>
                  </div>
                </div>
                {i.precioEditado !== i.precio && (
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>Original: S/ {i.precio.toFixed(2)}</span>
                    <button onClick={() => cambiarPrecio(i.id, String(i.precio))}
                      className="font-display text-[9px] font-bold uppercase tracking-widest transition-colors" style={{ color: 'var(--accent-yellow)' }}>
                      Restaurar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-5 py-5" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total a Cobrar</span>
              <div className="text-right leading-none">
                <span className="font-display font-bold text-sm" style={{ color: 'var(--accent-teal)' }}>S/ </span>
                <span className="font-mono text-4xl font-bold tracking-tighter" style={{ color: 'var(--text)' }}>{total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={handleVender} disabled={loading || carrito.length === 0}
              className="font-display w-full active:scale-95 disabled:opacity-40 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3"
              style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
              💳 {loading ? 'Procesando...' : 'Procesar Venta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
