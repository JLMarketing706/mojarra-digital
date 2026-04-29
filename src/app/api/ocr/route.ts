import { NextRequest, NextResponse } from 'next/server'
import { extraerDatosDocumento } from '@/lib/claude/ocr'
import { createClient } from '@/lib/supabase/server'

// Rate limiting simple en memoria (producción debería usar Redis/Upstash)
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS = 10
const WINDOW_MS = 60_000 // 1 minuto

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
    const archivo = formData.get('archivo') as File | null

    if (!archivo) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!tiposPermitidos.includes(archivo.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado. Usá JPG, PNG, WEBP o PDF.' },
        { status: 400 }
      )
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (archivo.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo supera el tamaño máximo de 5MB.' },
        { status: 400 }
      )
    }

    const buffer = await archivo.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const mimeType = archivo.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
    const datos = await extraerDatosDocumento(base64, mimeType)

    return NextResponse.json({ datos })
  } catch (error) {
    console.error('Error en OCR:', error)
    return NextResponse.json(
      { error: 'Error al procesar el documento. Intentá de nuevo.' },
      { status: 500 }
    )
  }
}
