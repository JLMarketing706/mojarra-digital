import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarPlus } from 'lucide-react'
import { formatFechaHora } from '@/lib/utils'
import { TurnoAcciones } from '@/components/crm/turno-acciones'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Agenda' }

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-500/20 text-yellow-300',
  confirmado: 'bg-lime-500/20 text-lime-300',
  cancelado: 'bg-red-500/20 text-red-300',
  realizado: 'bg-zinc-700 text-zinc-400',
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>
}) {
  const { vista } = await searchParams
  const supabase = await createClient()

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  let query = supabase
    .from('turnos')
    .select('*, cliente:clientes(nombre, apellido, telefono, email), responsable:profiles(nombre, apellido)')
    .order('fecha', { ascending: true })

  if (!vista || vista === 'proximos') {
    query = query.gte('fecha', hoy.toISOString())
  } else if (vista === 'pasados') {
    query = query.lt('fecha', hoy.toISOString())
  }

  const { data: turnos } = await query.limit(200)

  // Agrupar por fecha
  const grupos = new Map<string, typeof turnos>()
  for (const t of turnos ?? []) {
    const fecha = new Date(t.fecha).toLocaleDateString('es-AR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
    if (!grupos.has(fecha)) grupos.set(fecha, [])
    grupos.get(fecha)!.push(t)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Agenda</h1>
          <p className="text-zinc-400 text-sm">{turnos?.length ?? 0} turnos</p>
        </div>
        <Link href="/crm/agenda/nuevo">
          <Button className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            <CalendarPlus size={16} />Nuevo turno
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'proximos', label: 'Próximos' },
          { key: 'pasados', label: 'Pasados' },
          { key: 'todos', label: 'Todos' },
        ].map(({ key, label }) => (
          <Link key={key} href={`/crm/agenda?vista=${key}`}>
            <button className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (vista ?? 'proximos') === key
                ? 'bg-lime-400/10 text-lime-400 border-lime-400/30'
                : 'text-zinc-400 border-zinc-700 hover:bg-zinc-800'
            }`}>
              {label}
            </button>
          </Link>
        ))}
      </div>

      {grupos.size === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-xl">
          <p className="text-zinc-500">No hay turnos para mostrar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grupos.entries()).map(([fecha, grupoTurnos]) => (
            <div key={fecha}>
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 capitalize">
                {fecha}
              </h2>
              <div className="space-y-2">
                {grupoTurnos!.map(t => {
                  const cliente = t.cliente as { nombre: string; apellido: string; telefono?: string; email?: string } | null
                  const resp = t.responsable as { nombre: string; apellido: string } | null
                  const hora = new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div key={t.id} className="flex items-center gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
                      <span className="text-lime-400 font-mono text-sm font-semibold w-12 shrink-0">{hora}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-zinc-200 font-medium text-sm">
                            {cliente ? `${cliente.apellido}, ${cliente.nombre}` : 'Sin cliente'}
                          </p>
                          {t.tipo && (
                            <span className="text-zinc-500 text-xs">· {t.tipo}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                          {cliente?.telefono && <span>{cliente.telefono}</span>}
                          {resp && <span>Resp: {resp.nombre} {resp.apellido}</span>}
                          {t.notas && <span className="truncate max-w-xs">{t.notas}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-xs ${ESTADO_COLORS[t.estado] ?? 'bg-zinc-700 text-zinc-400'}`}>
                          {t.estado}
                        </Badge>
                        <TurnoAcciones turnoId={t.id} estadoActual={t.estado} clienteUserId={null} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
