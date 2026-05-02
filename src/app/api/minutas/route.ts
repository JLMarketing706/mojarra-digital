import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revisarDatosMinuta } from '@/lib/claude/minutas'
import { ROLES_STAFF } from '@/types'
import type { Tramite } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single()
  if (!profile || !ROLES_STAFF.includes(profile.rol as typeof ROLES_STAFF[number])) {
    return NextResponse.json({ error: 'Tu rol no tiene acceso a esta función.' }, { status: 403 })
  }

  try {
    const { tramiteId } = await request.json() as { tramiteId: string }
    if (!tramiteId) return NextResponse.json({ error: 'tramiteId requerido.' }, { status: 400 })

    const { data: tramite } = await supabase
      .from('tramites')
      .select('*, cliente:clientes(*)')
      .eq('id', tramiteId)
      .single()

    if (!tramite) return NextResponse.json({ error: 'Operación no encontrada.' }, { status: 404 })

    const observaciones = await revisarDatosMinuta(tramite as Tramite)
    return NextResponse.json({ observaciones })
  } catch (error) {
    console.error('Error en minutas:', error)
    return NextResponse.json({ error: 'Error al analizar la operación.' }, { status: 500 })
  }
}
