import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LABEL_TIPO_ACTO, LABEL_FORMA_PAGO } from '@/types'
import type { TipoActo, FormaPago } from '@/types'

// GET /api/uif/rsm?anio=2025&mes=4 — Reporte Sistemático Mensual UIF
//
// Genera CSV con las operaciones del mes que dispararon obligación UIF
// según Res. 70/2011 + 242/2023 + 78/2025.

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

interface ClienteJoin {
  apellido: string | null
  nombre: string | null
  tipo_persona: string | null
  tipo_documento: string | null
  dni: string | null
  cuil: string | null
  nivel_riesgo: string | null
  es_pep: boolean | null
  es_sujeto_obligado: boolean | null
}

interface InmuebleJoin {
  calle: string | null
  numero: string | null
  localidad: string | null
  provincia: string | null
  matricula_registral: string | null
  nomenclatura_catastral: string | null
  zona_frontera: boolean | null
}

interface TramiteRow {
  id: string
  numero_referencia: string | null
  tipo: string
  tipo_acto: TipoActo | null
  numero_escritura: string | null
  folio_protocolo: string | null
  registro_notarial: string | null
  fecha_escritura: string | null
  monto: number | null
  monto_efectivo: number | null
  monto_moneda_extranjera: number | null
  moneda_extranjera: string | null
  forma_pago: FormaPago | null
  origen_fondos: string | null
  estado_uif: string | null
  cumplimiento_dd: string | null
  ros_constancia_numero: string | null
  ros_fecha: string | null
  cliente: ClienteJoin | null
  inmueble: InmuebleJoin | null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, activo')
    .eq('id', user.id)
    .single()

  const rolesPermitidos = ['escribano_titular', 'oficial_cumplimiento', 'escribano', 'protocolista']
  if (!profile || !rolesPermitidos.includes(profile.rol)) {
    return NextResponse.json({ error: 'Solo el escribano u oficial de cumplimiento puede generar el RSM' }, { status: 403 })
  }

  // Params
  const { searchParams } = new URL(req.url)
  const anio = Number(searchParams.get('anio'))
  const mes = Number(searchParams.get('mes')) // 1-12
  if (!anio || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'Parámetros anio y mes son obligatorios (mes 1-12)' }, { status: 400 })
  }

  // Rango del mes
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
  const finMes = new Date(anio, mes, 0).getDate()
  const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(finMes).padStart(2, '0')}`

  // Consulta — usa fecha_escritura si existe, sino created_at
  const { data, error } = await supabase
    .from('tramites')
    .select(`
      id, numero_referencia, tipo, tipo_acto,
      numero_escritura, folio_protocolo, registro_notarial, fecha_escritura,
      monto, monto_efectivo, monto_moneda_extranjera, moneda_extranjera,
      forma_pago, origen_fondos,
      estado_uif, cumplimiento_dd, ros_constancia_numero, ros_fecha,
      cliente:clientes(
        apellido, nombre, tipo_persona, tipo_documento, dni, cuil,
        nivel_riesgo, es_pep, es_sujeto_obligado
      ),
      inmueble:inmuebles(
        calle, numero, localidad, provincia,
        matricula_registral, nomenclatura_catastral, zona_frontera
      )
    `)
    .eq('dispara_uif', true)
    .or(`and(fecha_escritura.gte.${desde},fecha_escritura.lte.${hasta}),and(fecha_escritura.is.null,created_at.gte.${desde},created_at.lte.${hasta}T23:59:59)`)
    .order('fecha_escritura', { ascending: true })

  if (error) {
    console.error('RSM query error:', error)
    return NextResponse.json({ error: 'Error al consultar operaciones' }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as TramiteRow[]

  // Headers del CSV (según Res. 70/2011 + 242/2023)
  const headers = [
    'N° escritura', 'Folio', 'Fecha escritura', 'Registro notarial',
    'Tipo de operación', 'Tipo de acto UIF',
    'Cliente apellido', 'Cliente nombre', 'Tipo persona',
    'Tipo doc.', 'N° doc.', 'CUIT/CUIL',
    'Nivel riesgo', 'PEP', 'Sujeto obligado',
    'Monto total ARS', 'Monto en efectivo ARS',
    'Moneda extranjera', 'Monto m. extr.',
    'Forma de pago', 'Origen de fondos',
    'Inmueble: calle', 'Inmueble: número', 'Inmueble: localidad', 'Inmueble: provincia',
    'Matrícula registral', 'Nomencl. catastral', 'Zona frontera',
    'Estado UIF', 'Debida diligencia', 'Const. ROS', 'Fecha ROS',
    'Ref. interna',
  ]

  const lines = [headers.map(csvEscape).join(',')]

  for (const t of rows) {
    const c = t.cliente
    const i = t.inmueble
    lines.push([
      t.numero_escritura, t.folio_protocolo, t.fecha_escritura, t.registro_notarial,
      t.tipo, t.tipo_acto ? LABEL_TIPO_ACTO[t.tipo_acto] : '',
      c?.apellido, c?.nombre, c?.tipo_persona,
      c?.tipo_documento, c?.dni, c?.cuil,
      c?.nivel_riesgo, c?.es_pep ? 'Sí' : 'No', c?.es_sujeto_obligado ? 'Sí' : 'No',
      t.monto, t.monto_efectivo,
      t.moneda_extranjera, t.monto_moneda_extranjera,
      t.forma_pago ? LABEL_FORMA_PAGO[t.forma_pago] : '', t.origen_fondos,
      i?.calle, i?.numero, i?.localidad, i?.provincia,
      i?.matricula_registral, i?.nomenclatura_catastral,
      i?.zona_frontera === true ? 'Sí' : i?.zona_frontera === false ? 'No' : '',
      t.estado_uif, t.cumplimiento_dd, t.ros_constancia_numero, t.ros_fecha,
      t.numero_referencia,
    ].map(csvEscape).join(','))
  }

  // Línea de resumen al final
  lines.push('')
  lines.push(`# RSM ${anio}-${String(mes).padStart(2, '0')} — ${rows.length} operaciones · Generado ${new Date().toISOString()}`)

  const csv = '﻿' + lines.join('\n') // BOM para Excel
  const filename = `RSM_${anio}-${String(mes).padStart(2, '0')}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
