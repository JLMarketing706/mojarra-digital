import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ShieldAlert, AlertTriangle, Clock, FileCheck2, FileWarning,
  GraduationCap, ClipboardList, ArrowRight, Calendar,
  TrendingUp, FileText, BookOpenText, ShieldCheck,
  History, ClipboardCheck,
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

  // DDJJ pendientes
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

  // Manual vigente
  const { data: manualVigente } = await supabase
    .from('manual_procedimientos')
    .select('id, version, vigente')
    .eq('vigente', true)
    .maybeSingle()

  // Cantidad de listas de sanción
  const { count: totalListas } = await supabase
    .from('listas_sancion')
    .select('*', { count: 'exact', head: true })
    .eq('vigente', true)

  // Revisiones externas pendientes
  const { count: revisionesPend } = await supabase
    .from('revisiones_externas')
    .select('*', { count: 'exact', head: true })
    .in('estado', ['pendiente', 'en_proceso'])

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <ShieldAlert size={20} className="text-lime-400" />Centro de Cumplimiento UIF
        </h1>
        <p className="text-zinc-400 text-sm">
          Panel del Oficial de Cumplimiento — vigilancia de plazos, ROS, DDJJ y autoevaluación anual.
        </p>
      </div>

      {/* NAVEGACIÓN RÁPIDA — siempre visible arriba */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <NavCard
          href="/crm/cumplimiento/ros"
          icon={FileWarning}
          label="Reportes ROS"
          desc="Operaciones LA / FT / FP"
          count={(rosInusuales ?? 0) + (rosAnalisis ?? 0) + (rosSospechosas ?? 0)}
          countLabel="pendientes"
          urgent={(rosSospechosas ?? 0) > 0}
        />
        <NavCard
          href="/crm/cumplimiento/ddjj"
          icon={FileCheck2}
          label="Declaraciones"
          desc="DDJJ de PEP, BF, fondos"
          count={ddjjPendientes ?? 0}
          countLabel={ddjjPendientes ? 'sin firmar' : 'al día'}
          urgent={(ddjjPendientes ?? 0) > 0}
        />
        <NavCard
          href="/crm/cumplimiento/rsa"
          icon={ClipboardList}
          label="RSA anual"
          desc="Autoevaluación de riesgos"
          count={rsaPrevio ? 1 : 0}
          countLabel={rsaPrevio ? rsaPrevio.estado : 'sin cargar'}
        />
        <NavCard
          href="/crm/cumplimiento/capacitacion"
          icon={GraduationCap}
          label="Capacitación"
          desc="PLA/FT obligatoria anual"
          count={proximaCap ? 1 : 0}
          countLabel={proximaCap ? 'programada' : 'sin programar'}
          urgent={!proximaCap}
        />
      </div>

      {/* SEGUNDA FILA NAV — fase 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <NavCard
          href="/crm/cumplimiento/manual"
          icon={BookOpenText}
          label="Manual PLA/FT"
          desc="Procedimientos versionados"
          count={manualVigente ? 1 : 0}
          countLabel={manualVigente ? `v${manualVigente.version} vigente` : 'sin manual'}
          urgent={!manualVigente}
        />
        <NavCard
          href="/crm/cumplimiento/screening"
          icon={ShieldCheck}
          label="Screening de listas"
          desc="PEP, OFAC, ONU, GAFI"
          count={totalListas ?? 0}
          countLabel="entradas"
        />
        <NavCard
          href="/crm/cumplimiento/revisiones"
          icon={ClipboardCheck}
          label="Revisiones externas"
          desc="Auditorías independientes"
          count={revisionesPend ?? 0}
          countLabel={revisionesPend ? 'en curso' : 'al día'}
        />
        <NavCard
          href="/crm/cumplimiento/auditoria"
          icon={History}
          label="Audit logs"
          desc="Trazabilidad completa"
          count={0}
          countLabel="ver actividad"
        />
      </div>

      {/* STATS ROS */}
      <div className="mb-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Estado de los ROS</p>
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
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IZQUIERDA: ROS pendientes + legajos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              ROS pendientes ({rosTyped.length})
            </h2>
            <Link href="/crm/cumplimiento/ros/nuevo">
              <Button size="sm" className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-1.5 h-8 text-xs">
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

        {/* DERECHA: resumen anual + tareas */}
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <TrendingUp size={14} className="text-lime-400" />Resumen {anio}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {statsAnio && (
                <>
                  <Row label="Escrituras" value={statsAnio.total_operaciones} />
                  <Row label="Disparan UIF" value={statsAnio.operaciones_uif} highlight />
                  <Row label="Clientes nuevos" value={statsAnio.total_clientes} />
                  <Row label="Clientes PEP" value={statsAnio.total_pep} />
                  <Row label="Beneficiarios finales" value={statsAnio.total_bf} />
                  <Row label="ROS reportados" value={statsAnio.total_ros} highlight />
                </>
              )}
            </CardContent>
          </Card>

          {rsaPrevio && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <ClipboardList size={14} className="text-lime-400" />RSA {anio - 1}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 capitalize">
                    {rsaPrevio.estado}
                  </Badge>
                  {rsaPrevio.fecha_presentacion && (
                    <span className="text-xs text-zinc-500">{formatFecha(rsaPrevio.fecha_presentacion)}</span>
                  )}
                </div>
                <Link href="/crm/cumplimiento/rsa">
                  <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 h-8 text-xs">
                    <FileText size={12} />Gestionar RSA
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

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
                <Link href="/crm/cumplimiento/ddjj?estado=pendientes">
                  <Button size="sm" className="w-full bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20 border border-yellow-400/30 text-xs">
                    Ver pendientes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {proximaCap && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <GraduationCap size={14} className="text-lime-400" />Próxima capacitación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-200 text-sm font-medium">{proximaCap.titulo}</p>
                <p className="text-zinc-500 text-xs flex items-center gap-1 mt-1">
                  <Calendar size={11} />{formatFecha(proximaCap.fecha)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
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

function NavCard({
  href, icon: Icon, label, desc, count, countLabel, urgent = false,
}: {
  href: string
  icon: React.ElementType
  label: string
  desc: string
  count: number
  countLabel: string
  urgent?: boolean
}) {
  return (
    <Link href={href} className="group">
      <Card className={`h-full transition-all ${
        urgent
          ? 'bg-zinc-900 border-yellow-500/30 hover:border-yellow-400/50'
          : 'bg-zinc-900 border-zinc-800 hover:border-lime-400/40'
      }`}>
        <CardContent className="p-4 h-full flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              urgent ? 'bg-yellow-400/10 border border-yellow-400/20' : 'bg-lime-400/10 border border-lime-400/20'
            }`}>
              <Icon size={16} className={urgent ? 'text-yellow-400' : 'text-lime-400'} />
            </div>
            <ArrowRight size={14} className="text-zinc-600 group-hover:text-lime-400 transition-colors" />
          </div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-zinc-500 text-xs mb-3">{desc}</p>
          <div className="mt-auto pt-2 border-t border-zinc-800/60 flex items-baseline gap-1.5">
            <span className={`text-xl font-bold ${urgent ? 'text-yellow-400' : 'text-zinc-200'}`}>{count}</span>
            <span className="text-zinc-500 text-xs">{countLabel}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
