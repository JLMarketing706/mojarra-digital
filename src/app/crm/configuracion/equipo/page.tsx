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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, UserPlus, Mail, Copy, X, Users, ShieldOff,
  RefreshCw, Send, Check, XCircle, Trash2, Calendar, MessageCircle, Stamp, Save,
} from 'lucide-react'
import Link from 'next/link'
import { formatFecha, formatFechaHora } from '@/lib/utils'
import {
  LABEL_ROL_INVITABLE,
  type RolInvitable,
  type Profile,
} from '@/types'

type Miembro = Profile

const MOTIVOS_DESACTIVACION = [
  { v: 'vacaciones', label: 'Vacaciones' },
  { v: 'licencia', label: 'Licencia (médica/personal)' },
  { v: 'suspension', label: 'Suspensión' },
  { v: 'baja', label: 'Baja definitiva (renunció / despido)' },
  { v: 'otro', label: 'Otro' },
]

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
  // Edición de registros notariales — qué miembro y el textarea draft
  const [editandoRegistros, setEditandoRegistros] = useState<Miembro | null>(null)
  const [registrosDraft, setRegistrosDraft] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [linkGenerado, setLinkGenerado] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'activos' | 'desactivados' | 'todos'>('activos')

  // Estado del diálogo de desactivación
  const [desactivando, setDesactivando] = useState<Miembro | null>(null)
  const [desactivacionMotivo, setDesactivacionMotivo] = useState('vacaciones')
  const [desactivacionFecha, setDesactivacionFecha] = useState('')

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
    const json = (await res.json()) as {
      error?: string
      linkInvitacion?: string
      emailEnviado?: boolean
      emailOmitido?: boolean
      emailError?: string
    }
    if (!res.ok) {
      toast.error(json.error ?? 'No se pudo invitar')
      return
    }
    if (json.emailEnviado) {
      toast.success(`Invitación enviada por email a ${form.email}`)
    } else if (json.emailOmitido) {
      // Resend no configurado: mostramos el link para copy-paste
      if (json.linkInvitacion) setLinkGenerado(json.linkInvitacion)
      toast.warning('Email no configurado todavía — usá el link para enviar manual')
    } else {
      // Falló el envío pero la invitación quedó creada
      if (json.linkInvitacion) setLinkGenerado(json.linkInvitacion)
      toast.warning(`Invitación creada pero no se pudo mandar el email: ${json.emailError ?? '?'}`)
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

  async function reactivar(m: Miembro) {
    const { error } = await supabase
      .from('profiles')
      .update({
        activo: true,
        desactivado_at: null,
        desactivado_por: null,
        desactivacion_motivo: null,
        reactivacion_programada: null,
      })
      .eq('id', m.id)
    if (error) { toast.error('No se pudo reactivar'); return }
    toast.success(`${m.nombre} reactivado/a`)
    cargar()
  }

  async function desactivarConMotivo(m: Miembro, motivo: string, fechaReactivacion: string) {
    const { error } = await supabase
      .from('profiles')
      .update({
        activo: false,
        desactivado_at: new Date().toISOString(),
        desactivado_por: yo?.id,
        desactivacion_motivo: motivo || null,
        reactivacion_programada: fechaReactivacion || null,
      })
      .eq('id', m.id)
    if (error) { toast.error('No se pudo desactivar'); return }
    toast.success(`${m.nombre} desactivado/a${fechaReactivacion ? ` hasta ${fechaReactivacion}` : ''}`)
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

  /** Guarda la lista de registros notariales del escribano (un string por línea) */
  async function guardarRegistros(m: Miembro, raw: string) {
    // Cada línea es un registro. Limpio espacios y vacíos.
    const lista = raw
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
    const { error } = await supabase
      .from('profiles')
      .update({ registros_notariales: lista.length > 0 ? lista : null })
      .eq('id', m.id)
    if (error) { toast.error('No se pudieron guardar los registros'); return }
    toast.success(
      lista.length === 0
        ? 'Registros notariales borrados'
        : `${lista.length} ${lista.length === 1 ? 'registro guardado' : 'registros guardados'}`
    )
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

  // #3: Conteo de escribanos (titular/adscripto/subrogante/interino) — máximo 5 por escribanía
  const ROLES_ESCRIB = ['escribano_titular', 'escribano_adscripto', 'escribano_subrogante', 'escribano_interino']
  const escribanosActivos = miembros.filter(m => !m.desactivado_at && ROLES_ESCRIB.includes(m.rol)).length
  const cupoEscribanos = 5 - escribanosActivos
  const formEsEscribano = ROLES_ESCRIB.includes(form.rol)
  const sinCupoEscribano = formEsEscribano && cupoEscribanos <= 0

  // Aplicar filtros
  const miembrosFiltrados = miembros.filter(m => {
    if (filtro === 'activos') return !m.desactivado_at
    if (filtro === 'desactivados') return !!m.desactivado_at
    return true
  })

  // Volviendo de licencia próximamente
  const ahora = new Date()
  const en7Dias = new Date(ahora)
  en7Dias.setDate(en7Dias.getDate() + 7)
  const proximosARegresar = miembros.filter(m =>
    m.reactivacion_programada
    && new Date(m.reactivacion_programada) > ahora
    && new Date(m.reactivacion_programada) <= en7Dias
  )

  function abrirDialogDesactivar(m: Miembro) {
    setDesactivando(m)
    setDesactivacionMotivo('vacaciones')
    setDesactivacionFecha('')
  }

  async function confirmarDesactivar() {
    if (!desactivando) return
    await desactivarConMotivo(desactivando, desactivacionMotivo, desactivacionFecha)
    setDesactivando(null)
  }

  return (
    <div className="max-w-3xl mx-auto">
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
                  {' · '}
                  <span className={escribanosActivos >= 5 ? 'text-yellow-400' : 'text-zinc-400'}>
                    {escribanosActivos}/5 escribanos
                  </span>
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
              {sinCupoEscribano && (
                <p className="text-xs text-yellow-400">
                  ⚠ Esta escribanía ya tiene 5 escribanos. Cambiá a otro rol o desactivá uno existente.
                </p>
              )}
              <Button type="submit" disabled={enviando || sinCupoEscribano}
                className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2 disabled:opacity-50">
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

      {/* VOLVIENDO DE LICENCIA */}
      {proximosARegresar.length > 0 && (
        <Card className="bg-blue-500/5 border-blue-500/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-blue-400" />
              <span className="text-blue-300 text-sm font-semibold">
                Volviendo de licencia próximamente ({proximosARegresar.length})
              </span>
            </div>
            <ul className="text-zinc-400 text-xs space-y-1">
              {proximosARegresar.map(m => (
                <li key={m.id}>
                  • <span className="text-zinc-200">{m.nombre} {m.apellido}</span>
                  {' '}({m.desactivacion_motivo})
                  {' — '}vuelve el <span className="text-zinc-200">{formatFecha(m.reactivacion_programada!)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* FILTROS */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Miembros del equipo ({miembrosFiltrados.length})
        </h2>
        <div className="flex gap-1 ml-auto">
          {(['activos', 'desactivados', 'todos'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                filtro === f
                  ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                  : 'text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-8">
        {miembrosFiltrados.map(m => {
          const desactivado = !!m.desactivado_at
          const esYo = m.id === yo?.id
          const esEscribano = ['escribano_titular', 'escribano_adscripto', 'escribano_subrogante', 'escribano_interino', 'escribano'].includes(m.rol)
          const registros = (m as Miembro & { registros_notariales?: string[] | null }).registros_notariales ?? []
          return (
            <Card key={m.id} className={`bg-zinc-900 border ${desactivado ? 'border-zinc-800 opacity-60' : 'border-zinc-800'}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-zinc-200 font-medium text-sm">
                      {m.nombre} {m.apellido}
                      {esYo && <span className="ml-1 text-zinc-500 text-xs">(vos)</span>}
                    </p>
                    {desactivado && (
                      <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs capitalize">
                        {m.desactivacion_motivo ?? 'Desactivado'}
                      </Badge>
                    )}
                    {m.reactivacion_programada && (
                      <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs">
                        <Calendar size={10} className="mr-1" />
                        vuelve {formatFecha(m.reactivacion_programada)}
                      </Badge>
                    )}
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

                  {esEscribano && !desactivado && (
                    <Button
                      onClick={() => {
                        setEditandoRegistros(m)
                        setRegistrosDraft(registros.join('\n'))
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      title="Editar registros notariales del escribano"
                    >
                      <Stamp size={11} />
                      Registros ({registros.length})
                    </Button>
                  )}

                  {!esYo && (
                    <Button onClick={() => desactivado ? reactivar(m) : abrirDialogDesactivar(m)}
                      variant="outline" size="sm"
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

      {/* Dialog: editar registros notariales del escribano */}
      <Dialog
        open={!!editandoRegistros}
        onOpenChange={open => { if (!open) setEditandoRegistros(null) }}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              Registros notariales
              {editandoRegistros && (
                <p className="text-zinc-400 text-sm font-normal mt-1">
                  {editandoRegistros.nombre} {editandoRegistros.apellido}
                </p>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-zinc-300 text-xs">
              Un registro por línea
              <span className="text-zinc-500 font-normal ml-2">
                (ej: &ldquo;Registro 123 CABA&rdquo;)
              </span>
            </Label>
            <Textarea
              value={registrosDraft}
              onChange={e => setRegistrosDraft(e.target.value)}
              placeholder="Registro 123 CABA&#10;Registro 45 PBA"
              rows={5}
              className={inputCls + ' font-mono text-sm'}
            />
            <p className="text-xs text-zinc-500">
              Si el escribano tiene un solo registro, se va a seleccionar
              por default al cargar una escritura. Si tiene varios,
              vas a poder elegir cuál usar en cada operación.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditandoRegistros(null)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (editandoRegistros) {
                    await guardarRegistros(editandoRegistros, registrosDraft)
                    setEditandoRegistros(null)
                  }
                }}
                className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2"
              >
                <Save size={13} /> Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* DIALOG DE DESACTIVACIÓN */}
      <Dialog open={!!desactivando} onOpenChange={open => !open && setDesactivando(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar a {desactivando?.nombre} {desactivando?.apellido}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              El miembro no podrá iniciar sesión mientras esté desactivado.
              Sus acciones pasadas siguen registradas en el sistema.
            </p>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Motivo</Label>
              <Select value={desactivacionMotivo} onValueChange={setDesactivacionMotivo}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {MOTIVOS_DESACTIVACION.map(m => (
                    <SelectItem key={m.v} value={m.v} className="text-zinc-200 focus:bg-zinc-800">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm flex items-center gap-1.5">
                <Calendar size={12} />Fecha de reactivación automática (opcional)
              </Label>
              <Input type="date"
                min={new Date().toISOString().split('T')[0]}
                value={desactivacionFecha}
                onChange={e => setDesactivacionFecha(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white" />
              <p className="text-zinc-500 text-xs">
                Si ponés una fecha, el sistema reactivará al miembro automáticamente ese día.
                Útil para vacaciones o licencias programadas.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDesactivando(null)}
                className="border-zinc-700 text-zinc-300">Cancelar</Button>
              <Button onClick={confirmarDesactivar}
                className="bg-red-500 text-white hover:bg-red-400">
                Desactivar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
