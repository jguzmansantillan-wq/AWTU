'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type TallerInfo = {
  id: string
  nombre: string
  logo_url: string
  telefono: string
  direccion: string
}

export default function HistorialClientePage() {
  const [taller, setTaller] = useState<TallerInfo | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: t } = await supabase
        .from('talleres')
        .select('id, nombre, logo_url, telefono, direccion, token_historial')
        .eq('user_id', user.id)
        .single()
      if (!t) return
      setTaller({ id: t.id, nombre: t.nombre, logo_url: t.logo_url, telefono: t.telefono, direccion: t.direccion })
      setToken(t.token_historial ?? null)
      setLoading(false)
    }
    cargar()
  }, [])

  const link = token ? `${window.location.origin}/historial/${token}` : ''

  const copiar = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const whatsapp = () => {
    if (!link) return
    const texto = encodeURIComponent(
      `🔧 *${taller?.nombre ?? 'Nuestro taller'}*\n\n` +
      `Consulta el historial de mantenimiento de tu vehículo con tu placa:\n\n` +
      `👉 ${link}\n\n` +
      `Ingresa tu número de placa y ve todos tus servicios. 🚗`
    )
    window.open(`https://wa.me/?text=${texto}`, '_blank')
  }

  const imprimir = async () => {
    if (!link || !taller) return
    setImprimiendo(true)
    setShowQR(true)

    // Esperar a que el QR se renderice
    await new Promise(r => setTimeout(r, 800))

    const ventana = window.open('', '_blank', 'width=420,height=620')
    if (!ventana) { setImprimiendo(false); return }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Historial — ${taller.nombre}</title>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 32px;
          }
          .card {
            width: 360px;
            border: 2px solid #e2e8f0;
            border-radius: 20px;
            overflow: hidden;
            text-align: center;
          }
          .header {
            background: #0f172a;
            padding: 24px 20px 20px;
          }
          .logo {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            object-fit: contain;
            background: #fff;
            padding: 6px;
            margin: 0 auto 12px;
            display: block;
          }
          .taller-nombre {
            color: #fff;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .taller-sub {
            color: #94a3b8;
            font-size: 11px;
            margin-top: 4px;
            font-weight: 600;
          }
          .body {
            padding: 28px 24px;
            background: #fff;
          }
          .titulo {
            font-size: 13px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            margin-bottom: 20px;
          }
          .qr {
            width: 220px;
            height: 220px;
            border-radius: 12px;
            margin: 0 auto 20px;
            display: block;
          }
          .instruccion {
            font-size: 13px;
            color: #64748b;
            font-weight: 600;
            line-height: 1.6;
            margin-bottom: 16px;
          }
          .link {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 11px;
            color: #94a3b8;
            font-family: monospace;
            word-break: break-all;
          }
          @media print {
            body { padding: 0; }
            .card { border: none; width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            ${taller.logo_url ? `<img src="${taller.logo_url}" class="logo" crossorigin="anonymous" />` : '<div style="font-size:36px;margin-bottom:12px">🔧</div>'}
            <div class="taller-nombre">${taller.nombre}</div>
            ${taller.direccion ? `<div class="taller-sub">${taller.direccion}</div>` : ''}
            ${taller.telefono ? `<div class="taller-sub">Tel: ${taller.telefono}</div>` : ''}
          </div>
          <div class="body">
            <div class="titulo">Consulta tu historial de mantenimiento</div>
            <img src="${qrUrl}" class="qr" crossorigin="anonymous" onload="window.print()" />
            <p class="instruccion">
              Escanea el código QR con tu celular o visita el siguiente link e ingresa tu número de placa
            </p>
            <div class="link">${link}</div>
          </div>
        </div>
      </body>
      </html>
    `)
    ventana.document.close()
    setImprimiendo(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cargando…</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="max-w-lg mx-auto mt-10 card p-8 text-center">
        <p className="text-3xl mb-4">⚠️</p>
        <p className="font-bold text-sm uppercase tracking-widest mb-2" style={{ color: 'var(--text)' }}>
          Token no encontrado
        </p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          Ejecuta la migración SQL para generar el token de tu taller.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-7">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tighter" style={{ color: 'var(--text)' }}>
          Historial Cliente
        </h2>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Link público para que tus clientes consulten su historial de mantenimiento
        </p>
      </div>

      {/* Card principal */}
      <div className="card p-6 mb-4">

        {/* Ícono + descripción */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(33,199,184,0.12)', border: '1px solid rgba(33,199,184,0.3)' }}>
            🔗
          </div>
          <div>
            <p className="font-display font-bold text-sm uppercase tracking-widest mb-1" style={{ color: 'var(--text)' }}>
              Link personalizado de tu taller
            </p>
            <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Comparte este link con tus clientes. Ellos ingresan su número de placa y ven todos sus servicios realizados en tu taller.
            </p>
          </div>
        </div>

        {/* Link display */}
        <div className="rounded-xl px-4 py-3 mb-5 font-mono text-xs break-all"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          {link}
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-3 gap-3">

          {/* Copiar link */}
          <button onClick={copiar}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
            style={copied
              ? { background: 'rgba(33,199,184,0.15)', border: '1.5px solid rgba(33,199,184,0.5)', color: 'var(--accent-teal)' }
              : { background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-muted)' }
            }>
            <span className="text-2xl">{copied ? '✅' : '📋'}</span>
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>

          {/* WhatsApp */}
          <button onClick={whatsapp}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
            style={{ background: 'rgba(37,211,102,0.1)', border: '1.5px solid rgba(37,211,102,0.3)', color: '#25d366' }}>
            <span className="text-2xl">💬</span>
            WhatsApp
          </button>

          {/* Imprimir QR */}
          <button onClick={imprimir} disabled={imprimiendo}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
            <span className="text-2xl">{imprimiendo ? '⏳' : '🖨️'}</span>
            {imprimiendo ? 'Abriendo…' : 'Imprimir QR'}
          </button>

        </div>
      </div>

      {/* QR Preview */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-bold text-xs uppercase tracking-widest" style={{ color: 'var(--text)' }}>
            Código QR
          </p>
          <button
            onClick={() => setShowQR(q => !q)}
            className="font-display font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            {showQR ? 'Ocultar' : 'Mostrar QR'}
          </button>
        </div>

        {showQR && (
          <div ref={qrRef} className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-2xl" style={{ background: '#fff' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`}
                alt="Código QR"
                width={220}
                height={220}
                style={{ borderRadius: 8, display: 'block' }}
              />
            </div>
            <p className="text-xs font-semibold text-center" style={{ color: 'var(--text-muted)' }}>
              El cliente escanea este QR e ingresa su placa para ver su historial
            </p>
          </div>
        )}

        {!showQR && (
          <p className="text-sm font-semibold text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Haz clic en "Mostrar QR" para ver el código
          </p>
        )}
      </div>

      {/* Info extra */}
      <div className="mt-4 rounded-2xl px-5 py-4"
        style={{ background: 'rgba(33,199,184,0.06)', border: '1px solid rgba(33,199,184,0.15)' }}>
        <p className="font-display font-bold text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--accent-teal)' }}>
          ¿Cómo funciona?
        </p>
        <ul className="space-y-1.5">
          {[
            '🔗 El cliente abre el link desde su celular o computadora',
            '🚗 Ingresa el número de placa de su vehículo',
            '📋 Ve todos sus mantenimientos registrados en tu taller',
            '🔒 No muestra precios ni datos sensibles, solo el historial técnico',
          ].map((item, i) => (
            <li key={i} className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{item}</li>
          ))}
        </ul>
      </div>

    </div>
  )
}
