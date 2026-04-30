import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/invitaciones/aceptar
// Body: { token, nombre, apellido, password }
//
// El invitado acepta su invitación: este endpoint hace TODO en el server
// usando service role:
//   1. Valida la invitación (no usada, no cancelada, no expirada)
//   2. Crea la cuenta de auth con email confirmado (no requiere verificación)
//   3. Actualiza el profile: vincula a la escribanía, asigna el rol invitado
//   4. Marca la invitación como aceptada
//   5. Audit log
//
// Mover esto al backend evita depender del flag "Allow public signups" en
// Supabase Auth (que normalmente conviene tener apagado).

interface Body {
  token?: string
  nombre?: string
  apellido?: string
  password?: string
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body

  const token = body.token?.trim() ?? ''
  const nombre = body.nombre?.trim() ?? ''
  const apellido = body.apellido?.trim() ?? ''
  const password = body.password ?? ''

  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  if (!nombre || !apellido) {
    return NextResponse.json({ error: 'Nombre y apellido son obligatorios' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // 1. Cargar y validar invitación
  const { data: inv } = await admin
    .from('invitaciones')
    .select('id, escribania_id, email, rol, expira_at, aceptada_at, cancelada_at')
    .eq('token', token)
    .maybeSingle()

  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  if (inv.aceptada_at) return NextResponse.json({ error: 'La invitación ya fue aceptada' }, { status: 400 })
  if (inv.cancelada_at) return NextResponse.json({ error: 'La invitación fue cancelada' }, { status: 400 })
  if (new Date(inv.expira_at) < new Date()) {
    return NextResponse.json({ error: 'La invitación expiró' }, { status: 400 })
  }

  const email = inv.email.toLowerCase()

  // 2. Crear / reutilizar el user de auth
  let userId: string | null = null

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido },
  })

  if (createErr) {
    const msg = createErr.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
      // El email ya tiene cuenta — buscarla por email
      const { data: list } = await admin.auth.admin.listUsers()
      const existing = list?.users.find(u => u.email?.toLowerCase() === email)
      if (!existing) {
        return NextResponse.json({
          error: 'Ya existe una cuenta con ese email pero no se pudo recuperar. Probá iniciar sesión.',
        }, { status: 500 })
      }
      userId = existing.id
    } else {
      console.error('[aceptar-invitacion] createUser error', createErr)
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }
  } else if (created.user) {
    userId = created.user.id
  }

  if (!userId) {
    return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 })
  }

  // 3. Upsert profile (si el trigger handle_new_user falló, lo creamos acá)
  const { error: profileErr } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      nombre,
      apellido,
      email,
      escribania_id: inv.escribania_id,
      rol: inv.rol,
      activo: true,
    }, { onConflict: 'id' })

  if (profileErr) {
    console.error('[aceptar-invitacion] profile update error', profileErr)
    return NextResponse.json({ error: 'No se pudo actualizar el perfil' }, { status: 500 })
  }

  // 4. Marcar invitación como aceptada
  await admin
    .from('invitaciones')
    .update({
      aceptada_at: new Date().toISOString(),
      aceptada_por: userId,
    })
    .eq('id', inv.id)

  // 5. Audit log
  await admin.from('audit_logs').insert({
    actor_id: userId,
    actor_email: email,
    accion: 'INVITATION_ACCEPTED',
    tabla: 'invitaciones',
    registro_id: inv.id,
    cambios: { rol: inv.rol, escribania_id: inv.escribania_id },
    escribania_id: inv.escribania_id,
  })

  return NextResponse.json({ ok: true, email })
}
