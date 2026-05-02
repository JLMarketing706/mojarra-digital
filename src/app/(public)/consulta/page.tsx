'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const TIPOS_TRAMITE = [
  'Escritura de compra-venta',
  'Escritura de hipoteca',
  'Poder general',
  'Poder especial',
  'Certificación de firma',
  'Certificación de fotocopia',
  'Sucesión / declaratoria de herederos',
  'Constitución de sociedad',
  'Modificación de sociedad',
  'Subdivisión / unificación de inmueble',
  'Otro',
]

export default function ConsultaPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    tipo_tramite: '',
    descripcion: '',
  })

  function set(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tipo_tramite) {
      toast.error('Seleccioná el tipo de trámite.')
      return
    }
    setLoading(true)

    const { error } = await supabase.from('presupuestos').insert({
      nombre: form.nombre,
      email: form.email,
      telefono: form.telefono || null,
      tipo_tramite: form.tipo_tramite,
      descripcion: form.descripcion || null,
      estado: 'nuevo',
    })

    setLoading(false)

    if (error) {
      toast.error('Error al enviar la consulta. Intentá de nuevo.')
      return
    }

    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-lime-400/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-lime-400" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">¡Consulta recibida!</h1>
        <p className="text-zinc-400 mb-8">
          Te vamos a contactar a <span className="text-white">{form.email}</span> a la brevedad para coordinar los próximos pasos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white">
              Volver al inicio
            </Button>
          </Link>
          <Link href="/registro">
            <Button className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
              Crear cuenta para seguir mi trámite <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Iniciá tu consulta</h1>
        <p className="text-zinc-400">
          Completá el formulario y te respondemos a la brevedad. Sin turnos, sin esperas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="text-zinc-300">Nombre y apellido *</Label>
            <Input
              id="nombre"
              placeholder="Juan García"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              required
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-300">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="telefono" className="text-zinc-300">
              Teléfono <span className="text-zinc-500 text-xs">(opcional)</span>
            </Label>
            <Input
              id="telefono"
              placeholder="+54 11 1234-5678"
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Tipo de trámite *</Label>
            <Select onValueChange={v => set('tipo_tramite', v)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white focus:ring-lime-400">
                <SelectValue placeholder="Seleccioná una opción" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {TIPOS_TRAMITE.map(t => (
                  <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descripcion" className="text-zinc-300">
            Descripción <span className="text-zinc-500 text-xs">(opcional)</span>
          </Label>
          <Textarea
            id="descripcion"
            placeholder="Contanos brevemente de qué se trata tu trámite, si tenés dudas o querés agregar más información..."
            rows={4}
            value={form.descripcion}
            onChange={e => set('descripcion', e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2 px-8"
            size="lg"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Enviando...</>
            ) : (
              <>Enviar consulta <ArrowRight size={16} /></>
            )}
          </Button>
        </div>

        <p className="text-xs text-zinc-600 pt-2">
          Al enviar este formulario, aceptás que el equipo de la escribanía se ponga en contacto con vos para coordinar tu trámite.
        </p>
      </form>
    </div>
  )
}
