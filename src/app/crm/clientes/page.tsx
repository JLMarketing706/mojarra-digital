import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClientesSearch } from '@/components/crm/clientes-search'
import { UserPlus, User, Building2, FileText, AlertTriangle } from 'lucide-react'
import { formatFecha } from '@/lib/utils'
import type { Metadata } from 'next'
import type { NivelRiesgo, TipoPersona } from '@/types'

const RIESGO_BADGE: Record<NivelRiesgo, string> = {
  bajo: 'bg-green-500/15 text-green-300 border-green-500/30',
  medio: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  alto: 'bg-red-500/15 text-red-300 border-red-500/30',
}

const TIPO_PERSONA_ICON: Record<TipoPersona, React.ElementType> = {
  humana: User,
  juridica: Building2,
  fideicomiso: FileText,
}

export const metadata: Metadata = { title: 'Clientes' }

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; legajo?: string }>
}) {
  const { q, legajo } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('clientes')
    .select('*')
    .order('apellido', { ascending: true })

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`
    query = query.or(`nombre.ilike.${term},apellido.ilike.${term},dni.ilike.${term},email.ilike.${term}`)
  }

  if (legajo === 'incompleto') {
    query = query.eq('legajo_incompleto', true)
  }

  const { data: clientes } = await query.limit(200)

  // Conteo total de incompletos (para el chip del filtro)
  const { count: incompletosCount } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('legajo_incompleto', true)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Clientes</h1>
          <p className="text-zinc-400 text-sm">{clientes?.length ?? 0} resultados</p>
        </div>
        <Link href="/crm/clientes/nuevo">
          <Button className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            <UserPlus size={16} />
            Nuevo cliente
          </Button>
        </Link>
      </div>

      <ClientesSearch defaultValue={q} />

      {/* Filtros */}
      <div className="flex gap-2 mt-3 flex-wrap">
        <Link href={q ? `/crm/clientes?q=${encodeURIComponent(q)}` : '/crm/clientes'}>
          <Button
            variant="outline"
            size="sm"
            className={`h-7 text-xs ${
              !legajo
                ? 'bg-lime-400/10 border-lime-400/50 text-lime-400'
                : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            Todos
          </Button>
        </Link>
        <Link href={`/crm/clientes?legajo=incompleto${q ? `&q=${encodeURIComponent(q)}` : ''}`}>
          <Button
            variant="outline"
            size="sm"
            className={`h-7 text-xs gap-1.5 ${
              legajo === 'incompleto'
                ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300'
                : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <AlertTriangle size={11} />Legajo incompleto ({incompletosCount ?? 0})
          </Button>
        </Link>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Apellido y nombre</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">DNI / CUIT</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Riesgo</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Próx. actualiz.</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!clientes || clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  No se encontraron clientes.
                </td>
              </tr>
            ) : (
              clientes.map(c => {
                const riesgo = (c.nivel_riesgo ?? 'bajo') as NivelRiesgo
                const tipo = (c.tipo_persona ?? 'humana') as TipoPersona
                const Icon = TIPO_PERSONA_ICON[tipo]
                return (
                  <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-zinc-500 shrink-0" />
                        <Link href={`/crm/clientes/${c.id}`} className="text-zinc-200 hover:text-lime-400 font-medium transition-colors">
                          {c.apellido}, {c.nombre}
                        </Link>
                        {c.es_pep && (
                          <Badge className="bg-yellow-500/20 text-yellow-300 border-0 text-xs px-1.5">PEP</Badge>
                        )}
                        {c.es_sujeto_obligado && (
                          <Badge className="bg-orange-500/20 text-orange-300 border-0 text-xs px-1.5">SO</Badge>
                        )}
                        {c.legajo_incompleto && (
                          <Badge className="bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-xs px-1.5 gap-0.5">
                            <AlertTriangle size={9} />Legajo
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell font-mono text-xs">
                      {c.dni ?? c.cuil ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs px-2 py-0.5 capitalize border ${RIESGO_BADGE[riesgo]}`}>
                        {riesgo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 hidden md:table-cell text-xs">
                      {c.proxima_actualizacion ? formatFecha(c.proxima_actualizacion) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/crm/clientes/${c.id}`}>
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
