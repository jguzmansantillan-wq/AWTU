import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const toTitleCase = (str: string) =>
  str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

export default async function ComprobantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: c, error } = await supabase
    .from('comprobantes')
    .select('*')
    .eq('id', id)
    .single()

  let taller: any = {}
  if (c?.taller_id) {
    const { data: t } = await supabase
      .from('talleres')
      .select('nombre, logo_url, ruc, direccion, telefono')
      .eq('id', c.taller_id)
      .single()
    taller = t || {}
  }

  if (!c || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <p className="text-6xl mb-4">🔍</p>
          <p className="font-black text-slate-700 text-lg">Comprobante no encontrado</p>
          <p className="text-slate-400 text-sm mt-2">El enlace puede ser incorrecto o el comprobante fue eliminado.</p>
        </div>
      </div>
    )
  }

  const nro    = `${c.serie}-${String(c.numero).padStart(6, '0')}`
  const items  = Array.isArray(c.payload?.items) ? c.payload.items : []
  const sub    = c.payload?.subtotal  || (c.monto / 1.18)
  const igv    = c.payload?.igv       || (c.monto - sub)
  const fecha  = c.fecha_emision || new Date(c.created_at).toLocaleDateString('es-PE')
  const esDemo = c.payload?.entorno !== 'produccion'

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-md mx-auto">

        {esDemo && (
          <div className="bg-amber-100 border border-amber-300 rounded-xl px-4 py-2 mb-4 text-center">
            <p className="text-amber-700 font-black text-xs uppercase tracking-wider">🧪 Comprobante de Prueba — Sin validez fiscal</p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
            {taller.logo_url ? (
              <img src={taller.logo_url} className="w-14 h-14 rounded-2xl object-contain bg-white p-1" alt="logo" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl">🔧</div>
            )}
            <div className="flex-1">
              <p className="font-black text-white text-lg uppercase tracking-tight">{taller.nombre || 'Taller'}</p>
              {taller.ruc       && <p className="text-slate-400 text-xs font-bold mt-0.5">RUC: {taller.ruc}</p>}
              {taller.direccion && <p className="text-slate-400 text-xs font-bold">{taller.direccion}</p>}
              {taller.telefono  && <p className="text-slate-400 text-xs font-bold">Tel: {taller.telefono}</p>}
            </div>
          </div>

          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs px-3 py-1.5 rounded-full font-black uppercase tracking-wider ${
                c.tipo === 'factura' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {c.tipo === 'factura' ? 'Factura Electrónica' : 'Boleta de Venta'}
              </span>
              <span className={`text-xs px-3 py-1.5 rounded-full font-black uppercase ${
                c.estado_sunat === 'emitido' ? 'bg-green-100 text-green-700' :
                c.estado_sunat === 'anulado' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {c.estado_sunat === 'emitido' ? '✓ Aceptado SUNAT' : c.estado_sunat?.toUpperCase()}
              </span>
            </div>
            <p className="font-black text-slate-900 text-2xl mt-3">{nro}</p>
            <p className="text-slate-400 text-sm font-bold mt-0.5">Fecha: {fecha}</p>
          </div>

          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente</p>
            <p className="font-black text-slate-800 text-base">{toTitleCase(c.cliente_nombre || '')}</p>
            {c.cliente_doc && (
              <p className="text-slate-500 text-sm font-semibold mt-0.5">
                {c.tipo === 'factura' ? 'RUC' : 'DNI'}: {c.cliente_doc}
              </p>
            )}
            {c.cliente_dir && (
              <p className="text-slate-400 text-xs font-semibold mt-0.5">{c.cliente_dir}</p>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-b border-slate-100">
              <div className="flex justify-between px-6 py-2 bg-slate-900">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Descripción</span>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Precio</span>
              </div>
              {items.map((item: any, i: number) => (
                <div key={i} className={`flex justify-between items-center px-6 py-3 border-b border-slate-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <span className="text-sm font-semibold text-slate-700 flex-1 mr-4 uppercase">{item.descripcion}</span>
                  <span className="text-sm font-black text-slate-900 shrink-0">S/ {(item.precio || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-6 py-4 space-y-2 border-b border-slate-100">
            <div className="flex justify-between text-sm text-slate-500">
              <span className="font-semibold">Subtotal</span>
              <span className="font-bold">S/ {Number(sub).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span className="font-semibold">IGV (18%)</span>
              <span className="font-bold">S/ {Number(igv).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-black text-slate-900 text-base uppercase tracking-wide">Total</span>
              <span className="font-black text-blue-600 text-3xl">S/ {(c.monto || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="px-6 py-4 text-center bg-slate-50">
            <p className="text-slate-400 text-xs font-bold">¡Gracias por su preferencia! 🙏</p>
            {taller.nombre && (
              <p className="text-slate-300 text-[10px] font-bold mt-1 uppercase tracking-widest">{taller.nombre}</p>
            )}
          </div>
        </div>

        <p className="text-center text-slate-400 text-[10px] font-bold mt-4 uppercase tracking-widest">
          Comprobante electrónico emitido a través de AWTU · SUNAT Perú
        </p>
      </div>
    </div>
  )
}