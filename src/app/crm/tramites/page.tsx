import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatFecha } from '@/lib/utils'
import { EstadoTramiteSelector } from '@/components/crm/estado-tramite-selector'
import { FilePlus, AlertTriangle } from 'lucide-react'
import { estadoTramiteLabel, estadoUifLabel, estadoUifColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Escrituras' }

const ESTADOS = ['todos', 'iniciado', 'en_proceso', 'en_registro', 'observado', 'listo', 'entregado']

export default async function TramitesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tramites')
    .select('*, cliente:clientes(nombre, apellido), escribano:profiles(nombre, apellido)')
    .order('updated_at', { ascending: false })

  if (estado && estado !== 'todos') {
    query = query.eq('estado', estado)
  }

  const { data: tramites } = await query.limit(200)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Escrituras</h1>
          <p className="text-zinc-400 text-sm">{tramites?.length ?? 0} resultados</p>
        </div>
        <Link href="/crm/tramites/nuevo">
          <Button className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            <FilePlus size={16} />Nueva escritura
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-4">
        {ESTADOS.map(e => (
          <Link key={e} href={e === 'todos' ? '/crm/tramites' : `/crm/tramites?estado=${e}`}>
            <Button
              variant="outline"
              size="sm"
              className={`h-7 text-xs ${
                (estado ?? 'todos') === e
                  ? 'bg-lime-400/10 border-lime-400/50 text-lime-400'
                  : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {e === 'todos' ? 'Todos' : estadoTramiteLabel(e)}
            </Button>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Ref.</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">UIF</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Informe</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Actualizado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!tramites || tramites.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  No se encontraron escrituras.
                </td>
              </tr>
            ) : (
              tramites.map(t => {
                const cliente = t.cliente as { nombre: string; apellido: string } | null
                return (
                  <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/crm/tramites/${t.id}`} className="block text-zinc-200 hover:text-lime-400 font-medium transition-colors">
                        {(() => {
                          const causales = (t.negocios_causales as string[] | null) ?? (t.tipo ? [t.tipo] : [])
                          if (causales.length === 0) return '—'
                          if (causales.length === 1) return causales[0]
                          return (
                            <>
                              {causales[0]}
                              <span className="ml-1.5 text-xs text-zinc-500 font-normal">
                                +{causales.length - 1} más
                              </span>
                            </>
                          )
                        })()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">
                      {cliente ? (
                        <Link href={`/crm/clientes/${t.cliente_id}`} className="hover:text-zinc-200 transition-colors">
                          {cliente.apellido}, {cliente.nombre}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoTramiteSelector tramiteId={t.id} estadoActual={t.estado} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {t.numero_referencia ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {t.requiere_uif && (
                        <AlertTriangle size={14} className="text-yellow-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Badge className={`text-xs border ${estadoUifColor(t.estado_uif)}`}>
                        {estadoUifLabel(t.estado_uif)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {formatFecha(t.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/crm/tramites/${t.id}`}>
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white h-7 text-xs">
                          Ver
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
