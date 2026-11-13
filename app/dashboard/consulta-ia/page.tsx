'use client'

import { useState } from 'react'

export default function ConsultaIAPage() {
  const [placa, setPlaca] = useState('')
  const [vehiculo, setVehiculo] = useState<Record<string, string> | null>(null)
  const [loadingPlaca, setLoadingPlaca] = useState(false)
  const [errorPlaca, setErrorPlaca] = useState('')
  const [pregunta, setPregunta] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [historial, setHistorial] = useState<{ q: string; a: string }[]>([])

  const extraerTexto = (val: unknown): string => {
    if (typeof val === 'string') return val
    if (typeof val === 'number') return String(val)
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>
      if (obj.CurrentTextValue) return String(obj.CurrentTextValue)
      if (obj.CurrentValue) return String(obj.CurrentValue)
    }
    return ''
  }

  const consultarPlaca = async () => {
    if (!placa.trim()) return
    setLoadingPlaca(true)
    setErrorPlaca('')
    setVehiculo(null)
    try {
      const res = await fetch(`/api/placa?placa=${placa.toUpperCase().trim()}`)
      const data = await res.json()
      if (data.error || data.message) {
        setErrorPlaca('No se encontraron datos para esta placa.')
      } else {
        const campos: Record<string, string> = {
          Placa: placa.toUpperCase().trim(),
        }
        const mapeo: Record<string, string> = {
          Description: 'Descripcion',
          CarMake: 'Marca',
          CarModel: 'Modelo',
          RegistrationYear: 'Año',
          FuelType: 'Combustible',
          BodyStyle: 'Carroceria',
          EngineSize: 'Motor',
          Transmission: 'Transmision',
          NumberOfDoors: 'Puertas',
          NumberOfSeats: 'Asientos',
          MakeDescription: 'Fabricante',
          ModelDescription: 'Modelo Detalle',
        }
        for (const [key, label] of Object.entries(mapeo)) {
          const val = extraerTexto(data[key])
          if (val) campos[label] = val
        }
        setVehiculo(campos)
      }
    } catch {
      setErrorPlaca('Error al consultar. Intenta nuevamente.')
    }
    setLoadingPlaca(false)
  }

  const consultarIA = async () => {
    if (!pregunta.trim()) return
    setLoadingIA(true)
    setRespuesta('')
    const contexto = vehiculo
      ? Object.entries(vehiculo).map(([k, v]) => `${k}: ${v}`).join(', ')
      : ''
    try {
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta, contexto })
      })
      const data = await res.json()
      setRespuesta(data.respuesta)
      setHistorial(prev => [{ q: pregunta, a: data.respuesta }, ...prev].slice(0, 10))
      setPregunta('')
    } catch {
      setRespuesta('Error al consultar. Intenta nuevamente.')
    }
    setLoadingIA(false)
  }

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>
          Consulta IA
        </h2>
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Consulta datos vehiculares y asistencia tecnica con inteligencia artificial
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
            style={{ background: 'rgba(33,199,184,0.12)' }}>🚗</div>
          <p className="font-display text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--accent-teal)' }}>Consulta Vehicular por Placa</p>
        </div>
        <div className="flex gap-3">
          <input
            value={placa}
            onChange={e => setPlaca(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && consultarPlaca()}
            placeholder="Ej: ABC123"
            maxLength={8}
            className="inp flex-1 font-mono uppercase font-bold tracking-widest"
          />
          <button onClick={consultarPlaca} disabled={loadingPlaca || !placa.trim()}
            className="font-display font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
            style={{ background: 'var(--accent-teal)', color: 'var(--bg)' }}>
            {loadingPlaca ? 'Buscando...' : 'Consultar'}
          </button>
        </div>
        {errorPlaca && <p className="text-sm font-semibold" style={{ color: '#ff5252' }}>❌ {errorPlaca}</p>}
        {vehiculo && (
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(33,199,184,0.06)', border: '1px solid rgba(33,199,184,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <p className="font-display text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--accent-teal)' }}>Datos del Vehiculo</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(vehiculo).map(([k, v]) => (
                <div key={k} className="rounded-xl p-3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p className="font-display text-[9px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-muted)' }}>{k}</p>
                  <p className="font-mono text-xs font-bold uppercase" style={{ color: 'var(--text)' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
            style={{ background: 'rgba(167,139,250,0.12)' }}>🤖</div>
          <p className="font-display text-[10px] font-bold uppercase tracking-widest"
            style={{ color: '#a78bfa' }}>Asistente Tecnico IA</p>
          {vehiculo && (
            <span className="font-display text-[9px] font-bold px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(33,199,184,0.12)', color: 'var(--accent-teal)', border: '1px solid rgba(33,199,184,0.3)' }}>
              🚗 {vehiculo['Marca']} {vehiculo['Modelo']}
            </span>
          )}
        </div>
        {!vehiculo && (
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            💡 Consulta una placa primero para obtener respuestas especificas al vehiculo, o haz preguntas generales de mecanica.
          </p>
        )}
        <div className="flex gap-3">
          <input
            value={pregunta}
            onChange={e => setPregunta(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && consultarIA()}
            placeholder="Ej: Que aceite usa este motor? Cuanto cuesta una faja de distribución?"
            className="inp flex-1"
          />
          <button onClick={consultarIA} disabled={loadingIA || !pregunta.trim()}
            className="font-display font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
            style={{ background: '#a78bfa', color: 'var(--bg)' }}>
            {loadingIA ? 'Pensando...' : 'Preguntar'}
          </button>
        </div>
        {loadingIA && (
          <div className="flex items-center gap-2 py-2">
            <div className="w-4 h-4 rounded-full animate-spin"
              style={{ border: '2px solid #a78bfa', borderTopColor: 'transparent' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Consultando IA...</p>
          </div>
        )}
        {respuesta && (
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <p className="font-display text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ color: '#a78bfa' }}>Respuesta</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{respuesta}</p>
          </div>
        )}
        {historial.length > 0 && (
          <div className="space-y-2">
            <p className="font-display text-[9px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}>Historial de consultas</p>
            {historial.map((h, i) => (
              <div key={i} className="rounded-xl p-3 cursor-pointer transition-all"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                onClick={() => setRespuesta(h.a)}>
                <p className="font-display text-[10px] font-bold uppercase truncate mb-1"
                  style={{ color: 'var(--accent-teal)' }}>❓ {h.q}</p>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{h.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}