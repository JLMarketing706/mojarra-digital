import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClientesSearch } from '@/components/crm/clientes-search'
import { UserPlus, AlertTriangle } from 'lucide-react'
import { formatFecha } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clientes' }

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('clientes')
    .select('*')
    .order('apellido', { ascending: true })

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`
    query = query.or(`nombre.ilike.${term},apellido.ilike.${term},dni.ilike.${term},email.ilike.${term}`)
  }

  const { data: clientes } = await query.limit(100)

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

      <div className="mt-4 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Apellido y nombre</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">DNI</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Teléfono</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Alta</th>
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
              clientes.map(c => (
                <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/crm/clientes/${c.id}`} className="text-zinc-200 hover:text-lime-400 font-medium transition-colors">
                        {c.apellido}, {c.nombre}
                      </Link>
                      {c.es_pep && (
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-0 text-xs px-1.5">PEP</Badge>
                      )}
                      {c.es_sujeto_obligado && (
                        <Badge className="bg-orange-500/20 text-orange-300 border-0 text-xs px-1.5">SO</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">{c.dni ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">{c.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell text-xs">{formatFecha(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/crm/clientes/${c.id}`}>
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white h-7 text-xs">
                        Ver
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
