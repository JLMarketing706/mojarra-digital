import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileWarning, Plus } from 'lucide-react'
import { formatFechaHora } from '@/lib/utils'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { EstadoROS, TipoROS } from '@/types'
import { LABEL_ESTADO_ROS, LABEL_TIPO_ROS } from '@/types'

export const metadata: Metadata = { title: 'Gestión de ROS' }

const ESTADO_COLORS: Record<EstadoROS, string> = {
  inusual: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  en_analisis: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  sospechosa: 'bg-red-500/15 text-red-300 border-red-500/30',
  reportada: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  descartada: 'bg-zinc-700 text-zinc-400 border-zinc-700',
}

interface ROSRow {
  id: string
  tipo: TipoROS
  estado: EstadoROS
  fecha_deteccion: string
  fecha_limite_reporte: string | null
  numero_constancia: string | null
  motivos_inusualidad: string | null
  tramite: {
    id: string
    tipo: string
    numero_referencia: string | null
    cliente: { nombre: string; apellido: string } | null
  } | null
}

function horasRest(limite: string): number {
  return Math.max(0, (new Date(limite).getTime() - Date.now()) / 1000 / 3600)
}

export default async function ROSListPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const supabase = await createClient()

  let q = supabase
    .from('ros_reportes')
    .select(`
      id, tipo, estado, fecha_deteccion, fecha_limite_reporte, numero_constancia, motivos_inusualidad,
      tramite:tramites(id, tipo, numero_referencia, cliente:clientes(nombre, apellido))
    `)
    .order('created_at', { ascending: false })

  if (estado && estado !== 'todos') q = q.eq('estado', estado)

  const { data } = await q.limit(100)
  const rows = (data ?? []) as unknown as ROSRow[]

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Cumplimiento
          </Button>
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
              <FileWarning size={20} className="text-red-400" />Reportes de Operación Sospechosa
            </h1>
            <p className="text-zinc-500 text-sm">
              Flujo: inusual → en análisis → sospechosa → reportada. Plazo 24h una vez confirmada la sospecha.
            </p>
          </div>
          <Link href="/crm/cumplimiento/ros/nuevo">
            <Button className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
              <Plus size={14} />Nuevo
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['todos', 'inusual', 'en_analisis', 'sospechosa', 'reportada', 'descartada'].map(e => (
          <Link key={e} href={e === 'todos' ? '/crm/cumplimiento/ros' : `/crm/cumplimiento/ros?estado=${e}`}>
            <button className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              (estado ?? 'todos') === e
                ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                : 'text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
            }`}>
              {e === 'todos' ? 'Todos' : LABEL_ESTADO_ROS[e as EstadoROS]}
            </button>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-xl">
          <FileWarning size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Sin ROS registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            const horas = r.fecha_limite_reporte ? horasRest(r.fecha_limite_reporte) : null
            const urgente = horas !== null && horas < 6 && r.estado === 'sospechosa'
            const vencido = horas === 0 && r.estado === 'sospechosa'
            return (
              <Link key={r.id} href={`/crm/cumplimiento/ros/${r.id}`}>
                <Card className={`bg-zinc-900 border ${
                  vencido ? 'border-red-500/50' : urgente ? 'border-red-500/30' : 'border-zinc-800 hover:border-zinc-700'
                } transition-colors cursor-pointer`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge className="bg-red-500/15 text-red-300 border border-red-500/30 text-xs">
                            ROS {r.tipo}
                          </Badge>
                          <Badge className={`text-xs border ${ESTADO_COLORS[r.estado]}`}>
                            {LABEL_ESTADO_ROS[r.estado]}
                          </Badge>
                          {vencido && <Badge className="bg-red-500 text-white border-0 text-xs">⚠ VENCIDO</Badge>}
                          {urgente && !vencido && <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">⏱ {horas?.toFixed(1)}h</Badge>}
                          {r.numero_constancia && <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-mono">N° {r.numero_constancia}</Badge>}
                        </div>
                        {r.motivos_inusualidad && (
                          <p className="text-zinc-300 text-sm line-clamp-2 mb-1">{r.motivos_inusualidad}</p>
                        )}
                        {r.tramite && (
                          <p className="text-zinc-500 text-xs">
                            {r.tramite.tipo}
                            {r.tramite.cliente && ` · ${r.tramite.cliente.apellido}, ${r.tramite.cliente.nombre}`}
                            {' · '}{formatFechaHora(r.fecha_deteccion)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
