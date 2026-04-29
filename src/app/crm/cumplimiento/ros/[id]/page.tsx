import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, FileWarning, Clock, AlertTriangle, FileCheck2, User, FileText } from 'lucide-react'
import { formatFecha, formatFechaHora } from '@/lib/utils'
import { RosAcciones } from '@/components/crm/ros-acciones'
import Link from 'next/link'
import type { EstadoROS, TipoROS, Profile } from '@/types'
import { LABEL_TIPO_ROS, LABEL_ESTADO_ROS } from '@/types'

const ESTADO_COLORS: Record<EstadoROS, string> = {
  inusual: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  en_analisis: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  sospechosa: 'bg-red-500/15 text-red-300 border-red-500/30',
  reportada: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  descartada: 'bg-zinc-700 text-zinc-400 border-zinc-700',
}

interface ROSDetalle {
  id: string
  tipo: TipoROS
  estado: EstadoROS
  motivos_inusualidad: string | null
  analisis_oc: string | null
  hechos_sospechosos: string | null
  fecha_deteccion: string
  fecha_conclusion_sospecha: string | null
  fecha_limite_reporte: string | null
  fecha_reportado: string | null
  numero_constancia: string | null
  operacion_concretada: boolean
  detectado_por: string | null
  reportado_por: string | null
  tramite: {
    id: string
    tipo: string
    numero_referencia: string | null
    monto: number | null
    monto_efectivo: number | null
    cliente: { id: string; nombre: string; apellido: string; dni: string | null; nivel_riesgo: string | null } | null
  } | null
}

