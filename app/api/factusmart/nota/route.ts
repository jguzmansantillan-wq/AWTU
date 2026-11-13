import { NextRequest, NextResponse } from 'next/server'

const API_KEY      = process.env.FACTUSMART_API_KEY!
const API_KEY_TEST = process.env.FACTUSMART_API_KEY_TEST!
const RUC          = process.env.FACTUSMART_RUC!
const BASE         = 'https://s2.factusmart.pe/api/v1/issuer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tipo_nota,         // '07' = Nota de Crédito | '08' = Nota de Débito
      external_id_ref,   // external_id del comprobante original
      serie_numero_ref,  // ej: 'B001-000001'
      tipo_doc_ref,      // '01' = Factura | '03' = Boleta
      codigo_motivo,     // ej: '01', '02', etc.
      motivo,            // descripción del motivo
      items,             // [{ descripcion, cantidad, precio_unitario }]
      modo = 'demo',     // 'demo' | 'produccion'
      cliente_nombre,
      cliente_doc,
      cliente_dir,
      tipo_doc_cliente,  // '6' = RUC | '1' = DNI
    } = body

    if (!external_id_ref) {
      return NextResponse.json({ error: 'external_id_ref es requerido' }, { status: 400 })
    }

    const apiKey = modo === 'produccion' ? API_KEY : API_KEY_TEST

    // ── 1. Calcular totales ───────────────────────────────────────────────
    const itemsCalc = (items || []).map((i: any) => ({
      descripcion:     i.descripcion,
      cantidad:        Number(i.cantidad) || 1,
      precio_unitario: Number(i.precio_unitario || i.precio) || 0,
      afectacion:      '10',
    }))

    const calcRes = await fetch(`${BASE}/calcular`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body:    JSON.stringify({ items: itemsCalc }),
    })

    if (!calcRes.ok) {
      const err = await calcRes.json()
      console.error('❌ FACTUSMART /calcular ERROR (nota):', JSON.stringify(err, null, 2))
      return NextResponse.json({ error: 'Error al calcular', detalle: err }, { status: 400 })
    }

    const calcData = await calcRes.json()

    // ── 2. Armar payload de nota ──────────────────────────────────────────
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('sv-SE', { timeZone: 'America/Lima' })
    const hora  = ahora.toLocaleTimeString('es-PE', { hour12: false, timeZone: 'America/Lima' })

    const payload: any = {
      ruc:                       RUC,
      numero_documento:          '#',
      fecha_de_emision:          fecha,
      hora_de_emision:           hora,
      codigo_tipo_documento:     tipo_nota, // '07' o '08'
      codigo_tipo_moneda:        'PEN',
      datos_del_cliente_o_receptor: {
        codigo_tipo_documento_identidad: tipo_doc_cliente || '1',
        numero_documento:                cliente_doc || '00000000',
        ...(cliente_nombre ? { apellidos_y_nombres_o_razon_social: cliente_nombre } : {}),
        ...(cliente_dir    ? { direccion: cliente_dir }                             : {}),
      },
      // Referencia al comprobante original
      documento_que_se_modifica_tipo:          tipo_doc_ref,    // '01' o '03'
      documento_que_se_modifica_numero_serie:  serie_numero_ref.split('-')[0] || '',
      documento_que_se_modifica_numero_numero: serie_numero_ref.split('-')[1] || '',
      codigo_tipo_nota_credito_o_debito:       codigo_motivo,
      descripcion_motivo_nota:                 motivo,
      // Items y totales calculados
      items:   calcData.items,
      totales: calcData.totales,
    }

    // ── 3. Emitir nota ────────────────────────────────────────────────────
    console.log('📤 FACTUSMART nota payload:', JSON.stringify(payload, null, 2))

    const emitRes = await fetch(`${BASE}/documents`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-API-Key':       apiKey,
        'Idempotency-Key': `awtu-nota-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    })

    const emitData = await emitRes.json()

    if (!emitRes.ok) {
      console.error('❌ FACTUSMART /documents (nota) ERROR:', JSON.stringify(emitData, null, 2))
      return NextResponse.json({ error: 'Error al emitir nota', detalle: emitData }, { status: 400 })
    }

    // ── 4. Descargar PDF ──────────────────────────────────────────────────
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
      ok:                 true,
      external_id:        emitData.external_id,
      serie_numero:       emitData.serie_numero,
      estado:             emitData.estado,
      estado_descripcion: emitData.estado_descripcion,
      aceptado_por_sunat: emitData.aceptado_por_sunat ?? false,
      sunat_descripcion:  emitData.sunat?.descripcion ?? '',
      entorno:            emitData.entorno,
      pdf_base64:         pdfUrl,
      raw:                emitData,
    })

  } catch (err: any) {
    console.error('❌ FACTUSMART nota route error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}