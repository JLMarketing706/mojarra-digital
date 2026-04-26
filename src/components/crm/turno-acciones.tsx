'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { ChevronDown, Loader2, CheckCircle2, XCircle, Clock, Check } from 'lucide-react'

type EstadoTurno = 'pendiente' | 'confirmado' | 'cancelado' | 'realizado'

interface Props {
  turnoId: string
  estadoActual: string
  clienteUserId: string | null
}

export function TurnoAcciones({ turnoId, estadoActual, clienteUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function cambiarEstado(nuevoEstado: EstadoTurno) {
    if (nuevoEstado === estadoActual) return
    setLoading(true)

    const { error } = await supabase
      .from('turnos')
      .update({ estado: nuevoEstado })
      .eq('id', turnoId)

    if (!error && clienteUserId && nuevoEstado === 'confirmado') {
      await supabase.from('notificaciones').insert({
        destinatario_id: clienteUserId,
        titulo: 'Turno confirmado',
        mensaje: 'Tu turno fue confirmado por la escribanía. ¡Te esperamos!',
      })
    }

    setLoading(false)
    if (!error) {
      toast.success(`Turno marcado como ${nuevoEstado}.`)
      router.refresh()
    } else {
      toast.error('Error al actualizar el turno.')
    }
  }

  const opciones: { valor: EstadoTurno; label: string; icon: React.ReactNode }[] = (
    [
      { valor: 'confirmado' as EstadoTurno, label: 'Confirmar', icon: <CheckCircle2 size={13} /> },
      { valor: 'realizado' as EstadoTurno, label: 'Marcar realizado', icon: <Check size={13} /> },
      { valor: 'cancelado' as EstadoTurno, label: 'Cancelar turno', icon: <XCircle size={13} /> },
      { valor: 'pendiente' as EstadoTurno, label: 'Volver a pendiente', icon: <Clock size={13} /> },
    ] as { valor: EstadoTurno; label: string; icon: React.ReactNode }[]
  ).filter(o => o.valor !== estadoActual)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading}
          className="text-zinc-400 hover:text-white h-7 gap-1 px-2">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 w-44">
        {opciones.map(({ valor, label, icon }) => (
          <DropdownMenuItem key={valor} onClick={() => cambiarEstado(valor)}
            className="text-zinc-200 focus:bg-zinc-800 cursor-pointer gap-2 text-xs">
            {icon}{label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
