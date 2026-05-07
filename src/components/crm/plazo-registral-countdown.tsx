'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, AlertTriangle, FileWarning, CheckCircle2, Circle } from 'lucide-react'
import {
  calcularPlazoRegistral, colorPlazo,
  REGISTRO_LABELS_CORTO, ETAPA_LABEL,
  type EstadoPlazos,
} from '@/lib/plazos-registrales'
import { formatFecha } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  registro: string | null | undefined
  estado: EstadoPlazos
  /** Si true, lo muestra dentro de una <Card>; sino solo el contenido */
  asCard?: boolean
}

export function PlazoRegistralCountdown({ registro, estado, asCard = true }: Props) {
  // Recalcular cada minuto por si la página queda abierta toda la noche
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const plazo = calcularPlazoRegistral(registro, estado)
  if (!plazo) {
    if (!asCard) return null
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <ClipboardList size={14} className="text-zinc-500" />
            Plazo registral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500">
            Cargá un registro y la fecha de presentación para ver el plazo.
          </p>
        </CardContent>
      </Card>
    )
  }

  const color = colorPlazo(plazo.diasRestantes)
  const vencido = plazo.diasRestantes < 0

  const contenido = (
    <div className="space-y-3">
      {/* Header con números grandes */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-mono font-bold ${color}`}>
              {vencido ? Math.abs(plazo.diasRestantes) : plazo.diasRestantes}
            </span>
            <span className="text-sm text-zinc-400">
              {Math.abs(plazo.diasRestantes) === 1 ? 'día' : 'días'}
              {vencido && ' vencido'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {vencido
              ? 'Plazo agotado'
              : `Vence el ${formatFecha(plazo.fechaVencimiento)}`}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Badge className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700">
            {REGISTRO_LABELS_CORTO[plazo.registro]}
          </Badge>
          <Badge className="text-xs bg-lime-400/10 text-lime-400 border border-lime-400/30">
            {ETAPA_LABEL[plazo.etapaActual]}
          </Badge>
        </div>
      </div>

      {/* Timeline de etapas */}
      <div className="space-y-1 pt-2 border-t border-zinc-800">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Línea de tiempo</p>
        {plazo.timeline.map((e, i) => {
          const esActual = e.etapa === plazo.etapaActual
          const completada = !esActual && plazo.timeline.findIndex(x => x.etapa === plazo.etapaActual) > i
          return (
            <div
              key={e.etapa}
              className={cn(
                'flex items-center gap-2 py-1 text-xs',
                !e.activa && !esActual && 'opacity-50',
              )}
            >
              {e.activa ? (
                <CheckCircle2 size={11} className={cn(
                  'shrink-0',
                  esActual ? 'text-lime-400' : completada ? 'text-zinc-500' : 'text-lime-400'
                )} />
              ) : (
                <Circle size={11} className="text-zinc-600 shrink-0" />
              )}
              <span className={cn(
                'flex-1 truncate',
                esActual ? 'text-zinc-100 font-medium' : e.activa ? 'text-zinc-300' : 'text-zinc-500'
              )}>
                {ETAPA_LABEL[e.etapa]} <span className="text-zinc-600">·</span> {e.diasEtapa}d
              </span>
              <span className={cn(
                'font-mono shrink-0',
                esActual ? 'text-zinc-100' : 'text-zinc-500'
              )}>
                {formatFecha(e.fechaVencimiento)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Avisos */}
      {plazo.generaExpediente && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2 flex items-start gap-2">
          <FileWarning size={13} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300 leading-snug">
            La 2da prórroga genera <strong>Nº de expediente</strong> en el registro.
          </p>
        </div>
      )}

      {vencido ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 flex items-start gap-2">
          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 leading-snug">
            El plazo venció hace {Math.abs(plazo.diasRestantes)} días.
            {plazo.etapaActual !== 'tercera_prorroga' && ' Considerá activar la próxima prórroga.'}
          </p>
        </div>
      ) : plazo.diasRestantes <= 15 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 flex items-start gap-2">
          <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-snug">
            Quedan menos de 15 días. Considerá activar la próxima prórroga.
          </p>
        </div>
      ) : null}
    </div>
  )

  if (!asCard) return contenido

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
          <ClipboardList size={14} className="text-lime-400" />
          Plazo registral
        </CardTitle>
      </CardHeader>
      <CardContent>{contenido}</CardContent>
    </Card>
  )
}
