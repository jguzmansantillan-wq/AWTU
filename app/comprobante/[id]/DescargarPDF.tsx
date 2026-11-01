'use client'

import { useState } from 'react'

export default function DescargarPDF({ base64, nro }: { base64: string; nro: string }) {
  const [loading, setLoading] = useState(false)

  const descargar = () => {
    setLoading(true)
    const link = document.createElement('a')
    link.href = base64
    link.download = `${nro}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setLoading(false), 1000)
  }

  const verPDF = () => {
    const win = window.open()
    if (win) {
      win.document.write(`<iframe src="${base64}" style="width:100%;height:100%;border:none;"></iframe>`)
    }
  }

  return (
    <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
      <button
        onClick={verPDF}
        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm py-3 rounded-2xl transition-colors"
      >
        👁️ Ver PDF
      </button>
      <button
        onClick={descargar}
        disabled={loading}
        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-sm py-3 rounded-2xl transition-colors"
      >
        {loading ? '⏳ Descargando...' : '⬇️ Descargar PDF'}
      </button>
    </div>
  )
}