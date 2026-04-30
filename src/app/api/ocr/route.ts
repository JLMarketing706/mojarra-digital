import { NextRequest, NextResponse } from 'next/server'
import { extraerDatosDocumento, type ImagenOcr, type OcrMimeType } from '@/lib/claude/ocr'
import { createClient } from '@/lib/supabase/server'

// Rate limiting simple en memoria (producción debería usar Redis/Upstash)
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS = 10
const WINDOW_MS = 60_000 // 1 minuto

const TIPOS_PERMITIDOS: OcrMimeType[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB por archivo
const MAX_ARCHIVOS = 4           // ej: frente + dorso, o varias páginas de un poder

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(key)

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (entry.count >= MAX_REQUESTS) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  // Auth: solo usuarios autenticados pueden usar el OCR (cuesta plata)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Rate limit por usuario
  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intentá en un momento.' },
      { status: 429 }
    )
  }

  try {
    const formData = await request.formData()
    // Soporta:
    //  - 'archivo' (single legacy)
    //  - 'archivos' (varios) — appendea con el mismo key cada archivo
    //  - 'frente' / 'dorso' (nombres semánticos)
    const archivos: File[] = []
    for (const key of ['archivo', 'frente', 'dorso']) {
      const f = formData.get(key)
      if (f instanceof File) archivos.push(f)
    }
    formData.getAll('archivos').forEach((f) => {
      if (f instanceof File) archivos.push(f)
    })

    if (archivos.length === 0) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })
    }
    if (archivos.length > MAX_ARCHIVOS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_ARCHIVOS} archivos por solicitud.` },
        { status: 400 }
      )
    }

    const imagenes: ImagenOcr[] = []
    for (const archivo of archivos) {
      if (!TIPOS_PERMITIDOS.includes(archivo.type as OcrMimeType)) {
        return NextResponse.json(
          { error: `Tipo de archivo no soportado: ${archivo.name}. Usá JPG, PNG, WEBP o PDF.` },
          { status: 400 }
        )
      }
      if (archivo.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `El archivo ${archivo.name} supera el tamaño máximo de 5MB.` },
          { status: 400 }
        )
      }
      const buffer = await archivo.arrayBuffer()
      imagenes.push({
        base64: Buffer.from(buffer).toString('base64'),
        mimeType: archivo.type as OcrMimeType,
      })
    }

    const datos = await extraerDatosDocumento(imagenes)
    return NextResponse.json({ datos })
  } catch (error) {
    console.error('Error en OCR:', error)
    const detalle = error instanceof Error ? error.message : 'desconocido'
    return NextResponse.json(
      { error: `Error al procesar el documento: ${detalle}` },
      { status: 500 }
    )
  }
}
