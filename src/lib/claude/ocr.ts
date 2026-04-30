import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type OcrMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

export interface ImagenOcr {
  base64: string
  mimeType: OcrMimeType
}

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
  imagenes: ImagenOcr[],
): Promise<DatosDocumento> {
  if (imagenes.length === 0) return { tipo_documento: 'otro' }

  // Claude no acepta application/pdf como image source — lo tratamos como image/jpeg
  // (el conversor de PDF en el cliente debería rasterizar antes; acá es fallback).
  const contenidoImagenes = imagenes.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: (img.mimeType === 'application/pdf' ? 'image/jpeg' : img.mimeType) as
        'image/jpeg' | 'image/png' | 'image/webp',
      data: img.base64,
    },
  }))

  const promptUsuario = imagenes.length > 1
    ? 'Te paso varias imágenes del mismo documento (frente y dorso de un DNI o varias páginas). Combiná los datos de todas y devolvé un único JSON estructurado.'
    : 'Extraé todos los datos relevantes de este documento y devolvé un JSON estructurado.'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Sos un sistema de extracción de datos para una escribanía argentina.
Tu tarea es analizar documentos (DNI, escrituras, títulos de propiedad, sentencias, poderes) y extraer los datos estructurados.
Cuando recibas varias imágenes del mismo documento (ej: frente y dorso de DNI), combiná la información de todas ellas en un único JSON.
Siempre respondé con un JSON válido y nada más. Si un campo no está presente en el documento, omitilo del JSON.
Los campos posibles son: tipo_documento, nombre, apellido, dni, cuil, fecha_nacimiento, domicilio, estado_civil, fecha, datos_adicionales.
Para tipo_documento usá: dni, escritura, titulo_propiedad, sentencia, poder, otro.
Fechas en formato DD/MM/AAAA. DNI sin puntos. CUIL con guiones (XX-XXXXXXXX-X).`,
    messages: [
      {
        role: 'user',
        content: [
          ...contenidoImagenes,
          { type: 'text', text: promptUsuario },
        ],
      },
    ],
  })

  const texto = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = texto.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { tipo_documento: 'otro' }

  return JSON.parse(jsonMatch[0]) as DatosDocumento
}
