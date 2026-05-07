'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, AlertTriangle, CheckCircle2, FileWarning } from 'lucide-react'
import {
  calcularPlazoRegistral, colorPlazo,
  REGISTRO_LABELS_CORTO, ETAPA_LABEL,
  type FechasPlazo,
} from '@/lib/plazos-registrales'
import { formatFecha } from '@/lib/utils'

interface Props {
  registro: string | null | undefined
  fechas: FechasPlazo
  /** Si true, lo muestra dentro de una <Card>; sino solo el contenido */
  asCard?: boolean
}

export function PlazoRegistralCountdown({ registro, fechas, asCard = true }: Props) {
  // Recalcular cada vez que cambia el día (por si se queda abierta la pantalla
  // toda la noche). Trigger via state que se setea al montar.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000) // 1 min
    return () => clearInterval(id)
  }, [])

  const plazo = calcularPlazoRegistral(registro, fechas)
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
            {ETAPA_LABEL[plazo.etapaActual]} · {plazo.diasPlazo}d
          </Badge>
        </div>
      </div>

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
            El plazo venció hace {Math.abs(plazo.diasRestantes)} días. Verificá si
            corresponde solicitar una nueva prórroga.
          </p>
        </div>
      ) : plazo.diasRestantes <= 15 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 flex items-start gap-2">
          <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-snug">
            Quedan menos de 15 días. Considerá solicitar prórroga si no vas a llegar.
          </p>
        </div>
      ) : (
        <div className="text-xs text-zinc-500 flex items-start gap-1.5">
          <CheckCircle2 size={11} className="text-zinc-500 shrink-0 mt-0.5" />
          Plazo en curso desde {formatFecha(plazo.fechaInicio)}
        </div>
      )}
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
