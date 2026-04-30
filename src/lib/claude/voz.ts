import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface DatosIndiceVoz {
  numero_escritura?: number
  folio?: string
  fecha?: string
  tipo_acto?: string
  partes?: string
  inmueble?: string
  observaciones?: string
}

export async function clasificarDictadoVoz(textoTranscripto: string): Promise<DatosIndiceVoz> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: `Sos un asistente notarial argentino. Recibís el dictado de un escribano y debés clasificar los datos en los campos del índice notarial.
Campos del índice: numero_escritura (entero), folio (texto), fecha (DD/MM/AAAA), tipo_acto, partes (nombres de las partes), inmueble (descripción del inmueble si aplica), observaciones.
Respondé solo con un JSON válido. Omití los campos que no puedas identificar con certeza.`,
    messages: [
      {
        role: 'user',
        content: `Dictado del escribano: "${textoTranscripto}"\n\nExtrae y clasifica los datos en el formato del índice notarial.`,
      },
    ],
  })

  const texto = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = texto.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}

  return JSON.parse(jsonMatch[0]) as DatosIndiceVoz
}
