import { NextRequest, NextResponse } from 'next/server'

const TOKEN = process.env.APIS_NET_PE_TOKEN!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const doc = searchParams.get('doc')?.trim().replace(/\D/g, '')

  if (!doc) return NextResponse.json({ error: 'Falta el número' }, { status: 400 })

  try {
    if (doc.length === 8) {
      const res = await fetch(`https://api.apis.net.pe/v2/dni?numero=${doc}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
      if (!res.ok) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      const data = await res.json()
      return NextResponse.json({
        nombre: `${data.nombres ?? ''} ${data.apellidoPaterno ?? ''} ${data.apellidoMaterno ?? ''}`.trim(),
        direccion: '',
        tipo: 'dni',
      })
    }

    if (doc.length === 11) {
      const res = await fetch(`https://api.apis.net.pe/v2/ruc?numero=${doc}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
      if (!res.ok) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      const data = await res.json()
      return NextResponse.json({
        nombre: data.razonSocial ?? '',
        direccion: data.direccion ?? '',
        tipo: 'ruc',
      })
    }

    return NextResponse.json({ error: 'Ingresa 8 dígitos (DNI) o 11 dígitos (RUC)' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}