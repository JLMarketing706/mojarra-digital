import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Pencil } from 'lucide-react'
import { formatFecha } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Escritura' }

export default async function DetalleEscrituraPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: entrada } = await supabase
    .from('indice_notarial')
    .select('*, escribano:profiles(nombre, apellido), tramite:tramites(id, tipo, estado)')
    .eq('id', id)
    .single()

  if (!entrada) notFound()

  const escribano = entrada.escribano as { nombre: string; apellido: string } | null
  const tramite = entrada.tramite as { id: string; tipo: string; estado: string } | null

  const campos = [
    ['Número de escritura', String(entrada.numero_escritura)],
    ['Folio', entrada.folio],
    ['Fecha', formatFecha(entrada.fecha)],
    ['Tipo de acto', entrada.tipo_acto],
    ['Partes intervinientes', entrada.partes],
    ['Inmueble', entrada.inmueble],
    ['Escribano/a', escribano ? `${escribano.apellido}, ${escribano.nombre}` : null],
    ['Observaciones', entrada.observaciones],
  ] as [string, string | null][]

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/indice">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Índice Notarial
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">
              Escritura Nº {entrada.numero_escritura}
            </h1>
            <p className="text-zinc-400 text-sm">{entrada.tipo_acto} · {formatFecha(entrada.fecha)}</p>
          </div>
          <Link href={`/crm/indice/${id}/editar`}>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
              <Pencil size={14} />Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-300">Datos de la escritura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campos.map(([label, value]) => value ? (
              <div key={label} className="flex gap-2 text-sm">
                <span className="text-zinc-500 shrink-0 w-36">{label}</span>
                <span className="text-zinc-200 break-words">{value}</span>
              </div>
            ) : null)}
          </CardContent>
        </Card>

        {tramite && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300">Operación asociado</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/crm/tramites/${tramite.id}`}
                className="text-lime-400 hover:underline font-medium">{tramite.tipo}</Link>
              <p className="text-zinc-500 text-xs mt-1 capitalize">{tramite.estado}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
