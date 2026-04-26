import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { estadoTramiteLabel, estadoTramiteColor, formatFecha } from '@/lib/utils'
import { FileText, ChevronRight, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mis trámites' }

const PROGRESO: Record<string, number> = {
  iniciado: 10,
  en_proceso: 35,
  en_registro: 65,
  listo: 90,
  entregado: 100,
}

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Buscar el cliente asociado al usuario
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const tramites = cliente
    ? (await supabase
        .from('tramites')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('updated_at', { ascending: false })
      ).data ?? []
    : []

  const activos = tramites.filter(t => t.estado !== 'entregado')
  const finalizados = tramites.filter(t => t.estado === 'entregado')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">
          Hola, {profile?.nombre ?? 'Cliente'} 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Seguí el estado de todos tus trámites notariales.
        </p>
      </div>

      {tramites.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <FileText size={36} className="text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-1">No tenés trámites activos</p>
          <p className="text-muted-foreground text-sm mb-6">
            Cuando la escribanía inicie un trámite tuyo, lo vas a ver acá.
          </p>
          <Link
            href="/consulta"
            className="text-sm text-lime-500 hover:underline"
          >
            Iniciar una consulta →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Trámites activos */}
          {activos.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                En curso ({activos.length})
              </h2>
              <div className="space-y-3">
                {activos.map(tramite => (
                  <Link key={tramite.id} href={`/portal/tramites/${tramite.id}`}>
                    <Card className="hover:border-lime-500/30 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{tramite.tipo}</span>
                              <Badge className={`text-xs shrink-0 ${estadoTramiteColor(tramite.estado)}`}>
                                {estadoTramiteLabel(tramite.estado)}
                              </Badge>
                            </div>
                            {tramite.numero_referencia && (
                              <p className="text-xs text-muted-foreground mb-2">
                                Ref: {tramite.numero_referencia}
                              </p>
                            )}
                            {/* Barra de progreso */}
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-lime-500 rounded-full transition-all"
                                  style={{ width: `${PROGRESO[tramite.estado] ?? 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {PROGRESO[tramite.estado] ?? 0}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock size={10} />
                                {formatFecha(tramite.updated_at)}
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Trámites finalizados */}
          {finalizados.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Finalizados ({finalizados.length})
              </h2>
              <div className="space-y-2">
                {finalizados.map(tramite => (
                  <Link key={tramite.id} href={`/portal/tramites/${tramite.id}`}>
                    <Card className="opacity-60 hover:opacity-80 transition-opacity cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{tramite.tipo}</span>
                            {tramite.numero_referencia && (
                              <span className="text-xs text-muted-foreground ml-2">
                                · Ref: {tramite.numero_referencia}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${estadoTramiteColor(tramite.estado)}`}>
                              {estadoTramiteLabel(tramite.estado)}
                            </Badge>
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
