import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PackagePlus, FileDown } from 'lucide-react'
import { formatFechaHora } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Entregas' }

export default async function EntregasPage() {
  const supabase = await createClient()

  const { data: entregas } = await supabase
    .from('entregas')
    .select('*, tramite:tramites(tipo, numero_referencia, cliente:clientes(nombre, apellido))')
    .order('fecha', { ascending: false })
    .limit(200)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Entregas</h1>
          <p className="text-zinc-400 text-sm">{entregas?.length ?? 0} registradas</p>
        </div>
        <Link href="/crm/entregas/nueva">
          <Button className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            <PackagePlus size={16} />Nueva entrega
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Trámite</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Receptor</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">DNI receptor</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Fecha</th>
              <th className="px-4 py-3 text-right">Recibo</th>
            </tr>
          </thead>
          <tbody>
            {!entregas || entregas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  No hay entregas registradas.
                </td>
              </tr>
            ) : (
              entregas.map(e => {
                const tramite = e.tramite as { tipo: string; numero_referencia: string | null; cliente: { nombre: string; apellido: string } | null } | null
                return (
                  <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-zinc-200 font-medium">{tramite?.tipo ?? '—'}</p>
                      {tramite?.cliente && (
                        <p className="text-zinc-500 text-xs">{tramite.cliente.apellido}, {tramite.cliente.nombre}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 hidden sm:table-cell">{e.receptor_nombre}</td>
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell font-mono text-xs">{e.receptor_dni}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{formatFechaHora(e.fecha)}</td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/api/recibo?id=${e.id}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-lime-400 h-7 gap-1.5 text-xs">
                          <FileDown size={13} />PDF
                        </Button>
                      </a>
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