export default async function ROSDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ros } = await supabase
    .from('ros_reportes')
    .select(`
      *,
      tramite:tramites(
        id, tipo, numero_referencia, monto, monto_efectivo,
        cliente:clientes(id, nombre, apellido, dni, nivel_riesgo)
      )
    `)
    .eq('id', id)
    .single()

  if (!ros) notFound()
  const r = ros as unknown as ROSDetalle

  // Cargar profiles de detectado_por y reportado_por
  const ids = [r.detectado_por, r.reportado_por].filter(Boolean) as string[]
  let profiles: Profile[] = []
  if (ids.length) {
    const { data } = await supabase.from('profiles').select('*').in('id', ids)
    if (data) profiles = data as Profile[]
  }
  const detectoNombre = profiles.find(p => p.id === r.detectado_por)
  const reportoNombre = profiles.find(p => p.id === r.reportado_por)

  const horas = r.fecha_limite_reporte
    ? Math.max(0, (new Date(r.fecha_limite_reporte).getTime() - Date.now()) / 1000 / 3600)
    : null
  const vencido = horas === 0 && r.estado === 'sospechosa'

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento/ros">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />ROS
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
              <FileWarning size={20} className="text-red-400" />
              ROS {r.tipo} — {LABEL_TIPO_ROS[r.tipo]}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs border ${ESTADO_COLORS[r.estado]}`}>
                {LABEL_ESTADO_ROS[r.estado]}
              </Badge>
              {!r.operacion_concretada && (
                <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs">Operación tentada</Badge>
              )}
              {r.numero_constancia && (
                <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-mono">
                  Constancia UIF: {r.numero_constancia}
                </Badge>
              )}
              {vencido && (
                <Badge className="bg-red-500 text-white border-0 text-xs animate-pulse">
                  ⚠ PLAZO VENCIDO
                </Badge>
              )}
              {horas !== null && horas > 0 && r.estado === 'sospechosa' && (
                <Badge className={`text-xs border ${
                  horas < 6 ? 'bg-red-500/20 text-red-300 border-red-500/30'
                  : horas < 12 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                }`}>
                  ⏱ {horas.toFixed(1)}h restantes
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardContent className="p-4">
          <p className="text-zinc-400 text-xs mb-3">Transicionar estado</p>
          <RosAcciones rosId={r.id} estadoActual={r.estado} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IZQ — datos del ROS */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300">Detección y motivos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.motivos_inusualidad && (
                <div>
                  <p className="text-zinc-500 text-xs mb-1.5">Motivos de inusualidad</p>
                  <p className="text-zinc-200 text-sm whitespace-pre-line">{r.motivos_inusualidad}</p>
                </div>
              )}
              {r.analisis_oc && (
                <>
                  <Separator className="bg-zinc-800" />
                  <div>
                    <p className="text-zinc-500 text-xs mb-1.5">Análisis del Oficial de Cumplimiento</p>
                    <p className="text-zinc-200 text-sm whitespace-pre-line">{r.analisis_oc}</p>
                  </div>
                </>
              )}
              {r.hechos_sospechosos && (
                <>
                  <Separator className="bg-zinc-800" />
                  <div>
                    <p className="text-zinc-500 text-xs mb-1.5">Hechos sospechosos</p>
                    <p className="text-zinc-200 text-sm whitespace-pre-line">{r.hechos_sospechosos}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Trámite */}
          {r.tramite && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <FileText size={14} className="text-lime-400" />Trámite involucrado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Link href={`/crm/tramites/${r.tramite.id}`}
                  className="text-lime-400 font-medium hover:underline">
                  {r.tramite.tipo}
                  {r.tramite.numero_referencia && ` · ${r.tramite.numero_referencia}`}
                </Link>
                {r.tramite.cliente && (
                  <p className="text-zinc-300">
                    <Link href={`/crm/clientes/${r.tramite.cliente.id}`} className="hover:text-lime-400">
                      {r.tramite.cliente.apellido}, {r.tramite.cliente.nombre}
                    </Link>
                    {r.tramite.cliente.dni && <span className="text-zinc-500"> · DNI {r.tramite.cliente.dni}</span>}
                    {r.tramite.cliente.nivel_riesgo && (
                      <Badge className="ml-2 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 capitalize">
                        Riesgo {r.tramite.cliente.nivel_riesgo}
                      </Badge>
                    )}
                  </p>
                )}
                {r.tramite.monto && (
                  <p className="text-zinc-400">Monto: ${Number(r.tramite.monto).toLocaleString('es-AR')}</p>
                )}
                {r.tramite.monto_efectivo && r.tramite.monto_efectivo > 0 && (
                  <p className="text-zinc-400">En efectivo: ${Number(r.tramite.monto_efectivo).toLocaleString('es-AR')}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* DER — timeline */}
        <Card className="bg-zinc-900 border-zinc-800 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Clock size={14} className="text-lime-400" />Línea de tiempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <TimelineItem
                icon={<AlertTriangle size={12} />}
                label="Detectado"
                date={r.fecha_deteccion}
                user={detectoNombre ? `${detectoNombre.nombre} ${detectoNombre.apellido}` : undefined}
                color="text-yellow-400"
              />
              {r.fecha_conclusion_sospecha && (
                <TimelineItem
                  icon={<AlertTriangle size={12} />}
                  label="Concluido sospechoso"
                  date={r.fecha_conclusion_sospecha}
                  color="text-red-400"
                />
              )}
              {r.fecha_limite_reporte && r.estado !== 'reportada' && r.estado !== 'descartada' && (
                <div className="pl-5 border-l border-dashed border-red-500/30">
                  <p className="text-red-400 text-xs flex items-center gap-1.5">
                    <Clock size={11} />
                    Plazo límite: {formatFechaHora(r.fecha_limite_reporte)}
                  </p>
                </div>
              )}
              {r.fecha_reportado && (
                <TimelineItem
                  icon={<FileCheck2 size={12} />}
                  label="Reportado a UIF"
                  date={r.fecha_reportado}
                  user={reportoNombre ? `${reportoNombre.nombre} ${reportoNombre.apellido}` : undefined}
                  color="text-blue-400"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TimelineItem({ icon, label, date, user, color }: {
  icon: React.ReactNode
  label: string
  date: string
  user?: string
  color: string
}) {
  return (
    <div className="flex gap-3">
      <div className={`shrink-0 w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="text-sm">
        <p className="text-zinc-200 font-medium">{label}</p>
        <p className="text-zinc-500 text-xs">{formatFechaHora(date)}</p>
        {user && (
          <p className="text-zinc-500 text-xs flex items-center gap-1">
            <User size={10} />{user}
          </p>
        )}
      </div>
    </div>
  )
}
