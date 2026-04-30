'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react'

export default function SolicitarDemoPage() {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    escribania: '',
    email: '',
    whatsapp: '',
    comentario: '',
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/solicitar-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      toast.error(data.error ?? 'Error al enviar la solicitud')
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
        <h1 className="text-2xl font-semibold text-white mb-3">¡Solicitud recibida!</h1>
        <p className="text-zinc-400 leading-relaxed mb-8">
          Te contactamos en las próximas <strong className="text-white">24 horas</strong> al email
          o WhatsApp que dejaste, con un link para activar tu prueba gratis de 7 días.
        </p>
        <Link href="/">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <ArrowLeft size={14} className="mr-2" />Volver al inicio
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
          <ArrowLeft size={14} />Inicio
        </Button>
      </Link>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2 text-lime-400 text-sm font-medium mb-2">
            <Sparkles size={14} />
            Demo gratis para escribanías
          </div>
          <CardTitle className="text-white text-2xl">Solicitá una demo</CardTitle>
          <CardDescription className="text-zinc-400">
            Te contactamos para coordinar una demostración rápida de Mojarra Digital y darte acceso a una prueba gratis de 7 días — sin tarjeta de crédito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre" className="text-zinc-300">Tu nombre *</Label>
              <Input
                id="nombre"
                placeholder="Juan García"
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="escribania" className="text-zinc-300">Nombre de la escribanía *</Label>
              <Input
                id="escribania"
                placeholder="Escribanía García e Hijos"
                value={form.escribania}
                onChange={e => set('escribania', e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-zinc-300">
                  WhatsApp <span className="text-zinc-500 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="whatsapp"
                  placeholder="+54 11 1234-5678"
                  value={form.whatsapp}
                  onChange={e => set('whatsapp', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comentario" className="text-zinc-300">
                ¿Qué te interesa probar? <span className="text-zinc-500 text-xs">(opcional)</span>
              </Label>
              <Textarea
                id="comentario"
                placeholder="Ej: el OCR de DNI, la integración UIF, la gestión de trámites..."
                rows={3}
                value={form.comentario}
                onChange={e => set('comentario', e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-lime-400 text-black hover:bg-lime-300 font-semibold mt-2"
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : 'Solicitar demo'}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-500 mt-5">
            Te respondemos dentro de las próximas 24 horas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
