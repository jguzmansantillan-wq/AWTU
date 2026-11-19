import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const API_KEY      = process.env.FACTUSMART_API_KEY!
const API_KEY_TEST = process.env.FACTUSMART_API_KEY_TEST!
const BASE         = 'https://s2.factusmart.pe/api/v1/issuer'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const {
      taller_id,
      ruc,
      razon_social,
      sol_usuario,   // Usuario SOL de SUNAT (ej. "20XXXXXXXXX123456")
      sol_clave,     // Clave SOL de SUNAT
      modo = 'prueba', // 'prueba' | 'produccion'
    } = await req.json()

    if (!taller_id || !ruc || !sol_usuario || !sol_clave) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: taller_id, ruc, sol_usuario, sol_clave' },
        { status: 400 }
      )
    }

    const apiKey = modo === 'produccion' ? API_KEY : API_KEY_TEST

    // ── 1. Crear el RUC en Factusmart ────────────────────────────────────────
    // Si ya existe, Factusmart devuelve error 409 — lo ignoramos y continuamos
    const crearRes = await fetch(`${BASE}/rucs`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        ruc,
        razon_social: razon_social || '',
      }),
    })

    const crearData = await crearRes.json()

    if (!crearRes.ok && crearRes.status !== 409) {
      console.error('❌ FACTUSMART /rucs POST ERROR:', JSON.stringify(crearData, null, 2))
      return NextResponse.json(
        { error: 'Error creando RUC en Factusmart', detalle: crearData },
        { status: 400 }
      )
    }

    // ── 2. Configurar credenciales SOL (modo Smart PSE sin certificado) ──────
    const solRes = await fetch(`${BASE}/rucs/${ruc}/sunat`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        sol_usuario,
        sol_clave,
        modalidad: 'pse',           // Smart PSE — sin certificado propio
        entorno:   modo === 'produccion' ? 'produccion' : 'beta',
      }),
    })

    const solData = await solRes.json()

    if (!solRes.ok) {
      console.error('❌ FACTUSMART /rucs/sunat ERROR:', JSON.stringify(solData, null, 2))
      return NextResponse.json(
        { error: 'Error configurando credenciales SOL', detalle: solData },
        { status: 400 }
      )
    }

    // ── 3. Guardar pse_usuario y pse_clave que devuelve Smart PSE ────────────
    // solData.credenciales_cpe contiene usuario_secundaria y token_acceso
    // Necesitamos guardarlos para hacer PUT /rucs/{ruc}/sunat en producción
    const pseUsuario = solData.credenciales_cpe?.usuario_secundaria || null
    const pseClave   = solData.credenciales_cpe?.token_acceso        || null

    // ── 4. Actualizar tabla talleres ─────────────────────────────────────────
    // IMPORTANTE: guardamos sol_usuario y sol_clave para poder reconfigurar
    // si es necesario, pero en producción deberías encriptarlos.
    // Las credenciales PSE también se guardan por si Factusmart las necesita.
    const { error: dbError } = await supabaseAdmin
      .from('talleres')
      .update({
        factusmart_ruc_registrado: true,
        factusmart_sol_usuario:    sol_usuario,
        factusmart_sol_clave:      sol_clave,
        factusmart_modo:           modo,
        // Guardamos las credenciales PSE en apisunat_token (reutilizamos columna)
        // para no crear más columnas innecesarias
        apisunat_token: pseClave   || '',
        apisunat_ruc:   pseUsuario || '',
      })
      .eq('id', taller_id)

    if (dbError) {
      console.error('❌ Supabase update error:', dbError)
      // No bloqueamos — el RUC ya quedó registrado en Factusmart
    }

    return NextResponse.json({
      ok: true,
      mensaje: `RUC ${ruc} registrado en Factusmart correctamente`,
      modo,
      ruc_data: crearData,
      sol_data: solData,
    })

  } catch (err: any) {
    console.error('❌ /registrar-ruc route error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}