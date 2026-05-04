'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Users, ShoppingCart, Building, ChevronDown, ChevronRight, UserPlus } from 'lucide-react'
import { ClienteCombobox } from '@/components/crm/cliente-combobox'

// ─── Tipos ────────────────────────────────────────────────
export type RolPartePrincipal = 'comprador' | 'vendedor'
export type RolOtro = 'conyuge' | 'conviviente' | 'apoderado' | 'padre' | 'madre' | 'fiador' | 'otro'

const ROL_OTRO_LABELS: Record<RolOtro, string> = {
  conyuge: 'Cónyuge',
  conviviente: 'Conviviente',
  apoderado: 'Apoderado',
  padre: 'Padre',
  madre: 'Madre',
  fiador: 'Fiador / Garante',
  otro: 'Otro',
}

export interface OtroParte {
  id: string                   // UUID temporal client-side
  rol: RolOtro
  nombre: string               // Nombre completo (apellido y nombre)
  dni: string                  // DNI / documento (opcional)
  observacion: string
}

export interface PartePrincipal {
  id: string                   // UUID temporal client-side
  cliente_id: string
  observacion: string
  otros: OtroParte[]
}

interface ClienteOpt {
  id: string
  nombre: string
  apellido: string
  dni: string | null
}

interface Props {
  clientes: ClienteOpt[]
  compradores: PartePrincipal[]
  vendedores: PartePrincipal[]
  onChange: (compradores: PartePrincipal[], vendedores: PartePrincipal[]) => void
  /**
   * Si se provee, muestra un botón "+ Crear" al lado de cada select de cliente.
   * El parent abre el modal de quick-create y, una vez creado, debe llamar
   * al callback con el id del nuevo cliente para que se asigne al slot.
   */
  onCrearCliente?: (asignarAlSlot: (clienteId: string) => void) => void
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export function CompradoresVendedoresForm({
  clientes, compradores, vendedores, onChange, onCrearCliente,
}: Props) {

  function nuevaParte(): PartePrincipal {
    return { id: uid(), cliente_id: '', observacion: '', otros: [] }
  }

  function nuevoOtro(): OtroParte {
    return { id: uid(), rol: 'conyuge', nombre: '', dni: '', observacion: '' }
  }

  function actualizarPrincipal(
    lista: 'compradores' | 'vendedores',
    parteId: string,
    cambios: Partial<PartePrincipal>,
  ) {
    const update = (arr: PartePrincipal[]) =>
      arr.map(p => p.id === parteId ? { ...p, ...cambios } : p)
    if (lista === 'compradores') onChange(update(compradores), vendedores)
    else onChange(compradores, update(vendedores))
  }

  function agregarPrincipal(lista: 'compradores' | 'vendedores') {
    if (lista === 'compradores') onChange([...compradores, nuevaParte()], vendedores)
    else onChange(compradores, [...vendedores, nuevaParte()])
  }

  function eliminarPrincipal(lista: 'compradores' | 'vendedores', parteId: string) {
    if (lista === 'compradores') onChange(compradores.filter(p => p.id !== parteId), vendedores)
    else onChange(compradores, vendedores.filter(p => p.id !== parteId))
  }

  function agregarOtro(lista: 'compradores' | 'vendedores', parteId: string) {
    actualizarPrincipal(lista, parteId, {
      otros: [...((lista === 'compradores' ? compradores : vendedores).find(p => p.id === parteId)?.otros ?? []), nuevoOtro()],
    })
  }

  function actualizarOtro(
    lista: 'compradores' | 'vendedores',
    parteId: string,
    otroId: string,
    cambios: Partial<OtroParte>,
  ) {
    const arr = lista === 'compradores' ? compradores : vendedores
    const parte = arr.find(p => p.id === parteId)
    if (!parte) return
    actualizarPrincipal(lista, parteId, {
      otros: parte.otros.map(o => o.id === otroId ? { ...o, ...cambios } : o),
    })
  }

  function eliminarOtro(lista: 'compradores' | 'vendedores', parteId: string, otroId: string) {
    const arr = lista === 'compradores' ? compradores : vendedores
    const parte = arr.find(p => p.id === parteId)
    if (!parte) return
    actualizarPrincipal(lista, parteId, {
      otros: parte.otros.filter(o => o.id !== otroId),
    })
  }

  function renderSeccion(
    titulo: string,
    icono: React.ReactNode,
    color: string,
    lista: 'compradores' | 'vendedores',
    partes: PartePrincipal[],
  ) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-medium flex items-center gap-2 ${color}`}>
            {icono}{titulo} ({partes.length})
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => agregarPrincipal(lista)}
            className={`border-zinc-700 hover:bg-zinc-800 gap-1.5 ${color}`}
          >
            <Plus size={13} />Agregar {lista === 'compradores' ? 'comprador' : 'vendedor'}
          </Button>
        </div>

        {partes.length === 0 ? (
          <p className="text-xs text-zinc-500 italic px-3 py-3 border border-dashed border-zinc-700 rounded-md text-center">
            Sin {lista} cargados.
          </p>
        ) : (
          <div className="space-y-3">
            {partes.map((parte, idx) => (
              <PrincipalCard
                key={parte.id}
                indice={idx + 1}
                titulo={lista === 'compradores' ? 'Comprador' : 'Vendedor'}
                color={color}
                parte={parte}
                clientes={clientes}
                onChange={cambios => actualizarPrincipal(lista, parte.id, cambios)}
                onEliminar={() => eliminarPrincipal(lista, parte.id)}
                onAgregarOtro={() => agregarOtro(lista, parte.id)}
                onActualizarOtro={(otroId, cambios) => actualizarOtro(lista, parte.id, otroId, cambios)}
                onEliminarOtro={(otroId) => eliminarOtro(lista, parte.id, otroId)}
                onCrearClientePrincipal={onCrearCliente
                  ? () => onCrearCliente((id) => actualizarPrincipal(lista, parte.id, { cliente_id: id }))
                  : undefined}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
          <Users size={14} className="text-lime-400" />Compradores y vendedores
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Cargá uno o más por lado. Si necesitás sumar a un cónyuge, padre, apoderado, etc. que
          también comparece, agregalo como "Otro" dentro del comprador o vendedor que corresponda.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderSeccion('Compradores', <ShoppingCart size={14} />, 'text-lime-400', 'compradores', compradores)}
        <div className="border-t border-zinc-800" />
        {renderSeccion('Vendedores', <Building size={14} />, 'text-zinc-300', 'vendedores', vendedores)}
      </CardContent>
    </Card>
  )
}

// ─── Sub-componente: card de una parte principal con sus "otros" ──
function PrincipalCard({
  indice, titulo, color, parte, clientes,
  onChange, onEliminar, onAgregarOtro, onActualizarOtro, onEliminarOtro,
  onCrearClientePrincipal,
}: {
  indice: number
  titulo: string
  color: string
  parte: PartePrincipal
  clientes: ClienteOpt[]
  onChange: (c: Partial<PartePrincipal>) => void
  onEliminar: () => void
  onAgregarOtro: () => void
  onActualizarOtro: (otroId: string, c: Partial<OtroParte>) => void
  onEliminarOtro: (otroId: string) => void
  onCrearClientePrincipal?: () => void
}) {
  const [expandidoOtros, setExpandidoOtros] = useState(parte.otros.length > 0)

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3 space-y-3">
      <div className="flex items-start gap-3">
        <span className={`text-xs uppercase tracking-wider font-medium shrink-0 mt-2 ${color}`}>
          {titulo} {indice}
        </span>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex gap-1.5">
            <ClienteCombobox
              value={parte.cliente_id}
              onChange={v => onChange({ cliente_id: v })}
              clientes={clientes}
              triggerHeight="h-9"
              className="flex-1"
            />
            {onCrearClientePrincipal && (
              <Button
                type="button" variant="outline" size="sm"
                onClick={onCrearClientePrincipal}
                title="Crear cliente rápido"
                className="border-zinc-700 text-lime-400 hover:bg-lime-400/10 h-9 px-2 shrink-0"
              >
                <UserPlus size={13} />
              </Button>
            )}
          </div>
          <Input
            value={parte.observacion}
            onChange={e => onChange({ observacion: e.target.value })}
            placeholder="Observación (opcional)"
            className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
          />
        </div>
        <Button
          type="button" variant="ghost" size="sm"
          onClick={onEliminar}
          className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0 shrink-0"
        >
          <Trash2 size={13} />
        </Button>
      </div>

      {/* Subsección "Otros" */}
      <div className="pl-2 border-l-2 border-zinc-700 ml-2">
        <button
          type="button"
          onClick={() => setExpandidoOtros(v => !v)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 mb-2"
        >
          {expandidoOtros ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Otros que comparecen ({parte.otros.length})
        </button>

        {expandidoOtros && (
          <div className="space-y-2 ml-1">
            {parte.otros.map((otro) => (
              <div key={otro.id} className="rounded-md bg-zinc-900/60 border border-zinc-700 p-2.5">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <Select value={otro.rol} onValueChange={(v: RolOtro) => onActualizarOtro(otro.id, { rol: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 sm:col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {(Object.keys(ROL_OTRO_LABELS) as RolOtro[]).map(r => (
                          <SelectItem key={r} value={r} className="text-zinc-200 focus:bg-zinc-800 text-xs">
                            {ROL_OTRO_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={otro.nombre}
                      onChange={e => onActualizarOtro(otro.id, { nombre: e.target.value })}
                      placeholder="Apellido y nombre"
                      className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 sm:col-span-4"
                    />
                    <Input
                      value={otro.dni}
                      onChange={e => onActualizarOtro(otro.id, { dni: e.target.value })}
                      placeholder="DNI"
                      inputMode="numeric"
                      className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 sm:col-span-2"
                    />
                    <Input
                      value={otro.observacion}
                      onChange={e => onActualizarOtro(otro.id, { observacion: e.target.value })}
                      placeholder="Observación"
                      className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 sm:col-span-3"
                    />
                  </div>
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => onEliminarOtro(otro.id)}
                    className="text-red-400 hover:bg-red-500/10 h-6 w-6 p-0 shrink-0"
                  >
                    <Trash2 size={11} />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button" size="sm" variant="ghost"
              onClick={onAgregarOtro}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 gap-1 text-xs h-7"
            >
              <Plus size={11} />Agregar otro
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
