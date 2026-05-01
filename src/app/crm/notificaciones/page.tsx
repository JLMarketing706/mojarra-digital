import { createClient } from '@/lib/supabase/server'
import { Bell, CheckCheck } from 'lucide-react'
import { formatFechaHora } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notificaciones' }

export default async function NotificacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notificaciones } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('destinatario_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const sinLeer = notificaciones?.filter(n => !n.leida).length ?? 0

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
            <Bell size={20} className="text-lime-400" />
            Notificaciones
          </h1>
          {sinLeer > 0 && (
            <p className="text-zinc-400 text-sm">{sinLeer} sin leer</p>
          )}
        </div>
      </div>

      {!notificaciones || notificaciones.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <CheckCheck size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No tenés notificaciones.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notificaciones.map(n => (
            <Card
              key={n.id}
              className={`border transition-colors ${n.leida ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-900 border-lime-400/20'}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.leida ? 'bg-zinc-700' : 'bg-lime-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-zinc-200 text-sm font-medium">{n.titulo}</p>
                    {!n.leida && (
                      <Badge className="bg-lime-400/10 text-lime-400 border border-lime-400/30 text-xs shrink-0">
                        Nueva
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm">{n.mensaje}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-zinc-600 text-xs">{formatFechaHora(n.created_at)}</span>
                    {n.tramite_id && (
                      <Link
                        href={`/crm/tramites/${n.tramite_id}`}
                        className="text-xs text-lime-400 hover:underline"
                      >
                        Ver operación →
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
