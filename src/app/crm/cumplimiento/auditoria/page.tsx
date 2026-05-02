import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, History, Plus, Edit3, Trash2, FileX } from 'lucide-react'
import { formatFechaHora } from '@/lib/utils'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { AuditLog } from '@/types'

export const metadata: Metadata = { title: 'Logs de auditoría' }

const ACCION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-500/15 text-green-300 border-green-500/30',
  UPDATE: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  DELETE: 'bg-red-500/15 text-red-300 border-red-500/30',
}

const ACCION_ICON: Record<string, React.ElementType> = {
  INSERT: Plus,
  UPDATE: Edit3,
  DELETE: Trash2,
}

const ACCION_LABEL: Record<string, string> = {
  INSERT: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
}

const TABLA_LABEL: Record<string, string> = {
  clientes: 'Cliente',
  clientes_juridicos: 'Cliente jurídico',
  tramites: 'Trámite',
  declaraciones_juradas: 'DDJJ',
  ros_reportes: 'ROS',
  beneficiarios_finales: 'Beneficiario final',
  autoevaluaciones_riesgo: 'RSA',
  manual_procedimientos: 'Manual',
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ tabla?: string; accion?: string }>
}) {
  const { tabla, accion } = await searchParams
  const supabase = await createClient()

  let q = supabase
    .from('audit_logs')
    .select('*')
    .order('ts', { ascending: false })

  if (tabla) q = q.eq('tabla', tabla)
  if (accion) q = q.eq('accion', accion)

  const { data } = await q.limit(200)
  const logs = (data ?? []) as AuditLog[]

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Cumplimiento
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <History size={20} className="text-lime-400" />Logs de auditoría
        </h1>
        <p className="text-zinc-500 text-sm">
          Trazabilidad completa de todas las acciones sobre datos sensibles. Conservación 5 años (Ley 25.246).
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { v: '', label: 'Todas las tablas' },
          ...Object.entries(TABLA_LABEL).map(([k, l]) => ({ v: k, label: l })),
        ].map(t => (
          <Link key={t.v} href={t.v ? `/crm/cumplimiento/auditoria?tabla=${t.v}` : '/crm/cumplimiento/auditoria'}>
            <button className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              (tabla ?? '') === t.v
                ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                : 'text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
            }`}>{t.label}</button>
          </Link>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-xl">
          <FileX size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Sin actividad registrada{tabla ? ` en ${TABLA_LABEL[tabla] ?? tabla}` : ''}.</p>
        </div>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">Fecha/hora</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">Acción</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">Tabla</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs hidden md:table-cell">Usuario</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs hidden lg:table-cell">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => {
                    const Icon = ACCION_ICON[l.accion] ?? History
                    return (
                      <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-2.5 text-zinc-300 text-xs whitespace-nowrap">
                          {formatFechaHora(l.ts)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={`text-xs border ${ACCION_COLORS[l.accion] ?? 'bg-zinc-700 text-zinc-300'}`}>
                            <Icon size={10} className="mr-1" />
                            {ACCION_LABEL[l.accion] ?? l.accion}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-200 text-xs">
                          {TABLA_LABEL[l.tabla] ?? l.tabla}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 text-xs hidden md:table-cell">
                          {l.actor_email ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 text-xs font-mono hidden lg:table-cell">
                          {l.registro_id ? l.registro_id.slice(0, 8) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-zinc-500 mt-4">
        Mostrando últimas {logs.length} entradas. Los logs no se pueden modificar ni eliminar.
      </p>
    </div>
  )
}
