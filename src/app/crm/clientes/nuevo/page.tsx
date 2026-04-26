'use client'

import { useState } from 'react'
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
import { Loader2, ArrowLeft, Upload, Scan } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { DatosDocumento } from '@/lib/claude/ocr'

const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión convivencial']

interface FormData {
  nombre: string; apellido: string; dni: string; cuil: string
  estado_civil: string; domicilio: string; email: string; telefono: string
  notas: string; es_pep: boolean; es_sujeto_obligado: boolean
}

const EMPTY: FormData = {
  nombre: '', apellido: '', dni: '', cuil: '', estado_civil: '',
  domicilio: '', email: '', telefono: '', notas: '',
  es_pep: false, es_sujeto_obligado: false,
}

export default function NuevoClientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [procesandoOCR, setProcesandoOCR] = useState(false)
  const [camposOCR, setCamposOCR] = useState<string[]>([])

  function set(key: keyof FormData, value: string | boolean) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleOCR(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setProcesandoOCR(true)
    try {
      const fd = new FormData()
      fd.append('archivo', file)
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      const json = await res.json() as { datos?: DatosDocumento; error?: string }
      if (!res.ok || !json.datos) { toast.error(json.error ?? 'Error en OCR.'); return }
      const d = json.datos
      const completados: string[] = []
      const mapeo: Array<[keyof DatosDocumento, keyof FormData]> = [
        ['nombre', 'nombre'], ['apellido', 'apellido'], ['dni', 'dni'],
        ['cuil', 'cuil'], ['domicilio', 'domicilio'],
      ]
      setForm(prev => {
        const next = { ...prev }
        for (const [src, dst] of mapeo) {
          const val = d[src] as string | undefined
          if (val) { (next as Record<string, string | boolean>)[dst] = val; completados.push(dst) }
        }
        return next
      })
      setCamposOCR(completados)
      toast.success(`${completados.length} campos completados con IA.`)
    } catch {
      toast.error('Error al procesar el documento.')
    } finally {
      setProcesandoOCR(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.apellido) { toast.error('Nombre y apellido son obligatorios.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('clientes').insert({
      nombre: form.nombre, apellido: form.apellido,
      dni: form.dni || null, cuil: form.cuil || null,
      estado_civil: form.estado_civil || null, domicilio: form.domicilio || null,
      email: form.email || null, telefono: form.telefono || null,
      notas: form.notas || null,
      es_pep: form.es_pep, es_sujeto_obligado: form.es_sujeto_obligado,
    }).select().single()
    setSaving(false)
    if (error) { toast.error('Error al guardar el cliente.'); return }
    toast.success('Cliente creado.')
    router.push(`/crm/clientes/${data.id}`)
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/clientes">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Clientes
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Nuevo cliente</h1>
      </div>

      {/* OCR rápido */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardContent className="p-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
              {procesandoOCR ? <Loader2 size={18} className="text-lime-400 animate-spin" /> : <Scan size={18} className="text-lime-400" />}
            </div>
            <div>
              <p className="text-zinc-200 text-sm font-medium">
                {procesandoOCR ? 'Leyendo documento...' : 'Escanear DNI con IA'}
              </p>
              <p className="text-zinc-500 text-xs">Subí una imagen del DNI para autocompletar los campos</p>
            </div>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleOCR} disabled={procesandoOCR} />
            <Button variant="outline" size="sm" className="ml-auto border-zinc-700 text-zinc-300 gap-1.5 pointer-events-none">
              <Upload size={14} />Subir
            </Button>
          </label>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Datos personales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['nombre', 'apellido'] as const).map(field => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-zinc-300 capitalize flex items-center gap-2">
                    {field === 'nombre' ? 'Nombre *' : 'Apellido *'}
                    {camposOCR.includes(field) && <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0"><Scan size={10} className="mr-1" />IA</Badge>}
                  </Label>
                  <Input value={form[field]} onChange={e => set(field, e.target.value)} required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['dni', 'cuil'] as const).map(field => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-zinc-300 uppercase text-xs flex items-center gap-2">
                    {field}
                    {camposOCR.includes(field) && <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0"><Scan size={10} className="mr-1" />IA</Badge>}
                  </Label>
                  <Input value={form[field]} onChange={e => set(field, e.target.value)}
                    placeholder={field === 'dni' ? '12345678' : '20-12345678-9'}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Estado civil</Label>
                <Select value={form.estado_civil} onValueChange={v => set('estado_civil', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                    <SelectValue placeholder="Seleccioná" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {ESTADOS_CIVILES.map(e => <SelectItem key={e} value={e} className="text-zinc-200 focus:bg-zinc-800">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Teléfono</Label>
                <Input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 flex items-center gap-2">
                Domicilio
                {camposOCR.includes('domicilio') && <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0"><Scan size={10} className="mr-1" />IA</Badge>}
              </Label>
              <Input value={form.domicilio} onChange={e => set('domicilio', e.target.value)}
                placeholder="Av. Corrientes 1234, CABA"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="nombre@ejemplo.com"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
            </div>
          </CardContent>
        </Card>

        {/* Alertas UIF */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Clasificación UIF</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={form.es_pep}
                onCheckedChange={(v: boolean | 'indeterminate') => set('es_pep', !!v)}
                className="border-zinc-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
              />
              <div>
                <p className="text-zinc-200 text-sm font-medium">Persona Políticamente Expuesta (PEP)</p>
                <p className="text-zinc-500 text-xs">Funcionarios públicos, sus familiares y asociados cercanos</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={form.es_sujeto_obligado}
                onCheckedChange={(v: boolean | 'indeterminate') => set('es_sujeto_obligado', !!v)}
                className="border-zinc-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <div>
                <p className="text-zinc-200 text-sm font-medium">Sujeto Obligado</p>
                <p className="text-zinc-500 text-xs">Entidades financieras, contadores, inmobiliarias, etc.</p>
              </div>
            </label>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Notas internas</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notas} onChange={e => set('notas', e.target.value)}
              placeholder="Observaciones internas sobre el cliente..."
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Guardar cliente
          </Button>
          <Link href="/crm/clientes">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
