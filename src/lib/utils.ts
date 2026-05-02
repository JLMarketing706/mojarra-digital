import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFecha(fecha: string | Date): string {
  return format(new Date(fecha), 'dd/MM/yyyy', { locale: es })
}

export function formatFechaHora(fecha: string | Date): string {
  return format(new Date(fecha), 'dd/MM/yyyy HH:mm', { locale: es })
}

export function estadoTramiteLabel(estado: string): string {
  const labels: Record<string, string> = {
    // 'borrador' / 'iniciado' (legacy) → ambos se muestran como "Iniciado"
    borrador: 'Iniciado',
    iniciado: 'Iniciado',
    en_proceso: 'En proceso',
    en_registro: 'En registro',
    observado: 'Observado',
    listo: 'Listo para retirar',
    entregado: 'Entregado',
  }
  return labels[estado] ?? estado
}

export function estadoTramiteColor(estado: string): string {
  const colors: Record<string, string> = {
    borrador: 'bg-zinc-500/20 text-zinc-400',
    iniciado: 'bg-zinc-500/20 text-zinc-400',
    en_proceso: 'bg-blue-500/20 text-blue-300',
    en_registro: 'bg-yellow-500/20 text-yellow-300',
    observado: 'bg-orange-500/20 text-orange-300',
    listo: 'bg-lime-500/20 text-lime-300',
    entregado: 'bg-zinc-600/20 text-zinc-400',
  }
  return colors[estado] ?? 'bg-zinc-500/20 text-zinc-300'
}

/** Días entre hoy y la fecha límite. Negativo si ya venció. */
export function diasHastaVencimiento(fechaLimite: string | null | undefined): number | null {
  if (!fechaLimite) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const limite = new Date(fechaLimite)
  limite.setHours(0, 0, 0, 0)
  return Math.round((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatMonto(valor: number | string): string {
  const num = typeof valor === 'string'
    ? parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    : valor
  if (isNaN(num)) return ''
  return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseMonto(valor: string): number {
  return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
}

/** Formatea un CUIT/CUIL con guiones medios mientras se tipea: XX-XXXXXXXX-X */
export function formatCuit(valor: string): string {
  const soloDigitos = (valor ?? '').replace(/\D/g, '').slice(0, 11)
  if (soloDigitos.length <= 2) return soloDigitos
  if (soloDigitos.length <= 10) return `${soloDigitos.slice(0, 2)}-${soloDigitos.slice(2)}`
  return `${soloDigitos.slice(0, 2)}-${soloDigitos.slice(2, 10)}-${soloDigitos.slice(10)}`
}

export function estadoUifLabel(estado: string | null | undefined): string {
  const labels: Record<string, string> = {
    no: 'No requiere informe',
    inusual: 'Operación inusual',
    en_analisis: 'En análisis',
    sospechosa: 'Sospechosa — pendiente de informar',
    reportada: 'Informado a UIF',
  }
  return labels[estado ?? 'no'] ?? '—'
}

export function estadoUifColor(estado: string | null | undefined): string {
  const colors: Record<string, string> = {
    no: 'bg-zinc-700/40 text-zinc-300 border-zinc-600',
    inusual: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
    en_analisis: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
    sospechosa: 'bg-red-500/15 text-red-300 border-red-500/40',
    reportada: 'bg-green-500/15 text-green-300 border-green-500/40',
  }
  return colors[estado ?? 'no'] ?? 'bg-zinc-700/40 text-zinc-300 border-zinc-600'
}

export function nivelRiesgoLabel(nivel: string | null | undefined): string {
  const labels: Record<string, string> = {
    bajo: 'Riesgo bajo',
    medio: 'Riesgo medio',
    alto: 'Riesgo alto',
  }
  return labels[nivel ?? ''] ?? 'Sin calificar'
}

export function nivelRiesgoColor(nivel: string | null | undefined): string {
  const colors: Record<string, string> = {
    bajo: 'bg-green-500/15 text-green-300 border-green-500/40',
    medio: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
    alto: 'bg-red-500/15 text-red-300 border-red-500/40',
  }
  return colors[nivel ?? ''] ?? 'bg-zinc-700/40 text-zinc-400 border-zinc-700'
}
