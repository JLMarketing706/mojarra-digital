# Procedimiento de rotación de keys — Mojarra Digital

Documento operativo para rotar las credenciales del sistema cuando sea necesario.

---

## 🚨 Cuándo rotar (triggers)

Rotá inmediatamente si pasa cualquiera de:

- [ ] Subiste el `.env.local` por accidente a git, Slack, screenshot, ChatGPT, etc.
- [ ] Te robaron o perdiste un dispositivo con acceso al `.env.local`
- [ ] Se va alguien del equipo que tenía acceso al repo o las credenciales
- [ ] Supabase te avisa de un security incident por email
- [ ] Ves actividad rara en `audit_logs` (descargas masivas, cambios de rol no esperados)
- [ ] Un cliente reporta acceso no autorizado a sus datos

**Rutina proactiva:** rotar cada 6 meses aunque no haya incidente.

---

## 🔑 Credenciales que hay que rotar

| Credencial | Dónde está | Cómo rotar |
|---|---|---|
| Supabase ANON_KEY | `.env.local` + Vercel | Desde dashboard Supabase |
| Supabase SERVICE_ROLE_KEY | `.env.local` + Vercel | Desde dashboard Supabase |
| Anthropic API key | `.env.local` + Vercel | Desde [console.anthropic.com](https://console.anthropic.com) |
| Gemini API key | (no usada en prod) | Desde [Google AI Studio](https://aistudio.google.com) |
| Supabase Personal Access Token | (solo en notas privadas) | Desde Supabase Account Tokens |

---

## 📋 Procedimiento paso a paso

### 1. Avisá al equipo

Mandá un mensaje al canal del equipo: "Voy a rotar las keys de prod ahora. Posible downtime de 5-10 min."

### 2. Generá las nuevas keys en Supabase

1. Entrá a https://supabase.com/dashboard/project/hvgzzkjwbjdmjozcvqoa/settings/jwt
2. Click en **"Create Standby Key"** (botón verde)
3. Esperá a que aparezca la standby con status "STANDBY"
4. Click en los 3 puntos de la standby → **"Promote"**
5. La standby pasa a "CURRENT" y la anterior queda como "PREVIOUS"
6. Andá a https://supabase.com/dashboard/project/hvgzzkjwbjdmjozcvqoa/settings/api-keys
7. En la pestaña **"Legacy anon, service_role API keys"**:
   - Copiá la nueva `anon` y `service_role`

### 3. Actualizá `.env.local` (desarrollo)

Editá `/Users/juanignaciolazarte/Downloads/claude/landing-prueba/mojarra-digital/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=<nueva_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<nueva_service_role>
```

### 4. Actualizá Vercel (producción)

1. Andá a https://vercel.com/juan-igncio-s-projects/mojarra-digital/settings/environment-variables
2. Editá `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
3. Click en **"Save"**
4. Andá a la pestaña **"Deployments"** y hacé **"Redeploy"** del último deploy

### 5. Verificá

- [ ] `https://mojarra-digital.vercel.app/login` carga
- [ ] Podés hacer login con un usuario existente
- [ ] El CRM funciona normal
- [ ] `npm run dev` local funciona con las nuevas keys

### 6. Revocá las keys viejas

1. En https://supabase.com/dashboard/project/hvgzzkjwbjdmjozcvqoa/settings/jwt
2. En "Previously used keys", click en los 3 puntos → **"Revoke"**
3. Confirmá

A partir de acá, las keys viejas dejan de funcionar definitivamente.

### 7. Documentá el incidente

Si la rotación fue por incidente (no rutina), creá un issue en GitHub con:
- Qué pasó
- Cuándo se detectó
- Qué datos podrían haberse expuesto
- Acciones tomadas

---

## 🛡️ Checklist post-rotación

- [ ] Vercel deploy verde
- [ ] Login funciona en prod
- [ ] Login funciona en local
- [ ] Audit logs no muestran errores 401/403 masivos
- [ ] El equipo está avisado
- [ ] (Si aplica) Issue documentado en GitHub

---

## 🔍 Cómo detectar uso indebido

### En Supabase Dashboard

1. **Auth → Users** → revisar usuarios creados sospechosos
2. **Database → Logs** → filtrar por errores 401/403
3. **Logs → Postgres logs** → buscar queries inusuales

### En Mojarra Digital

1. Andá a `/crm/cumplimiento/auditoria`
2. Filtrá por última semana
3. Revisá:
   - Cambios de rol en `profiles`
   - Inserts masivos en cualquier tabla
   - Acciones de usuarios desconocidos

### Configurar alertas (recomendado)

Conectar Supabase a Slack/email para que avise:
- Cuando alguien accede a la base con service_role key
- Cuando hay > 100 errores en 5 minutos
- Cuando se crean usuarios masivamente

---

## ⏰ Próximas rotaciones programadas

- [ ] 2026-01-01 — rotación rutinaria
- [ ] 2026-07-01 — rotación rutinaria

---

## 📞 Contactos de emergencia

- **Soporte Supabase**: https://supabase.com/support
- **Anthropic**: https://support.anthropic.com
- **Vercel**: https://vercel.com/help
