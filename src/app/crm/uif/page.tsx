import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Archive, AlertCircle, ShieldAlert } from 'lucide-react'
import { formatFecha, formatFechaHora } from '@/lib/utils'
import Link from 'next/link'
import { UIFAlertaAcciones } from '@/components/crm/uif-alerta-acciones'
import { RSMDescarga } from '@/components/crm/rsm-descarga'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Panel UIF' }

const TIPO_LABELS: Record<string, string> = {
  monto_excedido: 'Monto supera umbral',
  pep_detectado: 'PEP detectado',
  sujeto_obligado: 'Sujeto Obligado',
  monto: 'Monto',
  pep: 'PEP',
  otro: 'Otro',
}

const TIPO_COLORS: Record<string, string> = {
  monto_excedido: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  pep_detectado: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  sujeto_obligado: 'bg-red-500/20 text-red-300 border-red-500/30',
  monto: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  pep: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  otro: 'bg-zinc-700 text-zinc-300',
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-500/20 text-yellow-300',
  reportado: 'bg-blue-500/20 text-blue-300',
  archivado: 'bg-zinc-700 text-zinc-400',
}

interface AlertaRow {
  id: string
  tipo_alerta?: string | null
  tipo?: string | null
  descripcion: string | null
  estado: 'pendiente' | 'reportado' | 'archivado'
  created_at: string
  tramite: {
    id: string
    tipo: string
    numero_referencia: string | null
    monto: number | null
    cliente: {
      nombre: string
      apellido: string
      dni: string | null
      es_pep: boolean
      es_sujeto_obligado: boolean
    } | null
  } | null
}

