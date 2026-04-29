'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Building2, User } from 'lucide-react'

const JURISDICCIONES = [
  'CABA',
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
]

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    // Titular
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',
    // Escribanía
    razonSocial: '',
    nombreFantasia: '',
    cuit: '',
    jurisdiccion: '',
    localidad: '',
  })

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      toast.error('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/registro/escribania', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        password: form.password,
        telefono: form.telefono,
        razonSocial: form.razonSocial,
        nombreFantasia: form.nombreFantasia,
        cuit: form.cuit,
        jurisdiccion: form.jurisdiccion,
        localidad: form.localidad,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'No se pudo crear la cuenta')
      setLoading(false)
      return
    }

    // Login automático
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (signInError) {
      toast.success('Cuenta creada. Iniciá sesión para continuar.')
      router.push('/login')
      return
    }

    toast.success(`¡Bienvenido! Tenés ${7} días de prueba gratis.`)
    router.push('/crm/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
      <CardHeader className="text-center">
        <CardTitle className="text-white text-2xl">Crear escribanía</CardTitle>
        <CardDescription className="text-zinc-400">
          Probá Mojarra Digital gratis por 7 días. Sin tarjeta de crédito.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN TITULAR */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lime-400 font-semibold">
              <User size={18} />
              <h3>Tus datos como titular</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-zinc-300">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Juan"
                  value={form.nombre}
                  onChange={e => update('nombre', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellido" className="text-zinc-300">Apellido</Label>
                <Input
                  id="apellido"
                  placeholder="García"
                  value={form.apellido}
                  onChange={e => update('apellido', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono" className="text-zinc-300">
                  Teléfono <span className="text-zinc-500 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="telefono"
                  placeholder="+54 11 1234-5678"
                  value={form.telefono}
                  onChange={e => update('telefono', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-zinc-300">Repetir</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN ESCRIBANÍA */}
          <section className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-lime-400 font-semibold">
              <Building2 size={18} />
              <h3>Datos de la escribanía</h3>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="razonSocial" className="text-zinc-300">Razón social</Label>
              <Input
                id="razonSocial"
                placeholder="Escribanía García e Hijos"
                value={form.razonSocial}
                onChange={e => update('razonSocial', e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombreFantasia" className="text-zinc-300">
                  Nombre de fantasía <span className="text-zinc-500 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="nombreFantasia"
                  placeholder="Escribanía García"
                  value={form.nombreFantasia}
                  onChange={e => update('nombreFantasia', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cuit" className="text-zinc-300">CUIT</Label>
                <Input
                  id="cuit"
                  placeholder="20123456789"
                  value={form.cuit}
                  onChange={e => update('cuit', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="jurisdiccion" className="text-zinc-300">Jurisdicción</Label>
                <Select
                  value={form.jurisdiccion}
                  onValueChange={v => update('jurisdiccion', v)}
                >
                  <SelectTrigger
                    id="jurisdiccion"
                    className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400"
                  >
                    <SelectValue placeholder="Elegí" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-60">
                    {JURISDICCIONES.map(j => (
                      <SelectItem
                        key={j}
                        value={j}
                        className="text-white focus:bg-zinc-800 focus:text-lime-400 data-[state=checked]:text-lime-400"
                      >
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="localidad" className="text-zinc-300">Localidad</Label>
                <Input
                  id="localidad"
                  placeholder="San Isidro"
                  value={form.localidad}
                  onChange={e => update('localidad', e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
            </div>
          </section>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 text-black hover:bg-lime-300 font-semibold"
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : 'Crear cuenta y empezar prueba gratis'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-5">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-lime-400 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
