import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { estadoTramiteLabel, estadoTramiteColor, formatFecha, formatFechaHora } from '@/lib/utils'
import {
  ArrowLeft, CheckCircle2, Circle, FileDown, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Detalle de la operación' }

const ESTADOS_ORDEN = ['iniciado', 'en_proceso', 'en_registro', 'listo', 'entregado']

export default async function DetalleTramitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener cliente del usuario
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!cliente) notFound()

  // Obtener operación (verificar que pertenece al cliente)
  const { data: tramite } = await supabase
    .from('tramites')
    .select('*, escribano:profiles(nombre, apellido)')
    .eq('id', id)
    .eq('cliente_id', cliente.id)
    .single()

  if (!tramite) notFound()

  // Obtener hitos
  const { data: hitos } = await supabase
    .from('tramite_hitos')
    .select('*')
    .eq('tramite_id', id)
    .order('fecha', { ascending: true })

  // Obtener documentos visibles para el cliente
  const { data: documentos } = await supabase
    .from('documentos')
    .select('*')
    .eq('tramite_id', id)
    .eq('visible_cliente', true)
    .order('created_at', { ascending: false })

  const estadoActualIdx = ESTADOS_ORDEN.indexOf(tramite.estado)

  return (
    <div>
      <div className="mb-6">
        <Link href="/portal/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2 mb-4">
            <ArrowLeft size={14} />
            Mis operaciones
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{tramite.tipo}</h1>
            {tramite.numero_referencia && (
              <p className="text-muted-foreground text-sm mt-0.5">
                Referencia: {tramite.numero_referencia}
              </p>
            )}
          </div>
          <Badge className={`self-start sm:self-auto text-sm px-3 py-1 ${estadoTramiteColor(tramite.estado)}`}>
            {estadoTramiteLabel(tramite.estado)}
          </Badge>
        </div>
      </div>

      {/* Línea de tiempo de estados */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estado de la operación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-0">
            {ESTADOS_ORDEN.map((estado, idx) => {
              const completado = idx <= estadoActualIdx
              const actual = idx === estadoActualIdx
              return (
                <div key={estado} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      completado ? 'bg-lime-500 text-black' : 'bg-muted border border-border'
                    } ${actual ? 'ring-2 ring-lime-500 ring-offset-2 ring-offset-background' : ''}`}>
                      {completado ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Circle size={14} className="text-muted-foreground" />
                      )}
                    </div>
                    <span className={`text-xs text-center leading-tight ${
                      actual ? 'text-lime-500 font-medium' : completado ? 'text-foreground' : 'text-muted-foreground'
                    }`} style={{ maxWidth: 70 }}>
                      {estadoTramiteLabel(estado)}
                    </span>
                  </div>
                  {idx < ESTADOS_ORDEN.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 mb-5 ${idx < estadoActualIdx ? 'bg-lime-500' : 'bg-muted'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hitos / timeline */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Historial de actividad
          </h2>

          {!hitos || hitos.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center border border-dashed border-border rounded-lg">
              Aún no hay actividad registrada.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4 pl-10">
                {[...hitos].reverse().map((hito, idx) => (
                  <div key={hito.id} className="relative">
                    <div className="absolute -left-7 top-1 w-2.5 h-2.5 rounded-full bg-lime-500 ring-2 ring-background" />
                    <p className="text-sm font-medium">{hito.descripcion}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFechaHora(hito.fecha)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar con info + documentos */}
        <div className="space-y-4">
          {/* Info básica */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Iniciado</span>
                <span>{formatFecha(tramite.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última actualización</span>
                <span>{formatFecha(tramite.updated_at)}</span>
              </div>
              {tramite.escribano && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escribano/a</span>
                    <span>
                      {(tramite.escribano as { nombre: string; apellido: string }).nombre}{' '}
                      {(tramite.escribano as { nombre: string; apellido: string }).apellido}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              {!documentos || documentos.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aún no hay documentos disponibles.
                </p>
              ) : (
                <div className="space-y-2">
                  {documentos.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-lime-500 transition-colors group"
                    >
                      <FileDown size={14} className="text-muted-foreground group-hover:text-lime-500" />
                      <span className="flex-1 truncate">{doc.nombre}</span>
                      <ExternalLink size={12} className="text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
