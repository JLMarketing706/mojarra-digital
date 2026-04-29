import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { estadoTramiteLabel, estadoTramiteColor, formatFecha } from '@/lib/utils'
import { ArrowLeft, Pencil, FileText, ShieldAlert, MapPin, Briefcase, Heart, AlertTriangle, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import type { NivelRiesgo, Cliente } from '@/types'

export const metadata: Metadata = { title: 'Ficha de cliente' }

const RIESGO_BADGE: Record<NivelRiesgo, string> = {
  bajo: 'bg-green-500/15 text-green-300 border-green-500/30',
  medio: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  alto: 'bg-red-500/15 text-red-300 border-red-500/30',
}

const TIPO_PEP_LABEL: Record<string, string> = {
  funcionario: 'Funcionario público',
  familiar: 'Familiar de funcionario',
  allegado: 'Allegado / vínculo asociativo',
}

function Field({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-zinc-500 shrink-0 w-32">{label}</span>
      <span className={`text-zinc-200 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

function joinDomicilio(c: Cliente) {
  const parts = [
    [c.dom_calle, c.dom_numero].filter(Boolean).join(' '),
    c.dom_piso ? `Piso ${c.dom_piso}` : '',
    c.dom_localidad,
    c.dom_provincia,
    c.dom_codigo_postal ? `(CP ${c.dom_codigo_postal})` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : (c.domicilio || null)
}

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()
  const c = cliente as Cliente

  const { data: tramites } = await supabase
    .from('tramites')
    .select('id, tipo, estado, numero_referencia, created_at, updated_at, dispara_uif, monto, tipo_acto')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  const { data: documentos } = await supabase
    .from('documentos')
    .select('id, nombre, tipo, url, created_at')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  const riesgo = (c.nivel_riesgo ?? 'bajo') as NivelRiesgo
  const proximaVencida = c.proxima_actualizacion
    ? new Date(c.proxima_actualizacion) < new Date()
    : false

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/clientes">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Clientes
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-semibold text-white">{c.apellido}, {c.nombre}</h1>
              <Badge className={`uppercase border ${RIESGO_BADGE[riesgo]}`}>Riesgo {riesgo}</Badge>
              {c.es_pep && <Badge className="bg-yellow-500/20 text-yellow-300 border-0">PEP</Badge>}
              {c.es_sujeto_obligado && <Badge className="bg-orange-500/20 text-orange-300 border-0">Sujeto Obligado</Badge>}
            </div>
            <p className="text-zinc-400 text-sm">
              {c.tipo_documento ?? 'Documento'} {c.dni ?? '—'}
              {c.cuil && <> · CUIT/CUIL {c.cuil}</>}
              {' · '}Cliente desde {formatFecha(c.created_at)}
            </p>
          </div>
          <Link href={`/crm/clientes/${id}/editar`}>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
              <Pencil size={14} />Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerta legajo vencido */}
      {proximaVencida && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/5 border border-red-500/30 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <div>
            <p className="text-red-300 text-sm font-medium">Legajo vencido — actualización requerida</p>
            <p className="text-red-400/70 text-xs">
              Vencimiento: {formatFecha(c.proxima_actualizacion!)}. Res. UIF 242/2023 art. 16.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA — DATOS */}
        <div className="space-y-6">
          {/* Identificación */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300">Identificación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Field label="Nombre" value={`${c.nombre} ${c.apellido}`} />
              <Field label="Documento" value={c.tipo_documento && c.dni ? `${c.tipo_documento} ${c.dni}` : c.dni} />
              <Field label="CUIT/CUIL" value={c.cuil} mono />
              <Field label="Sexo" value={c.sexo} />
              <Field label="Nacimiento" value={c.fecha_nacimiento ? formatFecha(c.fecha_nacimiento) : null} />
              <Field label="Lugar nac." value={c.lugar_nacimiento} />
              <Field label="Nacionalidad" value={c.nacionalidad} />
              <Field label="Estado civil" value={c.estado_civil} />
              <Field label="Email" value={c.email} />
              <Field label="Teléfono" value={c.telefono} />
            </CardContent>
          </Card>

          {/* Domicilio */}
          {(c.dom_calle || c.domicilio) && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <MapPin size={14} className="text-lime-400" />Domicilio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-200 text-sm">{joinDomicilio(c)}</p>
              </CardContent>
            </Card>
          )}

          {/* Cónyuge */}
          {(c.conyuge_nombre || c.conyuge_dni) && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <Heart size={14} className="text-lime-400" />Cónyuge / Conviviente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Field label="Nombre" value={c.conyuge_nombre} />
                <Field label="DNI" value={c.conyuge_dni} mono />
                {c.conyuge_es_pep && <Badge className="bg-yellow-500/15 text-yellow-300 border-0">Cónyuge PEP</Badge>}
              </CardContent>
            </Card>
          )}

          {/* Perfil económico */}
          {(c.profesion || c.ingreso_mensual || c.patrimonio_aprox) && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <Briefcase size={14} className="text-lime-400" />Perfil económico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Field label="Profesión" value={c.profesion} />
                <Field label="Empleador" value={c.empleador} />
                <Field label="Ingreso mensual" value={c.ingreso_mensual ? `$ ${c.ingreso_mensual.toLocaleString('es-AR')}` : null} />
                <Field label="Patrimonio" value={c.patrimonio_aprox ? `$ ${c.patrimonio_aprox.toLocaleString('es-AR')}` : null} />
              </CardContent>
            </Card>
          )}

          {/* Cumplimiento UIF */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <ShieldAlert size={14} className="text-lime-400" />Cumplimiento UIF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Nivel de riesgo</span>
                <Badge className={`uppercase border ${RIESGO_BADGE[riesgo]}`}>{riesgo}</Badge>
              </div>

              {c.es_pep && (
                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 space-y-1.5">
                  <p className="text-yellow-300 text-xs font-semibold tracking-wide uppercase">PEP</p>
                  {c.tipo_pep && <p className="text-zinc-200 text-sm">{TIPO_PEP_LABEL[c.tipo_pep]}</p>}
                  {c.cargo_pep && <p className="text-zinc-400 text-xs">{c.cargo_pep}</p>}
                  {c.jurisdiccion_pep && <p className="text-zinc-500 text-xs">{c.jurisdiccion_pep}</p>}
                  {c.periodo_pep_desde && (
                    <p className="text-zinc-500 text-xs">
                      Desde {formatFecha(c.periodo_pep_desde)}
                      {c.periodo_pep_hasta ? ` hasta ${formatFecha(c.periodo_pep_hasta)}` : ' (vigente)'}
                    </p>
                  )}
                </div>
              )}

              {c.es_sujeto_obligado && (
                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-1">
                  <p className="text-orange-300 text-xs font-semibold tracking-wide uppercase">Sujeto Obligado UIF</p>
                  {c.uif_inscripcion_numero && (
                    <p className="text-zinc-200 text-sm font-mono">N° {c.uif_inscripcion_numero}</p>
                  )}
                  {c.uif_inscripcion_fecha && (
                    <p className="text-zinc-500 text-xs">Inscripto: {formatFecha(c.uif_inscripcion_fecha)}</p>
                  )}
                </div>
              )}

              <Separator className="bg-zinc-800" />
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 flex items-center gap-1.5"><Clock size={11} />Alta legajo</span>
                  <span className="text-zinc-300">{c.fecha_alta_legajo ? formatFecha(c.fecha_alta_legajo) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Última actualización</span>
                  <span className="text-zinc-300">{c.fecha_ultima_actualizacion ? formatFecha(c.fecha_ultima_actualizacion) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Próxima actualización</span>
                  <span className={proximaVencida ? 'text-red-400 font-medium' : 'text-zinc-300'}>
                    {c.proxima_actualizacion ? formatFecha(c.proxima_actualizacion) : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {c.notas && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300">Notas internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300 text-sm whitespace-pre-line">{c.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* COLUMNA DERECHA — TRÁMITES Y DOCS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Trámites ({tramites?.length ?? 0})
            </h2>
            <Link href={`/crm/tramites/nuevo?cliente_id=${id}`}>
              <Button size="sm" className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-1.5 h-7 text-xs">
                <FileText size={12} />Nuevo trámite
              </Button>
            </Link>
          </div>

          {!tramites || tramites.length === 0 ? (
            <div className="border border-dashed border-zinc-700 rounded-lg py-8 text-center">
              <p className="text-zinc-500 text-sm">Sin trámites registrados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tramites.map(t => (
                <Link key={t.id} href={`/crm/tramites/${t.id}`}>
                  <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-zinc-200 text-sm font-medium truncate">{t.tipo}</p>
                          {t.dispara_uif && (
                            <Badge className="bg-red-500/15 text-red-300 border border-red-500/30 text-xs">UIF</Badge>
                          )}
                        </div>
                        {t.numero_referencia && (
                          <p className="text-zinc-500 text-xs">Ref: {t.numero_referencia}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-xs ${estadoTramiteColor(t.estado)}`}>
                          {estadoTramiteLabel(t.estado)}
                        </Badge>
                        <span className="text-zinc-600 text-xs hidden sm:inline">{formatFecha(t.updated_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {documentos && documentos.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mt-6">
                Documentos ({documentos.length})
              </h2>
              <div className="space-y-2">
                {documentos.map(d => (
                  <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 transition-colors group">
                    <FileText size={14} className="text-zinc-500 shrink-0" />
                    <span className="text-zinc-300 text-sm flex-1 truncate group-hover:text-lime-400 transition-colors">{d.nombre}</span>
                    <span className="text-zinc-600 text-xs shrink-0">{formatFecha(d.created_at)}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
