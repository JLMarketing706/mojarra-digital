'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Feather, ShieldCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { LABEL_ROL_INVITABLE } from '@/types'
import type { RolInvitable } from '@/types'

interface InvitacionData {
  id: string
  email: string
  rol: RolInvitable
  expira_at: string
  aceptada_at: string | null
  cancelada_at: string | null
  mensaje: string | null
  escribania: { id: string; razon_social: string; nombre_fantasia: string | null } | null
  invitador: { nombre: string; apellido: string } | null
}

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'

export default function AceptarInvitacionPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()
  const token = params.token

  const [loading, setLoading] = useState(true)
  const [invitacion, setInvitacion] = useState<InvitacionData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [password, setPassword] = useState('')
  const [aceptando, setAceptando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    // Lookup vía endpoint con service_role: el invitado todavía no
    // tiene sesión, así que las RLS de invitaciones no le dejan
    // leer su propia fila directamente desde el cliente.
    const res = await fetch(`/api/invitaciones/lookup?token=${encodeURIComponent(token)}`)
    const json = (await res.json()) as { invitacion?: unknown; error?: string }
    const data = json.invitacion ?? null

    if (!data) {
      setError('Invitación no encontrada o inválida.')
      setLoading(false)
      return
    }

    const inv = data as unknown as InvitacionData
    if (inv.aceptada_at) {
      setError('Esta invitación ya fue aceptada. Iniciá sesión normalmente.')
    } else if (inv.cancelada_at) {
      setError('Esta invitación fue cancelada por el titular.')
    } else if (new Date(inv.expira_at) < new Date()) {
      setError('Esta invitación expiró. Pedile al titular que te envíe una nueva.')
    } else {
      setInvitacion(inv)
    }
    setLoading(false)
  }, [supabase, token])

  useEffect(() => { cargar() }, [cargar])

  async function aceptar(e: React.FormEvent) {
    e.preventDefault()
    if (!invitacion) return
    if (!nombre || !apellido) { toast.error('Completá nombre y apellido'); return }
    if (password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    setAceptando(true)

    // 1. Crear cuenta de Auth con el email de la invitación
    const { data: signUp, error: signErr } = await supabase.auth.signUp({
      email: invitacion.email,
      password,
      options: { data: { nombre, apellido } },
    })

    if (signErr || !signUp.user) {
      // Si ya existe el usuario, lo logueamos
      if (signErr?.message.toLowerCase().includes('already')) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: invitacion.email,
          password,
        })
        if (loginErr) {
          toast.error('Ya tenés cuenta con ese email pero la contraseña no coincide. Probá iniciar sesión.')
          setAceptando(false)
          return
        }
      } else {
        console.error(signErr)
        toast.error(signErr?.message ?? 'No se pudo crear la cuenta')
        setAceptando(false)
        return
      }
    }

    // 2. Llamar a un endpoint server-side que actualice el profile
    //    (vincula a la escribanía y asigna el rol invitado, marca la invitación como aceptada)
    const res = await fetch('/api/invitaciones/aceptar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nombre, apellido }),
    })

    if (!res.ok) {
      const j = (await res.json()) as { error?: string }
      toast.error(j.error ?? 'No se pudo completar la aceptación')
      setAceptando(false)
      return
    }

    toast.success('¡Bienvenido al equipo!')
    router.push('/crm/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle size={32} className="text-yellow-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No podés usar esta invitación</p>
            <p className="text-zinc-400 text-sm mb-6">{error}</p>
            <Link href="/login">
              <Button className="bg-lime-400 text-black hover:bg-lime-300 font-semibold">
                Ir al login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitacion) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
      <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center">
              <Feather size={16} className="text-black" />
            </div>
            <span className="font-bold text-white tracking-tight">Mojarra Digital</span>
          </div>

          <div className="mb-6 p-4 rounded-lg bg-lime-400/5 border border-lime-400/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-lime-400" />
              <span className="text-lime-300 text-sm font-semibold">Te invitaron al equipo</span>
            </div>
            <p className="text-zinc-300 text-sm">
              {invitacion.invitador && (
                <><strong className="text-white">{invitacion.invitador.nombre} {invitacion.invitador.apellido}</strong> de </>
              )}
              <strong className="text-white">
                {invitacion.escribania?.nombre_fantasia ?? invitacion.escribania?.razon_social}
              </strong>
              {' '}te invitó a sumarte como{' '}
              <strong className="text-lime-300">{LABEL_ROL_INVITABLE[invitacion.rol]}</strong>.
            </p>
            {invitacion.mensaje && (
              <p className="mt-3 text-zinc-400 text-xs italic">"{invitacion.mensaje}"</p>
            )}
          </div>

          <h1 className="text-xl font-semibold text-white mb-1">Creá tu cuenta</h1>
          <p className="text-zinc-500 text-sm mb-5">
            Tu email: <span className="text-zinc-300">{invitacion.email}</span>
          </p>

          <form onSubmit={aceptar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Nombre</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Apellido</Label>
                <Input value={apellido} onChange={e => setApellido(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Contraseña (mín. 8 caracteres)</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
            </div>
            <Button type="submit" disabled={aceptando}
              className="w-full bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
              {aceptando && <Loader2 size={14} className="animate-spin" />}
              Aceptar invitación y crear cuenta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
