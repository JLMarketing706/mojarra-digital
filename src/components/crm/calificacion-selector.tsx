'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  estadoUifLabel, estadoUifColor, nivelRiesgoLabel, nivelRiesgoColor,
} from '@/lib/utils'

const ESTADOS_UIF = ['no', 'inusual', 'en_analisis', 'sospechosa', 'reportada']
const NIVELES = ['bajo', 'medio', 'alto']

interface Props {
  tramiteId?: string
  clienteId?: string
  estadoUifActual?: string | null
  nivelRiesgoActual?: string | null
  /** Si true, muestra select editable; si false, solo badges read-only */
  editable?: boolean
}

export function CalificacionSelector({
  tramiteId, clienteId, estadoUifActual, nivelRiesgoActual, editable = true,
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [estadoUif, setEstadoUif] = useState(estadoUifActual ?? 'no')
  const [nivelRiesgo, setNivelRiesgo] = useState(nivelRiesgoActual ?? '')

  async function actualizarUif(nuevo: string) {
    if (!tramiteId) return
    setGuardando(true)
    const { error } = await supabase
      .from('tramites')
      .update({ estado_uif: nuevo, updated_at: new Date().toISOString() })
      .eq('id', tramiteId)
    setGuardando(false)
    if (error) { toast.error('Error al actualizar el estado UIF.'); return }
    setEstadoUif(nuevo)
    toast.success(`Operación: ${estadoUifLabel(nuevo)}`)
    router.refresh()
  }

  async function actualizarRiesgo(nuevo: string) {
    if (!clienteId) return
    setGuardando(true)
    const { error } = await supabase
      .from('clientes')
      .update({ nivel_riesgo: nuevo })
      .eq('id', clienteId)
    setGuardando(false)
    if (error) { toast.error('Error al actualizar el nivel de riesgo.'); return }
    setNivelRiesgo(nuevo)
    toast.success(`Cliente: ${nivelRiesgoLabel(nuevo)}`)
    router.refresh()
  }

  if (!editable) {
    return (
      <div className="flex flex-wrap gap-2">
        {tramiteId && (
          <Badge className={`text-xs border ${estadoUifColor(estadoUif)}`}>
            {estadoUifLabel(estadoUif)}
          </Badge>
        )}
        {clienteId && (
          <Badge className={`text-xs border ${nivelRiesgoColor(nivelRiesgo)}`}>
            {nivelRiesgoLabel(nivelRiesgo)}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tramiteId && (
        <div>
          <p className="text-xs text-zinc-500 mb-1.5 uppercase tracking-wide">Estado de informe UIF</p>
          <Select value={estadoUif} onValueChange={actualizarUif} disabled={guardando}>
            <SelectTrigger className={`h-8 text-xs border ${estadoUifColor(estadoUif)} bg-transparent`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {ESTADOS_UIF.map(e => (
                <SelectItem key={e} value={e} className="text-zinc-200 focus:bg-zinc-800 text-xs">
                  {estadoUifLabel(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {clienteId && (
        <div>
          <p className="text-xs text-zinc-500 mb-1.5 uppercase tracking-wide">Calificación de riesgo del cliente</p>
          <Select value={nivelRiesgo || 'sin_calificar'} onValueChange={actualizarRiesgo} disabled={guardando}>
            <SelectTrigger className={`h-8 text-xs border ${nivelRiesgoColor(nivelRiesgo)} bg-transparent`}>
              <SelectValue placeholder="Sin calificar" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {NIVELES.map(n => (
                <SelectItem key={n} value={n} className="text-zinc-200 focus:bg-zinc-800 text-xs">
                  {nivelRiesgoLabel(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
