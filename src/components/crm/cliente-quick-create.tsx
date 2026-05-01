'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, X, UserPlus, AlertTriangle } from 'lucide-react'
import type { TipoPersona } from '@/types'

const TIPOS_PERSONA: { v: TipoPersona; label: string }[] = [
  { v: 'humana', label: 'Persona humana' },
  { v: 'juridica', label: 'Persona jurídica' },
  { v: 'fideicomiso', label: 'Fideicomiso' },
]

interface ClienteCreado {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  cuil: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (cliente: ClienteCreado) => void
}

export function ClienteQuickCreate({ open, onClose, onCreated }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tipo_persona: 'humana' as TipoPersona,
    apellido: '',
    nombre: '',
    dni: '',
    cuil: '',
  })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  function reset() {
    setForm({ tipo_persona: 'humana', apellido: '', nombre: '', dni: '', cuil: '' })
  }

  async function handleCrear() {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      toast.error('Apellido y nombre son obligatorios.')
      return
    }
    if (!form.dni && !form.cuil) {
      toast.error('Cargá DNI o CUIT.')
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        tipo_persona: form.tipo_persona,
        apellido: form.apellido.trim().toUpperCase(),
        nombre: form.nombre.trim().toUpperCase(),
        dni: form.dni.trim() || null,
        cuil: form.cuil.trim() || null,
        legajo_incompleto: true,
        es_pep: false,
        es_sujeto_obligado: false,
        nivel_riesgo: 'bajo',
      })
      .select('id, nombre, apellido, dni, cuil')
      .single()

    setSaving(false)
    if (error) {
      if (error.message.includes('legajo_incompleto')) {
        toast.error('Falta migración: ejecutá supabase-clientes-legajo-incompleto.sql')
      } else {
        toast.error('Error al crear el cliente: ' + error.message)
      }
      return
    }

    toast.success('Cliente creado. Recordá completar el legajo.')
    onCreated(data as ClienteCreado)
    reset()
  }

  if (!open) return null

  const esJuridica = form.tipo_persona !== 'humana'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <UserPlus size={16} className="text-lime-400" />
            Crear cliente rápido
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white">
            <X size={14} />
          </Button>
        </div>

        {/* Aviso */}
        <div className="mb-4 p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
          <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-yellow-300/90 text-xs">
            Solo carga lo mínimo (apellido, nombre, DNI/CUIT). El cliente quedará marcado
            como <strong>legajo incompleto</strong> y deberás completar los datos UIF antes
            de generar reportes.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <Label className="text-zinc-300 text-xs">Tipo de persona</Label>
            <Select value={form.tipo_persona} onValueChange={(v: TipoPersona) => set('tipo_persona', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {TIPOS_PERSONA.map(t => (
                  <SelectItem key={t.v} value={t.v} className="text-zinc-200 focus:bg-zinc-800">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300 text-xs">
                {esJuridica ? 'Razón social *' : 'Apellido *'}
              </Label>
              <Input value={form.apellido} onChange={e => set('apellido', e.target.value)}
                placeholder={esJuridica ? 'Ej: ACME S.A.' : 'Ej: Pérez'}
                className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div>
              <Label className="text-zinc-300 text-xs">
                {esJuridica ? 'Tipo (SA/SRL/SAS)' : 'Nombre *'}
              </Label>
              <Input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder={esJuridica ? 'Ej: SA' : 'Ej: Juan Carlos'}
                className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!esJuridica && (
              <div>
                <Label className="text-zinc-300 text-xs">DNI</Label>
                <Input value={form.dni} onChange={e => set('dni', e.target.value)}
                  placeholder="12345678" inputMode="numeric"
                  className="bg-zinc-800 border-zinc-700 text-white font-mono" />
              </div>
            )}
            <div className={esJuridica ? 'col-span-2' : ''}>
              <Label className="text-zinc-300 text-xs">CUIT / CUIL</Label>
              <Input value={form.cuil} onChange={e => set('cuil', e.target.value)}
                placeholder="20-12345678-9" inputMode="numeric"
                className="bg-zinc-800 border-zinc-700 text-white font-mono" />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 mt-5 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleCrear} disabled={saving}
            className="bg-lime-400 text-black hover:bg-lime-300 gap-1.5">
            {saving && <Loader2 size={13} className="animate-spin" />}
            Crear cliente
          </Button>
        </div>
      </div>
    </div>
  )
}
