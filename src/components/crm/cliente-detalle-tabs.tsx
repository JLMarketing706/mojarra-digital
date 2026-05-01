'use client'

import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  FileText, ShieldAlert, MapPin, Briefcase, Heart, Clock, User, ShoppingCart,
} from 'lucide-react'
import { estadoTramiteLabel, estadoTramiteColor, formatFecha } from '@/lib/utils'
import type { Cliente, NivelRiesgo } from '@/types'
import { UploadDocumento } from '@/components/crm/upload-documento'

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

interface TramiteRow {
  id: string
  tipo: string
  estado: string
  numero_referencia: string | null
  created_at: string
  updated_at: string
  dispara_uif: boolean
  monto: number | null
  tipo_acto: string | null
}

interface DocRow {
  id: string
  nombre: string
  tipo: string | null
  url: string
  created_at: string
}

interface Props {
  cliente: Cliente
  tramites: TramiteRow[]
  documentos: DocRow[]
}

function Field({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <p className="text-zinc-500 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-zinc-200 text-sm mt-0.5 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
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

export function ClienteDetalleTabs({ cliente: c, tramites, documentos }: Props) {
  const riesgo = (c.nivel_riesgo ?? 'bajo') as NivelRiesgo
  const proximaVencida = c.proxima_actualizacion ? new Date(c.proxima_actualizacion) < new Date() : false

  return (
    <Tabs defaultValue="datos" className="w-full">
      {/* Pestañas estilo Chrome: todas visibles, mismo ancho, activa destacada */}
      <TabsList className="w-full grid grid-cols-4 bg-transparent p-0 h-auto rounded-none border-b border-zinc-800 gap-0">
        <TabsTrigger
          value="datos"
          className="rounded-none rounded-t-lg border border-b-0 border-transparent data-[state=active]:border-zinc-800 data-[state=active]:bg-zinc-900 data-[state=active]:text-lime-400 data-[state=active]:shadow-[0_2px_0_0_#0a0a0a] data-[state=inactive]:text-zinc-500 data-[state=inactive]:bg-zinc-950/40 data-[state=inactive]:hover:text-zinc-300 data-[state=inactive]:hover:bg-zinc-900/50 text-sm gap-2 py-2.5 px-3 transition-colors -mb-px"
        >
          <User size={14} />
          <span className="truncate">Datos personales</span>
        </TabsTrigger>
        <TabsTrigger
          value="uif"
          className="rounded-none rounded-t-lg border border-b-0 border-transparent data-[state=active]:border-zinc-800 data-[state=active]:bg-zinc-900 data-[state=active]:text-lime-400 data-[state=active]:shadow-[0_2px_0_0_#0a0a0a] data-[state=inactive]:text-zinc-500 data-[state=inactive]:bg-zinc-950/40 data-[state=inactive]:hover:text-zinc-300 data-[state=inactive]:hover:bg-zinc-900/50 text-sm gap-2 py-2.5 px-3 transition-colors -mb-px"
        >
          <ShieldAlert size={14} />
          <span className="truncate">Cumplimiento UIF</span>
        </TabsTrigger>
        <TabsTrigger
          value="tramites"
          className="rounded-none rounded-t-lg border border-b-0 border-transparent data-[state=active]:border-zinc-800 data-[state=active]:bg-zinc-900 data-[state=active]:text-lime-400 data-[state=active]:shadow-[0_2px_0_0_#0a0a0a] data-[state=inactive]:text-zinc-500 data-[state=inactive]:bg-zinc-950/40 data-[state=inactive]:hover:text-zinc-300 data-[state=inactive]:hover:bg-zinc-900/50 text-sm gap-2 py-2.5 px-3 transition-colors -mb-px"
        >
          <ShoppingCart size={14} />
          <span className="truncate">Operaciones ({tramites.length})</span>
        </TabsTrigger>
        <TabsTrigger
          value="legajo"
          className="rounded-none rounded-t-lg border border-b-0 border-transparent data-[state=active]:border-zinc-800 data-[state=active]:bg-zinc-900 data-[state=active]:text-lime-400 data-[state=active]:shadow-[0_2px_0_0_#0a0a0a] data-[state=inactive]:text-zinc-500 data-[state=inactive]:bg-zinc-950/40 data-[state=inactive]:hover:text-zinc-300 data-[state=inactive]:hover:bg-zinc-900/50 text-sm gap-2 py-2.5 px-3 transition-colors -mb-px"
        >
          <FileText size={14} />
          <span className="truncate">Legajo</span>
        </TabsTrigger>
      </TabsList>

      {/* ── TAB 1 — DATOS PERSONALES ──────────────────────────── */}
      <TabsContent value="datos" className="mt-6 space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-300">Identificación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Nombre completo" value={`${c.nombre} ${c.apellido}`} />
              <Field label="Documento" value={c.tipo_documento && c.dni ? `${c.tipo_documento} ${c.dni}` : c.dni} />
              <Field label="CUIT/CUIL" value={c.cuil} mono />
              <Field label="Sexo" value={c.sexo} />
              <Field label="Fecha de nacimiento" value={c.fecha_nacimiento ? formatFecha(c.fecha_nacimiento) : null} />
              <Field label="Lugar de nacimiento" value={c.lugar_nacimiento} />
              <Field label="Nacionalidad" value={c.nacionalidad} />
              <Field label="Email" value={c.email} />
              <Field label="Teléfono" value={c.telefono} />
            </div>
            <Separator className="bg-zinc-800 my-4" />
            <UploadDocumento
              clienteId={c.id}
              categoria="identificacion"
              campoValida="documento"
              label="DNI / Pasaporte"
              helpText="Subí el frente y dorso del DNI, pasaporte o constancia."
              ocultarSiHayDocs
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300">Estado civil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-zinc-200 text-sm capitalize">{c.estado_civil ?? '— sin definir —'}</p>
              <UploadDocumento
                clienteId={c.id}
                categoria="estado_civil"
                campoValida="estado_civil"
                label="Documentación de respaldo"
                helpText={
                  c.estado_civil === 'casado' ? 'Acta de matrimonio.' :
                  c.estado_civil === 'divorciado' ? 'Sentencia de divorcio firme.' :
                  c.estado_civil === 'viudo' ? 'Acta de defunción del cónyuge.' :
                  c.estado_civil === 'union_convivencial' ? 'Declaración de unión convivencial.' :
                  'Acta de matrimonio, sentencia, defunción o declaración de unión.'
                }
              />
            </CardContent>
          </Card>
        </div>

        {(c.estado_civil === 'casado' || c.estado_civil === 'union_convivencial' || c.conyuge_nombre || c.conyuge_dni) && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <Heart size={14} className="text-lime-400" />Cónyuge / Conviviente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <Field label="Nombre" value={c.conyuge_nombre} />
                <Field label="DNI" value={c.conyuge_dni} mono />
                <div>
                  {c.conyuge_es_pep && <Badge className="bg-yellow-500/15 text-yellow-300 border-0">Cónyuge PEP</Badge>}
                </div>
              </div>
              <UploadDocumento
                clienteId={c.id}
                categoria="identificacion"
                campoValida="conyuge_dni"
                label="DNI del cónyuge"
                helpText="DNI o documento del cónyuge."
                ocultarSiHayDocs
              />
            </CardContent>
          </Card>
        )}

        {(c.profesion || c.ingreso_mensual || c.patrimonio_aprox || c.empleador) && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <Briefcase size={14} className="text-lime-400" />Perfil económico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Profesión" value={c.profesion} />
                <Field label="Empleador" value={c.empleador} />
                <Field label="Ingreso mensual" value={c.ingreso_mensual ? `$ ${c.ingreso_mensual.toLocaleString('es-AR')}` : null} />
                <Field label="Patrimonio" value={c.patrimonio_aprox ? `$ ${c.patrimonio_aprox.toLocaleString('es-AR')}` : null} />
              </div>
            </CardContent>
          </Card>
        )}

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
      </TabsContent>

      {/* ── TAB 2 — CUMPLIMIENTO UIF ──────────────────────────── */}
      <TabsContent value="uif" className="mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-zinc-500 uppercase tracking-wide">Nivel de riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`uppercase border ${RIESGO_BADGE[riesgo]} text-base px-3 py-1`}>{riesgo}</Badge>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-zinc-500 uppercase tracking-wide">PEP</CardTitle>
            </CardHeader>
            <CardContent>
              {c.es_pep ? (
                <Badge className="bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-sm">
                  Sí · {c.tipo_pep ? TIPO_PEP_LABEL[c.tipo_pep] : 'sin especificar'}
                </Badge>
              ) : (
                <span className="text-zinc-500 text-sm">No</span>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-zinc-500 uppercase tracking-wide">Sujeto Obligado</CardTitle>
            </CardHeader>
            <CardContent>
              {c.es_sujeto_obligado ? (
                <Badge className="bg-orange-500/15 text-orange-300 border border-orange-500/30 text-sm">Sí</Badge>
              ) : (
                <span className="text-zinc-500 text-sm">No</span>
              )}
            </CardContent>
          </Card>
        </div>

        {c.es_pep && (
          <Card className="bg-yellow-500/5 border-yellow-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-300">Detalle PEP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Cargo" value={c.cargo_pep} />
                <Field label="Jurisdicción" value={c.jurisdiccion_pep} />
                <Field label="Período"
                  value={c.periodo_pep_desde
                    ? `Desde ${formatFecha(c.periodo_pep_desde)}${c.periodo_pep_hasta ? ` hasta ${formatFecha(c.periodo_pep_hasta)}` : ' (vigente)'}`
                    : null}
                />
              </div>
              <UploadDocumento
                clienteId={c.id}
                categoria="pep"
                campoValida="es_pep"
                label="Respaldo PEP"
                helpText="DDJJ PEP firmada o constancia de cargo / parentesco."
              />
            </CardContent>
          </Card>
        )}

        {c.es_sujeto_obligado && (
          <Card className="bg-orange-500/5 border-orange-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-300">Detalle Sujeto Obligado UIF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="N° de inscripción" value={c.uif_inscripcion_numero} mono />
                <Field label="Fecha de inscripción" value={c.uif_inscripcion_fecha ? formatFecha(c.uif_inscripcion_fecha) : null} />
              </div>
              <UploadDocumento
                clienteId={c.id}
                categoria="sujeto_obligado"
                campoValida="es_sujeto_obligado"
                label="Constancia de inscripción UIF"
                helpText="Adjuntá la constancia oficial."
              />
            </CardContent>
          </Card>
        )}

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Clock size={14} className="text-lime-400" />Estado del legajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Alta</p>
                <p className="text-zinc-200 text-sm mt-0.5">{c.fecha_alta_legajo ? formatFecha(c.fecha_alta_legajo) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Última actualización</p>
                <p className="text-zinc-200 text-sm mt-0.5">{c.fecha_ultima_actualizacion ? formatFecha(c.fecha_ultima_actualizacion) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Próxima actualización</p>
                <p className={`text-sm mt-0.5 ${proximaVencida ? 'text-red-400 font-medium' : 'text-zinc-200'}`}>
                  {c.proxima_actualizacion ? formatFecha(c.proxima_actualizacion) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── TAB 3 — OPERACIONES ────────────────────────────────── */}
      <TabsContent value="tramites" className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Operaciones del cliente
          </h2>
          <Link href={`/crm/tramites/nuevo?cliente_id=${c.id}`}>
            <Button size="sm" className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-1.5">
              <FileText size={12} />Nueva operación
            </Button>
          </Link>
        </div>

        {tramites.length === 0 ? (
          <div className="border border-dashed border-zinc-700 rounded-lg py-12 text-center">
            <FileText size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Este cliente todavía no tiene operaciones registradas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tramites.map(t => (
              <Link key={t.id} href={`/crm/tramites/${t.id}`}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-zinc-200 text-sm font-medium truncate">{t.tipo}</p>
                        {t.dispara_uif && (
                          <Badge className="bg-red-500/15 text-red-300 border border-red-500/30 text-xs">UIF</Badge>
                        )}
                      </div>
                      {t.numero_referencia && (
                        <p className="text-zinc-500 text-xs">Ref: {t.numero_referencia}</p>
                      )}
                      {t.monto && (
                        <p className="text-zinc-400 text-xs mt-0.5">${Number(t.monto).toLocaleString('es-AR')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
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
      </TabsContent>

      {/* ── TAB 4 — LEGAJO ────────────────────────────────────── */}
      <TabsContent value="legajo" className="mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <ShieldAlert size={14} className="text-lime-400" />Consultas UIF y declaraciones
                <Badge className="bg-lime-400/10 text-lime-300 border border-lime-400/30 text-[10px] ml-auto">
                  Obligatorio
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <UploadDocumento clienteId={c.id} categoria="renaper" label="Consulta RENAPER"
                helpText="PDF/captura del Registro Nacional de las Personas." />
              <UploadDocumento clienteId={c.id} categoria="repet" label="Consulta REPET"
                helpText="Resultado de búsqueda en repet.jus.gob.ar." />
              <UploadDocumento clienteId={c.id} categoria="nosis" label="Informe NOSIS"
                helpText="Informe crediticio del cliente." />
              <UploadDocumento clienteId={c.id} categoria="ddjj_uif" label="DJ UIF firmada"
                helpText="DDJJ que firma el cliente antes de la escritura." />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <FileText size={14} className="text-lime-400" />Otros documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <UploadDocumento clienteId={c.id} categoria="poder" label="Poderes vigentes"
                helpText="Si actúa como apoderado, adjuntá el poder y certificado de vigencia." />
              <UploadDocumento clienteId={c.id} categoria="origen_fondos" label="Origen de fondos (general)"
                helpText="Documentación de respaldo no asociada a un trámite específico." />
              <UploadDocumento clienteId={c.id} categoria="otros" label="Otros"
                helpText="Cualquier otra documentación del legajo." />
            </CardContent>
          </Card>
        </div>

        {documentos.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300">
                Todos los documentos cargados ({documentos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {documentos.map(d => (
                  <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 transition-colors group">
                    <FileText size={14} className="text-zinc-500 shrink-0" />
                    <span className="text-zinc-300 text-sm flex-1 truncate group-hover:text-lime-400 transition-colors">{d.nombre}</span>
                    <span className="text-zinc-600 text-xs shrink-0">{formatFecha(d.created_at)}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
