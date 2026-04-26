'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  })

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

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          nombre: form.nombre,
          apellido: form.apellido,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Crear perfil con rol 'cliente'
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        telefono: form.telefono || null,
        rol: 'cliente',
      })

      if (profileError) {
        toast.error('Error al crear el perfil. Contactá con el soporte.')
        setLoading(false)
        return
      }

      toast.success('Cuenta creada exitosamente.')
      router.push('/portal/dashboard')
      router.refresh()
    }
  }

  return (
    <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
      <CardHeader className="text-center">
        <CardTitle className="text-white">Crear cuenta</CardTitle>
        <CardDescription className="text-zinc-400">
          Registrate para seguir tus trámites en línea
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombre" className="text-zinc-300">Nombre</Label>
              <Input
                id="nombre"
                placeholder="Juan"
                value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
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
                onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
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
              onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-zinc-300">Repetir contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 text-black hover:bg-lime-300 font-semibold"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Crear cuenta'}
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
