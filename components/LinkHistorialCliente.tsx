'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  tallerId: string
}

export default function LinkHistorialCliente({ tallerId }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    const fetchToken = async () => {
      const { data } = await supabase
        .from('talleres')
        .select('token_historial')
        .eq('id', tallerId)
        .single()
      setToken(data?.token_historial ?? null)
      setLoading(false)
    }
    if (tallerId) fetchToken()
  }, [tallerId])

  const link = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/historial/${token}`
    : ''

  const copiar = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsapp = () => {
    const texto = encodeURIComponent(
      `Consulta el historial de mantenimiento de tu vehículo aquí:\n${link}`
    )
    window.open(`https://wa.me/?text=${texto}`, '_blank')
  }

  if (loading) {
    return (
      <div style={{
        background: 'var(--surface-1, #161b27)',
        border: '1px solid var(--border, #1e2535)',
        borderRadius: 12,
        padding: '16px 20px',
        color: 'var(--text-muted, #7b8099)',
        fontSize: 13,
      }}>
        Cargando link…
      </div>
    )
  }

  if (!token) {
    return (
      <div style={{
        background: 'var(--surface-1, #161b27)',
        border: '1px solid var(--border, #1e2535)',
        borderRadius: 12,
        padding: '16px 20px',
        color: 'var(--text-muted, #7b8099)',
        fontSize: 13,
      }}>
        ⚠️ No se encontró el token del taller. Ejecuta la migración SQL primero.
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface-1, #161b27)',
      border: '1px solid var(--border, #1e2535)',
      borderRadius: 12,
      padding: '18px 20px',
    }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🔗</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text, #e8eaf0)' }}>
            Link para clientes
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #7b8099)', marginTop: 1 }}>
            El cliente ingresa su placa y consulta su historial de mantenimientos
          </div>
        </div>
      </div>

      {/* Link display */}
      <div style={{
        background: 'var(--surface-2, #1e2535)',
        border: '1px solid var(--border, #2a3147)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        color: 'var(--text-muted, #7b8099)',
        wordBreak: 'break-all',
        marginBottom: 12,
        fontFamily: 'monospace',
      }}>
        {link}
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={copiar}
          style={{
            flex: 1,
            minWidth: 100,
            background: copied ? '#1a3a2a' : 'var(--surface-2, #1e2535)',
            border: `1px solid ${copied ? '#2d6645' : 'var(--border, #2a3147)'}`,
            borderRadius: 8,
            padding: '9px 14px',
            fontSize: 13,
            fontWeight: 500,
            color: copied ? '#5ec98a' : 'var(--text, #e8eaf0)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {copied ? '✓ Copiado' : '📋 Copiar link'}
        </button>

        <button
          onClick={whatsapp}
          style={{
            flex: 1,
            minWidth: 100,
            background: '#1a2e1a',
            border: '1px solid #2d5a2d',
            borderRadius: 8,
            padding: '9px 14px',
            fontSize: 13,
            fontWeight: 500,
            color: '#5ec95e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          📱 WhatsApp
        </button>

        <button
          onClick={() => setShowQR(q => !q)}
          style={{
            background: 'var(--surface-2, #1e2535)',
            border: '1px solid var(--border, #2a3147)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13,
            color: 'var(--text-muted, #7b8099)',
            cursor: 'pointer',
          }}
          title="Ver código QR"
        >
          QR
        </button>
      </div>

      {/* QR Code */}
      {showQR && (
        <div style={{
          marginTop: 14,
          padding: 16,
          background: '#fff',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`}
            alt="Código QR"
            style={{ width: 180, height: 180, borderRadius: 4 }}
          />
          <span style={{ color: '#555', fontSize: 11 }}>
            Escanea para consultar el historial
          </span>
        </div>
      )}
    </div>
  )
}