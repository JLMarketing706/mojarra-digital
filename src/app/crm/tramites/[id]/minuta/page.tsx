import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AsistenteMinuta } from '@/components/crm/asistente-minuta'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Asistente de Minuta' }

export default async function AsistenteMinutaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tramite } = await supabase
    .from('tramites')
    .select(`
      *,
      cliente:clientes(nombre, apellido, dni, cuil, domicilio, estado_civil, telefono, email),
      escribano:profiles(nombre, apellido)
    `)
    .eq('id', id)
    .single()

  if (!tramite) notFound()

  const { data: inmueble } = await supabase
    .from('inmuebles')
    .select('*')
    .eq('tramite_id', id)
    .maybeSingle()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/crm/tramites/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Volver a la operación
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Asistente de Minuta</h1>
        <p className="text-zinc-400 text-sm">
          {tramite.tipo} · Copiá los bloques listos para pegar en el sistema registral.
        </p>
      </div>

      <AsistenteMinuta tramite={tramite} inmueble={inmueble} />
    </div>
  )
}
