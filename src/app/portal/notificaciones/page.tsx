import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatFechaHora } from '@/lib/utils'
import { Bell, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notificaciones' }

export default async function NotificacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notificaciones } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('destinatario_id', user.id)
    .order('created_at', { ascending: false })

  // Marcar todas como leídas
  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('destinatario_id', user.id)
    .eq('leida', false)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Notificaciones</h1>
          <p className="text-muted-foreground text-sm">
            {notificaciones?.length ?? 0} notificaciones en total
          </p>
        </div>
      </div>

      {!notificaciones || notificaciones.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <Bell size={36} className="text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-1">Sin notificaciones</p>
          <p className="text-muted-foreground text-sm">
            Cuando haya novedades en tus trámites, las vas a ver acá.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notificaciones.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border transition-colors ${
                !n.leida
                  ? 'border-lime-500/30 bg-lime-500/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{n.titulo}</p>
                    {!n.leida && (
                      <Badge className="bg-lime-500/20 text-lime-500 border-0 text-xs px-1.5">
                        Nueva
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{n.mensaje}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {formatFechaHora(n.created_at)}
                  </p>
                </div>
                {n.leida && <Check size={14} className="text-muted-foreground shrink-0 mt-1" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
