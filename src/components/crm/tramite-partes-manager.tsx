'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClienteCombobox } from '@/components/crm/cliente-combobox'
import { toast } from 'sonner'
import { Plus, Trash2, Users, Loader2, ShoppingCart, Building, ChevronRight } from 'lucide-react'

const ROLES_PRINCIPALES = [
  'comprador', 'vendedor',
  'donante', 'donatario',
  'cedente', 'cesionario',
  'mutuante', 'mutuario',
  'fiduciante', 'fiduciario', 'beneficiario',
  'otorgante',
]

const ROLES_OTROS = ['conyuge', 'conviviente', 'apoderado', 'padre', 'madre', 'fiador', 'otro']

const ROL_LABELS: Record<string, string> = {
  comprador: 'Comprador',
  vendedor: 'Vendedor',
  donante: 'Donante',
  donatario: 'Donatario',
  cedente: 'Cedente',
  cesionario: 'Cesionario',
  mutuante: 'Mutuante (presta)',
  mutuario: 'Mutuario (recibe)',
  fiduciante: 'Fiduciante',
  fiduciario: 'Fiduciario',
  beneficiario: 'Beneficiario',
  otorgante: 'Otorgante',
  conyuge: 'Cónyuge',
  conviviente: 'Conviviente',
  apoderado: 'Apoderado',
  padre: 'Padre',
  madre: 'Madre',
  fiador: 'Fiador / Garante',
  otro: 'Otro',
}

interface ClienteOpt { id: string; nombre: string; apellido: string; dni: string | null }

interface Parte {
  id: string
  cliente_id: string | null
  rol: string
  porcentaje: number | null
  observacion: string | null
  parte_padre_id: string | null
  orden: number | null
  nombre: string | null
  dni: string | null
  cliente?: { nombre: string; apellido: string; dni: string | null } | null
}

interface Props { tramiteId: string }

