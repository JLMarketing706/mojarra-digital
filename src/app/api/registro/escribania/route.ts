import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/registro/escribania
// Alta self-service de una escribanía con trial de 7 días.
// Crea: auth user (confirmado) + escribanía + profile como escribano_titular.

const TRIAL_DIAS = 7

interface Body {
  // Titular
  nombre?: string
  apellido?: string
  email?: string
  password?: string
  telefono?: string
  // Escribanía
  razonSocial?: string
  nombreFantasia?: string
  cuit?: string
  jurisdiccion?: string
  localidad?: string
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body

  const nombre = body.nombre?.trim() ?? ''
  const apellido = body.apellido?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const telefono = body.telefono?.trim() || null
  const razonSocial = body.razonSocial?.trim() ?? ''
  const nombreFantasia = body.nombreFantasia?.trim() || null
  const cuit = body.cuit?.replace(/[\s-]/g, '') ?? ''
  const jurisdiccion = body.jurisdiccion?.trim() ?? ''
  const localidad = body.localidad?.trim() ?? ''

  if (!nombre || !apellido) return NextResponse.json({ error: 'Nombre y apellido son obligatorios' }, { status: 400 })
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  if (!razonSocial) return NextResponse.json({ error: 'Razón social obligatoria' }, { status: 400 })
  if (!cuit.match(/^\d{11}$/)) return NextResponse.json({ error: 'CUIT inválido (11 dígitos)' }, { status: 400 })
  if (!jurisdiccion) return NextResponse.json({ error: 'Jurisdicción obligatoria' }, { status: 400 })
  if (!localidad) return NextResponse.json({ error: 'Localidad obligatoria' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // 1. CUIT único
  const { data: cuitExistente } = await admin
    .from('escribanias')
    .select('id')
    .eq('cuit', cuit)
    .maybeSingle()
  if (cuitExistente) {
    return NextResponse.json({ error: 'Ya existe una escribanía con ese CUIT' }, { status: 400 })
  }

  // 2. Crear user en auth (confirmado, sin email de verificación)
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido },
  })

  if (authError || !created.user) {
    const msg = authError?.message ?? 'No se pudo crear la cuenta'
    const status = msg.toLowerCase().includes('already') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
  const userId = created.user.id

  // 3. Crear escribanía con trial
  const trialUntil = new Date()
  trialUntil.setDate(trialUntil.getDate() + TRIAL_DIAS)

  const { data: escribania, error: escError } = await admin
    .from('escribanias')
    .insert({
      razon_social: razonSocial,
      nombre_fantasia: nombreFantasia,
      cuit,
      jurisdiccion,
      dom_localidad: localidad,
      telefono,
      email,
      plan: 'trial',
      estado: 'trial',
      trial_until: trialUntil.toISOString().slice(0, 10),
    })
    .select('id')
    .single()

  if (escError || !escribania) {
    // Rollback del user para no dejar huérfano
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'No se pudo crear la escribanía' }, { status: 500 })
  }

  // 4. Actualizar profile (creado por trigger handle_new_user) con rol y escribanía
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      nombre,
      apellido,
      telefono,
      rol: 'escribano_titular',
      escribania_id: escribania.id,
      activo: true,
    })
    .eq('id', userId)

  if (profileError) {
    // Rollback escribanía + user
    await admin.from('escribanias').delete().eq('id', escribania.id)
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'No se pudo crear el perfil' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    escribaniaId: escribania.id,
    trialUntil: trialUntil.toISOString().slice(0, 10),
  })
}
