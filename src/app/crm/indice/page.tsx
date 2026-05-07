import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IndiceSearch } from '@/components/crm/indice-search'
import { IndiceExportButton } from '@/components/crm/indice-export-button'
import { formatFecha, estadoTramiteLabel, estadoTramiteColor } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Índice Notarial' }

// El índice notarial se deriva de las operaciones (tramites). No se carga
// manualmente. Excluimos las operaciones de Certificaciones/Actas y
// Gestión Registral porque no van al protocolo.
const EXCLUIDOS_INDICE = ['certificaciones', 'gestion_registral']

interface ParteRow {
  rol: string | null
  nombre: string | null
  cliente: { nombre: string; apellido: string } | null
}

interface TramiteIndice {
  id: string
  estado: string
  numero_escritura: string | null
  folio_protocolo: string | null
  fecha_escritura: string | null
  descripcion: string | null
  tipo: string
  negocios_causales: string[] | null
  tipo_acto_notarial: string | null
  cliente: { nombre: string; apellido: string } | null
  escribano: { nombre: string; apellido: string } | null
  tramite_partes: ParteRow[] | null
  updated_at: string
}

// Mapping de rol → label legible. Fallback: capitalizar el rol.
const ROL_LABEL: Record<string, { single: string; plural: string }> = {
  comprador:   { single: 'Comprador',   plural: 'Compradores' },
  vendedor:    { single: 'Vendedor',    plural: 'Vendedores' },
  donante:     { single: 'Donante',     plural: 'Donantes' },
  donatario:   { single: 'Donatario',   plural: 'Donatarios' },
  permutante:  { single: 'Permutante',  plural: 'Permutantes' },
  conyuge:     { single: 'Cónyuge',     plural: 'Cónyuges' },
  conviviente: { single: 'Conviviente', plural: 'Convivientes' },
  apoderado:   { single: 'Apoderado',   plural: 'Apoderados' },
  padre:       { single: 'Padre',       plural: 'Padres' },
  madre:       { single: 'Madre',       plural: 'Madres' },
  fiador:      { single: 'Fiador',      plural: 'Fiadores' },
  otro:        { single: 'Otro',        plural: 'Otros' },
}

function rolLabel(rol: string, count: number): string {
  const m = ROL_LABEL[rol]
  if (m) return count > 1 ? m.plural : m.single
  // Fallback: capitalize
  return rol.charAt(0).toUpperCase() + rol.slice(1)
}

interface PartesAgrupadas {
  /** Orden de roles: principales primero (compraventa), luego el resto */
  grupos: { rol: string; label: string; personas: string[] }[]
}

const ORDEN_ROLES = [
  'comprador', 'vendedor', 'donante', 'donatario', 'permutante',
  'apoderado', 'fiador', 'conyuge', 'conviviente', 'padre', 'madre', 'otro',
]

