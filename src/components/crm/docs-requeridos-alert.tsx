import { calcularDocsRequeridos, detectarFaltantes } from '@/lib/documentos-requeridos'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  tramite: {
    tipo?: string | null
    monto?: number | null
    monto_efectivo?: number | null
    dispara_uif?: boolean | null
    requiere_uif?: boolean | null
    forma_pago?: string | null
  }
  cliente: {
    es_pep?: boolean | null
    es_sujeto_obligado?: boolean | null
    tipo_persona?: string | null
  } | null
  documentos: { categoria?: string | null; tipo?: string | null }[]
  smvm?: number
}

export function DocsRequeridosAlert({ tramite, cliente, documentos, smvm = 308200 }: Props) {
  const requeridos = calcularDocsRequeridos(tramite, cliente, smvm)
  if (requeridos.length === 0) return null

  const faltantes = detectarFaltantes(requeridos, documentos)
  const completos = requeridos.length - faltantes.length

  if (faltantes.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
        <CheckCircle2 size={15} className="text-green-400 shrink-0" />
        <p className="text-green-300 text-sm">
          Documentación UIF completa ({completos}/{requeridos.length} documentos requeridos cargados).
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
        <p className="text-yellow-300 font-medium text-sm">
          Documentos requeridos faltantes ({faltantes.length}/{requeridos.length})
        </p>
      </div>
      <ul className="space-y-1.5 ml-6">
        {faltantes.map(d => (
          <li key={d.categoria} className="text-zinc-300 text-sm">
            <span className="font-medium">· {d.label}</span>
            <span className="text-zinc-500 text-xs ml-2">— {d.motivo}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
