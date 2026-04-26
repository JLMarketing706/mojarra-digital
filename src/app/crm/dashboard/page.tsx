import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, AlertTriangle, CalendarDays } from 'lucide-react'
import { estadoTramiteLabel, estadoTramiteColor, formatFecha } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard CRM' }

export default async function CRMDashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalClientes },
    { count: tramitesActivos },
    { count: alertasUIF },
    { data: tramitesRecientes },
    { data: turnosHoy },
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
  ])

  const stats = [
    { label: 'Clientes', value: totalClientes ?? 0, icon: Users, href: '/crm/clientes' },
    { label: 'Trámites activos', value: tramitesActivos ?? 0, icon: FileText, href: '/crm/tramites' },
    { label: 'Alertas UIF', value: alertasUIF ?? 0, icon: AlertTriangle, href: '/crm/uif', alert: (alertasUIF ?? 0) > 0 },
    { label: 'Turnos hoy', value: turnosHoy?.length ?? 0, icon: CalendarDays, href: '/crm/agenda' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Dashboard</h1>
        <p className="text-zinc-400 text-sm">Resumen del sistema notarial.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trámites recientes */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-zinc-300">Trámites recientes</CardTitle>
              <Link href="/crm/tramites" className="text-xs text-lime-400 hover:underline">Ver todos</Link>
            </div>
          </CardHeader>
          <CardContent>
            {!tramitesRecientes || tramitesRecientes.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">Sin trámites recientes.</p>
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
