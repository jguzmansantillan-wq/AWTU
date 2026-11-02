import { NextRequest, NextResponse } from 'next/server'

const API_KEY      = process.env.FACTUSMART_API_KEY!
const API_KEY_TEST = process.env.FACTUSMART_API_KEY_TEST!
const RUC          = process.env.FACTUSMART_RUC!
const BASE         = 'https://s2.factusmart.pe/api/v1/issuer'

// Nota de Crédito: tipo_nota = '07'
// Nota de Débito:  tipo_nota = '08'
export async function POST(req: NextRequest) {
  try {
    const {
      tipo_nota,         // '07' (crédito) | '08' (débito)
      external_id_ref,   // external_id del comprobante original
      serie_numero_ref,  // ej. "B001-000001"
      tipo_doc_ref,      // '01' (factura) | '03' (boleta)
      codigo_motivo,     // '01' anulación | '02' corrección | etc.
      motivo,            // descripción del motivo
      items,             // [{ descripcion, cantidad, precio_unitario }]
      modo = 'demo',
      cliente_nombre,
      cliente_doc,
      cliente_dir,
      tipo_doc_cliente,  // '6' RUC (factura) | '1' DNI (boleta)
    } = await req.json()

    const apiKey = modo === 'produccion' ? API_KEY : API_KEY_TEST

    // Calcular totales
    // Factusmart /calcular espera valor_unitario (sin IGV), no precio_unitario
    // Si el precio viene con IGV incluido (precio_unitario), dividir entre 1.18
    const itemsCalc = items.map((i: any) => {
      const precioConIgv = Number(i.precio_unitario || i.precio) || 0
      const valorSinIgv  = +(precioConIgv / 1.18).toFixed(6)
      return {
        descripcion:    i.descripcion,
        cantidad:       Number(i.cantidad) || 1,
        valor_unitario: valorSinIgv,
        afectacion:     '10',
      }
    })

    const calcRes = await fetch(`${BASE}/calcular`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body:    JSON.stringify({ items: itemsCalc }),
    })

    if (!calcRes.ok) {
      const err = await calcRes.json()
      return NextResponse.json({ error: 'Error al calcular nota', detalle: err }, { status: 400 })
    }

    const calcData = await calcRes.json()

    // LOG TEMPORAL para ver estructura de calcData
    console.log('🔍 calcData.items[0]:', JSON.stringify(calcData.items?.[0], null, 2))

    // El template PDF de Factusmart (note_a4.blade.php) busca $item->description (inglés)
    // Agregar ambos campos para compatibilidad
    const itemsFinales = (calcData.items || []).map((ci: any, idx: number) => {
      const desc = itemsCalc[idx]?.descripcion || ci.descripcion || motivo || 'Servicio'
      return {
        ...ci,
        descripcion: desc,
        description: desc,   // campo en inglés que requiere el template PDF
      }
    })

    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('sv-SE', { timeZone: 'America/Lima' })
    const hora  = ahora.toLocaleTimeString('es-PE', { hour12: false, timeZone: 'America/Lima' })

    const [serieRef, numRef] = (serie_numero_ref || '').split('-')

    // Tipo de documento del cliente según tipo de comprobante
    // Factura → RUC = '6' | Boleta → DNI = '1' (o '0' sin doc)
    const tipoDocCli  = tipo_doc_cliente || (tipo_doc_ref === '01' ? '6' : '1')
    const numDocCli   = (cliente_doc || '').replace(/\D/g, '')

    // Serie de la nota según tipo de comprobante origen:
    // boleta → BN01 | factura → FN01
    const serieNota = tipo_doc_ref === '01' ? 'FN01' : 'BN01'

    const payload: any = {
      ruc:                   RUC,
      numero_documento:      '#',
      serie_documento:       serieNota,
      fecha_de_emision:      fecha,
      hora_de_emision:       hora,
      codigo_tipo_documento: tipo_nota,   // '07' o '08'
      codigo_tipo_moneda:    'PEN',
      datos_del_cliente_o_receptor: {
        codigo_tipo_documento_identidad: numDocCli ? tipoDocCli : '0',
        numero_documento:                numDocCli || '-',
        apellidos_y_nombres_o_razon_social: (cliente_nombre || 'CLIENTE').toUpperCase(),
        ...(cliente_dir ? { direccion: cliente_dir } : {}),
      },
      documento_afectado: {
        numero_documento:      numRef || '1',
        serie:                 serieRef || 'B001',
        codigo_tipo_documento: tipo_doc_ref || '03',
      },
      discrepancia: {
        codigo:      codigo_motivo || '01',
        descripcion: motivo || 'Anulación de la operación',
        description: motivo || 'Anulación de la operación',  // alias inglés para template PDF
      },
      items:   itemsFinales,
      totales: calcData.totales,
    }

    console.log('🚀 payload.items:', JSON.stringify(itemsFinales, null, 2))

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
      console.error('❌ FACTUSMART nota ERROR:', JSON.stringify(emitData, null, 2))
      return NextResponse.json({ error: 'Error al emitir nota', detalle: emitData }, { status: 400 })
    }

    // Obtener PDF
    let pdfUrl: string | null = null
    if (emitData.external_id) {
      const pdfRes = await fetch(`${BASE}/documents/${emitData.external_id}/pdf`, {
        headers: { 'X-API-Key': apiKey },
      })
      if (pdfRes.ok) {
        const buf = await pdfRes.arrayBuffer()
        pdfUrl = `data:application/pdf;base64,${Buffer.from(buf).toString('base64')}`
      }
    }

    return NextResponse.json({
      ok:                 true,
      external_id:        emitData.external_id,
      serie_numero:       emitData.serie_numero,
      aceptado_por_sunat: emitData.aceptado_por_sunat ?? false,
      pdf_base64:         pdfUrl,
      raw:                emitData,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
