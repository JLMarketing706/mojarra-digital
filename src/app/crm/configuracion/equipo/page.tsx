'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, UserPlus, Mail, Copy, X, Users, ShieldOff,
  RefreshCw, Send, Check, XCircle, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { formatFecha, formatFechaHora } from '@/lib/utils'
import {
  LABEL_ROL_INVITABLE,
  type RolInvitable,
  type Profile,
} from '@/types'

interface Miembro extends Profile {
  desactivado_at: string | null
}

interface InvitacionView {
  id: string
  email: string
  rol: RolInvitable
  expira_at: string
  aceptada_at: string | null
  cancelada_at: string | null
  created_at: string
  invitador?: { nombre: string; apellido: string } | null
}

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'

export default function EquipoPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [yo, setYo] = useState<Profile | null>(null)
  const [escribania, setEscribania] = useState<{ id: string; razon_social: string; max_usuarios: number } | null>(null)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [invitaciones, setInvitaciones] = useState<InvitacionView[]>([])
  const [showForm, setShowForm] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [linkGenerado, setLinkGenerado] = useState<string | null>(null)

  const [form, setForm] = useState({
    email: '',
    rol: 'escribano_adscripto' as RolInvitable,
    mensaje: '',
  })

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    if (profile) setYo(profile as Profile)

    const escribaniaId = (profile as { escribania_id?: string } | null)?.escribania_id
    if (!escribaniaId) { setLoading(false); return }

    const [escRes, memRes, invRes] = await Promise.all([
      supabase.from('escribanias')
        .select('id, razon_social, max_usuarios')
        .eq('id', escribaniaId).single(),
      supabase.from('profiles')
        .select('*')
        .eq('escribania_id', escribaniaId)
        .order('rol').order('apellido'),
      supabase.from('invitaciones')
        .select(`
          id, email, rol, expira_at, aceptada_at, cancelada_at, created_at,
          invitador:profiles!invitado_por(nombre, apellido)
        `)
        .eq('escribania_id', escribaniaId)
        .order('created_at', { ascending: false }),
    ])

    if (escRes.data) setEscribania(escRes.data as typeof escribania)
    if (memRes.data) setMiembros(memRes.data as Miembro[])
    if (invRes.data) setInvitaciones(invRes.data as unknown as InvitacionView[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  const esTitular = yo && ['escribano_titular', 'escribano'].includes(yo.rol)

  async function invitar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email) { toast.error('Email requerido'); return }
    setEnviando(true)
    const res = await fetch('/api/invitaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setEnviando(false)
    const json = (await res.json()) as { error?: string; linkInvitacion?: string }
    if (!res.ok) {
      toast.error(json.error ?? 'No se pudo invitar')
      return
    }
    if (json.linkInvitacion) {
      setLinkGenerado(json.linkInvitacion)
      toast.success('Invitación creada — copiá el link y enviáselo')
    }
    setForm({ email: '', rol: 'escribano_adscripto', mensaje: '' })
    cargar()
  }

  async function cancelarInvitacion(id: string) {
    if (!confirm('¿Cancelar la invitación?')) return
    const res = await fetch(`/api/invitaciones?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('No se pudo cancelar'); return }
    toast.success('Invitación cancelada')
    cargar()
  }

  async function toggleMiembro(m: Miembro) {
    const desactivar = !m.desactivado_at
    const { error } = await supabase
      .from('profiles')
      .update({
        activo: !desactivar,
        desactivado_at: desactivar ? new Date().toISOString() : null,
        desactivado_por: desactivar ? yo?.id : null,
      })
      .eq('id', m.id)
    if (error) { toast.error('No se pudo actualizar'); return }
    toast.success(desactivar ? 'Miembro desactivado' : 'Miembro reactivado')
    cargar()
  }

  async function cambiarRol(m: Miembro, nuevoRol: RolInvitable) {
    if (m.rol === nuevoRol) return
    const { error } = await supabase
      .from('profiles')
      .update({ rol: nuevoRol })
      .eq('id', m.id)
    if (error) { toast.error('No se pudo cambiar el rol (verificá que sos titular)'); return }
    toast.success('Rol actualizado')
    cargar()
  }

  function copiarLink(link: string) {
    navigator.clipboard.writeText(link)
    toast.success('Link copiado')
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-zinc-500" /></div>
  }

  if (!esTitular) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <ShieldOff size={32} className="text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm">Solo los escribanos titulares pueden gestionar el equipo.</p>
      </div>
    )
  }

  const miembrosActivos = miembros.filter(m => !m.desactivado_at).length
  const cupo = escribania ? escribania.max_usuarios - miembrosActivos : 0

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/configuracion">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Configuración
          </Button>
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
              <Users size={20} className="text-lime-400" />Equipo
            </h1>
            <p className="text-zinc-500 text-sm">
              {escribania && (
                <>
                  <strong className="text-zinc-300">{escribania.razon_social}</strong>
                  {' · '}
                  {miembrosActivos} de {escribania.max_usuarios} usuarios activos
                  {cupo > 0 ? ` (cupo: ${cupo})` : ' (sin cupo libre)'}
                </>
              )}
            </p>
          </div>
          <Button onClick={() => setShowForm(s => !s)}
            disabled={cupo <= 0}
            className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2 disabled:opacity-50">
            {showForm ? <X size={14} /> : <UserPlus size={14} />}
            {showForm ? 'Cancelar' : 'Invitar miembro'}
          </Button>
        </div>
      </div>

      {/* FORM INVITAR */}
      {showForm && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Invitar nuevo miembro</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={invitar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Email</Label>
                  <Input type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="nuevo@ejemplo.com" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Rol</Label>
                  <Select value={form.rol} onValueChange={v => setForm(p => ({ ...p, rol: v as RolInvitable }))}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {(Object.keys(LABEL_ROL_INVITABLE) as RolInvitable[]).map(r => (
                        <SelectItem key={r} value={r} className="text-zinc-200 focus:bg-zinc-800">
                          {LABEL_ROL_INVITABLE[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Mensaje opcional</Label>
                <Textarea value={form.mensaje}
                  onChange={e => setForm(p => ({ ...p, mensaje: e.target.value }))}
                  rows={2} placeholder="Hola Juan, te sumo al equipo..."
                  className={inputCls + ' resize-none'} />
              </div>
              <Button type="submit" disabled={enviando}
                className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
                {enviando && <Loader2 size={14} className="animate-spin" />}
                <Send size={14} />Generar invitación
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* LINK GENERADO */}
      {linkGenerado && (
        <Card className="bg-lime-400/5 border-lime-400/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Mail size={16} className="text-lime-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-lime-300 text-sm font-medium mb-1">Link de invitación</p>
                <p className="text-zinc-400 text-xs mb-2">
                  El email automático todavía no está configurado. Copiá este link y enviáselo
                  al invitado por WhatsApp / email / etc. El link vence en 7 días.
                </p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono truncate">
                    {linkGenerado}
                  </code>
                  <Button onClick={() => copiarLink(linkGenerado)} size="sm"
                    className="bg-lime-400 text-black hover:bg-lime-300 gap-1.5 shrink-0">
                    <Copy size={12} />Copiar
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLinkGenerado(null)} className="text-zinc-400 h-7 w-7 p-0">
                <X size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MIEMBROS */}
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
        Miembros del equipo ({miembros.length})
      </h2>
      <div className="space-y-2 mb-8">
        {miembros.map(m => {
          const desactivado = !!m.desactivado_at
          const esYo = m.id === yo?.id
          return (
            <Card key={m.id} className={`bg-zinc-900 border ${desactivado ? 'border-zinc-800 opacity-60' : 'border-zinc-800'}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-zinc-200 font-medium text-sm">
                      {m.nombre} {m.apellido}
                      {esYo && <span className="ml-1 text-zinc-500 text-xs">(vos)</span>}
                    </p>
                    {desactivado && <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs">Desactivado</Badge>}
                  </div>
                  <p className="text-zinc-500 text-xs">{m.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={m.rol}
                    onValueChange={v => cambiarRol(m, v as RolInvitable)}
                    disabled={esYo || desactivado}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {(Object.keys(LABEL_ROL_INVITABLE) as RolInvitable[]).map(r => (
                        <SelectItem key={r} value={r} className="text-zinc-200 focus:bg-zinc-800 text-xs">
                          {LABEL_ROL_INVITABLE[r]}
                        </SelectItem>
                      ))}
                      {/* Soportar roles legacy si los tienen */}
                      {!['escribano_titular','oficial_cumplimiento','escribano_adscripto','empleado_admin'].includes(m.rol) && (
                        <SelectItem value={m.rol} className="text-zinc-500 focus:bg-zinc-800 text-xs">
                          {m.rol} (legacy)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {!esYo && (
                    <Button onClick={() => toggleMiembro(m)} variant="outline" size="sm"
                      className={`h-8 text-xs gap-1 ${
                        desactivado
                          ? 'border-lime-400/30 text-lime-400 hover:bg-lime-400/10'
                          : 'border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30'
                      }`}>
                      {desactivado ? <RefreshCw size={11} /> : <Trash2 size={11} />}
                      {desactivado ? 'Reactivar' : 'Desactivar'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* INVITACIONES */}
      {invitaciones.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Invitaciones ({invitaciones.length})
          </h2>
          <div className="space-y-2">
            {invitaciones.map(inv => {
              const expirada = new Date(inv.expira_at) < new Date()
              const aceptada = !!inv.aceptada_at
              const cancelada = !!inv.cancelada_at
              const pendiente = !aceptada && !cancelada && !expirada
              return (
                <Card key={inv.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-zinc-300 text-sm font-medium">{inv.email}</span>
                        <Badge className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400">
                          {LABEL_ROL_INVITABLE[inv.rol]}
                        </Badge>
                        {pendiente && (
                          <Badge className="text-xs bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                            Pendiente · vence {formatFecha(inv.expira_at)}
                          </Badge>
                        )}
                        {aceptada && (
                          <Badge className="text-xs bg-green-500/15 text-green-300 border border-green-500/30">
                            <Check size={10} className="mr-1" />Aceptada
                          </Badge>
                        )}
                        {cancelada && (
                          <Badge className="text-xs bg-zinc-700 text-zinc-400 border border-zinc-700">
                            Cancelada
                          </Badge>
                        )}
                        {expirada && !aceptada && !cancelada && (
                          <Badge className="text-xs bg-red-500/15 text-red-300 border border-red-500/30">
                            Expirada
                          </Badge>
                        )}
                      </div>
                      <p className="text-zinc-500 text-xs">
                        Creada {formatFechaHora(inv.created_at)}
                        {inv.invitador && ` por ${inv.invitador.nombre} ${inv.invitador.apellido}`}
                      </p>
                    </div>
                    {pendiente && (
                      <Button onClick={() => cancelarInvitacion(inv.id)} variant="outline" size="sm"
                        className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30 gap-1 h-8 text-xs">
                        <XCircle size={11} />Cancelar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
