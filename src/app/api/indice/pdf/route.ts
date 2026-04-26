import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { IndicePDF } from '@/lib/pdf/indice-pdf'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const anio = parseInt(searchParams.get('anio') ?? String(new Date().getFullYear()))

  // Obtener entradas del año solicitado
  const { data: entradas } = await supabase
    .from('indice_notarial')
    .select('*')
    .gte('fecha', `${anio}-01-01`)
    .lte('fecha', `${anio}-12-31`)
    .order('numero_escritura', { ascending: true })

  // Obtener configuración de la escribanía
  const { data: config } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['nombre_escribania', 'direccion_escribania', 'matricula_escribano'])

  const configMap = Object.fromEntries((config ?? []).map(c => [c.clave, c.valor]))

  const element = createElement(IndicePDF, {
    entradas: entradas ?? [],
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