export function TramitePartesManager({ tramiteId }: Props) {
  const supabase = createClient()
  const [partes, setPartes] = useState<Parte[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [cargando, setCargando] = useState(true)
  const [agregando, setAgregando] = useState(false)
  const [nuevo, setNuevo] = useState({
    cliente_id: '', rol: 'comprador', observacion: '', parte_padre_id: '',
    nombre: '', dni: '',
  })

  useEffect(() => {
    let cancel = false
    async function load() {
      const [pRes, cRes] = await Promise.all([
        supabase.from('tramite_partes')
          .select('id, cliente_id, rol, porcentaje, observacion, parte_padre_id, orden, nombre, dni, cliente:clientes(nombre, apellido, dni)')
          .eq('tramite_id', tramiteId)
          .order('orden', { ascending: true }),
        supabase.from('clientes').select('id, nombre, apellido, dni').order('apellido').limit(500),
      ])
      if (cancel) return
      if (pRes.error) {
        if (pRes.error.message.includes('tramite_partes')) setPartes([])
      } else {
        setPartes((pRes.data ?? []) as unknown as Parte[])
      }
      setClientes((cRes.data ?? []) as ClienteOpt[])
      setCargando(false)
    }
    load()
    return () => { cancel = true }
  }, [tramiteId, supabase])

  // Cuando elige "rol principal" reseteo parte_padre_id; cuando elige "rol otro" exigimos padre
  const esRolOtro = ROLES_OTROS.includes(nuevo.rol)

  const principales = partes.filter(p => !p.parte_padre_id)
  const otrosByPadre = new Map<string, Parte[]>()
  for (const p of partes.filter(p => p.parte_padre_id)) {
    const arr = otrosByPadre.get(p.parte_padre_id!) ?? []
    arr.push(p)
    otrosByPadre.set(p.parte_padre_id!, arr)
  }

  async function agregar() {
    // Validación según tipo de rol
    if (esRolOtro) {
      if (!nuevo.parte_padre_id) {
        toast.error('Indicá a qué parte principal acompaña.'); return
      }
      if (!nuevo.nombre.trim()) {
        toast.error('Cargá el nombre y apellido.'); return
      }
    } else {
      if (!nuevo.cliente_id) { toast.error('Elegí un cliente.'); return }
    }

    setAgregando(true)
    const payload = esRolOtro
      ? {
          tramite_id: tramiteId,
          cliente_id: null,
          rol: nuevo.rol,
          nombre: nuevo.nombre.trim(),
          dni: nuevo.dni.trim() || null,
          observacion: nuevo.observacion || null,
          parte_padre_id: nuevo.parte_padre_id,
          orden: partes.length,
        }
      : {
          tramite_id: tramiteId,
          cliente_id: nuevo.cliente_id,
          rol: nuevo.rol,
          observacion: nuevo.observacion || null,
          parte_padre_id: null,
          orden: partes.length,
        }

    const { data, error } = await supabase
      .from('tramite_partes')
      .insert(payload)
      .select('id, cliente_id, rol, porcentaje, observacion, parte_padre_id, orden, nombre, dni, cliente:clientes(nombre, apellido, dni)')
      .single()

    if (error) {
      setAgregando(false)
      if (error.message.includes('tramite_partes')) {
        toast.error('Tabla tramite_partes no existe. Ejecutá supabase-tramite-partes.sql en la base.')
      } else if (error.message.includes('parte_padre_id')) {
        toast.error('Falta migración: ejecutá supabase-tramite-partes-v2.sql en la base.')
      } else if (error.message.includes('column "nombre"') || error.message.includes('column "dni"')) {
        toast.error('Falta migración: ejecutá supabase-tramite-partes-v3.sql en la base.')
      } else {
        toast.error('Error al agregar parte.')
      }
      return
    }

    // Si es cónyuge/conviviente/padre/madre, sincronizar al legajo del cliente principal
    if (esRolOtro) {
      const principal = partes.find(p => p.id === nuevo.parte_padre_id)
      if (principal?.cliente_id) {
        const updates: Record<string, string> = {}
        if (nuevo.rol === 'conyuge' || nuevo.rol === 'conviviente') {
          updates.conyuge_nombre = nuevo.nombre.trim()
          if (nuevo.dni.trim()) updates.conyuge_dni = nuevo.dni.trim()
        } else if (nuevo.rol === 'padre') {
          updates.nombre_padre = nuevo.nombre.trim()
        } else if (nuevo.rol === 'madre') {
          updates.nombre_madre = nuevo.nombre.trim()
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('clientes').update(updates).eq('id', principal.cliente_id)
        }
      }
    }

    setAgregando(false)
    setPartes(prev => [...prev, data as unknown as Parte])
    setNuevo({ cliente_id: '', rol: 'comprador', observacion: '', parte_padre_id: '', nombre: '', dni: '' })
    toast.success(esRolOtro ? 'Compareciente agregado.' : 'Parte agregada.')
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('tramite_partes').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar.'); return }
    setPartes(prev => prev.filter(p => p.id !== id && p.parte_padre_id !== id))
    toast.success('Parte eliminada.')
  }

  function colorRol(rol: string): string {
    if (rol === 'comprador') return 'text-lime-400'
    if (rol === 'vendedor') return 'text-zinc-300'
    return 'text-zinc-300'
  }

  function iconoRol(rol: string): React.ReactNode {
    if (rol === 'comprador') return <ShoppingCart size={12} />
    if (rol === 'vendedor') return <Building size={12} />
    return null
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
          <Users size={14} className="text-lime-400" />Partes intervinientes ({partes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cargando ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin text-zinc-500" />
          </div>
        ) : (
          <>
            {/* Lista agrupada */}
            {principales.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">
                Sin partes adicionales cargadas.
              </p>
            ) : (
              <div className="space-y-2">
                {principales.map(p => (
                  <div key={p.id} className="rounded-lg bg-zinc-800/40 border border-zinc-700 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs uppercase tracking-wide font-medium flex items-center gap-1 ${colorRol(p.rol)}`}>
                            {iconoRol(p.rol)}{ROL_LABELS[p.rol] ?? p.rol}
                          </span>
                          {p.porcentaje != null && (
                            <span className="text-xs text-zinc-400">{p.porcentaje}%</span>
                          )}
                        </div>
                        <p className="text-zinc-200 text-sm truncate">
                          {p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}${p.cliente.dni ? ` · DNI ${p.cliente.dni}` : ''}` : '—'}
                        </p>
                        {p.observacion && <p className="text-zinc-500 text-xs truncate">{p.observacion}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => eliminar(p.id)}
                        className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0">
                        <Trash2 size={13} />
                      </Button>
                    </div>

                    {/* Otros anidados */}
                    {(otrosByPadre.get(p.id) ?? []).length > 0 && (
                      <div className="border-t border-zinc-700/50 bg-zinc-900/40 px-2.5 py-2 space-y-1.5">
                        {otrosByPadre.get(p.id)!.map(o => (
                          <div key={o.id} className="flex items-center gap-2 text-xs">
                            <ChevronRight size={11} className="text-zinc-600 shrink-0" />
                            <span className="text-zinc-400 uppercase tracking-wide font-medium">{ROL_LABELS[o.rol] ?? o.rol}:</span>
                            <span className="text-zinc-200 flex-1 truncate">
                              {o.nombre ?? (o.cliente ? `${o.cliente.apellido}, ${o.cliente.nombre}` : '—')}
                              {o.dni ? ` · DNI ${o.dni}` : ''}
                              {o.observacion ? ` · ${o.observacion}` : ''}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => eliminar(o.id)}
                              className="text-red-400 hover:bg-red-500/10 h-5 w-5 p-0">
                              <Trash2 size={10} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Form agregar */}
            <div className="pt-3 border-t border-zinc-800 space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Agregar parte</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-400">Rol</Label>
                  <Select value={nuevo.rol} onValueChange={v => setNuevo(p => ({ ...p, rol: v, parte_padre_id: '' }))}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <div className="text-xs text-zinc-500 px-2 py-1 uppercase">Principales</div>
                      {ROLES_PRINCIPALES.map(r => (
                        <SelectItem key={r} value={r} className="text-zinc-200 focus:bg-zinc-800 text-sm">
                          {ROL_LABELS[r] ?? r}
                        </SelectItem>
                      ))}
                      <div className="text-xs text-zinc-500 px-2 py-1 uppercase border-t border-zinc-800 mt-1">Otros (acompañan)</div>
                      {ROLES_OTROS.map(r => (
                        <SelectItem key={r} value={r} className="text-zinc-200 focus:bg-zinc-800 text-sm">
                          {ROL_LABELS[r] ?? r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Si es PRINCIPAL → cliente. Si es OTRO → nombre + DNI sueltos */}
                {esRolOtro ? (
                  <>
                    <div>
                      <Label className="text-xs text-zinc-400">Apellido y nombre <span className="text-lime-400">*</span></Label>
                      <Input
                        value={nuevo.nombre}
                        onChange={e => setNuevo(p => ({ ...p, nombre: e.target.value }))}
                        placeholder="Pérez, María"
                        className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-zinc-400">Acompaña a <span className="text-lime-400">*</span></Label>
                      <Select value={nuevo.parte_padre_id} onValueChange={v => setNuevo(p => ({ ...p, parte_padre_id: v }))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm h-9">
                          <SelectValue placeholder="Elegí a qué parte principal acompaña" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 max-h-64">
                          {principales.length === 0 ? (
                            <div className="text-xs text-zinc-500 px-3 py-2">Primero cargá una parte principal.</div>
                          ) : principales.map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-zinc-200 focus:bg-zinc-800 text-sm">
                              [{ROL_LABELS[p.rol] ?? p.rol}] {p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}` : '—'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400">DNI (opcional)</Label>
                      <Input
                        value={nuevo.dni}
                        onChange={e => setNuevo(p => ({ ...p, dni: e.target.value }))}
                        placeholder="12345678"
                        inputMode="numeric"
                        className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400">Observación (opcional)</Label>
                      <Input
                        value={nuevo.observacion}
                        onChange={e => setNuevo(p => ({ ...p, observacion: e.target.value }))}
                        placeholder="Ej: cónyuge desde 2018"
                        className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs text-zinc-400">Cliente</Label>
                      <ClienteCombobox
                        value={nuevo.cliente_id}
                        onChange={v => setNuevo(p => ({ ...p, cliente_id: v }))}
                        clientes={clientes}
                        triggerHeight="h-9"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-zinc-400">Observación (opcional)</Label>
                      <Input
                        value={nuevo.observacion}
                        onChange={e => setNuevo(p => ({ ...p, observacion: e.target.value }))}
                        placeholder="Ej: representante legal"
                        className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                      />
                    </div>
                  </>
                )}
              </div>
              <Button
                onClick={agregar}
                disabled={
                  agregando ||
                  (esRolOtro
                    ? (!nuevo.parte_padre_id || !nuevo.nombre.trim())
                    : !nuevo.cliente_id)
                }
                size="sm"
                className="bg-lime-400 text-black hover:bg-lime-300 gap-1.5"
              >
                {agregando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Agregar parte
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
