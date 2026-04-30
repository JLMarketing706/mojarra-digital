import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface DatosDocumento {
  tipo_documento: 'dni' | 'escritura' | 'titulo_propiedad' | 'sentencia' | 'poder' | 'otro'
  nombre?: string
  apellido?: string
  dni?: string
  cuil?: string
  fecha_nacimiento?: string
  domicilio?: string
  estado_civil?: string
  fecha?: string
  datos_adicionales?: Record<string, string>
}

export async function extraerDatosDocumento(
  imagenBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
): Promise<DatosDocumento> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Sos un sistema de extracción de datos para una escribanía argentina.
Tu tarea es analizar documentos (DNI, escrituras, títulos de propiedad, sentencias, poderes) y extraer los datos estructurados.
Siempre respondé con un JSON válido y nada más. Si un campo no está presente en el documento, omitilo del JSON.
Los campos posibles son: tipo_documento, nombre, apellido, dni, cuil, fecha_nacimiento, domicilio, estado_civil, fecha, datos_adicionales.
Para tipo_documento usá: dni, escritura, titulo_propiedad, sentencia, poder, otro.
Fechas en formato DD/MM/AAAA. DNI sin puntos. CUIL con guiones (XX-XXXXXXXX-X).`,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType === 'application/pdf' ? 'image/jpeg' : mimeType,
              data: imagenBase64,
            },
          },
          {
            type: 'text',
            text: 'Extraé todos los datos relevantes de este documento y devolvé un JSON estructurado.',
          },
        ],
      },
    ],
  })

  const texto = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = texto.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { tipo_documento: 'otro' }

  return JSON.parse(jsonMatch[0]) as DatosDocumento
}