export default async function UIFPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const supabase = await createClient()

  // SMVM vigente (real, del histórico)
  const { data: smvmRows } = await supabase
    .from('smvm_historico')
    .select('vigencia_desde, valor')
    .order('vigencia_desde', { ascending: false })
    .limit(1)
  const smvmVigente = smvmRows?.[0]
  const smvm = smvmVigente ? Number(smvmVigente.valor) : 308200
  const fechaSmvm = smvmVigente ? smvmVigente.vigencia_desde : null

  // Stats
  const [
    { count: pendientes },
    { count: reportados },
    { count: archivados },
    { count: tramitesUif },
    { count: tramitesUifMes },
  ] = await Promise.all([
    supabase.from('alertas_uif').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('alertas_uif').select('*', { count: 'exact', head: true }).eq('estado', 'reportado'),
    supabase.from('alertas_uif').select('*', { count: 'exact', head: true }).eq('estado', 'archivado'),
    supabase.from('tramites').select('*', { count: 'exact', head: true }).eq('dispara_uif', true),
    (() => {
      const desde = new Date()
      desde.setDate(1)
      desde.setHours(0, 0, 0, 0)
      return supabase.from('tramites')
        .select('*', { count: 'exact', head: true })
        .eq('dispara_uif', true)
        .gte('created_at', desde.toISOString())
    })(),
  ])

  // Alertas con join
  let query = supabase
    .from('alertas_uif')
    .select(`
      *,
      tramite:tramites(
        id, tipo, numero_referencia, monto,
        cliente:clientes(nombre, apellido, dni, es_pep, es_sujeto_obligado)
      )
    `)
    .order('created_at', { ascending: false })

  if (estado && estado !== 'todos') query = query.eq('estado', estado)

  const { data: alertas } = await query.limit(200)
  const alertasTyped = (alertas ?? []) as unknown as AlertaRow[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <ShieldAlert size={20} className="text-lime-400" />Panel UIF
        </h1>
        <p className="text-zinc-400 text-sm">
          Cumplimiento Res. 242/2023, 56/2024 y 78/2025.
          {fechaSmvm && (
            <> · SMVM vigente desde {formatFecha(fechaSmvm)}: <span className="text-zinc-200 font-medium">${smvm.toLocaleString('es-AR')}</span></>
          )}
        </p>
      </div>

      {/* Umbrales clave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: '750 SMVM (efectivo)', val: smvm * 750, desc: 'Compraventa en efectivo' },
          { label: '700 SMVM', val: smvm * 700, desc: 'Compraventa total' },
          { label: '150 SMVM', val: smvm * 150, desc: 'Adm. de bienes' },
          { label: '50 SMVM', val: smvm * 50, desc: 'Adm. de cuentas' },
        ].map(u => (
          <div key={u.label} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <p className="text-zinc-500 text-xs">{u.label}</p>
            <p className="text-white font-semibold text-sm mt-0.5">${u.val.toLocaleString('es-AR')}</p>
            <p className="text-zinc-600 text-xs">{u.desc}</p>
          </div>
        ))}
      </div>

      {/* RSM descarga */}
      <div className="mb-6">
        <RSMDescarga />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[
          { label: 'Trámites UIF totales', value: tramitesUif ?? 0, icon: ShieldAlert, color: 'text-lime-400' },
          { label: 'UIF este mes', value: tramitesUifMes ?? 0, icon: ShieldAlert, color: 'text-lime-400' },
          { label: 'Alertas pendientes', value: pendientes ?? 0, icon: AlertTriangle, color: 'text-yellow-400', estado: 'pendiente' },
          { label: 'Reportadas', value: reportados ?? 0, icon: CheckCircle2, color: 'text-blue-400', estado: 'reportado' },
          { label: 'Archivadas', value: archivados ?? 0, icon: Archive, color: 'text-zinc-500', estado: 'archivado' },
        ].map(({ label, value, icon: Icon, color, estado: e }) => {
          const card = (
            <Card className={`bg-zinc-900 transition-colors ${
              e && estado === e ? 'border-lime-400/50' : 'border-zinc-800 hover:border-zinc-700'
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <Icon size={20} className={color} />
              </CardContent>
            </Card>
          )
          return e ? (
            <Link key={label} href={`/crm/uif?estado=${e}`}>{card}</Link>
          ) : (
            <div key={label}>{card}</div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {['todos', 'pendiente', 'reportado', 'archivado'].map(e => (
          <Link key={e} href={e === 'todos' ? '/crm/uif' : `/crm/uif?estado=${e}`}>
            <button className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              (estado ?? 'todos') === e
                ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                : 'text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
            }`}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          </Link>
        ))}
      </div>

      {/* Lista */}
      {alertasTyped.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-xl">
          <AlertCircle size={36} className="text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">No hay alertas{estado && estado !== 'todos' ? ` con estado "${estado}"` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertasTyped.map(alerta => {
            const tipoKey = alerta.tipo_alerta || alerta.tipo || 'otro'
            const tramite = alerta.tramite
            return (
              <Card key={alerta.id} className={`bg-zinc-900 border-zinc-800 ${
                alerta.estado === 'pendiente' ? 'border-yellow-500/20' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={`text-xs border ${TIPO_COLORS[tipoKey] ?? 'bg-zinc-700 text-zinc-300'}`}>
                          <AlertTriangle size={11} className="mr-1" />
                          {TIPO_LABELS[tipoKey] ?? tipoKey}
                        </Badge>
                        <Badge className={`text-xs ${ESTADO_COLORS[alerta.estado] ?? ''}`}>
                          {alerta.estado.charAt(0).toUpperCase() + alerta.estado.slice(1)}
                        </Badge>
                      </div>

                      {alerta.descripcion && (
                        <p className="text-zinc-300 text-sm mb-2">{alerta.descripcion}</p>
                      )}

                      {tramite && (
                        <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                          <Link href={`/crm/tramites/${tramite.id}`}
                            className="text-lime-400 hover:underline font-medium">
                            {tramite.tipo}
                            {tramite.numero_referencia ? ` · Ref: ${tramite.numero_referencia}` : ''}
                          </Link>
                          {tramite.monto && (
                            <span>${Number(tramite.monto).toLocaleString('es-AR')}</span>
                          )}
                          {tramite.cliente && (
                            <span>
                              {tramite.cliente.apellido}, {tramite.cliente.nombre}
                              {tramite.cliente.dni ? ` · DNI ${tramite.cliente.dni}` : ''}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-zinc-600 text-xs mt-2">{formatFechaHora(alerta.created_at)}</p>
                    </div>

                    <UIFAlertaAcciones alertaId={alerta.id} estadoActual={alerta.estado} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
