import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookPlus } from 'lucide-react'
import { IndiceSearch } from '@/components/crm/indice-search'
import { IndiceExportButton } from '@/components/crm/indice-export-button'
import { formatFecha } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Índice Notarial' }

export default async function IndiceNotarialPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('indice_notarial')
    .select('*, escribano:profiles(nombre, apellido)')
    .order('numero_escritura', { ascending: false })

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`
    query = query.or(
      `partes.ilike.${term},tipo_acto.ilike.${term},inmueble.ilike.${term},observaciones.ilike.${term}`
    )
    // Si es número, filtrar también por numero_escritura
    const num = parseInt(q.trim())
    if (!isNaN(num)) {
      query = supabase
        .from('indice_notarial')
        .select('*, escribano:profiles(nombre, apellido)')
        .or(`partes.ilike.${term},tipo_acto.ilike.${term},inmueble.ilike.${term},numero_escritura.eq.${num}`)
        .order('numero_escritura', { ascending: false })
    }
  }

  const { data: entradas } = await query.limit(300)

  // Obtener configuración de la escribanía para PDF
  const { data: config } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['nombre_escribania', 'direccion_escribania', 'matricula_escribano'])

  const configMap = Object.fromEntries((config ?? []).map(c => [c.clave, c.valor]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Índice Notarial</h1>
          <p className="text-zinc-400 text-sm">
            {entradas?.length ?? 0} escrituras registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IndiceExportButton config={configMap} />
          <Link href="/crm/indice/nueva">
            <Button className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
              <BookPlus size={16} />
              Nueva escritura
            </Button>
          </Link>
        </div>
      </div>

      <IndiceSearch defaultValue={q} />

      <div className="mt-4 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium w-20">Nº</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell w-24">Fecha</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Tipo de acto</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Partes</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Inmueble</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Folio</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {!entradas || entradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  {q ? `Sin resultados para "${q}".` : 'El índice está vacío. Agregá la primera escritura.'}
                </td>
              </tr>
            ) : (
              entradas.map(e => (
                <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/crm/indice/${e.id}`}
                      className="text-lime-400 font-mono font-semibold hover:underline">
                      {e.numero_escritura}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">
                    {formatFecha(e.fecha)}
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{e.tipo_acto}</td>
                  <td className="px-4 py-3 text-zinc-300 max-w-xs truncate">{e.partes}</td>
                  <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell max-w-xs truncate">
                    {e.inmueble ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell font-mono text-xs">
                    {e.folio ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/crm/indice/${e.id}`}>
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
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
