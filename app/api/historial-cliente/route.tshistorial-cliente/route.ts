import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')?.trim()
  const placa = searchParams.get('placa')?.trim().toUpperCase().replace(/\s/g, '')

  if (!token || !placa) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  // 1. Buscar el taller por token
  const { data: taller, error: tallerError } = await supabase
    .from('talleres')
    .select('id, nombre, logo_url, direccion, telefono')
    .eq('token_historial', token)
    .single()

  if (tallerError || !taller) {
    return NextResponse.json({ error: 'Link inválido o expirado' }, { status: 404 })
  }

  // 2. Buscar servicios de esa placa en ese taller
  const placaNorm = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const { data: servicios, error: svcError } = await supabase
    .from('servicios')
    .select(`
      id, fecha, placa, marca, modelo, anio, km, proximo_km,
      aceite_marca, aceite_visc, aceite_cantidad,
      filtro_aceite, filtro_aire,
      caja_marca, refrig_marca, bujia_marca,
      otros_servicios, monto, created_at
    `)
    .eq('taller_id', taller.id)
    .ilike('placa', placaNorm)
    .order('created_at', { ascending: false })

  if (svcError) {
    return NextResponse.json({ error: 'Error al consultar' }, { status: 500 })
  }

  if (!servicios || servicios.length === 0) {
    return NextResponse.json({ error: 'No se encontraron registros para esa placa' }, { status: 404 })
  }

  // 3. Devolver info del taller + servicios (sin datos sensibles del cliente)
  return NextResponse.json({
    taller: {
      nombre: taller.nombre,
      logo_url: taller.logo_url,
      direccion: taller.direccion,
      telefono: taller.telefono,
    },
    placa: placaNorm,
    servicios: servicios.map(s => ({
      id:              s.id,
      fecha:           s.fecha,
      placa:           s.placa,
      marca:           s.marca,
      modelo:          s.modelo,
      anio:            s.anio,
      km:              s.km,
      proximo_km:      s.proximo_km,
      aceite_marca:    s.aceite_marca,
      aceite_visc:     s.aceite_visc,
      aceite_cantidad: s.aceite_cantidad,
      filtro_aceite:   s.filtro_aceite,
      filtro_aire:     s.filtro_aire,
      caja_marca:      s.caja_marca,
      refrig_marca:    s.refrig_marca,
      bujia_marca:     s.bujia_marca,
      otros_servicios: s.otros_servicios,
      created_at:      s.created_at,
    })),
  })
}
