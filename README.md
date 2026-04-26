# Mojarra Digital

Sistema de gestión notarial digital. Incluye sitio público, portal de clientes y CRM interno.

## Stack

- **Next.js 14** (App Router)
- **Supabase** — PostgreSQL, Auth, Storage, Realtime
- **shadcn/ui** + Tailwind CSS
- **Anthropic Claude** (`claude-sonnet-4-20250514`) — OCR, dictado por voz, asistente de minutas
- **@react-pdf/renderer** — generación de PDFs

---

## Setup local

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd mojarra-digital
npm install
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New project
2. Guardar la **Project URL** y las **API keys** (anon y service_role)

### 3. Variables de entorno

Copiar `.env.local.example` a `.env.local` y completar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Ejecutar el schema en Supabase

En el **SQL Editor** de Supabase, ejecutar en este orden:

1. `supabase-schema.sql` — tablas, RLS, triggers, storage buckets, Realtime
2. `supabase-extra.sql` — tabla `informes_registrales`

### 5. Crear usuario staff inicial

En Supabase → **Authentication → Users → Add user**:
- Email y contraseña del primer escribano
- Luego ir a **Table Editor → profiles** y setear `rol = 'escribano'`

### 6. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Rutas principales

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing page | Público |
| `/consulta` | Formulario de presupuesto | Público |
| `/datos` | Carga de datos + OCR | Público |
| `/login` | Login | Público |
| `/registro` | Registro de clientes | Público |
| `/portal/dashboard` | Panel del cliente | Clientes |
| `/portal/turnos` | Solicitar turno | Clientes |
| `/portal/notificaciones` | Notificaciones | Clientes |
| `/crm/dashboard` | Panel staff | Staff |
| `/crm/clientes` | Gestión de clientes | Staff |
| `/crm/tramites` | Gestión de trámites | Staff |
| `/crm/indice` | Índice notarial | Staff |
| `/crm/agenda` | Agenda de turnos | Staff |
| `/crm/uif` | Alertas UIF | Staff |
| `/crm/informes` | Informes registrales | Staff |
| `/crm/entregas` | Entregas | Staff |
| `/crm/configuracion` | Config escribanía | Staff |

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `cliente` | Portal (`/portal/*`) |
| `secretaria` | CRM completo |
| `protocolista` | CRM completo |
| `escribano` | CRM completo + Configuración |

---

## APIs internas

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ocr` | POST | OCR de documentos via Claude |
| `/api/voz` | POST | Clasificar dictado de voz via Claude |
| `/api/minutas` | POST | Revisión de datos de minuta via Claude |
| `/api/indice/pdf` | GET `?anio=` | Exportar índice notarial como PDF |
| `/api/recibo` | GET `?id=` | Generar constancia de entrega como PDF |

---

## Deploy en Vercel

1. Push del repo a GitHub
2. Nuevo proyecto en [vercel.com](https://vercel.com) → importar repo
3. Agregar las mismas variables de `.env.local` en **Project Settings → Environment Variables**
4. Cambiar `NEXT_PUBLIC_APP_URL` a la URL de producción (ej: `https://mojarra-digital.vercel.app`)
5. Deploy

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/          # Login, registro
│   ├── (public)/        # Landing, consulta, datos
│   ├── api/             # OCR, voz, minutas, PDFs
│   ├── crm/             # CRM interno (staff)
│   └── portal/          # Portal de clientes
├── components/
│   ├── crm/             # Componentes del CRM
│   ├── portal/          # Navbar del portal
│   └── ui/              # shadcn/ui
├── hooks/               # useSession, useRealtimeNotificaciones
├── lib/
│   ├── claude/          # OCR, voz, minutas
│   ├── pdf/             # IndicePDF, ReciboPDF
│   └── supabase/        # client, server, middleware
└── types/               # Interfaces TypeScript
```
