import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatFecha } from '@/lib/utils'
import { ArrowLeft, Pencil, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'
import type { NivelRiesgo, Cliente } from '@/types'
import { ClienteDetalleTabs } from '@/components/crm/cliente-detalle-tabs'

export const metadata: Metadata = { title: 'Ficha de cliente' }

const RIESGO_BADGE: Record<NivelRiesgo, string> = {
  bajo: 'bg-green-500/15 text-green-300 border-green-500/30',
  medio: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  alto: 'bg-red-500/15 text-red-300 border-red-500/30',
}

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()
  const c = cliente as Cliente

  const [{ data: tramites }, { data: documentos }] = await Promise.all([
    supabase.from('tramites')
      .select('id, tipo, estado, numero_referencia, created_at, updated_at, dispara_uif, monto, tipo_acto')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('documentos')
      .select('id, nombre, tipo, url, created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
  ])

  const riesgo = (c.nivel_riesgo ?? 'bajo') as NivelRiesgo
  const proximaVencida = c.proxima_actualizacion
    ? new Date(c.proxima_actualizacion) < new Date()
    : false

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/crm/clientes">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Clientes
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-semibold text-white">{c.apellido}, {c.nombre}</h1>
              <Badge className={`uppercase border ${RIESGO_BADGE[riesgo]}`}>Riesgo {riesgo}</Badge>
              {c.es_pep && <Badge className="bg-yellow-500/20 text-yellow-300 border-0">PEP</Badge>}
              {c.es_sujeto_obligado && <Badge className="bg-orange-500/20 text-orange-300 border-0">Sujeto Obligado</Badge>}
            </div>
            <p className="text-zinc-400 text-sm">
              {c.tipo_documento ?? 'Documento'} {c.dni ?? '—'}
              {c.cuil && <> · CUIT/CUIL {c.cuil}</>}
              {' · '}Cliente desde {formatFecha(c.created_at)}
            </p>
          </div>
          <Link href={`/crm/clientes/${id}/editar`}>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
              <Pencil size={14} />Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerta legajo vencido — solo si aplica */}
      {proximaVencida && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/5 border border-red-500/30 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <div>
            <p className="text-red-300 text-sm font-medium">Legajo vencido — actualización requerida</p>
            <p className="text-red-400/70 text-xs">
              Vencimiento: {formatFecha(c.proxima_actualizacion!)}. Res. UIF 242/2023 art. 16.
            </p>
          </div>
        </div>
      )}

      <ClienteDetalleTabs
        cliente={c}
        tramites={tramites ?? []}
        documentos={documentos ?? []}
      />
    </div>
  )
}
