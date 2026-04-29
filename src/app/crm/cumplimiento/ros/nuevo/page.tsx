'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, AlertTriangle, FileWarning } from 'lucide-react'
import Link from 'next/link'
import type { TipoROS } from '@/types'
import { LABEL_TIPO_ROS } from '@/types'

interface TramiteOption {
  id: string
  tipo: string
  numero_referencia: string | null
  monto: number | null
  cliente: { nombre: string; apellido: string } | null
}

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'
const selectTriggerCls = 'bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400'

function NuevoROSContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [tramiteId, setTramiteId] = useState(searchParams.get('tramite_id') ?? '')
  const [tipo, setTipo] = useState<TipoROS>('LA')
  const [motivos, setMotivos] = useState('')
  const [operacionConcretada, setOperacionConcretada] = useState(true)
  const [marcarSospechosa, setMarcarSospechosa] = useState(false)
  const [tramites, setTramites] = useState<TramiteOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tramites')
        .select('id, tipo, numero_referencia, monto, cliente:clientes(nombre, apellido)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (data) setTramites(data as unknown as TramiteOption[])
    }
    load()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tramiteId) { toast.error('Tenés que seleccionar el trámite involucrado.'); return }
    if (!motivos.trim()) { toast.error('Indicá los motivos de inusualidad.'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      tramite_id: tramiteId,
      tipo,
      estado: marcarSospechosa ? 'sospechosa' : 'inusual',
      motivos_inusualidad: motivos,
      operacion_concretada: operacionConcretada,
      detectado_por: user?.id ?? null,
    }

    const { data, error } = await supabase
      .from('ros_reportes')
      .insert(payload)
      .select()
      .single()

    setSaving(false)
    if (error || !data) {
      console.error(error)
      toast.error('No se pudo crear el reporte.')
      return
    }

    if (marcarSospechosa) {
      toast.warning('ROS creado como SOSPECHOSO — plazo de 24h para reportar a UIF.')
    } else {
      toast.success('Operación marcada como inusual. El OC debe analizarla.')
    }
    router.push(`/crm/cumplimiento/ros/${data.id}`)
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Cumplimiento
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <FileWarning size={20} className="text-red-400" />Reportar operación inusual
        </h1>
        <p className="text-zinc-500 text-sm">
          La marcación inicial es interna. Si después se concluye que es sospechosa,
          se activa el plazo de 24h para reportar a la UIF (Res. 56/2024).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Datos del reporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Trámite involucrado <span className="text-lime-400">*</span></Label>
              <Select value={tramiteId} onValueChange={setTramiteId}>
                <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Seleccioná el trámite" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-72">
                  {tramites.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-zinc-200 focus:bg-zinc-800">
                      {t.tipo}
                      {t.numero_referencia && ` · ${t.numero_referencia}`}
                      {t.cliente && ` · ${t.cliente.apellido}, ${t.cliente.nombre}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Tipo de ROS <span className="text-lime-400">*</span></Label>
              <Select value={tipo} onValueChange={v => setTipo(v as TipoROS)}>
                <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {(['LA', 'FT', 'FP'] as TipoROS[]).map(t => (
                    <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800">
                      {LABEL_TIPO_ROS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipo !== 'LA' && (
                <p className="text-xs text-yellow-400/80 mt-1">
                  ⚠ Para FT y FP el plazo es de 24h desde la operación, sin esperar análisis.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Motivos de inusualidad <span className="text-lime-400">*</span>
              </Label>
              <Textarea value={motivos} onChange={e => setMotivos(e.target.value)} rows={5}
                placeholder="Describí los hechos u operaciones que llamaron la atención..."
                className={inputCls + ' resize-none'} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={operacionConcretada}
                onCheckedChange={(v: boolean | 'indeterminate') => setOperacionConcretada(!!v)}
                className="border-zinc-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400" />
              <span className="text-zinc-200 text-sm">La operación fue concretada (si no, se marca como tentada)</span>
            </label>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={marcarSospechosa}
                onCheckedChange={(v: boolean | 'indeterminate') => setMarcarSospechosa(!!v)}
                className="mt-0.5 border-zinc-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />
              <div>
                <p className="text-zinc-200 text-sm font-medium">Marcar directamente como SOSPECHOSA</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Solo si tenés certeza. Se activa el plazo de 24h para enviar el reporte a la UIF.
                </p>
              </div>
            </label>

            {marcarSospechosa && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 text-sm font-medium">Plazo de 24 horas activo</p>
                  <p className="text-red-400/80 text-xs">Una vez creada la marca como sospechosa, debe enviarse el reporte a la UIF dentro de las 24 horas.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}
            className={`font-semibold gap-2 ${
              marcarSospechosa
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-lime-400 text-black hover:bg-lime-300'
            }`}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {marcarSospechosa ? 'Crear como sospechosa' : 'Marcar como inusual'}
          </Button>
          <Link href="/crm/cumplimiento">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="text-zinc-500">Cargando...</div>}>
      <NuevoROSContent />
    </Suspense>
  )
}
