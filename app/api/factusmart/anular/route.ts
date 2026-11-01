import { NextRequest, NextResponse } from 'next/server'

const API_KEY      = process.env.FACTUSMART_API_KEY!
const API_KEY_TEST = process.env.FACTUSMART_API_KEY_TEST!
const BASE         = 'https://s2.factusmart.pe/api/v1/issuer'

export async function POST(req: NextRequest) {
  try {
    const { external_id, motivo, modo = 'demo' } = await req.json()

    if (!external_id) return NextResponse.json({ error: 'Falta external_id' }, { status: 400 })

    const apiKey = modo === 'produccion' ? API_KEY : API_KEY_TEST

    const res = await fetch(`${BASE}/documents/${external_id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ motivo: motivo || 'Anulación solicitada por el emisor' }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('❌ FACTUSMART /void ERROR:', JSON.stringify(data, null, 2))
      return NextResponse.json({ error: 'Error al anular', detalle: data }, { status: 400 })
    }

    return NextResponse.json({ ok: true, ...data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
