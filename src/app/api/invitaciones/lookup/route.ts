import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/invitaciones/lookup?token=XXX
// Endpoint público (sin auth) que el invitado usa para ver los datos
// de su invitación antes de registrarse. El token es secreto y único,
// funciona como llave de acceso a una sola invitación.
//
// NOTA DE SEGURIDAD: solo expone los campos necesarios para mostrarle
// al usuario qué escribanía lo invita y bajo qué rol. NO expone otras
// invitaciones de la misma escribanía.

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data } = await admin
    .from('invitaciones')
    .select(`
      id, email, rol, expira_at, aceptada_at, cancelada_at, mensaje,
      escribania:escribanias(id, razon_social, nombre_fantasia),
      invitador:profiles!invitado_por(nombre, apellido)
    `)
    .eq('token', token)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ invitacion: data })
}
