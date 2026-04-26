import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { estadoTramiteLabel, estadoTramiteColor, formatFecha } from '@/lib/utils'
import { FilePlus, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Trámites' }

const ESTADOS = ['todos', 'iniciado', 'en_proceso', 'en_registro', 'listo', 'entregado']

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
          <h1 className="text-2xl font-semibold text-white mb-1">Trámites</h1>
          <p className="text-zinc-400 text-sm">{tramites?.length ?? 0} resultados</p>
        </div>
        <Link href="/crm/tramites/nuevo">
          <Button className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            <FilePlus size={16} />Nuevo trámite
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

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Ref.</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">UIF</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Actualizado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!tramites || tramites.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No se encontraron trámites.
                </td>
              </tr>
            ) : (
              tramites.map(t => {
                const cliente = t.cliente as { nombre: string; apellido: string } | null
                return (
                  <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/crm/tramites/${t.id}`} className="text-zinc-200 hover:text-lime-400 font-medium transition-colors">
                        {t.tipo}
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
                      <Badge className={`text-xs ${estadoTramiteColor(t.estado)}`}>
                        {estadoTramiteLabel(t.estado)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {t.numero_referencia ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {t.requiere_uif && (
                        <AlertTriangle size={14} className="text-yellow-400" />
                      )}
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
