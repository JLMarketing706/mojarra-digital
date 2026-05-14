'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { estadoTramiteLabel, formatFecha } from '@/lib/utils'
import {
  calcularPlazoRegistral, REGISTRO_LABELS_CORTO, ETAPA_LABEL,
} from '@/lib/plazos-registrales'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, X, AlertTriangle, Calendar } from 'lucide-react'
import { EntregaDialog } from '@/components/crm/entrega-dialog'

const ESTADOS = ['iniciado', 'en_proceso', 'en_registro', 'observado', 'listo', 'entregado']

const colorMap: Record<string, string> = {
  borrador: 'text-zinc-400',
  iniciado: 'text-zinc-400',
  en_proceso: 'text-blue-300',
  en_registro: 'text-yellow-300',
  observado: 'text-orange-300',
  listo: 'text-lime-300',
  entregado: 'text-zinc-500',
}

interface Props {
  tramiteId: string
  estadoActual: string
}

interface PlazoTramite {
  registro_propiedad: 'pba' | 'caba' | null
  fecha_presentacion: string | null
  primera_prorroga_activa: boolean
  segunda_prorroga_activa: boolean
  tercera_prorroga_activa: boolean
}

export function EstadoTramiteSelector({ tramiteId, estadoActual }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [showObsDialog, setShowObsDialog] = useState(false)
  const [showEntregaDialog, setShowEntregaDialog] = useState(false)
  const [fechaLimite, setFechaLimite] = useState('')
  const [obsTexto, setObsTexto] = useState('')
  const [plazoData, setPlazoData] = useState<PlazoTramite | null>(null)
  const [cargandoPlazo, setCargandoPlazo] = useState(false)

  // Normalizar legacy 'borrador' → 'iniciado'
  const estadoNorm = estadoActual === 'borrador' ? 'iniciado' : estadoActual

  // Cuando se abre el dialog de observado, fetcheo el plazo registral del trámite
  useEffect(() => {
    if (!showObsDialog) return
    setCargandoPlazo(true)
    setPlazoData(null)
    supabase
      .from('tramites')
      .select('registro_propiedad, fecha_presentacion, primera_prorroga_activa, segunda_prorroga_activa, tercera_prorroga_activa')
      .eq('id', tramiteId)
      .single()
      .then(({ data }) => {
        if (data) setPlazoData(data as unknown as PlazoTramite)
        setCargandoPlazo(false)
      })
  }, [showObsDialog, tramiteId, supabase])

  // Calcular plazo si hay datos suficientes
  const plazo = plazoData
    ? calcularPlazoRegistral(plazoData.registro_propiedad, {
        fecha_presentacion: plazoData.fecha_presentacion,
        primera_prorroga_activa: plazoData.primera_prorroga_activa,
        segunda_prorroga_activa: plazoData.segunda_prorroga_activa,
        tercera_prorroga_activa: plazoData.tercera_prorroga_activa,
      })
    : null

  async function aplicarEstado(
    nuevoEstado: string,
    extra: { fecha_limite_observacion?: string; observacion_registro?: string } = {},
  ) {
    setGuardando(true)
    const { error } = await supabase
      .from('tramites')
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString(), ...extra })
      .eq('id', tramiteId)
    setGuardando(false)
    if (error) { toast.error('Error al actualizar el estado.'); return false }
    toast.success(`Estado: ${estadoTramiteLabel(nuevoEstado)}`)
    router.refresh()
    return true
  }

  async function handleChange(nuevoEstado: string) {
    if (nuevoEstado === estadoNorm) return
    if (nuevoEstado === 'observado') {
      setFechaLimite('')
      setObsTexto('')
      setShowObsDialog(true)
      return
    }
    if (nuevoEstado === 'entregado') {
      // Abrir dialog de entrega — el componente se encarga de actualizar
      // el estado a 'entregado' al confirmar.
      setShowEntregaDialog(true)
      return
    }
    await aplicarEstado(nuevoEstado)
  }

  async function confirmarObservado() {
    // Si hay plazo calculado, lo usamos como fecha límite. Si no, exigimos
    // que el usuario haya cargado una fecha manual en el fallback.
    const fechaParaGuardar = plazo?.fechaVencimiento ?? fechaLimite
    if (!fechaParaGuardar) {
      toast.error('Cargá la fecha límite o configurá el plazo registral en la escritura.')
      return
    }
    const ok = await aplicarEstado('observado', {
      fecha_limite_observacion: fechaParaGuardar,
      observacion_registro: obsTexto || undefined,
    })
    if (ok) setShowObsDialog(false)
  }

  return (
    <>
      <Select value={estadoNorm} onValueChange={handleChange} disabled={guardando}>
        <SelectTrigger className={`h-7 text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0 w-auto gap-1 ${colorMap[estadoNorm] ?? 'text-zinc-400'}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          {ESTADOS.map(e => (
            <SelectItem key={e} value={e} className="text-zinc-200 focus:bg-zinc-800 text-xs">
              {estadoTramiteLabel(e)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Diálogo de entrega — al confirmarse, marca como 'entregado' */}
      <EntregaDialog
        tramiteId={tramiteId}
        open={showEntregaDialog}
        onOpenChange={setShowEntregaDialog}
      />

      {/* Diálogo: observación + fecha límite (autoderivada del plazo registral) */}
      {showObsDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-full max-w-md rounded-xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-orange-300">Marcar como observado</h3>
              <Button
                variant="ghost" size="sm"
                onClick={() => setShowObsDialog(false)}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </Button>
            </div>

            {/* Fecha límite — autocalculada o pedida */}
            {cargandoPlazo ? (
              <div className="flex items-center gap-2 text-zinc-500 text-xs py-4">
                <Loader2 size={13} className="animate-spin" />
                Cargando plazo registral…
              </div>
            ) : plazo ? (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 mb-4">
                <p className="text-[10px] uppercase tracking-wider text-orange-300/80 mb-1">
                  Fecha límite (calculada)
                </p>
                <p className="text-3xl font-semibold text-orange-300 mb-1">
                  {formatFecha(plazo.fechaVencimiento)}
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                  <Calendar size={11} />
                  <span>
                    {plazo.diasRestantes >= 0
                      ? `Quedan ${plazo.diasRestantes} ${plazo.diasRestantes === 1 ? 'día' : 'días'}`
                      : `Vencido hace ${Math.abs(plazo.diasRestantes)} días`}
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>{REGISTRO_LABELS_CORTO[plazo.registro]}</span>
                  <span className="text-zinc-600">·</span>
                  <span>{ETAPA_LABEL[plazo.etapaActual]}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 mb-4 flex items-start gap-2">
                <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-200 space-y-2 flex-1">
                  <p>
                    No hay plazo registral cargado en esta escritura. Cargá la
                    fecha límite manualmente:
                  </p>
                  <Input
                    type="date"
                    value={fechaLimite}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setFechaLimite(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-zinc-500">
                    Tip: si cargás registro y fecha de presentación en la
                    ficha de la escritura, este valor se calcula solo.
                  </p>
                </div>
              </div>
            )}

            {/* Observación recibida del registro (opcional) */}
            <div>
              <Label className="text-zinc-300 text-xs">
                Observación recibida (opcional)
              </Label>
              <Textarea
                value={obsTexto}
                onChange={e => setObsTexto(e.target.value)}
                rows={3}
                placeholder="Ej: falta firma del cónyuge en folio 3, reverso..."
                className="bg-zinc-800 border-zinc-700 text-white mt-1 resize-none"
              />
            </div>

            <div className="flex gap-2 mt-5 justify-end">
              <Button
                variant="outline" size="sm"
                onClick={() => setShowObsDialog(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={confirmarObservado}
                disabled={guardando || cargandoPlazo || (!plazo && !fechaLimite)}
                className="bg-orange-500 text-white hover:bg-orange-400 gap-1.5"
              >
                {guardando && <Loader2 size={13} className="animate-spin" />}
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