function partesAgrupadas(t: TramiteIndice): PartesAgrupadas {
  const partes = t.tramite_partes ?? []
  if (partes.length === 0) {
    // Fallback: cliente principal sin rol
    if (t.cliente) {
      return {
        grupos: [{
          rol: 'cliente',
          label: 'Cliente',
          personas: [`${t.cliente.apellido}, ${t.cliente.nombre}`],
        }],
      }
    }
    return { grupos: [] }
  }

  // Agrupar por rol
  const porRol = new Map<string, string[]>()
  for (const p of partes) {
    const rol = p.rol ?? 'otro'
    const persona = p.cliente
      ? `${p.cliente.apellido}, ${p.cliente.nombre}`
      : (p.nombre?.trim() || null)
    if (!persona) continue
    if (!porRol.has(rol)) porRol.set(rol, [])
    porRol.get(rol)!.push(persona)
  }

  // Ordenar según ORDEN_ROLES
  const grupos = Array.from(porRol.entries())
    .sort(([a], [b]) => {
      const ia = ORDEN_ROLES.indexOf(a)
      const ib = ORDEN_ROLES.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    .map(([rol, personas]) => ({
      rol,
      label: rolLabel(rol, personas.length),
      personas,
    }))

  return { grupos }
}

// String plano para que el buscador matchee por nombre/rol/etc.
function partesString(t: TramiteIndice): string {
  const { grupos } = partesAgrupadas(t)
  if (grupos.length === 0) return ''
  return grupos
    .map(g => `${g.label}: ${g.personas.join(', ')}`)
    .join(' · ')
}

function tipoActoString(t: TramiteIndice): string {
  const causales = t.negocios_causales ?? []
  if (causales.length === 0) return t.tipo || '—'
  if (causales.length === 1) return causales[0]
  return `${causales[0]} (+${causales.length - 1})`
}

export default async function IndiceNotarialPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  // Traemos todos los tramites del índice (sin certificaciones ni gestión registral)
  const { data: rows } = await supabase
    .from('tramites')
    .select(`
      id, estado, numero_escritura, folio_protocolo, fecha_escritura,
      descripcion, tipo, negocios_causales, tipo_acto_notarial, updated_at,
      cliente:clientes(nombre, apellido),
      escribano:profiles(nombre, apellido),
      tramite_partes(rol, nombre, cliente:clientes(nombre, apellido))
    `)
    .order('updated_at', { ascending: false })
    .limit(500)

  const todos = (rows ?? []) as unknown as TramiteIndice[]

  // Filtros: excluir categorías que no van al protocolo
  let entradas = todos.filter(t => {
    const cat = t.tipo_acto_notarial ?? ''
    return !EXCLUIDOS_INDICE.includes(cat)
  })

  // Búsqueda en cliente / partes / tipo / nº escritura / inmueble (descripcion)
  if (q && q.trim().length > 0) {
    const term = q.trim().toLowerCase()
    entradas = entradas.filter(t => {
      const haystack = [
        t.numero_escritura ?? '',
        t.folio_protocolo ?? '',
        tipoActoString(t),
        partesString(t),
        t.descripcion ?? '',
      ].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }

  // Configuración de la escribanía para PDF
  const { data: config } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['nombre_escribania', 'direccion_escribania', 'matricula_escribano'])

  const configMap = Object.fromEntries((config ?? []).map(c => [c.clave, c.valor]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Índice Notarial</h1>
          <p className="text-zinc-400 text-sm">
            {entradas.length} {entradas.length === 1 ? 'escritura' : 'escrituras'} en el índice ·{' '}
            <span className="text-zinc-500">se deriva de las escrituras (excepto Certificaciones y Gestión Registral)</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IndiceExportButton config={configMap} />
        </div>
      </div>

      <IndiceSearch defaultValue={q} />

      <div className="mt-4 rounded-lg border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium w-20">Nº</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell w-24">Fecha</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Tipo de acto</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Partes</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Folio</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Inmueble</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {entradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                  {q
                    ? `Sin resultados para "${q}".`
                    : 'No hay escrituras para mostrar. Cargá una escritura nueva y aparecerá acá automáticamente.'}
                </td>
              </tr>
            ) : (
              entradas.map(t => (
                <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/crm/tramites/${t.id}`}
                      className="text-lime-400 font-mono font-semibold hover:underline">
                      {t.numero_escritura ?? <span className="text-zinc-600">—</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">
                    {t.fecha_escritura ? formatFecha(t.fecha_escritura) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{tipoActoString(t)}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {(() => {
                      const { grupos } = partesAgrupadas(t)
                      if (grupos.length === 0) return <span className="text-zinc-600">—</span>
                      return (
                        <div className="space-y-0.5">
                          {grupos.map(g => (
                            <div key={g.rol} className="text-xs leading-snug">
                              <span className="text-zinc-500 font-medium">{g.label}:</span>{' '}
                              <span className="text-zinc-200">{g.personas.join('; ')}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell font-mono text-xs">
                    {t.folio_protocolo ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell max-w-xs truncate">
                    {t.descripcion ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${estadoTramiteColor(t.estado)}`}>
                      {estadoTramiteLabel(t.estado)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/crm/tramites/${t.id}`}>
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
