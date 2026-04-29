import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ShieldAlert, AlertTriangle, Clock, FileCheck2, FileWarning,
  GraduationCap, ClipboardList, ArrowRight, Calendar,
  TrendingUp, FileText,
} from 'lucide-react'
import Link from 'next/link'
import { formatFecha, formatFechaHora } from '@/lib/utils'
import type { Metadata } from 'next'
import type { EstadoROS } from '@/types'
import { LABEL_TIPO_ROS, LABEL_ESTADO_ROS } from '@/types'

export const metadata: Metadata = { title: 'Cumplimiento UIF' }

const ESTADO_ROS_COLORS: Record<EstadoROS, string> = {
  inusual: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  en_analisis: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  sospechosa: 'bg-red-500/15 text-red-300 border-red-500/30',
  reportada: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  descartada: 'bg-zinc-700 text-zinc-400 border-zinc-700',
}

interface ROSConTramite {
  id: string
  tipo: 'LA' | 'FT' | 'FP'
  estado: EstadoROS
  fecha_deteccion: string
  fecha_limite_reporte: string | null
  fecha_reportado: string | null
  motivos_inusualidad: string | null
  tramite: {
    id: string
    tipo: string
    numero_referencia: string | null
    cliente: { nombre: string; apellido: string } | null
  } | null
}

function horasRestantes(limite: string): number {
  return Math.max(0, (new Date(limite).getTime() - Date.now()) / 1000 / 3600)
}

