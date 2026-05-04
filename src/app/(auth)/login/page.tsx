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

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error || !data.user) {
      toast.error('Credenciales incorrectas. Verificá tu email y contraseña.')
      setLoading(false)
      return
    }

    // El portal del cliente final fue removido; todos los usuarios entran al CRM.
    // Si el rol no es staff, /crm/layout.tsx los rebota al login.
    router.push('/crm/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
      <CardHeader className="text-center">
        <CardTitle className="text-white">Iniciar sesión</CardTitle>
        <CardDescription className="text-zinc-400">
          Ingresá con tu email y contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 text-black hover:bg-lime-300 font-semibold"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Ingresar'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-5">
          ¿No tenés cuenta?{' '}
          <Link href="/registro" className="text-lime-400 hover:underline">
            Registrarse
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
