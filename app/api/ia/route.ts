import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { pregunta, contexto } = await request.json()
  if (!pregunta) return NextResponse.json({ error: 'Pregunta requerida' }, { status: 400 })

  const prompt = contexto
    ? `Eres un asistente tecnico especializado en mecanica automotriz para talleres en Peru. El vehiculo consultado es: ${contexto}. Responde de forma clara y concisa en español. Pregunta: ${pregunta}`
    : `Eres un asistente tecnico especializado en mecanica automotriz para talleres en Peru. Responde de forma clara y concisa en español. Pregunta: ${pregunta}`

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    })
    const data = await res.json()
    const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta de la IA.'
    return NextResponse.json({ respuesta })
  } catch (err) {
    console.error('Error Gemini:', err)
    return NextResponse.json({ respuesta: 'Error al conectar con la IA.' })
  }
}