import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Cron mensual que actualiza el SMVM scrapeando la página oficial.
 *
 * Activación:
 *   - Vía Vercel Cron (configurado en vercel.json) cada día 2 del mes.
 *     Vercel envía el header Authorization: Bearer ${CRON_SECRET}.
 *   - Vía botón manual en /crm/configuracion (super-admin solamente).
 *     En ese caso autentica con sesión normal y origen='manual:<user_id>'.
 *
 * Fuente: https://www.argentina.gob.ar/trabajo/consejodelsalario
 *
 * Estrategia de parseo:
 *   - Trae el HTML
 *   - Busca patrones como "$ 352.400" cerca de "marzo de 2026" o
 *     "1/03/2026" o "1 de marzo de 2026"
 *   - Si encuentra el último valor, INSERT en smvm_historico (con
 *     ON CONFLICT DO NOTHING — no duplica)
 *   - Loguea cada intento en smvm_actualizaciones_log
 */

const FUENTE_URL = 'https://www.argentina.gob.ar/trabajo/consejodelsalario'

interface ParseResult {
  ok: boolean
  valor?: number
  vigenciaDesde?: string // YYYY-MM-DD
  norma?: string
  error?: string
}

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
}

function parseHTML(html: string): ParseResult {
  // Limpiar espacios y normalizar
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  // Buscar resolución (norma)
  const normaMatch = text.match(/Resoluci[oó]n[\s\S]{0,80}?(\d+\/?\d{4})/i)
  const norma = normaMatch ? `Res. CNEPySMVyM ${normaMatch[1]}` : 'Res. CNEPySMVyM (auto)'

  // Patrones para encontrar la fecha de vigencia + monto.
  // Formatos comunes:
  //   "A partir del 1/03/2026: $ 352.400"
  //   "A partir del 1° de marzo de 2026 $ 352.400"
  //   "marzo de 2026 ... $ 352.400"

  // 1. Primer intento: "1/MM/YYYY" o "1°/MM/YYYY" + monto
  const re1 = /1[°º]?\s*[\/\.\-]\s*(\d{1,2})\s*[\/\.\-]\s*(20\d{2})[\s\S]{0,80}?\$\s*([\d.]+(?:,\d+)?)/g
  // 2. Segundo intento: "1° de mes de YYYY" + monto
  const re2 = /1[°º]?\s*de\s+([a-záéíóú]+)\s+de\s+(20\d{2})[\s\S]{0,80}?\$\s*([\d.]+(?:,\d+)?)/gi
  // 3. Tercer intento: "mes de YYYY" + monto
  const re3 = /([a-záéíóú]+)\s+de\s+(20\d{2})[\s\S]{0,40}?\$\s*([\d.]+(?:,\d+)?)/gi

  type Hit = { fecha: string; valor: number }
  const hits: Hit[] = []

  function pushHit(year: string, month: string | number, valorStr: string) {
    const m = typeof month === 'string' ? MESES[month.toLowerCase()] : String(month).padStart(2, '0')
    if (!m) return
    const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valor) || valor < 100000 || valor > 100000000) return // sanity check
    hits.push({ fecha: `${year}-${m}-01`, valor })
  }

  let match
  while ((match = re1.exec(text)) !== null) {
    pushHit(match[2], match[1], match[3])
  }
  while ((match = re2.exec(text)) !== null) {
    pushHit(match[2], match[1], match[3])
  }
  if (hits.length === 0) {
    while ((match = re3.exec(text)) !== null) {
      pushHit(match[2], match[1], match[3])
    }
  }

  if (hits.length === 0) {
    return { ok: false, error: 'No se encontró ningún valor de SMVM con los patrones conocidos' }
  }

  // Tomar el más reciente
  hits.sort((a, b) => b.fecha.localeCompare(a.fecha))
  const ultimo = hits[0]

  return {
    ok: true,
    valor: ultimo.valor,
    vigenciaDesde: ultimo.fecha,
    norma,
  }
}

