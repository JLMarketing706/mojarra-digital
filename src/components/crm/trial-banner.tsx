import Link from 'next/link'
import { Clock, AlertTriangle, Sparkles } from 'lucide-react'

interface Props {
  estado: 'trial' | 'activa' | 'suspendida' | 'cancelada' | string
  trialUntil: string | null  // YYYY-MM-DD
}

export function TrialBanner({ estado, trialUntil }: Props) {
  if (estado !== 'trial' || !trialUntil) return null

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fin = new Date(trialUntil + 'T00:00:00')
  const diasRestantes = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  // Vencido
  if (diasRestantes < 0) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-red-300 text-sm">
          <AlertTriangle size={16} />
          <span><strong>Tu prueba gratis venció.</strong> Suscribite a un plan para seguir usando Mojarra Digital.</span>
        </div>
        <Link
          href="/crm/configuracion/plan"
          className="bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          Elegir plan
        </Link>
      </div>
    )
  }

  // Últimos 3 días — naranja/advertencia
  if (diasRestantes <= 3) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-300 text-sm">
          <Clock size={16} />
          <span>
            Te {diasRestantes === 1 ? 'queda 1 día' : `quedan ${diasRestantes} días`} de prueba gratis.
            <span className="text-amber-200/80 ml-1">Suscribite antes para no perder acceso.</span>
          </span>
        </div>
        <Link
          href="/crm/configuracion/plan"
          className="bg-lime-400 hover:bg-lime-300 text-black text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          Elegir plan
        </Link>
      </div>
    )
  }

  // Trial activo — verde/neutral
  return (
    <div className="bg-lime-400/10 border-b border-lime-400/20 px-6 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-lime-300 text-xs">
        <Sparkles size={14} />
        <span>
          <strong>Prueba gratis activa</strong> — te {diasRestantes === 1 ? 'queda 1 día' : `quedan ${diasRestantes} días`}.
        </span>
      </div>
      <Link
        href="/crm/configuracion/plan"
        className="text-lime-400 hover:text-lime-300 text-xs underline underline-offset-2"
      >
        Ver planes
      </Link>
    </div>
  )
}
