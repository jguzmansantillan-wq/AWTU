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
      correo,        // Email del taller (requerido por Factusmart)
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

    // Para registrar y configurar credenciales SOL, Factusmart SIEMPRE requiere
    // la API key de producción — la de prueba no tiene permisos de escritura.
    // El parámetro "modo" solo afecta el entorno de envío a SUNAT (beta/produccion).
    const apiKeyConfig = API_KEY  // siempre producción para configurar

    // Generar clave para el portal Factusmart (no es la clave SOL)
    const clavePortal = `Awtu${ruc.slice(-4)}${Date.now().toString(36).toUpperCase()}`

    // ── 1. Crear el RUC en Factusmart ────────────────────────────────────────
    // Si ya existe, Factusmart devuelve error 409 — lo ignoramos y continuamos
    const crearRes = await fetch(`${BASE}/rucs`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKeyConfig },
      body: JSON.stringify({
        ruc,
        empresa:      razon_social || ruc,
        razon_social: razon_social || '',
        correo:       correo || `${ruc}@awtu.pe`,
        clave:        clavePortal,
      }),
    })

    const crearData = await crearRes.json()

    if (!crearRes.ok && crearRes.status !== 409) {
      console.error('❌ FACTUSMART /rucs POST ERROR:', JSON.stringify(crearData, null, 2))
      const detalleMensaje = crearData?.message || crearData?.error || crearData?.detail || JSON.stringify(crearData)
      return NextResponse.json(
        { error: `Error creando RUC en Factusmart: ${detalleMensaje}` },
        { status: 400 }
      )
    }

    // ── 2. Configurar credenciales SOL (modo Smart PSE sin certificado) ──────
    const solRes = await fetch(`${BASE}/rucs/${ruc}/sunat`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKeyConfig },
      body: JSON.stringify({
        sol_usuario,
        sol_clave,
        modalidad: 'sunat',         // Envío directo a SUNAT con credenciales SOL
        entorno:   modo === 'produccion' ? 'produccion' : 'prueba',
      }),
    })

    const solData = await solRes.json()

    if (!solRes.ok) {
      console.error('❌ FACTUSMART /rucs/sunat ERROR:', JSON.stringify(solData, null, 2))
      const detalleSol = typeof solData?.message === 'string'
        ? solData.message
        : typeof solData?.error === 'string'
          ? solData.error
          : JSON.stringify(solData)
      return NextResponse.json(
        { error: `Error configurando credenciales SOL: ${detalleSol}` },
        { status: 400 }
      )
    }

    // ── 3. Guardar credenciales PSE que devuelve Smart PSE ───────────────────
    const pseUsuario = solData.credenciales_cpe?.usuario_secundaria || null
    const pseClave   = solData.credenciales_cpe?.token_acceso        || null

    // ── 4. Actualizar tabla talleres ─────────────────────────────────────────
    const { error: dbError } = await supabaseAdmin
      .from('talleres')
      .update({
        factusmart_ruc_registrado: true,
        factusmart_sol_usuario:    sol_usuario,
        factusmart_sol_clave:      sol_clave,
        factusmart_modo:           modo,
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