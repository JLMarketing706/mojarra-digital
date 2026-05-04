import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReciboPDF } from '@/lib/pdf/recibo-pdf'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { formatFecha } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const entregaId = searchParams.get('id')
  if (!entregaId) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 })

  const { data: entrega } = await supabase
    .from('entregas')
    .select('*, tramite:tramites(tipo, numero_referencia, cliente:clientes(nombre, apellido, dni))')
    .eq('id', entregaId)
    .single()

  if (!entrega) return NextResponse.json({ error: 'Entrega no encontrada.' }, { status: 404 })

  const { data: config } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['nombre_escribania', 'direccion_escribania'])

  const configMap = Object.fromEntries((config ?? []).map(c => [c.clave, c.valor]))

  const tramite = entrega.tramite as {
    tipo: string; numero_referencia: string | null;
    cliente: { nombre: string; apellido: string; dni: string | null } | null;
  } | null

  const element = createElement(ReciboPDF, {
    data: {
      tipoActo: tramite?.tipo ?? 'Acto notarial',
      clienteNombre: tramite?.cliente
        ? `${tramite.cliente.apellido}, ${tramite.cliente.nombre}`
        : 'No especificado',
      clienteDNI: tramite?.cliente?.dni ?? undefined,
      receptorNombre: entrega.receptor_nombre,
      receptorDNI: entrega.receptor_dni,
      fechaEntrega: formatFecha(entrega.fecha),
      observaciones: entrega.observaciones ?? undefined,
      escribania: configMap.nombre_escribania ?? 'Escribanía',
      direccionEscribania: configMap.direccion_escribania ?? undefined,
    },
  }) as ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recibo-entrega-${entregaId}.pdf"`,
    },
  })
}
