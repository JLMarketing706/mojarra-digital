'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useRealtimeNotificaciones(userId: string | null) {
  const [sinLeer, setSinLeer] = useState(0)
  const supabase = createClient()

  const cargarConteo = useCallback(async () => {
    if (!userId) return
    const { count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('destinatario_id', userId)
      .eq('leida', false)
    setSinLeer(count ?? 0)
  }, [userId, supabase])

  useEffect(() => {
    if (!userId) return

    cargarConteo()

    const channel = supabase
      .channel(`notificaciones:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `destinatario_id=eq.${userId}`,
        },
        (payload) => {
          const nueva = payload.new as { titulo: string; mensaje: string }
          setSinLeer(prev => prev + 1)
          toast(nueva.titulo, {
            description: nueva.mensaje,
            duration: 5000,
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, cargarConteo, supabase])

  return { sinLeer, recargar: cargarConteo }
}
