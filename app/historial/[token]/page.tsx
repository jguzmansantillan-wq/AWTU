'use client'

import { useState, useEffect } from 'react'

type TallerInfo = {
  nombre: string
  logo_url: string
  direccion: string
  telefono: string
}

type Servicio = {
  id: string
  fecha: string
  km: number
  proximo_km: number
  aceite_marca: string
  aceite_visc: string
  aceite_cantidad: number
  filtro_aceite: string
  filtro_aire: string
  caja_marca: string
  caja_tipo: string
  refrig_marca: string
  refrig_color: string
  bujia_marca: string
  otros_servicios: string
  marca: string
  modelo: string
  anio: string
}

export default function HistorialClientePublico({ params }: { params: { token: string } }) {
  const [placa, setPlaca] = useState('')
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [taller, setTaller] = useState<TallerInfo | null>(null)
  const [buscado, setBuscado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cargar datos del taller al abrir la página
  useEffect(() => {
    fetch(`/api/historial-cliente?token=${encodeURIComponent(params.token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.taller) setTaller(data.taller)
      })
      .catch(() => {})
  }, [params.token])

  const buscar = async () => {
    const placaLimpia = placa.trim().toUpperCase().replace(/\s+/g, '')
    if (!placaLimpia) { setError('Ingresa tu número de placa'); return }
    setLoading(true)
    setError('')
    setBuscado(false)
    setServicios([])

    try {
      const res = await fetch(
        `/api/historial-cliente?token=${encodeURIComponent(params.token)}&placa=${encodeURIComponent(placaLimpia)}`
      )
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se encontraron registros para esta placa')
        setLoading(false)
        return
      }

      setTaller(data.taller || null)
      setServicios(data.servicios || [])
      setBuscado(true)
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const agendarCita = () => {
    if (!taller?.telefono) return
    const tel = taller.telefono.replace(/\D/g, '')
    const texto = encodeURIComponent(
      `Hola${taller.nombre ? ` *${taller.nombre}*` : ''}, quiero agendar una cita para el mantenimiento de mi vehículo 🚗`
    )
    window.open(`https://wa.me/51${tel}?text=${texto}`, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header del taller */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '20px 20px 16px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {taller?.logo_url ? (
            <img
              src={taller.logo_url}
              alt={taller.nombre}
              style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 4, flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
              🔧
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 18, margin: 0, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              {taller?.nombre || 'Historial de Mantenimiento'}
            </h1>
            {taller?.direccion && (
              <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                📍 {taller.direccion}
              </p>
            )}
            {taller?.telefono && (
              <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                📞 {taller.telefono}
              </p>
            )}
            {!taller && (
              <p style={{ color: '#64748b', fontSize: 12, fontWeight: 600, margin: '3px 0 0' }}>
                Consulta el historial de tu vehículo
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>

        {/* Buscador */}
        <div style={{ background: '#1e293b', borderRadius: 20, padding: '24px 20px', border: '1px solid #334155', marginBottom: 20 }}>
          <p style={{ color: '#cbd5e1', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 16px' }}>
            Ingresa tu placa
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={placa}
              onChange={e => { setPlaca(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="Ej: ABC-123"
              maxLength={8}
              style={{
                flex: 1,
                background: '#0f172a',
                border: '2px solid #334155',
                borderRadius: 12,
                padding: '14px 16px',
                color: '#f1f5f9',
                fontWeight: 900,
                fontSize: 18,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                outline: 'none',
                textAlign: 'center',
              }}
            />
            <button
              onClick={buscar}
              disabled={loading}
              style={{
                background: loading ? '#334155' : '#ff6a1f',
                color: loading ? '#94a3b8' : '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '14px 20px',
                fontWeight: 900,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {loading ? '⏳' : '🔍 Buscar'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 700, margin: 0 }}>⚠️ {error}</p>
            </div>
          )}
        </div>

        {/* Sin resultados */}
        {buscado && servicios.length === 0 && !error && (
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 28, border: '1px solid #334155', textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>🔍</p>
            <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 15, margin: '0 0 8px', textTransform: 'uppercase' }}>
              Sin registros
            </p>
            <p style={{ color: '#64748b', fontSize: 13, fontWeight: 600, margin: 0 }}>
              No encontramos servicios para la placa <strong style={{ color: '#94a3b8' }}>{placa}</strong>
            </p>
          </div>
        )}

        {/* Lista de servicios */}
        {servicios.length > 0 && (
          <div>
            <p style={{ color: '#64748b', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 12px 4px' }}>
              {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} registrado{servicios.length !== 1 ? 's' : ''}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {servicios.map((s, idx) => (
                <div key={s.id} style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' }}>

                  {/* Cabecera del servicio */}
                  <div style={{ background: '#0f172a', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, background: '#ff6a1f', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                        {servicios.length - idx}
                      </div>
                      <div>
                        <p style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 14, margin: 0 }}>
                          {s.fecha ? s.fecha.split('-').reverse().join('/') : '—'}
                        </p>
                        <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, margin: 0 }}>
                          {s.marca} {s.modelo} {s.anio ? `(${s.anio})` : ''}
                        </p>
                      </div>
                    </div>
                    {s.km > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, margin: 0 }}>KM</p>
                        <p style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 14, margin: 0 }}>{s.km.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Detalle */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      s.aceite_marca && { icon: '🛢️', label: 'Aceite', value: `${s.aceite_marca} ${s.aceite_visc || ''}${s.aceite_cantidad ? ` · ${s.aceite_cantidad}L` : ''}`.trim() },
                      (s.filtro_aceite || s.filtro_aire) && { icon: '🔵', label: 'Filtros', value: [s.filtro_aceite ? `Aceite: ${s.filtro_aceite}` : '', s.filtro_aire ? `Aire: ${s.filtro_aire}` : ''].filter(Boolean).join(' · ') },
                      s.caja_marca && { icon: '⚙️', label: 'Aceite Caja', value: `${s.caja_marca}${s.caja_tipo ? ` ${s.caja_tipo}` : ''}` },
                      s.refrig_marca && { icon: '🌡️', label: 'Refrigerante', value: `${s.refrig_marca}${s.refrig_color ? ` ${s.refrig_color}` : ''}` },
                      s.bujia_marca && { icon: '⚡', label: 'Bujías', value: s.bujia_marca },
                      s.otros_servicios && { icon: '🔧', label: 'Otros', value: s.otros_servicios },
                    ].filter(Boolean).map((item: any, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#0f172a', borderRadius: 10 }}>
                        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: '#64748b', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>{item.label}</p>
                          <p style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700, margin: 0 }}>{item.value}</p>
                        </div>
                      </div>
                    ))}

                    {s.proximo_km > 0 && (
                      <div style={{ marginTop: 4, background: 'rgba(255,106,31,0.08)', border: '1px solid rgba(255,106,31,0.2)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>📌</span>
                        <div>
                          <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 1px' }}>Próximo servicio</p>
                          <p style={{ color: '#ff6a1f', fontSize: 13, fontWeight: 900, margin: 0 }}>a los {s.proximo_km.toLocaleString()} km</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón Agenda tu cita — solo si el taller tiene teléfono */}
        {taller?.telefono && (
          <div style={{ marginTop: 24 }}>
            <button
              onClick={agendarCita}
              style={{
                width: '100%',
                background: '#25d366',
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                padding: '18px 24px',
                fontWeight: 900,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                letterSpacing: '0.03em',
                boxShadow: '0 4px 20px rgba(37,211,102,0.3)',
              }}
            >
              💬 Agenda tu cita por WhatsApp
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p style={{ color: '#334155', fontSize: 11, fontWeight: 600, margin: 0 }}>
            Powered by AWTU · Sistema de gestión para talleres
          </p>
        </div>
      </div>
    </div>
  )
}
