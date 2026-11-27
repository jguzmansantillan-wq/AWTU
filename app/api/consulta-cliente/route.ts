import { NextRequest, NextResponse } from 'next/server'

// Decolecta API — https://decolecta.gitbook.io/docs
// Endpoints: GET /v1/reniec/dni?numero=... y /v1/sunat/ruc?numero=...
const TOKEN = process.env.DECOLECTA_KEY

const BASE = 'https://api.decolecta.com/v1'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const doc = searchParams.get('doc')?.trim().replace(/\D/g, '')

  if (!doc) return NextResponse.json({ error: 'Falta el número' }, { status: 400 })

  if (!TOKEN) {
    return NextResponse.json(
      { error: 'Token de consulta no configurado (DECOLECTA_KEY).' },
      { status: 500 }
    )
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  }

  try {
    // ── DNI (8 dígitos) → RENIEC ──
    if (doc.length === 8) {
      const res = await fetch(`${BASE}/reniec/dni?numero=${doc}`, { headers })
      const data = await res.json()
      if (!res.ok) {
        return NextResponse.json(
          { error: data.error || data.message || `Error ${res.status} al consultar DNI` },
          { status: 404 }
        )
      }
      // full_name viene como "APELLIDO1 APELLIDO2 NOMBRES" — reordenar a "NOMBRES APELLIDO1 APELLIDO2"
      const nombre =
        data.full_name ||
        `${data.first_name ?? ''} ${data.first_last_name ?? ''} ${data.second_last_name ?? ''}`.trim()
      return NextResponse.json({ nombre, direccion: '', tipo: 'dni' })
    }

    // ── RUC (11 dígitos) → SUNAT ──
    if (doc.length === 11) {
      const res = await fetch(`${BASE}/sunat/ruc?numero=${doc}`, { headers })
      const data = await res.json()
      if (!res.ok) {
        return NextResponse.json(
          { error: data.error || data.message || `Error ${res.status} al consultar RUC` },
          { status: 404 }
        )
      }
      const nombre = data.razon_social ?? ''
      const direccion = [data.direccion, data.distrito, data.provincia]
        .filter(Boolean)
        .join(', ')
      return NextResponse.json({ nombre, direccion, tipo: 'ruc' })
    }

    return NextResponse.json(
      { error: 'Ingresa 8 dígitos (DNI) o 11 dígitos (RUC)' },
      { status: 400 }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
