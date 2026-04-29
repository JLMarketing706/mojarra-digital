'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2, ArrowLeft, GraduationCap, Plus, Calendar, Clock, X,
} from 'lucide-react'
import Link from 'next/link'
import { formatFecha } from '@/lib/utils'

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'

interface Cap {
  id: string
  fecha: string
  titulo: string
  contenido: string | null
  instructor: string | null
  duracion_horas: number | null
  modalidad: 'presencial' | 'virtual' | 'mixta' | null
}

export default function CapacitacionPage() {
  const supabase = createClient()
  const [caps, setCaps] = useState<Cap[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    fecha: '',
    titulo: '',
    contenido: '',
    instructor: '',
    duracion_horas: '',
    modalidad: 'presencial',
  })

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('capacitaciones')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(50)
    if (data) setCaps(data as Cap[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  function set<K extends keyof typeof form>(k: K, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fecha || !form.titulo) { toast.error('Fecha y título son obligatorios'); return }
    setSaving(true)
    const { error } = await supabase.from('capacitaciones').insert({
      fecha: form.fecha,
      titulo: form.titulo,
      contenido: form.contenido || null,
      instructor: form.instructor || null,
      duracion_horas: form.duracion_horas ? Number(form.duracion_horas) : null,
      modalidad: form.modalidad,
      norma_origen: 'Res. UIF 242/2023',
    })
    setSaving(false)
    if (error) { toast.error('No se pudo guardar.'); return }
    toast.success('Capacitación registrada.')
    setForm({ fecha: '', titulo: '', contenido: '', instructor: '', duracion_horas: '', modalidad: 'presencial' })
    setShowForm(false)
    cargar()
  }

  const ahora = new Date()
  const proximas = caps.filter(c => new Date(c.fecha) >= ahora)
  const pasadas = caps.filter(c => new Date(c.fecha) < ahora)

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Cumplimiento
          </Button>
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
              <GraduationCap size={20} className="text-lime-400" />Capacitación PLA/FT
            </h1>
            <p className="text-zinc-500 text-sm">
              La Res. 242/2023 obliga a capacitar al personal al menos una vez al año.
            </p>
          </div>
          <Button onClick={() => setShowForm(s => !s)}
            className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancelar' : 'Nueva capacitación'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Registrar capacitación</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Fecha *</Label>
                  <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Modalidad</Label>
                  <Select value={form.modalidad} onValueChange={v => set('modalidad', v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="presencial" className="text-zinc-200 focus:bg-zinc-800">Presencial</SelectItem>
                      <SelectItem value="virtual" className="text-zinc-200 focus:bg-zinc-800">Virtual</SelectItem>
                      <SelectItem value="mixta" className="text-zinc-200 focus:bg-zinc-800">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Título *</Label>
                <Input value={form.titulo} onChange={e => set('titulo', e.target.value)}
                  placeholder="Ej: Capacitación anual UIF 2025" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Instructor</Label>
                  <Input value={form.instructor} onChange={e => set('instructor', e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Duración (horas)</Label>
                  <Input type="number" step="0.5" value={form.duracion_horas}
                    onChange={e => set('duracion_horas', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Contenido</Label>
                <Textarea value={form.contenido} onChange={e => set('contenido', e.target.value)} rows={3}
                  placeholder="Temas tratados..." className={inputCls + ' resize-none'} />
              </div>
              <Button type="submit" disabled={saving}
                className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Guardar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-zinc-500" /></div>
      ) : caps.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-xl">
          <GraduationCap size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Sin capacitaciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {proximas.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
                Próximas ({proximas.length})
              </h2>
              <div className="space-y-2">
                {proximas.map(c => <CapCard key={c.id} cap={c} />)}
              </div>
            </div>
          )}

          {pasadas.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
                Realizadas ({pasadas.length})
              </h2>
              <div className="space-y-2">
                {pasadas.map(c => <CapCard key={c.id} cap={c} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CapCard({ cap }: { cap: Cap }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-zinc-200 text-sm font-medium">{cap.titulo}</p>
            {cap.modalidad && (
              <Badge className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs capitalize">
                {cap.modalidad}
              </Badge>
            )}
          </div>
          {cap.contenido && (
            <p className="text-zinc-400 text-xs line-clamp-2 mb-1">{cap.contenido}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
            <span className="flex items-center gap-1"><Calendar size={11} />{formatFecha(cap.fecha)}</span>
            {cap.duracion_horas && (
              <span className="flex items-center gap-1"><Clock size={11} />{cap.duracion_horas}h</span>
            )}
            {cap.instructor && <span>· {cap.instructor}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
