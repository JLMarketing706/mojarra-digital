import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { IndicePDF } from '@/lib/pdf/indice-pdf'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'

const EXCLUIDOS_INDICE = ['certificaciones', 'gestion_registral']

interface ParteRow {
  rol: string | null
  nombre: string | null
  cliente: { nombre: string; apellido: string } | null
}

function partesString(t: {
  cliente: { nombre: string; apellido: string } | null
  tramite_partes: ParteRow[] | null
}): string {
  const partes = t.tramite_partes ?? []
  if (partes.length > 0) {
    const c = partes.filter(p => p.rol === 'comprador')
      .map(p => p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}` : p.nombre).filter(Boolean)
    const v = partes.filter(p => p.rol === 'vendedor')
      .map(p => p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}` : p.nombre).filter(Boolean)
    const o = partes.filter(p => p.rol !== 'comprador' && p.rol !== 'vendedor')
      .map(p => p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}` : p.nombre).filter(Boolean)
    const frags: string[] = []
    if (c.length > 0) frags.push(`C: ${c.join(', ')}`)
    if (v.length > 0) frags.push(`V: ${v.join(', ')}`)
    if (o.length > 0) frags.push(o.join(', '))
    if (frags.length > 0) return frags.join(' · ')
  }
  if (t.cliente) return `${t.cliente.apellido}, ${t.cliente.nombre}`
  return ''
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const anio = parseInt(searchParams.get('anio') ?? String(new Date().getFullYear()))

  // Leer operaciones del año (por fecha_escritura) que correspondan al índice
  const { data: rows } = await supabase
    .from('tramites')
    .select(`
      id, numero_escritura, folio_protocolo, fecha_escritura, descripcion,
      tipo, negocios_causales, tipo_acto_notarial,
      cliente:clientes(nombre, apellido),
      tramite_partes(rol, nombre, cliente:clientes(nombre, apellido))
    `)
    .gte('fecha_escritura', `${anio}-01-01`)
    .lte('fecha_escritura', `${anio}-12-31`)
    .order('numero_escritura', { ascending: true })

  // Adaptar a la forma { numero_escritura, folio, fecha, tipo_acto, partes, inmueble }
  // que espera el componente IndicePDF (legacy: shape de la tabla indice_notarial)
  type T = {
    numero_escritura: string | null
    folio_protocolo: string | null
    fecha_escritura: string | null
    descripcion: string | null
    tipo: string | null
    negocios_causales: string[] | null
    tipo_acto_notarial: string | null
    cliente: { nombre: string; apellido: string } | null
    tramite_partes: ParteRow[] | null
  }

  const entradas = ((rows ?? []) as unknown as T[])
    .filter(t => !EXCLUIDOS_INDICE.includes(t.tipo_acto_notarial ?? ''))
    .map(t => ({
      id: '',
      numero_escritura: t.numero_escritura ?? '',
      folio: t.folio_protocolo ?? '',
      fecha: t.fecha_escritura ?? '',
      tipo_acto: (t.negocios_causales?.[0] ?? t.tipo ?? '—'),
      partes: partesString(t),
      inmueble: t.descripcion ?? '',
    }))

  // Configuración de la escribanía
  const { data: config } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['nombre_escribania', 'direccion_escribania', 'matricula_escribano'])

  const configMap = Object.fromEntries((config ?? []).map(c => [c.clave, c.valor]))

  // Cast porque el componente IndicePDF tipa entradas como IndiceNotarial[]
  // (shape legacy). Construimos el subset mínimo que usa: numero_escritura,
  // folio, fecha, tipo_acto, partes, inmueble.
  const element = createElement(IndicePDF, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entradas: entradas as any,
    anio,
    config: configMap,
  }) as ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)
  const uint8 = new Uint8Array(buffer)

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="indice-notarial-${anio}.pdf"`,
    },
  })
}