async function ejecutarActualizacion(origen: string) {
  // Usamos service_role para escribir en smvm_historico sin pasar por RLS
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { status: 500, body: { ok: false, error: 'Faltan env vars Supabase' } }
  }
  const admin = createClient(url, key, { auth: { persistSession: false } })

  // 1. Fetch
  let html: string
  try {
    const r = await fetch(FUENTE_URL, {
      headers: { 'User-Agent': 'MojarraDigital-SMVM-Bot/1.0' },
      cache: 'no-store',
    })
    if (!r.ok) {
      const msg = `HTTP ${r.status}`
      await admin.from('smvm_actualizaciones_log').insert({
        fuente_url: FUENTE_URL, ok: false, razon: 'fetch_error', error_mensaje: msg, origen,
      })
      return { status: 502, body: { ok: false, error: msg } }
    }
    html = await r.text()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await admin.from('smvm_actualizaciones_log').insert({
      fuente_url: FUENTE_URL, ok: false, razon: 'fetch_error', error_mensaje: msg, origen,
    })
    return { status: 502, body: { ok: false, error: msg } }
  }

  // 2. Parse
  const parsed = parseHTML(html)
  if (!parsed.ok || !parsed.valor || !parsed.vigenciaDesde) {
    await admin.from('smvm_actualizaciones_log').insert({
      fuente_url: FUENTE_URL, ok: false, razon: 'parse_error',
      error_mensaje: parsed.error ?? 'No se pudo parsear', origen,
    })
    return { status: 422, body: { ok: false, error: parsed.error } }
  }

  // 3. Comparar contra el último en DB
  const { data: ultimoEnDb } = await admin
    .from('smvm_historico')
    .select('vigencia_desde, valor')
    .order('vigencia_desde', { ascending: false })
    .limit(1)
    .single()

  if (
    ultimoEnDb &&
    ultimoEnDb.vigencia_desde === parsed.vigenciaDesde &&
    Number(ultimoEnDb.valor) === parsed.valor
  ) {
    // Sin cambios: igual log para que se vea que el cron corrió
    await admin.from('smvm_actualizaciones_log').insert({
      fuente_url: FUENTE_URL, ok: true, razon: 'sin_cambios',
      valor: parsed.valor, vigencia_desde: parsed.vigenciaDesde, origen,
    })
    return {
      status: 200,
      body: {
        ok: true, sin_cambios: true,
        valor: parsed.valor, vigencia_desde: parsed.vigenciaDesde,
        mensaje: 'El SMVM ya estaba actualizado.',
      },
    }
  }

  // 4. Insertar (ON CONFLICT lo cubre el UNIQUE en vigencia_desde)
  const { error: insertError } = await admin
    .from('smvm_historico')
    .upsert({
      vigencia_desde: parsed.vigenciaDesde,
      valor: parsed.valor,
      norma_origen: parsed.norma,
    }, { onConflict: 'vigencia_desde' })

  if (insertError) {
    await admin.from('smvm_actualizaciones_log').insert({
      fuente_url: FUENTE_URL, ok: false, razon: 'db_error',
      valor: parsed.valor, vigencia_desde: parsed.vigenciaDesde,
      error_mensaje: insertError.message, origen,
    })
    return { status: 500, body: { ok: false, error: insertError.message } }
  }

  await admin.from('smvm_actualizaciones_log').insert({
    fuente_url: FUENTE_URL, ok: true,
    valor: parsed.valor, vigencia_desde: parsed.vigenciaDesde, origen,
  })

  return {
    status: 200,
    body: {
      ok: true, sin_cambios: false,
      valor: parsed.valor, vigencia_desde: parsed.vigenciaDesde, norma: parsed.norma,
      mensaje: `SMVM actualizado: $${parsed.valor.toLocaleString('es-AR')} desde ${parsed.vigenciaDesde}`,
    },
  }
}

/**
 * GET — Vercel Cron usa GET y manda Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (auth !== expected) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const r = await ejecutarActualizacion('cron')
  return NextResponse.json(r.body, { status: r.status })
}

/**
 * POST — Disparado manualmente por super-admin desde /crm/configuracion
 */
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
  }
  // Solo super admin
  const { data: sa } = await supabase
    .from('super_admins').select('profile_id').eq('profile_id', user.id).maybeSingle()
  if (!sa) {
    return NextResponse.json({ ok: false, error: 'Solo super-admin' }, { status: 403 })
  }
  const r = await ejecutarActualizacion(`manual:${user.id}`)
  return NextResponse.json(r.body, { status: r.status })
}
