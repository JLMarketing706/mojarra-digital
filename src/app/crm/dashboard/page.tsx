import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, AlertTriangle, CalendarDays, Printer } from 'lucide-react'
import { estadoTramiteLabel, estadoTramiteColor, diasHastaVencimiento, formatFecha } from '@/lib/utils'
import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Panel de control' }

export default async function CRMDashboardPage() {
  const supabase = await createClient()

  // Nombre de la escribanía del usuario actual (para mostrar al lado del título)
  let nombreEscribania: string | null = null
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('escribania_id').eq('id', user.id).single()
    const escribaniaId = (profile as { escribania_id?: string } | null)?.escribania_id
    if (escribaniaId) {
      const { data: esc } = await supabase
        .from('escribanias')
        .select('razon_social, nombre_fantasia')
        .eq('id', escribaniaId)
        .single()
      const e = esc as { razon_social?: string; nombre_fantasia?: string } | null
      nombreEscribania = e?.nombre_fantasia || e?.razon_social || null
    }
  }

  const [
    { count: totalClientes },
    { count: tramitesActivos },
    { count: alertasUIF },
    { data: tramitesRecientes },
    { data: turnosHoy },
    { data: alertasPendientes },
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    supabase.from('tramites').select('*', { count: 'exact', head: true }).neq('estado', 'entregado'),
    supabase.from('alertas_uif').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('tramites')
      .select('id, tipo, estado, numero_referencia, updated_at, cliente:clientes(nombre, apellido)')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase.from('turnos')
      .select('id, tipo, estado, fecha, cliente:clientes(nombre, apellido)')
      .gte('fecha', new Date().toISOString().split('T')[0])
      .lt('fecha', new Date(Date.now() + 86400000).toISOString().split('T')[0])
      .order('fecha', { ascending: true })
      .limit(5),
    supabase.from('alertas_uif')
      .select('id, tipo_alerta, tipo, descripcion, created_at, tramite:tramites(id, tipo, cliente:clientes(nombre, apellido))')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Observados con plazo próximo (próximos 15 días o vencidos)
  const en15Dias = new Date()
  en15Dias.setDate(en15Dias.getDate() + 15)
  const { data: observadosUrgentes } = await supabase
    .from('tramites')
    .select('id, tipo, fecha_limite_observacion, observacion_registro, cliente:clientes(nombre, apellido)')
    .eq('estado', 'observado')
    .lte('fecha_limite_observacion', en15Dias.toISOString().split('T')[0])
    .order('fecha_limite_observacion', { ascending: true })
    .limit(10)

  // Clientes con legajo pendiente de completar
  const { data: legajosPendientes } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, dni, cuil, created_at')
    .eq('legajo_incompleto', true)
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: 'Clientes', value: totalClientes ?? 0, icon: Users, href: '/crm/clientes' },
    { label: 'Escrituras activas', value: tramitesActivos ?? 0, icon: FileText, href: '/crm/tramites' },
    { label: 'Alertas UIF', value: alertasUIF ?? 0, icon: AlertTriangle, href: '/crm/uif', alert: (alertasUIF ?? 0) > 0 },
    { label: 'Turnos hoy', value: turnosHoy?.length ?? 0, icon: CalendarDays, href: '/crm/agenda' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-semibold text-white">Panel de control</h1>
            {nombreEscribania && (
              <span className="text-zinc-500 text-base">·</span>
            )}
            {nombreEscribania && (
              <span className="text-zinc-300 text-base font-medium">
                {nombreEscribania}
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-sm">Resumen del sistema notarial.</p>
        </div>
        <Link href="/crm/cumplimiento/ddjj/imprimir" target="_blank">
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 shrink-0">
            <Printer size={14} />
            Imprimir DDJJ UIF
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href, alert }) => (
          <Link key={label} href={href}>
            <Card className={`bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer ${alert ? 'border-yellow-500/50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-zinc-400 text-xs font-medium uppercase tracking-wide">{label}</span>
                  <Icon size={16} className={alert ? 'text-yellow-400' : 'text-zinc-500'} />
                </div>
                <p className={`text-3xl font-bold ${alert ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Observados próximos a vencer */}
      {observadosUrgentes && observadosUrgentes.length > 0 && (
        <Card className="bg-orange-500/5 border-orange-500/30 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-orange-300 flex items-center gap-2">
                <Clock size={14} />Observados — plazo próximo o vencido ({observadosUrgentes.length})
              </CardTitle>
              <Link href="/crm/tramites?estado=observado" className="text-xs text-orange-400 hover:underline">
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {observadosUrgentes.map(o => {
                const dias = diasHastaVencimiento(o.fecha_limite_observacion as string)
                const cliente = (o.cliente as unknown) as { nombre: string; apellido: string } | null
                const vencido = dias !== null && dias < 0
                return (
                  <Link key={o.id} href={`/crm/tramites/${o.id}`}>
                    <div className="flex items-start justify-between gap-3 py-2 border-b border-orange-500/10 last:border-0 hover:bg-orange-500/5 -mx-2 px-2 rounded transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200 truncate">{o.tipo}</p>
                        <p className="text-xs text-zinc-500">
                          {cliente ? `${cliente.apellido}, ${cliente.nombre} · ` : ''}
                          Vence {formatFecha(o.fecha_limite_observacion as string)}
                        </p>
                      </div>
                      <Badge className={`text-xs shrink-0 border ${
                        vencido
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      }`}>
                        {vencido ? `Vencido hace ${Math.abs(dias!)}d` : `${dias}d restantes`}
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clientes con legajo incompleto */}
      {legajosPendientes && legajosPendientes.length > 0 && (
        <Card className="bg-yellow-500/5 border-yellow-500/30 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-yellow-300 flex items-center gap-2">
                <AlertTriangle size={14} />Clientes con legajo pendiente ({legajosPendientes.length})
              </CardTitle>
              <Link href="/crm/clientes?legajo=incompleto" className="text-xs text-yellow-400 hover:underline">
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {legajosPendientes.map(c => (
                <Link key={c.id} href={`/crm/clientes/${c.id}/editar`}>
                  <div className="flex items-center justify-between gap-3 py-2 border-b border-yellow-500/10 last:border-0 hover:bg-yellow-500/5 -mx-2 px-2 rounded transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-200 truncate">{c.apellido}, {c.nombre}</p>
                      <p className="text-xs text-zinc-500">
                        {c.dni ? `DNI ${c.dni}` : c.cuil ? `CUIT ${c.cuil}` : 'sin documento'}
                      </p>
                    </div>
                    <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shrink-0">
                      Completar
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas UIF pendientes */}
      {alertasPendientes && alertasPendientes.length > 0 && (
        <Card className="bg-yellow-500/5 border-yellow-500/30 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-yellow-300 flex items-center gap-2">
                <AlertTriangle size={14} />Alertas UIF pendientes ({alertasPendientes.length})
              </CardTitle>
              <Link href="/crm/uif?estado=pendiente" className="text-xs text-yellow-400 hover:underline">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertasPendientes.map((a) => {
                const tramite = (a.tramite as unknown) as { id: string; tipo: string; cliente: { nombre: string; apellido: string } | null } | null
                return (
                  <Link key={a.id} href={tramite ? `/crm/tramites/${tramite.id}` : '/crm/uif'}>
                    <div className="flex items-start justify-between gap-3 py-2 border-b border-yellow-500/10 last:border-0 hover:bg-yellow-500/5 -mx-2 px-2 rounded transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200 truncate">{a.descripcion ?? a.tipo_alerta ?? a.tipo ?? 'Alerta UIF'}</p>
                        {tramite && (
                          <p className="text-xs text-zinc-500">
                            {tramite.tipo}
                            {tramite.cliente ? ` · ${tramite.cliente.apellido}, ${tramite.cliente.nombre}` : ''}
                          </p>
                        )}
                      </div>
                      <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shrink-0">
                        Pendiente
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operaciones recientes */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-zinc-300">Escrituras recientes</CardTitle>
              <Link href="/crm/tramites" className="text-xs text-lime-400 hover:underline">Ver todos</Link>
            </div>
          </CardHeader>
          <CardContent>
            {!tramitesRecientes || tramitesRecientes.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">Sin escrituras recientes.</p>
            ) : (
              <div className="space-y-2">
                {tramitesRecientes.map((t) => {
                  const cliente = (t.cliente as unknown) as { nombre: string; apellido: string } | null
                  return (
                    <Link key={t.id} href={`/crm/tramites/${t.id}`}>
                      <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 -mx-2 px-2 rounded transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-200 truncate">{t.tipo}</p>
                          {cliente && (
                            <p className="text-xs text-zinc-500">{cliente.nombre} {cliente.apellido}</p>
                          )}
                        </div>
                        <Badge className={`text-xs ml-2 shrink-0 ${estadoTramiteColor(t.estado)}`}>
                          {estadoTramiteLabel(t.estado)}
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Turnos de hoy */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-zinc-300">Turnos de hoy</CardTitle>
              <Link href="/crm/agenda" className="text-xs text-lime-400 hover:underline">Ver agenda</Link>
            </div>
          </CardHeader>
          <CardContent>
            {!turnosHoy || turnosHoy.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">No hay turnos para hoy.</p>
            ) : (
              <div className="space-y-2">
                {turnosHoy.map((t) => {
                  const cliente = (t.cliente as unknown) as { nombre: string; apellido: string } | null
                  const hora = new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                      <span className="text-lime-400 font-mono text-sm shrink-0">{hora}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 truncate">
                          {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Sin cliente'}
                        </p>
                        {t.tipo && <p className="text-xs text-zinc-500">{t.tipo}</p>}
                      </div>
                      <Badge className={`ml-auto shrink-0 text-xs ${
                        t.estado === 'confirmado' ? 'bg-lime-500/20 text-lime-300' : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {t.estado}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
