import { NextRequest, NextResponse } from 'next/server'

const API_KEY      = process.env.FACTUSMART_API_KEY!
const API_KEY_TEST = process.env.FACTUSMART_API_KEY_TEST!
const BASE         = 'https://s2.factusmart.pe/api/v1/issuer'

// Descarga una imagen desde una URL y la convierte a Buffer
async function urlToBuffer(url: string): Promise<{ buffer: Buffer; mime: string; ext: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/png'
    const mime = contentType.split(';')[0].trim()
    const ext  = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'jpg'
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mime, ext }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      logo_url,
      modo = 'prueba',  // 'prueba' | 'produccion'
      taller_ruc,       // RUC del taller — para subir el logo al RUC correcto
    } = await req.json()

    if (!logo_url) {
      return NextResponse.json({ error: 'logo_url requerido' }, { status: 400 })
    }

    const apiKey = modo === 'produccion' ? API_KEY : API_KEY_TEST

    // 1. Descargar la imagen desde Supabase Storage
    const img = await urlToBuffer(logo_url)
    if (!img) {
      return NextResponse.json({ error: 'No se pudo descargar el logo' }, { status: 400 })
    }

    // 2. Preparar el FormData con el logo
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(img.buffer)], { type: img.mime })
    formData.append('logo_path', blob, `logo.${img.ext}`)

    let updateRes: Response
    let updateData: any

    if (taller_ruc) {
      // ── Modo multi-RUC: subir logo al RUC específico del taller ──────────
      // Factusmart tiene endpoint PUT /rucs/{ruc}/logo (o similar)
      // Intentamos primero con /rucs/{ruc} y luego con /companies/{id}
      updateRes = await fetch(`${BASE}/rucs/${taller_ruc}`, {
        method:  'POST',
        headers: {
          'X-API-Key':              apiKey,
          'X-HTTP-Method-Override': 'PUT',
        },
        body: formData,
      })
      updateData = await updateRes.json()

      if (!updateRes.ok) {
        // Fallback: intentar con endpoint /rucs/{ruc}/logo
        const logoRes = await fetch(`${BASE}/rucs/${taller_ruc}/logo`, {
          method:  'POST',
          headers: {
            'X-API-Key':              apiKey,
            'X-HTTP-Method-Override': 'PUT',
          },
          body: formData,
        })
        updateData = await logoRes.json()

        if (!logoRes.ok) {
          console.error('❌ FACTUSMART logo upload ERROR:', JSON.stringify(updateData, null, 2))
          return NextResponse.json(
            { error: 'Error subiendo logo a Factusmart', detalle: updateData },
            { status: 400 }
          )
        }
      }

    } else {
      // ── Modo legacy: subir logo a la empresa principal (companies[0]) ────
      const listRes = await fetch(`${BASE}/companies`, {
        headers: { 'X-API-Key': apiKey },
      })
      if (!listRes.ok) {
        const err = await listRes.json()
        return NextResponse.json(
          { error: 'Error listando empresas', detalle: err },
          { status: 400 }
        )
      }
      const listData = await listRes.json()
      const empresas = Array.isArray(listData) ? listData : (listData.data || [])
      if (empresas.length === 0) {
        return NextResponse.json(
          { error: 'No hay empresa registrada en Factusmart' },
          { status: 404 }
        )
      }
      const empresaId = empresas[0].id

      updateRes = await fetch(`${BASE}/companies/${empresaId}`, {
        method:  'POST',
        headers: {
          'X-API-Key':              apiKey,
          'X-HTTP-Method-Override': 'PUT',
        },
        body: formData,
      })
      updateData = await updateRes.json()

      if (!updateRes.ok) {
        console.error('❌ FACTUSMART /companies update ERROR:', JSON.stringify(updateData, null, 2))
        return NextResponse.json(
          { error: 'Error actualizando empresa', detalle: updateData },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ ok: true, data: updateData })

  } catch (err: any) {
    console.error('❌ FACTUSMART /empresa route error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}