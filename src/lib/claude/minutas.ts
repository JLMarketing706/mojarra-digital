import Anthropic from '@anthropic-ai/sdk'
import type { Tramite } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ObservacionMinuta {
  campo: string
  mensaje: string
  tipo: 'error' | 'advertencia' | 'sugerencia'
}

export async function revisarDatosMinuta(tramite: Tramite): Promise<ObservacionMinuta[]> {
  const contexto = JSON.stringify(tramite, null, 2)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Sos un asistente notarial argentino experto en revisión de minutas y expedientes.
Revisás los datos de un trámite notarial y detectás posibles errores, inconsistencias o datos faltantes antes de enviarlos al registro.
Verificá: completitud de datos del cliente, coherencia entre partes e inmueble, alertas UIF relevantes, fechas coherentes.
Respondé con un array JSON de observaciones con el formato: [{campo, mensaje, tipo}] donde tipo es "error", "advertencia" o "sugerencia".
Si no hay observaciones, devolvé un array vacío [].`,
    messages: [
      {
        role: 'user',
        content: `Revisá los datos de este trámite notarial:\n\n${contexto}`,
      },
    ],
  })

  const texto = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const jsonMatch = texto.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  return JSON.parse(jsonMatch[0]) as ObservacionMinuta[]
}
