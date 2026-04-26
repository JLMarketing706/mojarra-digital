import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { estadoTramiteLabel, estadoTramiteColor, formatFecha } from '@/lib/utils'
import { ArrowLeft, Pencil, AlertTriangle, FileText } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ficha de cliente' }

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

  const { data: tramites } = await supabase
    .from('tramites')
    .select('id, tipo, estado, numero_referencia, created_at, updated_at')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  const { data: documentos } = await supabase
    .from('documentos')
    .select('id, nombre, tipo, url, created_at')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/clientes">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Clientes
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-white">
                {cliente.apellido}, {cliente.nombre}
              </h1>
              {cliente.es_pep && <Badge className="bg-yellow-500/20 text-yellow-300 border-0">PEP</Badge>}
              {cliente.es_sujeto_obligado && <Badge className="bg-orange-500/20 text-orange-300 border-0">Sujeto Obligado</Badge>}
            </div>
            <p className="text-zinc-400 text-sm">Cliente desde {formatFecha(cliente.created_at)}</p>
          </div>
          <Link href={`/crm/clientes/${id}/editar`}>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
              <Pencil size={14} />Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos personales */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-300">Datos personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ['DNI', cliente.dni],
              ['CUIL', cliente.cuil],
              ['Estado civil', cliente.estado_civil],
              ['Domicilio', cliente.domicilio],
              ['Email', cliente.email],
              ['Teléfono', cliente.telefono],
            ].map(([label, value]) => value ? (
              <div key={label} className="flex gap-2">
                <span className="text-zinc-500 shrink-0 w-24">{label}</span>
                <span className="text-zinc-200 break-all">{value}</span>
              </div>
            ) : null)}
            {cliente.notas && (
              <>
                <Separator className="bg-zinc-800" />
                <div>
                  <p className="text-zinc-500 text-xs mb-1">Notas internas</p>
                  <p className="text-zinc-300 text-sm">{cliente.notas}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trámites */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Trámites ({tramites?.length ?? 0})
            </h2>
            <Link href={`/crm/tramites/nuevo?cliente_id=${id}`}>
              <Button size="sm" className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-1.5 h-7 text-xs">
                <FileText size={12} />Nuevo trámite
              </Button>
            </Link>
          </div>

          {!tramites || tramites.length === 0 ? (
            <div className="border border-dashed border-zinc-700 rounded-lg py-8 text-center">
              <p className="text-zinc-500 text-sm">Sin trámites registrados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tramites.map(t => (
                <Link key={t.id} href={`/crm/tramites/${t.id}`}>
                  <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-zinc-200 text-sm font-medium">{t.tipo}</p>
                        {t.numero_referencia && (
                          <p className="text-zinc-500 text-xs">Ref: {t.numero_referencia}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${estadoTramiteColor(t.estado)}`}>
                          {estadoTramiteLabel(t.estado)}
                        </Badge>
                        <span className="text-zinc-600 text-xs">{formatFecha(t.updated_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Documentos */}
          {documentos && documentos.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mt-6">
                Documentos ({documentos.length})
              </h2>
              <div className="space-y-2">
                {documentos.map(d => (
                  <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 transition-colors group">
                    <FileText size={14} className="text-zinc-500 shrink-0" />
                    <span className="text-zinc-300 text-sm flex-1 truncate group-hover:text-lime-400 transition-colors">{d.nombre}</span>
                    <span className="text-zinc-600 text-xs shrink-0">{formatFecha(d.created_at)}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
