import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { estadoTramiteLabel, estadoTramiteColor, formatFecha, formatFechaHora, diasHastaVencimiento } from '@/lib/utils'
import { ArrowLeft, AlertTriangle, FileText, Feather, Clock, AlertCircle } from 'lucide-react'
import { TramiteAcciones } from '@/components/crm/tramite-acciones'
import { CalificacionSelector } from '@/components/crm/calificacion-selector'
import { DocsRequeridosAlert } from '@/components/crm/docs-requeridos-alert'
import { TramitePartesManager } from '@/components/crm/tramite-partes-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Detalle de operación' }

export default async function DetalleTramiteCRMPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tramite } = await supabase
    .from('tramites')
    .select('*, cliente:clientes(*), escribano:profiles(id, nombre, apellido)')
    .eq('id', id)
    .single()

  if (!tramite) notFound()

  const [
    { data: hitos },
    { data: documentos },
    { data: alertas },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('tramite_hitos').select('*').eq('tramite_id', id).order('fecha', { ascending: false }),
    supabase.from('documentos').select('*').eq('tramite_id', id).order('created_at', { ascending: false }),
    supabase.from('alertas_uif').select('*').eq('tramite_id', id),
    supabase.from('profiles').select('id, nombre, apellido').in('rol', ['secretaria', 'protocolista', 'escribano']),
  ])

  const cliente = tramite.cliente as Record<string, string> | null
  const escribano = tramite.escribano as { id: string; nombre: string; apellido: string } | null

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/tramites">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Operaciones
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-semibold text-white">{tramite.tipo as string}</h1>
              <Badge className={`${estadoTramiteColor(tramite.estado)}`}>
                {estadoTramiteLabel(tramite.estado)}
              </Badge>
              {tramite.requiere_uif && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 gap-1">
                  <AlertTriangle size={12} />UIF
                </Badge>
              )}
            </div>
            {tramite.numero_referencia && (
              <p className="text-zinc-400 text-sm">Ref: {tramite.numero_referencia as string}</p>
            )}
          </div>
          <Link href={`/crm/tramites/${id}/minuta`}>
            <Button variant="outline" size="sm" className="border-lime-400/40 text-lime-400 hover:bg-lime-400/10 gap-2">
              <Feather size={14} />Asistir Minuta
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerta de observación con fecha límite */}
      {tramite.estado === 'observado' && tramite.fecha_limite_observacion && (() => {
        const dias = diasHastaVencimiento(tramite.fecha_limite_observacion as string)
        const vencido = dias !== null && dias < 0
        const proxVencer = dias !== null && dias >= 0 && dias <= 15
        const colorBase = vencido
          ? 'border-red-500/40 bg-red-500/10'
          : proxVencer
            ? 'border-orange-500/40 bg-orange-500/10'
            : 'border-yellow-500/30 bg-yellow-500/5'
        const Icon = vencido ? AlertCircle : Clock
        const iconColor = vencido ? 'text-red-400' : proxVencer ? 'text-orange-400' : 'text-yellow-400'
        const titleColor = vencido ? 'text-red-300' : proxVencer ? 'text-orange-300' : 'text-yellow-300'
        const titulo = vencido
          ? `⚠ Plazo VENCIDO hace ${Math.abs(dias!)} día${Math.abs(dias!) === 1 ? '' : 's'}`
          : proxVencer
            ? `Plazo próximo: vence en ${dias} día${dias === 1 ? '' : 's'}`
            : `Plazo: vence en ${dias} días`
        return (
          <div className={`mb-6 p-4 rounded-lg border ${colorBase}`}>
            <div className="flex items-start gap-3">
              <Icon size={18} className={`${iconColor} shrink-0 mt-0.5`} />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${titleColor}`}>{titulo}</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Fecha límite: <strong className="text-zinc-200">{formatFecha(tramite.fecha_limite_observacion as string)}</strong>
                </p>
                {tramite.observacion_registro && (
                  <p className="text-zinc-300 text-sm mt-2 italic">"{tramite.observacion_registro as string}"</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Documentos requeridos faltantes */}
      <div className="mb-6">
        <DocsRequeridosAlert
          tramite={{
            tipo: tramite.tipo as string,
            monto: tramite.monto as number | null,
            monto_efectivo: tramite.monto_efectivo as number | null,
            dispara_uif: tramite.dispara_uif as boolean | null,
            requiere_uif: tramite.requiere_uif as boolean | null,
            forma_pago: tramite.forma_pago as string | null,
          }}
          cliente={cliente as { es_pep?: boolean; es_sujeto_obligado?: boolean; tipo_persona?: string } | null}
          documentos={documentos ?? []}
        />
      </div>

      {/* Alertas UIF activas */}
      {alertas && alertas.filter(a => a.estado === 'pendiente').length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            <p className="text-yellow-300 font-medium text-sm">Alertas UIF pendientes</p>
          </div>
          {alertas.filter(a => a.estado === 'pendiente').map(a => (
            <p key={a.id} className="text-zinc-300 text-sm">· {a.descripcion}</p>
          ))}
          <Link href="/crm/uif" className="text-yellow-400 text-xs hover:underline mt-2 inline-block">
            Gestionar en panel UIF →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Info + Acciones */}
        <div className="space-y-4">
          {/* Info de la operación */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-300">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {tramite.descripcion && (
                <p className="text-zinc-300 pb-2">{tramite.descripcion}</p>
              )}
              {[
                ['Cliente', cliente ? `${cliente.apellido}, ${cliente.nombre}` : null, cliente ? `/crm/clientes/${tramite.cliente_id}` : null],
                ['Escribano/a', escribano ? `${escribano.apellido}, ${escribano.nombre}` : null, null],
                ['Monto', tramite.monto ? `$${Number(tramite.monto).toLocaleString('es-AR')}` : null, null],
                ['Iniciado', formatFecha(tramite.created_at), null],
                ['Actualizado', formatFecha(tramite.updated_at), null],
              ].map(([label, value, href]) => value ? (
                <div key={label as string} className="flex gap-2">
                  <span className="text-zinc-500 shrink-0 w-24">{label}</span>
                  {href ? (
                    <Link href={href as string} className="text-lime-400 hover:underline truncate">{value}</Link>
                  ) : (
                    <span className="text-zinc-200">{value}</span>
                  )}
                </div>
              ) : null)}
            </CardContent>
          </Card>

          {/* Calificaciones (UIF + riesgo cliente) */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-300">Calificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <CalificacionSelector
                tramiteId={id}
                clienteId={tramite.cliente_id as string}
                estadoUifActual={tramite.estado_uif as string | null}
                nivelRiesgoActual={cliente?.nivel_riesgo ?? null}
              />
            </CardContent>
          </Card>

          {/* Acciones (cambio de estado, hito, documentos) */}
          <TramiteAcciones
            tramiteId={id}
            estadoActual={tramite.estado}
            profiles={profiles ?? []}
          />
        </div>

        {/* Columna derecha: Hitos + Documentos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Múltiples partes intervinientes */}
          <TramitePartesManager tramiteId={id} />

          {/* Notas internas */}
          {tramite.notas_internas && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-300">Notas internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300 text-sm">{tramite.notas_internas}</p>
              </CardContent>
            </Card>
          )}

          {/* Historial de hitos */}
          <div>
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
              Historial de actividad ({hitos?.length ?? 0})
            </h2>
            {!hitos || hitos.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6 border border-dashed border-zinc-700 rounded-lg">
                Sin actividad registrada.
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-800" />
                <div className="space-y-4 pl-10">
                  {hitos.map(hito => (
                    <div key={hito.id} className="relative">
                      <div className="absolute -left-7 top-1.5 w-2.5 h-2.5 rounded-full bg-lime-400 ring-2 ring-zinc-900" />
                      <p className="text-zinc-200 text-sm">{hito.descripcion}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{formatFechaHora(hito.fecha)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documentos */}
          <div>
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
              Documentos ({documentos?.length ?? 0})
            </h2>
            {!documentos || documentos.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6 border border-dashed border-zinc-700 rounded-lg">
                Sin documentos adjuntos.
              </p>
            ) : (
              <div className="space-y-2">
                {documentos.map(d => (
                  <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 transition-colors group">
                    <FileText size={14} className="text-zinc-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-300 text-sm truncate group-hover:text-lime-400 transition-colors">{d.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {d.tipo && <span className="text-zinc-600 text-xs uppercase">{d.tipo}</span>}
                        <span className="text-zinc-600 text-xs">{formatFecha(d.created_at)}</span>
                        {d.visible_cliente && (
                          <Badge className="bg-blue-500/20 text-blue-300 border-0 text-xs px-1 py-0">Visible al cliente</Badge>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
