// Templates de emails transaccionales — HTML inline para máxima compatibilidad

interface InvitacionTemplateParams {
  nombreInvitador: string
  escribaniaNombre: string
  rolLabel: string
  linkInvitacion: string
  mensaje?: string | null
  expiraEn: string  // ej: "7 días"
}

export function templateInvitacion(p: InvitacionTemplateParams): {
  subject: string
  html: string
} {
  const subject = `${p.nombreInvitador} te invitó a sumarte a ${p.escribaniaNombre} en Mojarra Digital`

  const mensajeBlock = p.mensaje
    ? `<tr><td style="padding:0 24px 16px;"><div style="background:#f4f4f5;border-left:3px solid #a3e635;padding:12px 16px;border-radius:4px;font-style:italic;color:#52525b;font-size:14px;">"${escapeHtml(p.mensaje)}"</div></td></tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 24px;color:#ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:#a3e635;width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;font-weight:bold;color:#0a0a0a;font-size:14px;">M</td>
                  <td style="padding-left:10px;font-weight:bold;font-size:16px;letter-spacing:-0.3px;">Mojarra Digital</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:32px 24px 8px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;">
                Te sumás a <span style="color:#65a30d;">${escapeHtml(p.escribaniaNombre)}</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:8px 24px 16px;color:#52525b;font-size:15px;line-height:1.6;">
              <strong style="color:#18181b;">${escapeHtml(p.nombreInvitador)}</strong> te invitó a unirte al equipo de
              <strong style="color:#18181b;">${escapeHtml(p.escribaniaNombre)}</strong> como
              <strong style="color:#65a30d;">${escapeHtml(p.rolLabel)}</strong>.
            </td>
          </tr>

          ${mensajeBlock}

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:8px 24px 24px;">
              <a href="${p.linkInvitacion}"
                 style="display:inline-block;background:#a3e635;color:#0a0a0a;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;font-size:15px;">
                Aceptar invitación →
              </a>
            </td>
          </tr>

          <!-- Info -->
          <tr>
            <td style="padding:0 24px 24px;color:#71717a;font-size:13px;line-height:1.5;">
              <p style="margin:0 0 6px;">Hacé click en el botón para crear tu cuenta y empezar a usar el sistema.</p>
              <p style="margin:0;">Este link es válido por <strong>${p.expiraEn}</strong>. Si no lo reconocés podés ignorar este mensaje.</p>
            </td>
          </tr>

          <!-- Link plano -->
          <tr>
            <td style="padding:0 24px 24px;">
              <div style="background:#f4f4f5;padding:12px;border-radius:6px;font-size:11px;color:#52525b;word-break:break-all;font-family:monospace;">
                ${escapeHtml(p.linkInvitacion)}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:20px 24px;border-top:1px solid #e4e4e7;color:#a1a1aa;font-size:12px;line-height:1.5;text-align:center;">
              <p style="margin:0 0 4px;"><strong style="color:#52525b;">Mojarra Digital</strong> — Software de gestión notarial</p>
              <p style="margin:0;">Hecho para escribanías argentinas · Cumplimiento UIF</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}

interface SolicitudDemoParams {
  nombre: string
  escribania: string
  email: string
  whatsapp?: string | null
  comentario?: string | null
}

export function templateSolicitudDemo(p: SolicitudDemoParams): {
  subject: string
  html: string
} {
  const subject = `🆕 Demo solicitada: ${p.escribania} (${p.nombre})`

  const filas: Array<[string, string]> = [
    ['Nombre', p.nombre],
    ['Escribanía', p.escribania],
    ['Email', p.email],
    ['WhatsApp', p.whatsapp || '—'],
    ['Comentario', p.comentario || '—'],
  ]
  const filasHtml = filas
    .map(([label, value]) =>
      `<tr><td style="padding:8px 12px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;width:30%;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#18181b;border-bottom:1px solid #e4e4e7;">${escapeHtml(value)}</td></tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e4e4e7;">
    <div style="margin-bottom:16px;">
      <span style="display:inline-block;background:#a3e635;color:#000;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Nueva solicitud de demo</span>
    </div>
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">${escapeHtml(p.escribania)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${filasHtml}</table>
    <p style="margin:24px 0 0;color:#71717a;font-size:13px;">
      Contactá al lead y mandale el link de registro:
      <code style="background:#f4f4f5;padding:2px 6px;border-radius:3px;">https://mojarradigital.com/registro</code>
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
