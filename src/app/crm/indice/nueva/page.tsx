'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { VozInput } from '@/components/crm/voz-input'
import type { Profile } from '@/types'
import type { DatosIndiceVoz } from '@/lib/claude/voz'

const TIPOS_ACTO = [
  'Escritura de compra-venta',
  'Escritura de hipoteca',
  'Poder general',
  'Poder especial',
  'Certificación de firma',
  'Certificación de fotocopia',
  'Constitución de sociedad',
  'Sucesión / declaratoria de herederos',
  'Subdivisión / unificación de inmueble',
  'Donación',
  'Permuta',
  'Usufructo',
  'Otro',
]

interface FormData {
  numero_escritura: string
  folio: string
  fecha: string
  tipo_acto: string
  partes: string
  inmueble: string
  observaciones: string
  escribano_id: string
}

const hoy = new Date().toISOString().split('T')[0]

const EMPTY: FormData = {
  numero_escritura: '', folio: '', fecha: hoy,
  tipo_acto: '', partes: '', inmueble: '', observaciones: '', escribano_id: '',
}

export default function NuevaEscrituraPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [escribanos, setEscribanos] = useState<Profile[]>([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nombre, apellido, rol')
      .in('rol', ['escribano', 'protocolista'])
      .order('apellido')
      .then(({ data }) => { if (data) setEscribanos(data as Profile[]) })
  }, [])

  function set(key: keyof FormData, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  const handleVozDatos = useCallback((datos: DatosIndiceVoz) => {
    setForm(prev => ({
      ...prev,
      numero_escritura: datos.numero_escritura ? String(datos.numero_escritura) : prev.numero_escritura,
      folio: datos.folio ?? prev.folio,
      fecha: datos.fecha
        ? convertirFechaArg(datos.fecha)
        : prev.fecha,
      tipo_acto: datos.tipo_acto ?? prev.tipo_acto,
      partes: datos.partes ?? prev.partes,
      inmueble: datos.inmueble ?? prev.inmueble,
      observaciones: datos.observaciones ?? prev.observaciones,
    }))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.numero_escritura || !form.fecha || !form.tipo_acto || !form.partes) {
      toast.error('Número, fecha, tipo de acto y partes son obligatorios.')
      return
    }
    setSaving(true)

    const { data, error } = await supabase.from('indice_notarial').insert({
      numero_escritura: parseInt(form.numero_escritura),
      folio: form.folio || null,
      fecha: form.fecha,
      tipo_acto: form.tipo_acto,
      partes: form.partes,
      inmueble: form.inmueble || null,
      observaciones: form.observaciones || null,
      escribano_id: form.escribano_id || null,
    }).select().single()

    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        toast.error(`El número de escritura ${form.numero_escritura} ya existe.`)
      } else {
        toast.error('Error al guardar la escritura.')
      }
      return
    }

    toast.success(`Escritura Nº ${form.numero_escritura} registrada.`)
    router.push(`/crm/indice/${data.id}`)
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/indice">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Índice Notarial
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Nueva escritura</h1>
        <p className="text-zinc-400 text-sm">Podés dictar los datos con el micrófono o ingresarlos manualmente.</p>
      </div>

      {/* Carga por voz */}
      <div className="mb-6">
        <VozInput onDatosExtraidos={handleVozDatos} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Datos del acto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Nº Escritura *</Label>
                <Input
                  type="number" min="1"
                  value={form.numero_escritura}
                  onChange={e => set('numero_escritura', e.target.value)}
                  placeholder="1"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white font-mono placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Folio</Label>
                <Input
                  value={form.folio}
                  onChange={e => set('folio', e.target.value)}
                  placeholder="123v"
                  className="bg-zinc-800 border-zinc-700 text-white font-mono placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-zinc-300">Fecha *</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={e => set('fecha', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-lime-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Tipo de acto *</Label>
              <Select value={form.tipo_acto} onValueChange={v => set('tipo_acto', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                  <SelectValue placeholder="Seleccioná el tipo de acto" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-52">
                  {TIPOS_ACTO.map(t => (
                    <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Partes intervinientes *</Label>
              <Textarea
                value={form.partes}
                onChange={e => set('partes', e.target.value)}
                placeholder="Ej: VENDEDOR: García Juan DNI 12345678 — COMPRADOR: López María DNI 87654321"
                rows={2}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Inmueble</Label>
              <Textarea
                value={form.inmueble}
                onChange={e => set('inmueble', e.target.value)}
                placeholder="Ej: Depto. 3B, Av. Corrientes 1234, CABA — Matrícula 123-456"
                rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Escribano/a</Label>
                <Select value={form.escribano_id} onValueChange={v => set('escribano_id', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {escribanos.map(e => (
                      <SelectItem key={e.id} value={e.id} className="text-zinc-200 focus:bg-zinc-800">
                        {e.apellido}, {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Observaciones</Label>
                <Input
                  value={form.observaciones}
                  onChange={e => set('observaciones', e.target.value)}
                  placeholder="Notas adicionales..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}
            className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Registrar escritura
          </Button>
          <Link href="/crm/indice">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

function convertirFechaArg(fecha: string): string {
  // Convierte DD/MM/AAAA → AAAA-MM-DD para el input date
  const match = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  return fecha
}
