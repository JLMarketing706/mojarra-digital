'use client'

import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { MontoInput } from '@/components/crm/monto-input'
import { LABEL_FORMA_PAGO } from '@/types'
import type { FormaPago } from '@/types'
import { parseMonto, formatMonto } from '@/lib/utils'

export interface FormaPagoEntry {
  /** ID local (UUID temporal o real). Solo para keying en React. */
  id: string
  forma_pago: FormaPago | ''
  /** Monto como string para edición libre (parseMonto al guardar) */
  monto: string
  observacion: string
}

const FORMAS_PAGO_LIST: FormaPago[] = [
  'efectivo', 'transferencia', 'cheque', 'permuta',
  'credito_hipotecario', 'otra',
]

interface Props {
  value: FormaPagoEntry[]
  onChange: (next: FormaPagoEntry[]) => void
  /** Total esperado (monto de la operación). Si está, validamos suma. */
  montoTotal?: number
  /** SMVM para mostrar warning si una entrada de efectivo supera el umbral */
  smvm?: number
}

function uid() {
  return `fp-${Math.random().toString(36).slice(2, 10)}`
}

export function nuevaFormaPagoVacia(): FormaPagoEntry {
  return { id: uid(), forma_pago: '', monto: '', observacion: '' }
}

export function FormasPagoMultiInput({ value, onChange, montoTotal, smvm }: Props) {
  const sumaActual = useMemo(
    () => value.reduce((acc, e) => acc + parseMonto(e.monto), 0),
    [value]
  )
  const efectivoTotal = useMemo(
    () => value
      .filter(e => e.forma_pago === 'efectivo')
      .reduce((acc, e) => acc + parseMonto(e.monto), 0),
    [value]
  )
  const umbralEfectivo = (smvm ?? 0) * 700
  const efectivoSuperaUmbral = umbralEfectivo > 0 && efectivoTotal >= umbralEfectivo

  function add() {
    onChange([...value, nuevaFormaPagoVacia()])
  }
  function remove(id: string) {
    onChange(value.filter(e => e.id !== id))
  }
  function update(id: string, patch: Partial<FormaPagoEntry>) {
    onChange(value.map(e => (e.id === id ? { ...e, ...patch } : e)))
  }

  const diferencia = montoTotal != null ? sumaActual - montoTotal : 0
  const sumaCoincide = montoTotal != null && montoTotal > 0 && Math.abs(diferencia) < 0.5

  return (
    <div className="space-y-2.5">
      {value.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-900/50 p-4 text-center">
          <p className="text-sm text-zinc-500 mb-2">
            Sin formas de pago cargadas
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            className="border-zinc-700 text-lime-400 hover:bg-lime-400/10 gap-1.5"
          >
            <Plus size={14} /> Agregar forma de pago
          </Button>
        </div>
      ) : (
        <>
          {value.map((entry, i) => (
            <div
              key={entry.id}
              className="rounded-md border border-zinc-700 bg-zinc-800/30 p-2.5 sm:p-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                {/* Forma */}
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs text-zinc-400">
                    Forma de pago {value.length > 1 && <span className="text-zinc-600">#{i + 1}</span>}
                  </Label>
                  <Select
                    value={entry.forma_pago}
                    onValueChange={v => update(entry.id, { forma_pago: v as FormaPago })}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-sm h-9">
                      <SelectValue placeholder="Elegir" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {FORMAS_PAGO_LIST.map(f => (
                        <SelectItem key={f} value={f} className="text-zinc-200 focus:bg-zinc-800 text-sm">
                          {LABEL_FORMA_PAGO[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Monto */}
                <div className="sm:col-span-3">
                  <MontoInput
                    label="Monto (ARS)"
                    value={entry.monto}
                    onChange={v => update(entry.id, { monto: v })}
                  />
                </div>

                {/* Observación */}
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs text-zinc-400">Observación</Label>
                  <Input
                    value={entry.observacion}
                    onChange={e => update(entry.id, { observacion: e.target.value })}
                    placeholder="Ej: cheque del Banco Nación nº 1234"
                    className="bg-zinc-900 border-zinc-700 text-white text-sm h-9 placeholder:text-zinc-500"
                  />
                </div>

                {/* Borrar */}
                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(entry.id)}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 h-9 w-9 p-0"
                    aria-label="Quitar forma de pago"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Footer con suma + botón agregar */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={add}
              className="border-zinc-700 text-lime-400 hover:bg-lime-400/10 gap-1.5"
            >
              <Plus size={14} /> Agregar otra
            </Button>

            <div className="flex items-center gap-2 text-xs">
              {montoTotal != null && montoTotal > 0 ? (
                <>
                  <span className="text-zinc-500">
                    Suma: <span className="text-zinc-200 font-mono">${formatMonto(sumaActual)}</span>
                    {' '}/ Total operación: <span className="text-zinc-300 font-mono">${formatMonto(montoTotal)}</span>
                  </span>
                  {sumaCoincide ? (
                    <span className="inline-flex items-center gap-1 text-lime-400">
                      <CheckCircle2 size={12} /> coincide
                    </span>
                  ) : sumaActual > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <AlertTriangle size={12} />
                      {diferencia > 0
                        ? `excede en $${formatMonto(diferencia)}`
                        : `falta $${formatMonto(-diferencia)}`}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-zinc-500">
                  Suma: <span className="text-zinc-200 font-mono">${formatMonto(sumaActual)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Warning UIF si efectivo supera 700 SMVM */}
          {efectivoSuperaUmbral && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2.5 flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300 leading-snug">
                El total en efectivo (${formatMonto(efectivoTotal)}) supera los 700 SMVM —
                la operación va a disparar reporte UIF.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
