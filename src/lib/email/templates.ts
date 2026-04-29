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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
