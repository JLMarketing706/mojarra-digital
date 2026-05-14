import {
  calcularDocsRequeridos, detectarFaltantes,
  type ContextoCliente, type DocRequerido,
} from '@/lib/documentos-requeridos'
import { AlertTriangle, CheckCircle2, User, FileSearch } from 'lucide-react'

interface Props {
  tramite: {
    tipo?: string | null
    monto?: number | null
    monto_efectivo?: number | null
    dispara_uif?: boolean | null
    requiere_uif?: boolean | null
    forma_pago?: string | null
  }
  /** Todos los clientes involucrados (principal + compradores/vendedores) */
  clientes: ContextoCliente[]
  documentos: {
    categoria?: string | null
    tipo?: string | null
    cliente_id?: string | null
  }[]
  smvm?: number
}

export function DocsRequeridosAlert({ tramite, clientes, documentos, smvm = 308200 }: Props) {
  const requeridos = calcularDocsRequeridos(tramite, clientes, smvm)
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

  // Agrupar faltantes: por cliente o "Operación" (NOSIS, DDJJ generales)
  type Grupo = { key: string; titulo: string; items: DocRequerido[] }
  const porGrupo = new Map<string, Grupo>()
  for (const f of faltantes) {
    const key = f.cliente ? `c:${f.cliente.id}` : 'op'
    const titulo = f.cliente
      ? `${f.cliente.apellido}, ${f.cliente.nombre}`
      : 'De la operación'
    if (!porGrupo.has(key)) {
      porGrupo.set(key, { key, titulo, items: [] })
    }
    porGrupo.get(key)!.items.push(f)
  }
  // Ordenar: los de operación primero, después los clientes en orden de aparición
  const grupos = Array.from(porGrupo.values()).sort((a, b) => {
    if (a.key === 'op') return -1
    if (b.key === 'op') return 1
    return a.titulo.localeCompare(b.titulo)
  })

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
        <p className="text-yellow-300 font-medium text-sm">
          Informes / documentos faltantes ({faltantes.length}/{requeridos.length})
        </p>
      </div>

      <div className="space-y-3">
        {grupos.map(g => (
          <div key={g.key}>
            <div className="flex items-center gap-1.5 mb-1.5">
              {g.key === 'op' ? (
                <FileSearch size={12} className="text-yellow-400/80 shrink-0" />
              ) : (
                <User size={12} className="text-yellow-400/80 shrink-0" />
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-yellow-300/80">
                {g.titulo}
              </p>
            </div>
            <ul className="space-y-1 ml-5">
              {g.items.map(d => {
                // Si el doc es por cliente, el label ya incluye el nombre.
                // Le saco la parte " — Nombre" porque ya está en el header del grupo.
                const labelLimpio = d.cliente
                  ? d.label.replace(/ — .+$/, '')
                  : d.label
                return (
                  <li key={d.categoria} className="text-zinc-300 text-sm flex items-baseline gap-2">
                    <span className="text-yellow-500/60">·</span>
                    <span>
                      <span className="font-medium">{labelLimpio}</span>
                      <span className="text-zinc-500 text-xs ml-2">— {d.motivo}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
