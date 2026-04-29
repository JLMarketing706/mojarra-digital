'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Search, AlertTriangle, FileCheck2, X } from 'lucide-react'
import type { EstadoROS } from '@/types'

interface Props {
  rosId: string
  estadoActual: EstadoROS
}

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'

export function RosAcciones({ rosId, estadoActual }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  // Inputs
  const [analisis, setAnalisis] = useState('')
  const [hechos, setHechos] = useState('')
  const [constancia, setConstancia] = useState('')

  async function transicionar(nuevoEstado: EstadoROS, extras: Record<string, unknown> = {}) {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const updates: Record<string, unknown> = { estado: nuevoEstado, ...extras }
    if (nuevoEstado === 'reportada' && user) updates.reportado_por = user.id
    const { error } = await supabase.from('ros_reportes').update(updates).eq('id', rosId)
    setLoading(false)
    if (error) {
      toast.error('No se pudo actualizar el ROS.')
      return
    }
    toast.success('Estado actualizado.')
    router.refresh()
  }

  if (estadoActual === 'reportada' || estadoActual === 'descartada') {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Empezar análisis */}
      {estadoActual === 'inusual' && (
        <Button onClick={() => transicionar('en_analisis')} disabled={loading}
          className="bg-orange-500 text-white hover:bg-orange-400 font-medium gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Iniciar análisis
        </Button>
      )}

      {/* Marcar como sospechosa */}
      {(estadoActual === 'inusual' || estadoActual === 'en_analisis') && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-red-500 text-white hover:bg-red-400 font-medium gap-2">
              <AlertTriangle size={14} />Marcar sospechosa
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirmar como SOSPECHOSA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                Una vez marcada como sospechosa se activa el plazo de <strong>24 horas</strong> para reportar a la UIF (Res. 56/2024).
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Análisis del Oficial de Cumplimiento</Label>
                <Textarea value={analisis} onChange={e => setAnalisis(e.target.value)} rows={3}
                  placeholder="Análisis técnico que justifica la sospecha..." className={inputCls + ' resize-none'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Hechos sospechosos concretos</Label>
                <Textarea value={hechos} onChange={e => setHechos(e.target.value)} rows={3}
                  placeholder="Hechos u operaciones específicas..." className={inputCls + ' resize-none'} />
              </div>
              <Button onClick={() => transicionar('sospechosa', {
                analisis_oc: analisis || null,
                hechos_sospechosos: hechos || null,
              })} disabled={loading} className="bg-red-500 text-white hover:bg-red-400 font-semibold w-full gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirmar y activar plazo de 24h
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Marcar reportada */}
      {estadoActual === 'sospechosa' && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 text-white hover:bg-blue-400 font-medium gap-2">
              <FileCheck2 size={14} />Marcar reportado a UIF
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar constancia UIF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Número de constancia UIF</Label>
                <Input value={constancia} onChange={e => setConstancia(e.target.value)}
                  placeholder="Ej: 123456789" className={inputCls} />
              </div>
              <Button onClick={() => transicionar('reportada', {
                numero_constancia: constancia || null,
              })} disabled={loading} className="bg-blue-500 text-white hover:bg-blue-400 font-semibold w-full gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirmar reporte
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Descartar */}
      <Button variant="outline" onClick={() => transicionar('descartada')} disabled={loading}
        className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30 gap-2">
        <X size={14} />Descartar
      </Button>
    </div>
  )
}
