import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const placa = searchParams.get('placa')
  if (!placa) return NextResponse.json({ error: 'Placa requerida' }, { status: 400 })

  const res = await fetch(`https://api.decolecta.com/api/vehiculo?placa=${placa}`, {
    headers: { 'Authorization': `Bearer ${process.env.DECOLECTA_KEY}` }
  })
  const data = await res.json()
  return NextResponse.json(data)
}