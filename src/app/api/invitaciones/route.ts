import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { templateInvitacion } from '@/lib/email/templates'
import { LABEL_ROL_INVITABLE, type RolInvitable } from '@/types'

const ROLES_VALIDOS: RolInvitable[] = [
  'escribano_titular', 'oficial_cumplimiento', 'escribano_adscripto', 'empleado_admin',
]

// POST /api/invitaciones — Titular invita a un nuevo miembro a la escribanía
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que es Titular
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, escribania_id, activo')
    .eq('id', user.id)
    .single()

  if (!profile || !['escribano_titular', 'escribano'].includes(profile.rol) || !profile.activo) {
    return NextResponse.json({ error: 'Solo escribanos titulares pueden invitar' }, { status: 403 })
  }

  if (!profile.escribania_id) {
    return NextResponse.json({ error: 'Tu cuenta no está asociada a una escribanía' }, { status: 400 })
  }

  const body = (await req.json()) as { email?: string; rol?: string; mensaje?: string }
  const email = body.email?.trim().toLowerCase() ?? ''
  const rol = body.rol as RolInvitable
  const mensaje = body.mensaje?.trim() ?? null

  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  // Verificar que la escribanía no haya alcanzado su límite de usuarios
  const { data: escribaniaInfo } = await supabase
    .from('escribanias')
    .select('max_usuarios, razon_social, nombre_fantasia')
    .eq('id', profile.escribania_id)
    .single()

  const { count: usuariosActivos } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('escribania_id', profile.escribania_id)
    .eq('activo', true)
    .is('desactivado_at', null)

  if (escribaniaInfo && usuariosActivos !== null && usuariosActivos >= escribaniaInfo.max_usuarios) {
    return NextResponse.json({
      error: `Tu plan permite ${escribaniaInfo.max_usuarios} usuarios. Desactivá uno o actualizá el plan.`,
    }, { status: 400 })
  }

  // Verificar invitación previa pendiente con mismo email
  const { data: previa } = await supabase
    .from('invitaciones')
    .select('id, expira_at, aceptada_at, cancelada_at')
    .eq('escribania_id', profile.escribania_id)
    .eq('email', email)
    .is('aceptada_at', null)
    .is('cancelada_at', null)
    .gte('expira_at', new Date().toISOString())
    .maybeSingle()

  if (previa) {
    return NextResponse.json({
      error: 'Ya hay una invitación pendiente para ese email. Cancelala primero si querés reenviar.',
    }, { status: 400 })
  }

  // Generar token
  const { data: tokenRow } = await supabase.rpc('generar_token_invitacion')
  const token = (tokenRow as unknown as string) ?? null
  if (!token) {
    return NextResponse.json({ error: 'No se pudo generar token' }, { status: 500 })
  }

  const { data: inv, error } = await supabase.from('invitaciones').insert({
    escribania_id: profile.escribania_id,
    email,
    rol,
    token,
    mensaje,
    invitado_por: user.id,
  }).select().single()

  if (error || !inv) {
    console.error(error)
    return NextResponse.json({ error: 'No se pudo crear la invitación' }, { status: 500 })
  }

  // Construir link
  const url = new URL(req.url)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`
  const linkInvitacion = `${baseUrl}/aceptar-invitacion/${token}`

  // Datos para el email
  const { data: invitador } = await supabase
    .from('profiles')
    .select('nombre, apellido')
    .eq('id', user.id)
    .single()

  // Enviar email
  const tpl = templateInvitacion({
    nombreInvitador: invitador
      ? `${invitador.nombre} ${invitador.apellido}`.trim()
      : 'Tu colega',
    escribaniaNombre: escribaniaInfo?.nombre_fantasia || escribaniaInfo?.razon_social || 'la escribanía',
    rolLabel: LABEL_ROL_INVITABLE[rol],
    linkInvitacion,
    mensaje,
    expiraEn: '7 días',
  })

  const emailResult = await sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
  })

  return NextResponse.json({
    invitacion: inv,
    linkInvitacion,
    emailEnviado: emailResult.ok,
    emailOmitido: emailResult.skipped ?? false,
    emailError: emailResult.error,
  })
}

// DELETE /api/invitaciones?id=... — cancelar invitación pendiente
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await supabase
    .from('invitaciones')
    .update({ cancelada_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'No se pudo cancelar' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
