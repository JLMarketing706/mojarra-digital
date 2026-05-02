'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Upload, FileText } from 'lucide-react'
import { estadoTramiteLabel } from '@/lib/utils'
import type { Profile } from '@/types'

const ESTADOS = ['iniciado', 'en_proceso', 'en_registro', 'observado', 'listo', 'entregado']

interface Props {
  tramiteId: string
  estadoActual: string
  profiles: Pick<Profile, 'id' | 'nombre' | 'apellido'>[]
}

export function TramiteAcciones({ tramiteId, estadoActual, profiles }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nuevoEstado, setNuevoEstado] = useState(estadoActual)
  const [hito, setHito] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [visibleCliente, setVisibleCliente] = useState(false)
  const [fechaLimiteObs, setFechaLimiteObs] = useState('')
  const [obsTexto, setObsTexto] = useState('')

  async function actualizarEstado() {
    if (nuevoEstado === estadoActual) return
    if (nuevoEstado === 'observado' && !fechaLimiteObs) {
      toast.error('Cargá la fecha límite del registro antes de confirmar.')
      return
    }
    setGuardandoEstado(true)

    const updates: Record<string, unknown> = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    }
    if (nuevoEstado === 'observado') {
      updates.fecha_limite_observacion = fechaLimiteObs
      if (obsTexto) updates.observacion_registro = obsTexto
    }

    const { error } = await supabase
      .from('tramites')
      .update(updates)
      .eq('id', tramiteId)

    if (!error) {
      await supabase.from('tramite_hitos').insert({
        tramite_id: tramiteId,
        descripcion: `Estado actualizado: ${estadoTramiteLabel(nuevoEstado)}`,
      })

      // Notificar al cliente si la operación tiene un cliente con portal
      const { data: tramite } = await supabase
        .from('tramites')
        .select('cliente:clientes(user_id)')
        .eq('id', tramiteId)
        .single()

      const userId = (tramite?.cliente as { user_id?: string } | null)?.user_id
      if (userId) {
        await supabase.from('notificaciones').insert({
          destinatario_id: userId,
          tramite_id: tramiteId,
          titulo: 'Actualización de tu operación',
          mensaje: `Tu operación cambió de estado: ${estadoTramiteLabel(nuevoEstado)}`,
        })
      }

      toast.success('Estado actualizado.')
      router.refresh()
    } else {
      toast.error('Error al actualizar el estado.')
    }
    setGuardandoEstado(false)
  }

  async function agregarHito() {
    if (!hito.trim()) return
    const { error } = await supabase.from('tramite_hitos').insert({
      tramite_id: tramiteId,
      descripcion: hito.trim(),
    })
    if (!error) {
      setHito('')
      toast.success('Hito agregado.')
      router.refresh()
    } else {
      toast.error('Error al agregar el hito.')
    }
  }

  async function subirDocumento(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)

    const path = `tramites/${tramiteId}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documentos-privados')
      .upload(path, file)

    if (uploadError) {
      toast.error('Error al subir el archivo.')
      setSubiendo(false)
      return
    }

    // No persistimos URL: el endpoint /api/documentos/[id] genera signed URL on-demand
    const { error } = await supabase.from('documentos').insert({
      tramite_id: tramiteId,
      nombre: file.name,
      tipo: file.name.split('.').pop() ?? 'archivo',
      url: '',
      storage_path: uploadData.path,
      mime_type: file.type,
      tamano_bytes: file.size,
      visible_cliente: visibleCliente,
    })

    setSubiendo(false)
    if (!error) {
      toast.success('Documento subido.')
      router.refresh()
    } else {
      toast.error('Error al registrar el documento.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Cambiar estado */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Cambiar estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {ESTADOS.map(e => (
                <SelectItem key={e} value={e} className="text-zinc-200 focus:bg-zinc-800">
                  {estadoTramiteLabel(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Si pasa a "Observado" → fecha límite + observación obligatoria */}
          {nuevoEstado === 'observado' && nuevoEstado !== estadoActual && (
            <div className="space-y-2 p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
              <div>
                <Label className="text-xs text-orange-300">Fecha límite del registro <span className="text-orange-400">*</span></Label>
                <Input
                  type="date"
                  value={fechaLimiteObs}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setFechaLimiteObs(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white text-sm h-8 mt-1"
                />
                <p className="text-xs text-zinc-500 mt-1">Aviso 15 días antes del vencimiento.</p>
              </div>
              <div>
                <Label className="text-xs text-orange-300">Observación recibida (opcional)</Label>
                <Textarea
                  value={obsTexto}
                  onChange={e => setObsTexto(e.target.value)}
                  rows={2}
                  placeholder="Falta firma del cónyuge..."
                  className="bg-zinc-800 border-zinc-700 text-white text-sm resize-none mt-1"
                />
              </div>
            </div>
          )}

          <Button
            onClick={actualizarEstado}
            disabled={nuevoEstado === estadoActual || guardandoEstado}
            className="w-full bg-lime-400 text-black hover:bg-lime-300 font-medium"
            size="sm"
          >
            {guardandoEstado && <Loader2 size={13} className="animate-spin mr-1" />}
            Actualizar estado
          </Button>
        </CardContent>
      </Card>

      {/* Agregar hito */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Agregar hito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={hito}
            onChange={e => setHito(e.target.value)}
            placeholder="Descripción del hito visible para el cliente..."
            rows={2}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none text-sm"
          />
          <Button
            onClick={agregarHito}
            disabled={!hito.trim()}
            size="sm"
            variant="outline"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Agregar hito
          </Button>
        </CardContent>
      </Card>

      {/* Subir documento */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Subir documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={visibleCliente}
              onCheckedChange={(v: boolean | 'indeterminate') => setVisibleCliente(!!v)}
              className="border-zinc-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
            />
            <span className="text-zinc-300 text-sm">Visible para el cliente</span>
          </label>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendo}
            size="sm"
            variant="outline"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
          >
            {subiendo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {subiendo ? 'Subiendo...' : 'Seleccionar archivo'}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={subirDocumento} />
        </CardContent>
      </Card>
    </div>
  )
}
