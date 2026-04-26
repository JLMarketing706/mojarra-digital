import { NextRequest, NextResponse } from 'next/server'
import { clasificarDictadoVoz } from '@/lib/claude/voz'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Solo staff autenticado puede usar esta ruta
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  try {
    const { texto } = await request.json() as { texto: string }

    if (!texto || typeof texto !== 'string' || texto.trim().length < 5) {
      return NextResponse.json({ error: 'Texto muy corto o inválido.' }, { status: 400 })
    }

    const datos = await clasificarDictadoVoz(texto.trim())
    return NextResponse.json({ datos })
  } catch (error) {
    console.error('Error en clasificación de voz:', error)
    return NextResponse.json(
      { error: 'Error al procesar el dictado.' },
      { status: 500 }
    )
  }
}
