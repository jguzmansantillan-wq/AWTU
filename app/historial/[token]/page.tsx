'use client'

import { useState } from 'react'

interface Taller {
  nombre: string
  logo_url?: string
  direccion?: string
  telefono?: string
}

interface Servicio {
  id: string
  fecha: string
  placa: string
  marca?: string
  modelo?: string
  anio?: number
  km?: number
  proximo_km?: number
  aceite_marca?: string
  aceite_visc?: string
  aceite_cantidad?: number
  filtro_aceite?: boolean
  filtro_aire?: boolean
  caja_marca?: string
  refrig_marca?: string
  bujia_marca?: string
  otros_servicios?: string
  created_at: string
}

interface HistorialData {
  taller: Taller
  placa: string
  servicios: Servicio[]
}

export default function HistorialClientePage({ params }: { params: { token: string } }) {
  const { token } = params

  const [placa, setPlaca] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<HistorialData | null>(null)

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault()
    const placaNorm = placa.trim().toUpperCase().replace(/\s/g, '')
    if (!placaNorm) return

    setLoading(true)
    setError('')
    setData(null)

    try {
      const res = await fetch(`/api/historial-cliente?token=${token}&placa=${placaNorm}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'No se encontraron registros')
      } else {
        setData(json)
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—'
    try {
      return new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    } catch {
      return fecha
    }
  }

  const formatKm = (km?: number) =>
    km ? `${km.toLocaleString('es-PE')} km` : '—'

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e8eaf0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#161b27', borderBottom: '1px solid #1e2535', padding: '16px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {data?.taller.logo_url && (
            <img src={data.taller.logo_url} alt="logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#e8eaf0' }}>
              {data?.taller.nombre ?? 'Historial de Mantenimientos'}
            </div>
            {data?.taller.direccion && (
              <div style={{ fontSize: 12, color: '#7b8099', marginTop: 2 }}>{data.taller.direccion}</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>

        {/* Formulario de búsqueda */}
        {!data && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#e8eaf0' }}>
              Consulta tu historial
            </h1>
            <p style={{ color: '#7b8099', fontSize: 14, marginBottom: 28 }}>
              Ingresa tu placa para ver el historial de mantenimientos de tu vehículo
            </p>
            <form onSubmit={buscar} style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <input
                value={placa}
                onChange={e => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                maxLength={8}
                style={{
                  background: '#1e2535',
                  border: '1px solid #2a3147',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#e8eaf0',
                  letterSpacing: 3,
                  width: 160,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading || !placa.trim()}
                style={{
                  background: loading || !placa.trim() ? '#2a3147' : '#3b82f6',
                  color: loading || !placa.trim() ? '#7b8099' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading || !placa.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {loading ? 'Buscando…' : 'Consultar'}
              </button>
            </form>

            {error && (
              <div style={{
                marginTop: 20,
                background: '#1e1a2e',
                border: '1px solid #3b2060',
                borderRadius: 10,
                padding: '14px 20px',
                color: '#c4a5f0',
                fontSize: 14,
              }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Resultados */}
        {data && (
          <>
            {/* Info vehículo */}
            <div style={{
              background: '#161b27',
              border: '1px solid #1e2535',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#e8eaf0' }}>
                  {data.placa}
                </div>
                {data.servicios[0] && (
                  <div style={{ color: '#7b8099', fontSize: 13, marginTop: 4 }}>
                    {[data.servicios[0].marca, data.servicios[0].modelo, data.servicios[0].anio]
                      .filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>
                  {data.servicios.length}
                </div>
                <div style={{ fontSize: 12, color: '#7b8099' }}>
                  {data.servicios.length === 1 ? 'mantenimiento' : 'mantenimientos'}
                </div>
              </div>
            </div>

            {/* Botón buscar otra placa */}
            <button
              onClick={() => { setData(null); setPlaca(''); setError('') }}
              style={{
                background: 'transparent',
                border: '1px solid #2a3147',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                color: '#7b8099',
                cursor: 'pointer',
                marginBottom: 24,
              }}
            >
              ← Consultar otra placa
            </button>

            {/* Lista de servicios */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.servicios.map((s, idx) => (
                <ServiceCard key={s.id} s={s} idx={idx} formatFecha={formatFecha} formatKm={formatKm} />
              ))}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 40, color: '#4a5168', fontSize: 12 }}>
              Historial proporcionado por {data.taller.nombre}
              {data.taller.telefono && (
                <> · <a href={`tel:${data.taller.telefono}`} style={{ color: '#4a5168' }}>{data.taller.telefono}</a></>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ServiceCard({ s, idx, formatFecha, formatKm }: {
  s: Servicio
  idx: number
  formatFecha: (f: string) => string
  formatKm: (k?: number) => string
}) {
  const [open, setOpen] = useState(idx === 0)

  const tags: string[] = []
  if (s.aceite_marca) tags.push(`Aceite ${s.aceite_marca}${s.aceite_visc ? ' ' + s.aceite_visc : ''}`)
  if (s.filtro_aceite) tags.push('Filtro aceite')
  if (s.filtro_aire) tags.push('Filtro aire')
  if (s.caja_marca) tags.push(`Caja ${s.caja_marca}`)
  if (s.refrig_marca) tags.push(`Refrigerante ${s.refrig_marca}`)
  if (s.bujia_marca) tags.push(`Bujías ${s.bujia_marca}`)

  return (
    <div style={{
      background: '#161b27',
      border: '1px solid #1e2535',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header card */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          color: '#e8eaf0',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{formatFecha(s.fecha)}</div>
          <div style={{ fontSize: 12, color: '#7b8099', marginTop: 3 }}>
            {formatKm(s.km)}
            {s.proximo_km ? ` · próximo: ${s.proximo_km.toLocaleString('es-PE')} km` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {tags.length > 0 && (
            <span style={{
              background: '#1a2540',
              color: '#6b88c4',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 600,
            }}>
              {tags.length} servicios
            </span>
          )}
          <span style={{ color: '#4a5168', fontSize: 16 }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Detalle expandible */}
      {open && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid #1e2535' }}>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: s.otros_servicios ? 12 : 0 }}>
              {tags.map(tag => (
                <span key={tag} style={{
                  background: '#1a2540',
                  color: '#8ba4d8',
                  border: '1px solid #243050',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {s.otros_servicios && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#4a5168', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                Otros servicios
              </div>
              <div style={{ fontSize: 13, color: '#a0a8c0', lineHeight: 1.6 }}>
                {s.otros_servicios}
              </div>
            </div>
          )}

          {tags.length === 0 && !s.otros_servicios && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#4a5168' }}>
              Sin detalles adicionales
            </div>
          )}
        </div>
      )}
    </div>
  )
}
