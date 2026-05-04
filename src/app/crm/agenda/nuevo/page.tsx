'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClienteCombobox } from '@/components/crm/cliente-combobox'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Profile } from '@/types'

const TIPOS_TURNO = ['Firma de escritura', 'Consulta', 'Entrega de documentos', 'Poder', 'Certificación', 'Otro']

export default function NuevoTurnoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [responsables, setResponsables] = useState<Profile[]>([])
  const [form, setForm] = useState({
    cliente_id: '', responsable_id: '', fecha: '', hora: '',
    tipo: '', notas: '', estado: 'confirmado',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('id, nombre, apellido, dni').order('apellido'),
      supabase.from('profiles').select('id, nombre, apellido, rol').in('rol', ['secretaria', 'protocolista', 'escribano']).order('apellido'),
    ]).then(([{ data: cls }, { data: resps }]) => {
      if (cls) setClientes(cls as Cliente[])
      if (resps) setResponsables(resps as Profile[])
    })
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fecha || !form.hora) { toast.error('Fecha y hora son obligatorias.'); return }
    setSaving(true)

    const fechaISO = new Date(`${form.fecha}T${form.hora}:00`).toISOString()

    const { error } = await supabase.from('turnos').insert({
      cliente_id: form.cliente_id || null,
      responsable_id: form.responsable_id || null,
      fecha: fechaISO,
      tipo: form.tipo || null,
      notas: form.notas || null,
      estado: form.estado,
    })

    setSaving(false)
    if (error) { toast.error('Error al crear el turno.'); return }
    toast.success('Turno creado.')
    router.push('/crm/agenda')
  }

  return (
    <div>
      <Link href="/crm/agenda">
        <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-6">
          <ArrowLeft size={14} />Agenda
        </Button>
      </Link>
      <h1 className="text-2xl font-semibold text-white mb-6">Nuevo turno</h1>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Datos del turno</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Fecha *</Label>
                <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required
                  className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-lime-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Hora *</Label>
                <Input type="time" value={form.hora} onChange={e => set('hora', e.target.value)} required
                  className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-lime-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Cliente</Label>
              <ClienteCombobox
                value={form.cliente_id}
                onChange={v => set('cliente_id', v)}
                clientes={clientes}
                placeholder="Sin asignar"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                    <SelectValue placeholder="Seleccioná" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {TIPOS_TURNO.map(t => <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Responsable</Label>
                <Select value={form.responsable_id} onValueChange={v => set('responsable_id', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {responsables.map(r => (
                      <SelectItem key={r.id} value={r.id} className="text-zinc-200 focus:bg-zinc-800">
                        {r.apellido}, {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Estado inicial</Label>
              <Select value={form.estado} onValueChange={v => set('estado', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {['pendiente', 'confirmado'].map(e => <SelectItem key={e} value={e} className="text-zinc-200 focus:bg-zinc-800 capitalize">{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Notas</Label>
              <Textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                placeholder="Indicaciones o preparación previa..." rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}Crear turno
          </Button>
          <Link href="/crm/agenda">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
