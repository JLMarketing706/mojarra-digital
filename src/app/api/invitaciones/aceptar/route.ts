import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST /api/invitaciones/aceptar
// Body: { token, nombre, apellido }
//
// Cuando un invitado acepta su invitación:
// 1. Su cuenta de Auth ya fue creada vía signUp en el cliente.
// 2. handle_new_user() creó un profile con rol='cliente' por defecto.
// 3. Acá usamos service_role para promoverlo al rol invitado y vincular escribanía.

export async function POST(req: NextRequest) {
  const ssrClient = await createServerClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = (await req.json()) as { token?: string; nombre?: string; apellido?: string }
  if (!body.token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  // Cliente con service role: bypassea RLS para esta operación crítica
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // 1. Cargar invitación válida
  const { data: inv } = await admin
    .from('invitaciones')
    .select('id, escribania_id, email, rol, expira_at, aceptada_at, cancelada_at')
    .eq('token', body.token)
    .maybeSingle()

  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  if (inv.aceptada_at) return NextResponse.json({ error: 'Ya aceptada' }, { status: 400 })
  if (inv.cancelada_at) return NextResponse.json({ error: 'Cancelada' }, { status: 400 })
  if (new Date(inv.expira_at) < new Date()) {
    return NextResponse.json({ error: 'Expirada' }, { status: 400 })
  }

  // Validar que el email del usuario logueado coincida con el de la invitación
  if (user.email?.toLowerCase() !== inv.email.toLowerCase()) {
    return NextResponse.json({
      error: `La invitación es para ${inv.email}. Iniciá sesión con ese email.`,
    }, { status: 403 })
  }

  // 2. Actualizar profile: vincular escribanía + promover rol
  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      escribania_id: inv.escribania_id,
      rol: inv.rol,
      nombre: body.nombre || undefined,
      apellido: body.apellido || undefined,
      activo: true,
    })
    .eq('id', user.id)

  if (profileErr) {
    console.error(profileErr)
    return NextResponse.json({ error: 'No se pudo actualizar el perfil' }, { status: 500 })
  }

  // 3. Marcar invitación como aceptada
  await admin
    .from('invitaciones')
    .update({
      aceptada_at: new Date().toISOString(),
      aceptada_por: user.id,
    })
    .eq('id', inv.id)

  // 4. Audit log
  await admin.from('audit_logs').insert({
    actor_id: user.id,
    actor_email: user.email,
    accion: 'INVITATION_ACCEPTED',
    tabla: 'invitaciones',
    registro_id: inv.id,
    cambios: { rol: inv.rol, escribania_id: inv.escribania_id },
    escribania_id: inv.escribania_id,
  })

  return NextResponse.json({ ok: true })
}
