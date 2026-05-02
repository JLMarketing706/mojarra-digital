import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileCheck2, FileText, FileWarning, CheckCircle2, Clock } from 'lucide-react'
import { formatFecha } from '@/lib/utils'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { TipoDDJJ } from '@/types'
import { LABEL_DDJJ } from '@/types'

export const metadata: Metadata = { title: 'Declaraciones juradas' }

interface DDJJRow {
  id: string
  tipo: TipoDDJJ
  firmada: boolean
  vigente: boolean
  fecha_emision: string
  fecha_firma: string | null
  fecha_vencimiento: string | null
  pdf_url: string | null
  cliente: { id: string; nombre: string; apellido: string } | null
  cliente_juridico: { id: string; razon_social: string } | null
}

export default async function DDJJPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string }>
}) {
  const { estado, tipo } = await searchParams
  const supabase = await createClient()

  let q = supabase
    .from('declaraciones_juradas')
    .select(`
      id, tipo, firmada, vigente, fecha_emision, fecha_firma, fecha_vencimiento, pdf_url,
      cliente:clientes(id, nombre, apellido),
      cliente_juridico:clientes_juridicos(id, razon_social)
    `)
    .order('created_at', { ascending: false })

  if (estado === 'pendientes') q = q.eq('firmada', false)
  if (estado === 'firmadas') q = q.eq('firmada', true)
  if (tipo) q = q.eq('tipo', tipo)

  const { data } = await q.limit(100)
  const rows = (data ?? []) as unknown as DDJJRow[]

  const [
    { count: pendientes },
    { count: firmadas },
  ] = await Promise.all([
    supabase.from('declaraciones_juradas').select('*', { count: 'exact', head: true }).eq('firmada', false),
    supabase.from('declaraciones_juradas').select('*', { count: 'exact', head: true }).eq('firmada', true),
  ])

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Cumplimiento
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <FileCheck2 size={20} className="text-lime-400" />Declaraciones Juradas
        </h1>
        <p className="text-zinc-500 text-sm">
          Las DDJJ se generan desde la ficha del cliente o operación. Acá podés ver el estado consolidado.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Pendientes de firma</p>
              <p className="text-2xl font-bold text-yellow-400">{pendientes ?? 0}</p>
            </div>
            <FileWarning size={20} className="text-yellow-400" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Firmadas</p>
              <p className="text-2xl font-bold text-green-400">{firmadas ?? 0}</p>
            </div>
            <CheckCircle2 size={20} className="text-green-400" />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { v: '', label: 'Todas' },
          { v: 'pendientes', label: 'Pendientes' },
          { v: 'firmadas', label: 'Firmadas' },
        ].map(e => (
          <Link key={e.v} href={e.v ? `/crm/cumplimiento/ddjj?estado=${e.v}` : '/crm/cumplimiento/ddjj'}>
            <button className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              (estado ?? '') === e.v
                ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                : 'text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
            }`}>
              {e.label}
            </button>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-xl">
          <FileText size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">
            Sin DDJJ {estado === 'pendientes' ? 'pendientes' : estado === 'firmadas' ? 'firmadas' : 'registradas'}.
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            Las declaraciones se emiten desde la ficha de cada cliente o operación.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Emitida</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Firmada</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(d => {
                const clienteLabel = d.cliente
                  ? `${d.cliente.apellido}, ${d.cliente.nombre}`
                  : d.cliente_juridico?.razon_social ?? '—'
                const clienteHref = d.cliente
                  ? `/crm/clientes/${d.cliente.id}`
                  : null
                return (
                  <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-200">{LABEL_DDJJ[d.tipo]}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {clienteHref ? (
                        <Link href={clienteHref} className="hover:text-lime-400">{clienteLabel}</Link>
                      ) : clienteLabel}
                    </td>
                    <td className="px-4 py-3">
                      {d.firmada ? (
                        <Badge className="text-xs bg-green-500/15 text-green-300 border border-green-500/30">
                          <CheckCircle2 size={11} className="mr-1" />Firmada
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                          <Clock size={11} className="mr-1" />Pendiente
                        </Badge>
                      )}
                      {!d.vigente && (
                        <Badge className="ml-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-400">No vigente</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">{formatFecha(d.fecha_emision)}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {d.fecha_firma ? formatFecha(d.fecha_firma) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.pdf_url ? (
                        <a href={d.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white h-7 text-xs">
                            <FileText size={12} />
                          </Button>
                        </a>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
