'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Contacto = {
  nombre: string; telefono: string; placa: string
  marca: string; modelo: string; cumpleanos?: string; created_at: string
}

export default function ContactosPage() {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase.from('talleres').select('id').eq('user_id', user.id).single()
      if (!t) return
      const { data } = await supabase.from('servicios')
        .select('nombre, telefono, placa, marca, modelo, cumpleanos, created_at')
        .eq('taller_id', t.id)
        .order('created_at', { ascending: false })
      // Deduplicar por nombre
      const vistos = new Set<string>()
      const unicos = (data || []).filter(c => {
        if (vistos.has(c.nombre)) return false
        vistos.add(c.nombre)
        return true
      })
      setContactos(unicos)
      setLoading(false)
    }
    cargar()
  }, [])

  const filtrados = contactos.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.placa?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda)
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>Directorio de Clientes</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{filtrados.length} clientes registrados</p>
        </div>
      </div>

      <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, placa o teléfono..."
        className="inp w-full mb-5" />

      {loading ? (
        <div className="text-center py-20 font-bold" style={{ color: 'var(--text-muted)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No hay contactos aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((c, i) => {
            const iniciales = c.nombre?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const colores = ['var(--accent-teal)', 'var(--accent)', '#a78bfa', 'var(--accent-yellow)', '#f472b6', '#22d3ee']
            const color = colores[i % colores.length]
            return (
              <div key={i} className="card flex items-center gap-4 transition-all"
                onMouseEnter={e => e.currentTarget.style.borderColor = color + '60'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div className="font-display w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: color + '1a', border: `1px solid ${color}50`, color }}>
                  {iniciales}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold uppercase" style={{ color: 'var(--text)' }}>{c.nombre}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {c.telefono || 'Sin teléfono'} · <span className="font-mono">{c.placa}</span>
                  </p>
                  {c.cumpleanos && (
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: '#f472b6' }}>
                      🎂 {c.cumpleanos.split('-').reverse().join('/')}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-xs font-bold uppercase" style={{ color: 'var(--text)' }}>{c.marca} {c.modelo}</p>
                  <p className="font-mono text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.placa}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}