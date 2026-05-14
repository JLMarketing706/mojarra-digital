import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react'
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
}

// Categorías UIF — orden y label corto para el desglose anual.
// Los slugs legacy se agrupan en el bin que les corresponde para que
// data vieja no se pierda.
const CATEGORIAS_UIF: { slugs: string[]; label: string }[] = [
  { slugs: ['compraventa_inmueble'], label: 'Compraventas mayores a 700 SMVM' },
  { slugs: ['organizacion_aportes'], label: 'Organización de aportes (fondeo)' },
  {
    slugs: ['creacion_administracion_pj', 'constitucion_sociedad', 'fideicomiso'],
    label: 'Creación, operación y administración de PJ',
  },
  { slugs: ['cesion_cuotas'], label: 'Compraventa de negocios / cesión de participaciones' },
]

interface AlertaRow {
  id: string
  tipo_alerta?: string | null
  tipo?: string | null
  descripcion: string | null
  estado: 'pendiente' | 'reportado'
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
  searchParams: Promise<{ estado?: string; anio?: string }>
}) {
  const { estado, anio: anioParam } = await searchParams
  const supabase = await createClient()

  const anioActual = new Date().getFullYear()
  const anio = anioParam ? parseInt(anioParam) : anioActual
  // Lista de años para el selector (últimos 5 años hasta el actual)
  const aniosDisponibles = Array.from({ length: 5 }, (_, i) => anioActual - i)

  // SMVM vigente
  const { data: smvmRows } = await supabase
    .from('smvm_historico')
    .select('vigencia_desde, valor')
    .order('vigencia_desde', { ascending: false })
    .limit(1)
  const smvmVigente = smvmRows?.[0]
  const smvm = smvmVigente ? Number(smvmVigente.valor) : 308200
  const fechaSmvm = smvmVigente ? smvmVigente.vigencia_desde : null

  // Stats
  const desdeAnio = `${anio}-01-01`
  const hastaAnio = `${anio}-12-31T23:59:59`
  const desdeMes = (() => {
    const d = new Date()
    d.setDate(1); d.setHours(0, 0, 0, 0)
    return d.toISOString()
  })()

  const [
    { count: pendientes },
    { count: reportados },
    { count: tramitesUifMes },
    { data: tramitesAnioRows },
  ] = await Promise.all([
    supabase.from('alertas_uif').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('alertas_uif').select('*', { count: 'exact', head: true }).eq('estado', 'reportado'),
    supabase.from('tramites')
      .select('*', { count: 'exact', head: true })
      .eq('dispara_uif', true)
      .gte('created_at', desdeMes),
    // Para el desglose anual: traigo solo el campo tipo_acto y agrupo en JS
    supabase.from('tramites')
      .select('tipo_acto')
      .eq('dispara_uif', true)
      .gte('created_at', desdeAnio)
      .lte('created_at', hastaAnio),
  ])

  // Conteo por categoría UIF (con bins que cubren slugs legacy)
  const conteoTipoActo = new Map<string, number>()
  for (const t of (tramitesAnioRows ?? []) as Array<{ tipo_acto: string | null }>) {
    const key = t.tipo_acto ?? '__sin_categoria__'
    conteoTipoActo.set(key, (conteoTipoActo.get(key) ?? 0) + 1)
  }
  const desgloseAnual = CATEGORIAS_UIF.map(cat => ({
    label: cat.label,
    count: cat.slugs.reduce((acc, s) => acc + (conteoTipoActo.get(s) ?? 0), 0),
  }))
  const tramitesUifAnio = desgloseAnual.reduce((a, b) => a + b.count, 0)
  // Si quedaron tramites con tipo_acto null o un slug que no mapea, los sumo en "Sin categoría"
  const sumadosEnDesglose = new Set(CATEGORIAS_UIF.flatMap(c => c.slugs))
  const sinCategoria = Array.from(conteoTipoActo.entries())
    .filter(([k]) => !sumadosEnDesglose.has(k))
    .reduce((acc, [, v]) => acc + v, 0)

  // Alertas con join (filtro 'archivado' eliminado)
  let query = supabase
    .from('alertas_uif')
    .select(`
      *,
      tramite:tramites(
        id, tipo, numero_referencia, monto,
        cliente:clientes(nombre, apellido, dni, es_pep, es_sujeto_obligado)
      )
    `)
    .neq('estado', 'archivado') // ocultar archivadas legacy
    .order('created_at', { ascending: false })

  if (estado === 'pendiente' || estado === 'reportado') {
    query = query.eq('estado', estado)
  }

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
          { label: '700 SMVM (efectivo)', val: smvm * 700, desc: 'Compraventa en efectivo' },
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

      {/* Stats principales: 4 cards (UIF anual, UIF este mes, Pendientes, Reportadas) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* UIF anual con desglose */}
        <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <p className="text-zinc-400 text-xs mb-1">Operaciones UIF · año {anio}</p>
                <p className="text-2xl font-bold text-lime-400">{tramitesUifAnio}</p>
              </div>
              <div className="flex items-start gap-2 flex-wrap justify-end">
                <ShieldAlert size={20} className="text-lime-400 shrink-0" />
                {/* Selector de año */}
                <div className="flex flex-wrap gap-1 justify-end">
                  {aniosDisponibles.map(a => {
                    const params = new URLSearchParams()
                    if (a !== anioActual) params.set('anio', String(a))
                    if (estado) params.set('estado', estado)
                    const href = `/crm/uif${params.toString() ? `?${params.toString()}` : ''}`
                    const activo = a === anio
                    return (
                      <Link key={a} href={href}>
                        <span className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          activo
                            ? 'bg-lime-400/10 text-lime-400 border-lime-400/40'
                            : 'text-zinc-500 border-zinc-700 hover:bg-zinc-800'
                        }`}>{a}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Desglose por categoría */}
            {tramitesUifAnio === 0 ? (
              <p className="text-zinc-500 text-xs mt-2">Sin operaciones UIF en {anio}.</p>
            ) : (
              <div className="space-y-1 mt-2 pt-2 border-t border-zinc-800">
                {desgloseAnual.map(d => (
                  <div key={d.label} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-zinc-400 truncate">{d.label}</span>
                    <span className={d.count > 0 ? 'text-zinc-100 font-mono font-semibold' : 'text-zinc-600 font-mono'}>
                      {d.count}
                    </span>
                  </div>
                ))}
                {sinCategoria > 0 && (
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-zinc-500 italic truncate">Sin categoría asignada</span>
                    <span className="text-zinc-300 font-mono">{sinCategoria}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* UIF este mes */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between h-full">
            <div>
              <p className="text-zinc-400 text-xs mb-1">UIF este mes</p>
              <p className="text-2xl font-bold text-lime-400">{tramitesUifMes ?? 0}</p>
            </div>
            <ShieldAlert size={20} className="text-lime-400" />
          </CardContent>
        </Card>

        {/* Card pendientes + reportadas en una columna apilada */}
        <div className="grid grid-rows-2 gap-3">
          <Link href={`/crm/uif?estado=pendiente${anio !== anioActual ? `&anio=${anio}` : ''}`}>
            <Card className={`bg-zinc-900 transition-colors h-full ${
              estado === 'pendiente' ? 'border-lime-400/50' : 'border-zinc-800 hover:border-zinc-700'
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs mb-1">Alertas pendientes</p>
                  <p className="text-2xl font-bold text-yellow-400">{pendientes ?? 0}</p>
                </div>
                <AlertTriangle size={20} className="text-yellow-400" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/crm/uif?estado=reportado${anio !== anioActual ? `&anio=${anio}` : ''}`}>
            <Card className={`bg-zinc-900 transition-colors h-full ${
              estado === 'reportado' ? 'border-lime-400/50' : 'border-zinc-800 hover:border-zinc-700'
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs mb-1">Reportadas</p>
                  <p className="text-2xl font-bold text-blue-400">{reportados ?? 0}</p>
                </div>
                <CheckCircle2 size={20} className="text-blue-400" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Filtros tabs (sin 'archivado') */}
      <div className="flex gap-2 mb-4">
        {[
          { v: 'todos', label: 'Todas' },
          { v: 'pendiente', label: 'Pendientes' },
          { v: 'reportado', label: 'Reportadas' },
        ].map(e => {
          const params = new URLSearchParams()
          if (e.v !== 'todos') params.set('estado', e.v)
          if (anio !== anioActual) params.set('anio', String(anio))
          const href = `/crm/uif${params.toString() ? `?${params.toString()}` : ''}`
          return (
            <Link key={e.v} href={href}>
              <button className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                (estado ?? 'todos') === e.v
                  ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                  : 'text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
              }`}>
                {e.label}
              </button>
            </Link>
          )
        })}
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
