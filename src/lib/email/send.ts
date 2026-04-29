import { Resend } from 'resend'

// Cliente de Resend (server-only)
let _client: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (_client) return _client
  _client = new Resend(process.env.RESEND_API_KEY)
  return _client
}

export interface EmailParams {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export interface EmailResult {
  ok: boolean
  id?: string
  error?: string
  skipped?: boolean
}

/**
 * Envía un email transaccional vía Resend.
 * Si RESEND_API_KEY no está configurada, lo loguea y retorna `skipped: true`
 * para que el flujo principal pueda continuar (ej: en desarrollo local).
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY no configurada — email omitido', {
      to: params.to, subject: params.subject,
    })
    return { ok: false, skipped: true, error: 'Email service no configurado' }
  }

  const from = process.env.MAIL_FROM ?? 'Mojarra Digital <onboarding@resend.dev>'

  try {
    const result = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    })
    if (result.error) {
      console.error('[email] Error enviando:', result.error)
      return { ok: false, error: result.error.message }
    }
    return { ok: true, id: result.data?.id }
  } catch (err) {
    console.error('[email] Excepción:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
