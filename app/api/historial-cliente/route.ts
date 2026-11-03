import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const placa  = req.nextUrl.searchParams.get('placa')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Faltan variables de entorno:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey })
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Buscar el taller por token
  const { data: taller, error: tallerError } = await supabase
    .from('talleres')
    .select('id, nombre, logo_url, direccion, telefono')
    .eq('token_historial', token)
    .single()

  if (tallerError || !taller) {
    return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 })
  }

  // Si no viene placa, solo devolver info del taller (para que la página pueda mostrar el header)
  if (!placa) {
    return NextResponse.json({
      taller: {
        nombre:    taller.nombre,
        logo_url:  taller.logo_url || '',
        direccion: taller.direccion || '',
        telefono:  taller.telefono || '',
      },
      servicios: [],
    })
  }

  // 2. Buscar servicios por placa en ese taller
  const placaUpper = placa.trim().toUpperCase().replace(/\s+/g, '')

  const { data: servicios, error: serviciosError } = await supabase
    .from('servicios')
    .select(`
      id, fecha, km, proximo_km,
      aceite_marca, aceite_visc, aceite_cantidad,
      filtro_aceite, filtro_aire,
      caja_marca, caja_tipo,
      refrig_marca, refrig_color,
      bujia_marca, otros_servicios,
      marca, modelo, anio
    `)
    .eq('taller_id', taller.id)
    .ilike('placa', placaUpper)
    .order('fecha', { ascending: false })

  if (serviciosError) {
    console.error('Error al buscar servicios:', serviciosError)
    return NextResponse.json({ error: 'Error al consultar el historial' }, { status: 500 })
  }

  if (!servicios || servicios.length === 0) {
    return NextResponse.json(
      { error: `No se encontraron servicios para la placa ${placaUpper}` },
      { status: 404 }
    )
  }

  return NextResponse.json({
    taller: {
      nombre:    taller.nombre,
      logo_url:  taller.logo_url || '',
      direccion: taller.direccion || '',
      telefono:  taller.telefono || '',
    },
    servicios,
  })
}