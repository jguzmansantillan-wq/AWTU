import { NextRequest, NextResponse } from 'next/server'

const API_KEY       = process.env.FACTUSMART_API_KEY!
const API_KEY_TEST  = process.env.FACTUSMART_API_KEY_TEST!
const BASE          = 'https://s2.factusmart.pe/api/v1/issuer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tipo,            // 'boleta' | 'factura'
      cliente_nombre,
      cliente_doc,     // DNI u RUC
      cliente_dir,
      items,           // [{ descripcion, cantidad, precio_unitario }]
      modo = 'prueba', // 'prueba' | 'produccion'
      // RUC del taller que emite — cada taller usa el suyo
      // Si no se pasa, usa el RUC del env (fallback para pruebas)
      taller_ruc,
    } = body

    const apiKey  = modo === 'produccion' ? API_KEY : API_KEY_TEST
    const tipoDoc = tipo === 'factura' ? '01' : '03'

    // RUC a usar: el del taller si está disponible, si no el del env
    const rucEmisor = taller_ruc || process.env.FACTUSMART_RUC!

    if (!rucEmisor) {
      return NextResponse.json(
        { error: 'No se encontró RUC del taller para emitir' },
        { status: 400 }
      )
    }

    // ── 1. Armar items para /calcular ─────────────────────────────────────
    const itemsCalc = items.map((i: any) => ({
      descripcion:     i.descripcion,
      cantidad:        Number(i.cantidad) || 1,
      precio_unitario: Number(i.precio_unitario || i.precio) || 0,
      afectacion:      '10',   // gravado con IGV
    }))

    // ── 2. Calcular totales ───────────────────────────────────────────────
    const calcRes = await fetch(`${BASE}/calcular`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body:    JSON.stringify({ items: itemsCalc }),
    })

    if (!calcRes.ok) {
      const err = await calcRes.json()
      console.error('❌ FACTUSMART /calcular ERROR:', JSON.stringify(err, null, 2))
      return NextResponse.json({ error: 'Error al calcular', detalle: err }, { status: 400 })
    }

    const calcData = await calcRes.json()

    // ── 3. Armar payload del comprobante ─────────────────────────────────
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('sv-SE', { timeZone: 'America/Lima' })
    const hora  = ahora.toLocaleTimeString('es-PE', { hour12: false, timeZone: 'America/Lima' })

    const payload: any = {
      ruc:                       rucEmisor,  // ← RUC del taller
      numero_documento:          '#',
      fecha_de_emision:          fecha,
      hora_de_emision:           hora,
      codigo_tipo_operacion:     '0101',
      codigo_tipo_documento:     tipoDoc,
      codigo_tipo_moneda:        'PEN',
      datos_del_cliente_o_receptor: {
        codigo_tipo_documento_identidad: tipo === 'factura' ? '6' : '1',
        numero_documento:                cliente_doc || '00000000',
        ...(cliente_nombre ? { apellidos_y_nombres_o_razon_social: cliente_nombre } : {}),
        ...(cliente_dir    ? { direccion: cliente_dir }                             : {}),
      },
      items:   calcData.items,
      totales: calcData.totales,
    }

    // ── 4. Emitir comprobante ─────────────────────────────────────────────
    const emitRes = await fetch(`${BASE}/documents`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-API-Key':       apiKey,
        'Idempotency-Key': `awtu-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    })

    const emitData = await emitRes.json()

    if (!emitRes.ok) {
      console.error('❌ FACTUSMART /documents ERROR:', JSON.stringify(emitData, null, 2))
      return NextResponse.json({ error: 'Error al emitir', detalle: emitData }, { status: 400 })
    }

    // ── 5. Descargar PDF ──────────────────────────────────────────────────
    let pdfUrl: string | null = null
    if (emitData.external_id) {
      const pdfRes = await fetch(
        `${BASE}/documents/${emitData.external_id}/pdf`,
        { headers: { 'X-API-Key': apiKey } }
      )
      if (pdfRes.ok) {
        const pdfBuffer = await pdfRes.arrayBuffer()
        pdfUrl = `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString('base64')}`
      }
    }

    return NextResponse.json({
      ok:                  true,
      external_id:         emitData.external_id,
      serie_numero:        emitData.serie_numero,
      estado:              emitData.estado,
      estado_descripcion:  emitData.estado_descripcion,
      aceptado_por_sunat:  emitData.aceptado_por_sunat ?? false,
      sunat_descripcion:   emitData.sunat?.descripcion ?? '',
      entorno:             emitData.entorno,
      pdf_base64:          pdfUrl,
      raw:                 emitData,
    })

  } catch (err: any) {
    console.error('❌ FACTUSMART route error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}