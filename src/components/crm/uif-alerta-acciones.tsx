'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { ChevronDown, Loader2, CheckCircle2, Clock } from 'lucide-react'

type EstadoAlerta = 'pendiente' | 'reportado'

interface Props {
  alertaId: string
  estadoActual: string
}

const OPCIONES: { valor: EstadoAlerta; label: string; icon: React.ReactNode }[] = [
  { valor: 'pendiente', label: 'Marcar pendiente', icon: <Clock size={13} /> },
  { valor: 'reportado', label: 'Marcar reportado', icon: <CheckCircle2 size={13} /> },
]

export function UIFAlertaAcciones({ alertaId, estadoActual }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function cambiarEstado(nuevoEstado: EstadoAlerta) {
    if (nuevoEstado === estadoActual) return
    setLoading(true)
    const { error } = await supabase
      .from('alertas_uif')
      .update({ estado: nuevoEstado })
      .eq('id', alertaId)
    setLoading(false)
    if (!error) {
      toast.success(`Alerta marcada como ${nuevoEstado}.`)
      router.refresh()
    } else {
      toast.error('Error al actualizar la alerta.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5 shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          Acción
          <ChevronDown size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 w-44">
        {OPCIONES.filter(o => o.valor !== estadoActual).map(({ valor, label, icon }) => (
          <DropdownMenuItem
            key={valor}
            onClick={() => cambiarEstado(valor)}
            className="text-zinc-200 focus:bg-zinc-800 cursor-pointer gap-2"
          >
            {icon}
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
