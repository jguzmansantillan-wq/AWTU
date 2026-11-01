import { NextRequest, NextResponse } from 'next/server'

const API_KEY      = process.env.FACTUSMART_API_KEY!
const API_KEY_TEST = process.env.FACTUSMART_API_KEY_TEST!
const BASE         = 'https://s2.factusmart.pe/api/v1/issuer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const external_id = searchParams.get('external_id')
  const modo        = searchParams.get('modo') || 'demo'

  if (!external_id) return NextResponse.json({ error: 'Falta external_id' }, { status: 400 })

  const apiKey = modo === 'produccion' ? API_KEY : API_KEY_TEST

  const res = await fetch(`${BASE}/documents/${external_id}/cdr`, {
    headers: { 'X-API-Key': apiKey },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: 'Error al obtener CDR', detalle: err }, { status: 400 })
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="CDR-${external_id}.zip"`,
    },
  })
}
