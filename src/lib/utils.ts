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
    iniciado: 'Iniciado',
    en_proceso: 'En proceso',
    en_registro: 'En registro',
    listo: 'Listo para retirar',
    entregado: 'Entregado',
  }
  return labels[estado] ?? estado
}

export function estadoTramiteColor(estado: string): string {
  const colors: Record<string, string> = {
    iniciado: 'bg-zinc-500/20 text-zinc-300',
    en_proceso: 'bg-blue-500/20 text-blue-300',
    en_registro: 'bg-yellow-500/20 text-yellow-300',
    listo: 'bg-lime-500/20 text-lime-300',
    entregado: 'bg-zinc-600/20 text-zinc-400',
  }
  return colors[estado] ?? 'bg-zinc-500/20 text-zinc-300'
}
