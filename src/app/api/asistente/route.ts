import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { ROLES_STAFF } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Sos el asistente virtual de Mojarra Digital, una plataforma para escribanías argentinas.

Tu rol es responder consultas del staff (escribanos, oficiales de cumplimiento, secretarias) sobre:
- Normativa UIF argentina (Res. 242/2023, 56/2024, 78/2025, Ley 25.246)
- Operaciones notariales (compraventas, hipotecas, sociedades, poderes, etc.)
- Procedimientos del sistema Mojarra (cómo cargar una operación, generar una DDJJ, ver alertas, etc.)
- Umbrales SMVM vigentes (700 SMVM compraventa total, 700 SMVM efectivo, 150 SMVM administración de bienes)
- Categorización de riesgo de clientes (PEP, sujetos obligados, beneficiarios finales)

Reglas:
- Respondé en español rioplatense (vos, tenés, podés).
- Sé conciso. Si la respuesta es directa, no des rodeos.
- Si no sabés algo o requiere análisis legal específico, recomendá consultar con un escribano titular o el oficial de cumplimiento.
- No inventes referencias normativas. Si no estás seguro de un número de resolución, decilo.
- Para preguntas operativas del sistema, dirigí al usuario a la sección correspondiente: /crm/clientes, /crm/tramites, /crm/uif, /crm/cumplimiento, etc.

FORMATO DE RESPUESTA — IMPORTANTE:
- Respondé en TEXTO PLANO, sin markdown.
- NO uses asteriscos para negrita (**texto**), NO uses ### para títulos, NO uses --- como separador, NO uses emojis numerados (1️⃣ 2️⃣).
- Si necesitás listas, usá guiones simples al inicio de línea (- item).
- Si necesitás separar secciones, usá un salto de línea en blanco.
- Mantené las respuestas cortas (2-4 párrafos máx). Si te piden algo largo, ofrecé un resumen y preguntá si quieren más detalle.`

interface Mensaje { role: 'user' | 'assistant'; content: string }

const LIMITE_DIARIO = 50

/** Devuelve la fecha de "hoy" en zona Buenos Aires (YYYY-MM-DD) */
function hoyArgentina(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return fmt.format(new Date()) // 'YYYY-MM-DD'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (!profile || !ROLES_STAFF.includes(profile.rol as typeof ROLES_STAFF[number])) {
    return NextResponse.json({ error: 'Acceso restringido al staff.' }, { status: 403 })
  }

  // Rate limit: 50 mensajes/día por usuario (zona AR)
  const fecha = hoyArgentina()
  const { data: usoRow } = await supabase
    .from('asistente_uso')
    .select('mensajes')
    .eq('user_id', user.id)
    .eq('fecha', fecha)
    .maybeSingle()

  const usoActual = (usoRow as { mensajes: number } | null)?.mensajes ?? 0
  if (usoActual >= LIMITE_DIARIO) {
    return NextResponse.json({
      error: `Ya usaste tus ${LIMITE_DIARIO} consultas diarias al asistente. El contador se reinicia mañana.`,
      limiteAlcanzado: true,
      uso: usoActual,
      limite: LIMITE_DIARIO,
    }, { status: 429 })
  }

  try {
    const { mensajes } = await request.json() as { mensajes: Mensaje[] }
    if (!mensajes || mensajes.length === 0) {
      return NextResponse.json({ error: 'Mensaje vacío.' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: mensajes,
    })

    const respuesta = response.content[0].type === 'text' ? response.content[0].text : ''

    // Registrar uso (upsert)
    await supabase.from('asistente_uso').upsert({
      user_id: user.id,
      fecha,
      mensajes: usoActual + 1,
    })

    return NextResponse.json({
      respuesta,
      uso: usoActual + 1,
      limite: LIMITE_DIARIO,
    })
  } catch (error) {
    console.error('Error en asistente:', error)
    return NextResponse.json({ error: 'Error al conectar con el asistente.' }, { status: 500 })
  }
}
