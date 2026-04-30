import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/send'
import { templateSolicitudDemo } from '@/lib/email/templates'

const ADMIN_EMAIL = 'jlmarketing706@gmail.com'

interface Body {
  nombre?: string
  escribania?: string
  email?: string
  whatsapp?: string
  comentario?: string
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body

  const nombre = body.nombre?.trim() ?? ''
  const escribania = body.escribania?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const whatsapp = body.whatsapp?.trim() || null
  const comentario = body.comentario?.trim() || null

  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  if (!escribania) return NextResponse.json({ error: 'El nombre de la escribanía es obligatorio' }, { status: 400 })
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const tpl = templateSolicitudDemo({ nombre, escribania, email, whatsapp, comentario })

  const result = await sendEmail({
    to: ADMIN_EMAIL,
    subject: tpl.subject,
    html: tpl.html,
    replyTo: email,
  })

  // Log básico para tener registro en logs de Vercel.
  console.info('[solicitar-demo]', { escribania, email, ok: result.ok, skipped: result.skipped })

  if (!result.ok && !result.skipped) {
    return NextResponse.json({ error: 'No se pudo enviar la solicitud. Intentá de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
