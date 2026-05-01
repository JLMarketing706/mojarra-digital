'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, Users, Loader2 } from 'lucide-react'

const ROLES = [
  'comprador', 'vendedor',
  'donante', 'donatario',
  'cedente', 'cesionario',
  'mutuante', 'mutuario',
  'fiduciante', 'fiduciario', 'beneficiario',
  'otorgante',
  'apoderado', 'conyuge', 'otro',
]

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
  apoderado: 'Apoderado',
  conyuge: 'Cónyuge',
  otro: 'Otro',
}

interface ClienteOpt { id: string; nombre: string; apellido: string; dni: string | null }

interface Parte {
  id: string
  cliente_id: string | null
  rol: string
  porcentaje: number | null
  observacion: string | null
  cliente?: { nombre: string; apellido: string; dni: string | null } | null
}

interface Props { tramiteId: string }

export function TramitePartesManager({ tramiteId }: Props) {
  const supabase = createClient()
  const [partes, setPartes] = useState<Parte[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [cargando, setCargando] = useState(true)
  const [agregando, setAgregando] = useState(false)
  const [nuevo, setNuevo] = useState({ cliente_id: '', rol: 'comprador', porcentaje: '', observacion: '' })

  useEffect(() => {
    let cancel = false
    async function load() {
      const [pRes, cRes] = await Promise.all([
        supabase.from('tramite_partes')
          .select('id, cliente_id, rol, porcentaje, observacion, cliente:clientes(nombre, apellido, dni)')
          .eq('tramite_id', tramiteId)
          .order('orden', { ascending: true }),
        supabase.from('clientes').select('id, nombre, apellido, dni').order('apellido').limit(500),
      ])
      if (cancel) return
      if (pRes.error) {
        // Tabla no existe aún → mostrar mensaje informativo
        if (pRes.error.message.includes('tramite_partes')) {
          setPartes([])
        }
      } else {
        setPartes((pRes.data ?? []) as unknown as Parte[])
      }
      setClientes((cRes.data ?? []) as ClienteOpt[])
      setCargando(false)
    }
    load()
    return () => { cancel = true }
  }, [tramiteId, supabase])

  async function agregar() {
    if (!nuevo.cliente_id) { toast.error('Elegí un cliente.'); return }
    setAgregando(true)
    const payload = {
      tramite_id: tramiteId,
      cliente_id: nuevo.cliente_id,
      rol: nuevo.rol,
      porcentaje: nuevo.porcentaje ? parseFloat(nuevo.porcentaje) : null,
      observacion: nuevo.observacion || null,
      orden: partes.length,
    }
    const { data, error } = await supabase
      .from('tramite_partes')
      .insert(payload)
      .select('id, cliente_id, rol, porcentaje, observacion, cliente:clientes(nombre, apellido, dni)')
      .single()
    setAgregando(false)
    if (error) {
      if (error.message.includes('tramite_partes')) {
        toast.error('Tabla tramite_partes no existe. Ejecutá supabase-tramite-partes.sql en la base.')
      } else {
        toast.error('Error al agregar parte.')
      }
      return
    }
    setPartes(prev => [...prev, data as unknown as Parte])
    setNuevo({ cliente_id: '', rol: 'comprador', porcentaje: '', observacion: '' })
    toast.success('Parte agregada.')
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('tramite_partes').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar.'); return }
    setPartes(prev => prev.filter(p => p.id !== id))
    toast.success('Parte eliminada.')
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
            {/* Lista de partes existentes */}
            {partes.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">
                No hay partes adicionales cargadas. La operación usa solo el cliente principal.
              </p>
            ) : (
              <div className="space-y-2">
                {partes.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs uppercase tracking-wide text-lime-400 font-medium">
                          {ROL_LABELS[p.rol] ?? p.rol}
                        </span>
                        {p.porcentaje != null && (
                          <span className="text-xs text-zinc-400">{p.porcentaje}%</span>
                        )}
                      </div>
                      <p className="text-zinc-200 text-sm truncate">
                        {p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}${p.cliente.dni ? ` · DNI ${p.cliente.dni}` : ''}` : '—'}
                      </p>
                      {p.observacion && (
                        <p className="text-zinc-500 text-xs truncate">{p.observacion}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => eliminar(p.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Form para agregar */}
            <div className="pt-3 border-t border-zinc-800 space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Agregar parte</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-400">Rol</Label>
                  <Select value={nuevo.rol} onValueChange={v => setNuevo(p => ({ ...p, rol: v }))}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {ROLES.map(r => (
                        <SelectItem key={r} value={r} className="text-zinc-200 focus:bg-zinc-800 text-sm">
                          {ROL_LABELS[r] ?? r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Cliente</Label>
                  <Select value={nuevo.cliente_id} onValueChange={v => setNuevo(p => ({ ...p, cliente_id: v }))}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm h-9">
                      <SelectValue placeholder="Seleccioná cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 max-h-64">
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-zinc-200 focus:bg-zinc-800 text-sm">
                          {c.apellido}, {c.nombre}{c.dni ? ` · ${c.dni}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">% participación (opcional)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01"
                    value={nuevo.porcentaje}
                    onChange={e => setNuevo(p => ({ ...p, porcentaje: e.target.value }))}
                    placeholder="50"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Observación (opcional)</Label>
                  <Input
                    value={nuevo.observacion}
                    onChange={e => setNuevo(p => ({ ...p, observacion: e.target.value }))}
                    placeholder="Cónyuge de Juan Pérez"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                  />
                </div>
              </div>
              <Button
                onClick={agregar}
                disabled={agregando || !nuevo.cliente_id}
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
