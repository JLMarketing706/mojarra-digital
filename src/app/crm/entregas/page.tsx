import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PackagePlus, FileDown, FileText } from 'lucide-react'
import { formatFechaHora } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Entregas' }

interface ClienteJoin {
  nombre: string
  apellido: string
  dni: string | null
}

interface EntregaJoin {
  id: string
  fecha: string
  receptor_nombre: string | null
  receptor_dni: string | null
}

interface EscrituraEntregada {
  id: string
  tipo: string
  numero_referencia: string | null
  numero_escritura: string | null
  estado: string
  updated_at: string
  cliente: ClienteJoin | null
  /** Si el escribano usó el flujo 'Nueva entrega', acá está el recibo */
  entrega: EntregaJoin | null
}

export default async function EntregasPage() {
  const supabase = await createClient()

  // Listar TODAS las escrituras en estado 'entregado', con join al recibo
  // (si existe). Antes la página solo listaba registros de la tabla
  // `entregas`, así que no se veían las que se marcaban como entregadas
  // desde el selector de estado.
  const { data: rows } = await supabase
    .from('tramites')
    .select(`
      id, tipo, numero_referencia, numero_escritura, estado, updated_at,
      cliente:clientes(nombre, apellido, dni),
      entrega:entregas(id, fecha, receptor_nombre, receptor_dni)
    `)
    .eq('estado', 'entregado')
    .order('updated_at', { ascending: false })
    .limit(200)

  const escrituras = (rows ?? []).map(r => {
    const e = r as unknown as Omit<EscrituraEntregada, 'entrega'> & { entrega: EntregaJoin[] | EntregaJoin | null }
    // El join a entregas puede venir como array o como objeto según la versión
    const entregaArr = Array.isArray(e.entrega) ? e.entrega : (e.entrega ? [e.entrega] : [])
    return { ...e, entrega: entregaArr[0] ?? null } as EscrituraEntregada
  })

  const totalEntregadas = escrituras.length
  const conRecibo = escrituras.filter(e => e.entrega).length
  const sinRecibo = totalEntregadas - conRecibo

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Entregas</h1>
          <p className="text-zinc-400 text-sm">
            <span className="text-zinc-200 font-medium">{totalEntregadas}</span>{' '}
            {totalEntregadas === 1 ? 'escritura entregada' : 'escrituras entregadas'}
            <span className="text-zinc-600 ml-2">
              · {conRecibo} con recibo{sinRecibo > 0 ? ` · ${sinRecibo} sin recibo` : ''}
            </span>
          </p>
        </div>
        <Link href="/crm/entregas/nueva">
          <Button className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            <PackagePlus size={16} />Nueva entrega
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Escritura</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Receptor</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">DNI receptor</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Fecha</th>
              <th className="px-4 py-3 text-right">Recibo</th>
            </tr>
          </thead>
          <tbody>
            {escrituras.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  No hay escrituras entregadas todavía.
                </td>
              </tr>
            ) : (
              escrituras.map(e => {
                const fecha = e.entrega?.fecha ?? e.updated_at
                return (
                  <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/crm/tramites/${e.id}`} className="text-zinc-200 font-medium hover:text-lime-400 transition-colors">
                        {e.tipo}
                      </Link>
                      {e.cliente && (
                        <p className="text-zinc-500 text-xs">
                          {e.cliente.apellido}, {e.cliente.nombre}
                          {e.cliente.dni ? ` · DNI ${e.cliente.dni}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 hidden sm:table-cell">
                      {e.entrega?.receptor_nombre ?? <span className="text-zinc-600 text-xs italic">— sin recibo —</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell font-mono text-xs">
                      {e.entrega?.receptor_dni ?? <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{formatFechaHora(fecha)}</td>
                    <td className="px-4 py-3 text-right">
                      {e.entrega ? (
                        <a href={`/api/recibo?id=${e.entrega.id}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-lime-400 h-7 gap-1.5 text-xs">
                            <FileDown size={13} />PDF
                          </Button>
                        </a>
                      ) : (
                        <Link href={`/crm/entregas/nueva?tramite=${e.id}`}>
                          <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-lime-400 h-7 gap-1.5 text-xs">
                            <FileText size={13} />Generar recibo
                          </Button>
                        </Link>
                      )}
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