export default async function CumplimientoPage() {
  const supabase = await createClient()
  const ahora = new Date()
  const anio = ahora.getFullYear()

  // ROS por estado
  const [
    { count: rosInusuales },
    { count: rosAnalisis },
    { count: rosSospechosas },
    { count: rosReportadas },
  ] = await Promise.all([
    supabase.from('ros_reportes').select('*', { count: 'exact', head: true }).eq('estado', 'inusual'),
    supabase.from('ros_reportes').select('*', { count: 'exact', head: true }).eq('estado', 'en_analisis'),
    supabase.from('ros_reportes').select('*', { count: 'exact', head: true }).eq('estado', 'sospechosa'),
    supabase.from('ros_reportes').select('*', { count: 'exact', head: true }).eq('estado', 'reportada'),
  ])

  // ROS pendientes (con plazo activo)
  const { data: rosPendientes } = await supabase
    .from('ros_reportes')
    .select(`
      id, tipo, estado, fecha_deteccion, fecha_limite_reporte, fecha_reportado, motivos_inusualidad,
      tramite:tramites(id, tipo, numero_referencia,
        cliente:clientes(nombre, apellido))
    `)
    .in('estado', ['inusual', 'en_analisis', 'sospechosa'])
    .order('fecha_limite_reporte', { ascending: true, nullsFirst: false })
    .limit(20)

  const rosTyped = (rosPendientes ?? []) as unknown as ROSConTramite[]

  // Clientes con legajo vencido
  const { data: legajosVencidos } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, nivel_riesgo, proxima_actualizacion')
    .lt('proxima_actualizacion', ahora.toISOString().split('T')[0])
    .order('proxima_actualizacion', { ascending: true })
    .limit(10)

  // Stats anuales
  const [{ data: stats }] = await Promise.all([
    supabase.rpc('calcular_stats_rsa', { p_anio: anio }),
  ])
  const statsAnio = (Array.isArray(stats) && stats[0]) || null

  // Estado RSA del año pasado
  const { data: rsaPrevio } = await supabase
    .from('autoevaluaciones_riesgo')
    .select('*')
    .eq('anio', anio - 1)
    .maybeSingle()

  // DDJJ pendientes (no firmadas o vencidas)
  const { count: ddjjPendientes } = await supabase
    .from('declaraciones_juradas')
    .select('*', { count: 'exact', head: true })
    .eq('firmada', false)

  // Próxima capacitación
  const { data: proximaCap } = await supabase
    .from('capacitaciones')
    .select('*')
    .gte('fecha', ahora.toISOString().split('T')[0])
    .order('fecha', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <ShieldAlert size={20} className="text-lime-400" />Centro de Cumplimiento UIF
        </h1>
        <p className="text-zinc-400 text-sm">
          Panel del Oficial de Cumplimiento — vigilancia de plazos, ROS, DDJJ y autoevaluación anual.
        </p>
      </div>

      {/* === ROS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Inusuales', val: rosInusuales ?? 0, color: 'text-yellow-400', icon: AlertTriangle },
          { label: 'En análisis', val: rosAnalisis ?? 0, color: 'text-orange-400', icon: Clock },
          { label: 'Sospechosas', val: rosSospechosas ?? 0, color: 'text-red-400', icon: ShieldAlert },
          { label: 'Reportadas', val: rosReportadas ?? 0, color: 'text-blue-400', icon: FileCheck2 },
        ].map(s => (
          <Card key={s.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              </div>
              <s.icon size={20} className={s.color} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* === DOS COLUMNAS === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IZQUIERDA: ROS pendientes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              ROS pendientes ({rosTyped.length})
            </h2>
            <Link href="/crm/cumplimiento/ros/nuevo">
              <Button size="sm" className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-1.5 h-7 text-xs">
                <FileWarning size={12} />Reportar operación inusual
              </Button>
            </Link>
          </div>

          {rosTyped.length === 0 ? (
            <div className="border border-dashed border-zinc-700 rounded-lg py-10 text-center">
              <FileCheck2 size={32} className="text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Sin ROS pendientes. Buen trabajo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rosTyped.map(ros => {
                const horas = ros.fecha_limite_reporte ? horasRestantes(ros.fecha_limite_reporte) : null
                const urgente = horas !== null && horas < 6 && ros.estado === 'sospechosa'
                const vencido = horas !== null && horas === 0 && ros.estado === 'sospechosa'

                return (
                  <Card key={ros.id}
                    className={`bg-zinc-900 border ${
                      vencido ? 'border-red-500/50' : urgente ? 'border-red-500/30' : 'border-zinc-800'
                    }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-red-500/15 text-red-300 border border-red-500/30 text-xs">
                            ROS {ros.tipo}
                          </Badge>
                          <Badge className={`text-xs border ${ESTADO_ROS_COLORS[ros.estado]}`}>
                            {LABEL_ESTADO_ROS[ros.estado]}
                          </Badge>
                          {vencido && (
                            <Badge className="bg-red-500 text-white border-0 text-xs animate-pulse">
                              ⚠ PLAZO VENCIDO
                            </Badge>
                          )}
                          {urgente && !vencido && (
                            <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">
                              ⏱ {horas?.toFixed(1)}h restantes
                            </Badge>
                          )}
                        </div>
                        <Link href={`/crm/cumplimiento/ros/${ros.id}`}>
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white h-7 text-xs gap-1">
                            Ver <ArrowRight size={12} />
                          </Button>
                        </Link>
                      </div>

                      {ros.motivos_inusualidad && (
                        <p className="text-zinc-300 text-sm mb-2 line-clamp-2">{ros.motivos_inusualidad}</p>
                      )}

                      {ros.tramite && (
                        <div className="text-xs text-zinc-500">
                          <Link href={`/crm/tramites/${ros.tramite.id}`} className="text-lime-400 hover:underline">
                            {ros.tramite.tipo}
                            {ros.tramite.numero_referencia && ` · ${ros.tramite.numero_referencia}`}
                          </Link>
                          {ros.tramite.cliente && (
                            <> · {ros.tramite.cliente.apellido}, {ros.tramite.cliente.nombre}</>
                          )}
                          <span className="text-zinc-600"> · {formatFechaHora(ros.fecha_deteccion)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Legajos vencidos */}
          {legajosVencidos && legajosVencidos.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mt-8 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                Legajos con actualización vencida
              </h2>
              <div className="space-y-2">
                {legajosVencidos.map(c => (
                  <Link key={c.id} href={`/crm/clientes/${c.id}`}>
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-red-500/30 transition-colors">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-200 text-sm">{c.apellido}, {c.nombre}</span>
                          {c.nivel_riesgo && (
                            <Badge className="text-xs uppercase border border-zinc-700 bg-zinc-800 text-zinc-400">
                              {c.nivel_riesgo}
                            </Badge>
                          )}
                        </div>
                        <span className="text-red-400 text-xs">
                          Venció {formatFecha(c.proxima_actualizacion)}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* DERECHA: Resumen anual y próximas tareas */}
        <div className="space-y-4">
          {/* Stats año */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <TrendingUp size={14} className="text-lime-400" />
                Resumen {anio}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {statsAnio && (
                <>
                  <Row label="Operaciones" value={statsAnio.total_operaciones} />
                  <Row label="Disparan UIF" value={statsAnio.operaciones_uif} highlight />
                  <Row label="Clientes nuevos" value={statsAnio.total_clientes} />
                  <Row label="Clientes PEP" value={statsAnio.total_pep} />
                  <Row label="Beneficiarios finales" value={statsAnio.total_bf} />
                  <Row label="ROS reportados" value={statsAnio.total_ros} highlight />
                </>
              )}
            </CardContent>
          </Card>

          {/* RSA */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <ClipboardList size={14} className="text-lime-400" />
                Autoevaluación anual (RSA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-zinc-500">
                El primer RSA debió presentarse entre el 2/ene y el 15/mar del año siguiente.
                Res. UIF 242/2023 art. 28.
              </p>
              {rsaPrevio ? (
                <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-800/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-200 text-sm font-medium">RSA {anio - 1}</span>
                    <Badge className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 capitalize">
                      {rsaPrevio.estado}
                    </Badge>
                  </div>
                  {rsaPrevio.fecha_presentacion && (
                    <p className="text-xs text-zinc-500">Presentado: {formatFecha(rsaPrevio.fecha_presentacion)}</p>
                  )}
                </div>
              ) : (
                <p className="text-zinc-500 text-xs">Sin RSA cargado para {anio - 1}.</p>
              )}
              <Link href="/crm/cumplimiento/rsa">
                <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
                  <FileText size={12} />Gestionar RSA
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* DDJJ pendientes */}
          {(ddjjPendientes ?? 0) > 0 && (
            <Card className="bg-yellow-500/5 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileWarning size={14} className="text-yellow-400" />
                  <span className="text-yellow-300 text-sm font-semibold">
                    {ddjjPendientes} DDJJ sin firmar
                  </span>
                </div>
                <p className="text-yellow-400/70 text-xs mb-2">
                  Hay declaraciones juradas pendientes de firma.
                </p>
                <Link href="/crm/cumplimiento/ddjj">
                  <Button size="sm" className="w-full bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20 border border-yellow-400/30 text-xs">
                    Ver pendientes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Próxima capacitación */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <GraduationCap size={14} className="text-lime-400" />
                Capacitación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proximaCap ? (
                <div>
                  <p className="text-zinc-200 text-sm font-medium">{proximaCap.titulo}</p>
                  <p className="text-zinc-500 text-xs flex items-center gap-1 mt-1">
                    <Calendar size={11} />{formatFecha(proximaCap.fecha)}
                  </p>
                </div>
              ) : (
                <p className="text-zinc-500 text-xs mb-3">Sin capacitaciones programadas. La Res. 242/2023 exige al menos una anual.</p>
              )}
              <Link href="/crm/cumplimiento/capacitacion">
                <Button variant="outline" size="sm" className="w-full mt-3 border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
                  Ver capacitaciones
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
        {[
          { href: '/crm/cumplimiento/ros', label: 'Gestión de ROS', icon: FileWarning, desc: 'LA / FT / FP' },
          { href: '/crm/cumplimiento/ddjj', label: 'Declaraciones', icon: FileCheck2, desc: 'PEP, fondos, BF' },
          { href: '/crm/cumplimiento/rsa', label: 'RSA anual', icon: ClipboardList, desc: 'Autoevaluación' },
          { href: '/crm/cumplimiento/capacitacion', label: 'Capacitación', icon: GraduationCap, desc: 'PLA/FT' },
        ].map(it => (
          <Link key={it.href} href={it.href}>
            <Card className="bg-zinc-900 border-zinc-800 hover:border-lime-400/30 transition-colors h-full">
              <CardContent className="p-4">
                <it.icon size={18} className="text-lime-400 mb-3" />
                <p className="text-white text-sm font-medium">{it.label}</p>
                <p className="text-zinc-500 text-xs">{it.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value, highlight = false }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={highlight ? 'text-lime-400 font-semibold' : 'text-zinc-200'}>{value}</span>
    </div>
  )
}
