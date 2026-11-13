import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const placa = searchParams.get('placa')
  if (!placa) return NextResponse.json({ error: 'Placa requerida' }, { status: 400 })

  const username = process.env.PLACAAPI_USER || 'JuanPablo111'

  try {
    const res = await fetch('https://www.regcheck.org.uk/api/reg.asmx/CheckPeru', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `RegistrationNumber=${encodeURIComponent(placa)}&username=${encodeURIComponent(username)}`
    })

    const xml = await res.text()
    const match = xml.match(/<vehicleJson>([^<]*)<\/vehicleJson>/)
    if (!match) return NextResponse.json({ error: 'No se encontraron datos para esta placa' }, { status: 404 })

    const vehicleData = JSON.parse(match[1].replace(/&quot;/g, '"'))
    return NextResponse.json(vehicleData)

  } catch (err) {
    console.error('Error placa:', err)
    return NextResponse.json({ error: 'Error al consultar la placa' }, { status: 500 })
  }
}