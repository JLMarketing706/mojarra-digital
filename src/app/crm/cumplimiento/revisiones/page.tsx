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
  Loader2, ArrowLeft, ClipboardCheck, Plus, X, User, Calendar, FileSearch,
} from 'lucide-react'
import Link from 'next/link'
import { formatFecha } from '@/lib/utils'
import type { RevisionExterna, EstadoRevision } from '@/types'

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'

const ESTADO_COLORS: Record<EstadoRevision, string> = {
  pendiente: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  en_proceso: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  completada: 'bg-green-500/15 text-green-300 border-green-500/30',
  archivada: 'bg-zinc-700 text-zinc-400 border-zinc-700',
}

const ESTADO_LABEL: Record<EstadoRevision, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En curso',
  completada: 'Completada',
  archivada: 'Archivada',
}

export default function RevisionesPage() {
  const supabase = createClient()
  const [revs, setRevs] = useState<RevisionExterna[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    revisor_nombre: '',
    revisor_matricula: '',
    revisor_email: '',
    alcance: '',
    hallazgos: '',
    plan_accion: '',
    estado: 'pendiente' as EstadoRevision,
  })

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('revisiones_externas')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(50)
    if (data) setRevs(data as RevisionExterna[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fecha || !form.revisor_nombre) { toast.error('Fecha y revisor son obligatorios'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('revisiones_externas').insert({
      ...form,
      created_by: user?.id ?? null,
    })
    setSaving(false)
    if (error) { toast.error('No se pudo guardar.'); return }
    toast.success('Revisión registrada.')
    setForm({
      fecha: new Date().toISOString().split('T')[0], revisor_nombre: '', revisor_matricula: '',
      revisor_email: '', alcance: '', hallazgos: '', plan_accion: '', estado: 'pendiente',
    })
    setShowForm(false)
    cargar()
  }

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
              <ClipboardCheck size={20} className="text-lime-400" />Revisiones externas
            </h1>
            <p className="text-zinc-500 text-sm">
              Auditorías independientes sobre el sistema de prevención. Res. UIF 242/2023.
            </p>
          </div>
          <Button onClick={() => setShowForm(s => !s)}
            className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancelar' : 'Nueva revisión'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Registrar revisión externa</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Fecha *</Label>
                  <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Estado</Label>
                  <Select value={form.estado} onValueChange={v => set('estado', v as EstadoRevision)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {(Object.keys(ESTADO_LABEL) as EstadoRevision[]).map(e =>
                        <SelectItem key={e} value={e} className="text-zinc-200 focus:bg-zinc-800">{ESTADO_LABEL[e]}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Revisor *</Label>
                  <Input value={form.revisor_nombre} onChange={e => set('revisor_nombre', e.target.value)} placeholder="Nombre completo" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Matrícula</Label>
                  <Input value={form.revisor_matricula} onChange={e => set('revisor_matricula', e.target.value)} placeholder="Mat. CPCECABA Tomo X Folio Y" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Email</Label>
                  <Input type="email" value={form.revisor_email} onChange={e => set('revisor_email', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Alcance</Label>
                <Textarea value={form.alcance} onChange={e => set('alcance', e.target.value)} rows={2}
                  placeholder="Qué se revisó (legajos, RSM, ROS, manual, etc.)" className={inputCls + ' resize-none'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Hallazgos</Label>
                <Textarea value={form.hallazgos} onChange={e => set('hallazgos', e.target.value)} rows={3}
                  placeholder="Conclusiones del revisor..." className={inputCls + ' resize-none'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Plan de acción</Label>
                <Textarea value={form.plan_accion} onChange={e => set('plan_accion', e.target.value)} rows={3}
                  placeholder="Acciones a implementar a partir de la revisión..." className={inputCls + ' resize-none'} />
              </div>
              <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Guardar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-zinc-500" /></div>
      ) : revs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-xl">
          <FileSearch size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Sin revisiones registradas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {revs.map(r => (
            <Card key={r.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs border ${ESTADO_COLORS[r.estado]}`}>
                      {ESTADO_LABEL[r.estado]}
                    </Badge>
                    <span className="text-zinc-500 text-xs flex items-center gap-1">
                      <Calendar size={11} />{formatFecha(r.fecha)}
                    </span>
                  </div>
                </div>
                <p className="text-zinc-200 text-sm font-medium flex items-center gap-2 mb-1">
                  <User size={13} className="text-zinc-500" />
                  {r.revisor_nombre}
                  {r.revisor_matricula && <span className="text-zinc-500 text-xs font-mono">· {r.revisor_matricula}</span>}
                </p>
                {r.alcance && (
                  <p className="text-zinc-400 text-xs mt-2"><strong className="text-zinc-300">Alcance:</strong> {r.alcance}</p>
                )}
                {r.hallazgos && (
                  <p className="text-zinc-400 text-xs mt-1"><strong className="text-zinc-300">Hallazgos:</strong> {r.hallazgos}</p>
                )}
                {r.plan_accion && (
                  <p className="text-zinc-400 text-xs mt-1"><strong className="text-zinc-300">Plan:</strong> {r.plan_accion}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
