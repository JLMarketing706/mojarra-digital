'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Input estilo calculadora para montos en pesos / moneda.
 *
 * - Default visible: "0,00"
 * - Cada dígito que se tipea acumula desde la derecha:
 *     "5"     → "0,05"
 *     "55"    → "0,55"
 *     "555"   → "5,55"
 *     "5555"  → "55,55"
 *     "555555"→ "5.555,55"
 * - Backspace borra dígito por dígito
 * - Pegar acepta números con puntos/comas, extrae los dígitos
 * - Texto alineado a la derecha como una calculadora
 * - Mantiene la tipografía del sistema (NO monoespaciada)
 *
 * El `value` que recibe / emite es la cadena del número en formato JS
 * ("1234.56"), para que parseFloat funcione directo.
 */
interface Props {
  label?: string
  value: string
  onChange: (v: string) => void
  helpText?: string
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function MontoInput({ label, value, onChange, helpText, className = '', placeholder, disabled }: Props) {
  const [digits, setDigits] = useState(() => valueToDigits(value))

  useEffect(() => {
    const externo = valueToDigits(value)
    if (externo !== digits) setDigits(externo)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      if (digits.length >= 15) return
      const nuevos = (digits + e.key).replace(/^0+/, '')
      actualizar(nuevos)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      actualizar(digits.slice(0, -1))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      actualizar('')
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      // dejar pasar para navegación / submit
      return
    } else if (!e.metaKey && !e.ctrlKey) {
      // Bloquear cualquier otro input que no sea modifier
      e.preventDefault()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    if (disabled) return
    e.preventDefault()
    const txt = e.clipboardData.getData('text')
    const soloDigitos = txt.replace(/\D/g, '')
    if (!soloDigitos) return
    const num = parseInt(soloDigitos, 10)
    if (!isNaN(num)) actualizar(String(num))
  }

  function actualizar(nuevosDigits: string) {
    setDigits(nuevosDigits)
    if (!nuevosDigits) { onChange(''); return }
    const numero = parseInt(nuevosDigits, 10) / 100
    onChange(String(numero))
  }

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-zinc-300">{label}</Label>}
      <Input
        value={digitsToDisplay(digits)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => { /* manejado por keydown */ }}
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        className={`text-right ${className}`}
      />
      {helpText && <p className="text-xs text-zinc-500">{helpText}</p>}
    </div>
  )
}

/** Convierte el value externo (ej "1234.56") a dígitos internos ("123456") */
export function valueToDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num) || num <= 0) return ''
  return String(Math.round(num * 100))
}

/** Convierte dígitos internos a display formateado es-AR */
export function digitsToDisplay(digits: string): string {
  if (!digits) return '0,00'
  const padded = digits.padStart(3, '0')
  const enteros = padded.slice(0, -2)
  const decimales = padded.slice(-2)
  const enterosFmt = enteros.replace(/^0+/, '') || '0'
  const conPuntos = enterosFmt.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${conPuntos},${decimales}`
}
