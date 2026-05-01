'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Loader2, ArrowLeft, User, Building2,
  ShieldAlert, FileText, MapPin, Briefcase, Heart,
} from 'lucide-react'
import Link from 'next/link'
import type { TipoPersona, TipoDocumento, Sexo, EstadoCivil, TipoPEP } from '@/types'

const ESTADOS_CIVILES: { v: EstadoCivil; label: string }[] = [
  { v: 'soltero', label: 'Soltero/a' },
  { v: 'casado', label: 'Casado/a' },
  { v: 'divorciado', label: 'Divorciado/a' },
  { v: 'viudo', label: 'Viudo/a' },
  { v: 'union_convivencial', label: 'Unión convivencial' },
]

const PROVINCIAS_AR = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]

const NACIONALIDADES_COMUNES = [
  { v: 'AR', label: 'Argentina' }, { v: 'UY', label: 'Uruguaya' },
  { v: 'CL', label: 'Chilena' }, { v: 'BR', label: 'Brasileña' },
  { v: 'BO', label: 'Boliviana' }, { v: 'PY', label: 'Paraguaya' },
  { v: 'PE', label: 'Peruana' }, { v: 'CO', label: 'Colombiana' },
  { v: 'VE', label: 'Venezolana' }, { v: 'ES', label: 'Española' },
  { v: 'IT', label: 'Italiana' }, { v: 'OTRO', label: 'Otra' },
]

const TIPOS_JURIDICA = ['SA', 'SRL', 'SAS', 'SCS', 'SCA', 'Asoc.Civil', 'Fundación', 'Cooperativa', 'Mutual', 'Fideicomiso', 'Otra']

interface FormData {
  tipo_persona: TipoPersona
  nombre: string; apellido: string
  tipo_documento: TipoDocumento | ''
  dni: string; cuil: string
  sexo: Sexo | ''
  fecha_nacimiento: string
  lugar_nacimiento: string
  nacionalidad: string
  estado_civil: string
  nombre_padre: string
  nombre_madre: string
  conyuge_nombre: string; conyuge_dni: string; conyuge_es_pep: boolean
  dom_calle: string; dom_numero: string; dom_piso: string
  dom_localidad: string; dom_provincia: string
  dom_codigo_postal: string; dom_pais: string
  email: string; telefono: string
  profesion: string; empleador: string
  ingreso_mensual: string; patrimonio_aprox: string
  es_pep: boolean; tipo_pep: TipoPEP | ''
  cargo_pep: string; jurisdiccion_pep: string
  periodo_pep_desde: string; periodo_pep_hasta: string
  es_sujeto_obligado: boolean
  uif_inscripcion_numero: string; uif_inscripcion_fecha: string
  notas: string
}

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'
const selectTriggerCls = 'bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400'
const selectContentCls = 'bg-zinc-900 border-zinc-700'
const selectItemCls = 'text-zinc-200 focus:bg-zinc-800'

export default function EditarClientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>({
    tipo_persona: 'humana', nombre: '', apellido: '', tipo_documento: '', dni: '', cuil: '',
    sexo: '', fecha_nacimiento: '', lugar_nacimiento: '', nacionalidad: 'AR', estado_civil: '',
    nombre_padre: '', nombre_madre: '',
    conyuge_nombre: '', conyuge_dni: '', conyuge_es_pep: false,
    dom_calle: '', dom_numero: '', dom_piso: '', dom_localidad: '', dom_provincia: '',
    dom_codigo_postal: '', dom_pais: 'AR', email: '', telefono: '',
    profesion: '', empleador: '', ingreso_mensual: '', patrimonio_aprox: '',
    es_pep: false, tipo_pep: '', cargo_pep: '', jurisdiccion_pep: '',
    periodo_pep_desde: '', periodo_pep_hasta: '',
    es_sujeto_obligado: false, uif_inscripcion_numero: '', uif_inscripcion_fecha: '',
    notas: '',
  })

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single()
      if (error || !data) { toast.error('Cliente no encontrado.'); return }
      const c = data as Record<string, unknown>

      // Padres: ahora desde columnas dedicadas; fallback al legacy embebido en notas
      let notas = (c.notas as string) ?? ''
      let nombre_padre = (c.nombre_padre as string) ?? ''
      let nombre_madre = (c.nombre_madre as string) ?? ''
      if (!nombre_padre && !nombre_madre) {
        const padresMatch = notas.match(/\[Padres: Padre: ([^,]*), Madre: ([^\]]*)\]/)
        if (padresMatch) {
          nombre_padre = padresMatch[1].trim()
          nombre_madre = padresMatch[2].trim()
          notas = notas.replace(padresMatch[0], '').trim()
        }
      }

      setForm({
        tipo_persona: (c.tipo_persona as TipoPersona) ?? 'humana',
        nombre: (c.nombre as string) ?? '',
        apellido: (c.apellido as string) ?? '',
        tipo_documento: (c.tipo_documento as TipoDocumento) ?? '',
        dni: (c.dni as string) ?? '',
        cuil: (c.cuil as string) ?? '',
        sexo: (c.sexo as Sexo) ?? '',
        fecha_nacimiento: (c.fecha_nacimiento as string) ?? '',
        lugar_nacimiento: (c.lugar_nacimiento as string) ?? '',
        nacionalidad: (c.nacionalidad as string) ?? 'AR',
        estado_civil: (c.estado_civil as string) ?? '',
        nombre_padre,
        nombre_madre,
        conyuge_nombre: (c.conyuge_nombre as string) ?? '',
        conyuge_dni: (c.conyuge_dni as string) ?? '',
        conyuge_es_pep: (c.conyuge_es_pep as boolean) ?? false,
        dom_calle: (c.dom_calle as string) ?? '',
        dom_numero: (c.dom_numero as string) ?? '',
        dom_piso: (c.dom_piso as string) ?? '',
        dom_localidad: (c.dom_localidad as string) ?? '',
        dom_provincia: (c.dom_provincia as string) ?? '',
        dom_codigo_postal: (c.dom_codigo_postal as string) ?? '',
        dom_pais: (c.dom_pais as string) ?? 'AR',
        email: (c.email as string) ?? '',
        telefono: (c.telefono as string) ?? '',
        profesion: (c.profesion as string) ?? '',
        empleador: (c.empleador as string) ?? '',
        ingreso_mensual: c.ingreso_mensual ? String(c.ingreso_mensual) : '',
        patrimonio_aprox: c.patrimonio_aprox ? String(c.patrimonio_aprox) : '',
        es_pep: (c.es_pep as boolean) ?? false,
        tipo_pep: (c.tipo_pep as TipoPEP) ?? '',
        cargo_pep: (c.cargo_pep as string) ?? '',
        jurisdiccion_pep: (c.jurisdiccion_pep as string) ?? '',
        periodo_pep_desde: (c.periodo_pep_desde as string) ?? '',
        periodo_pep_hasta: (c.periodo_pep_hasta as string) ?? '',
        es_sujeto_obligado: (c.es_sujeto_obligado as boolean) ?? false,
        uif_inscripcion_numero: (c.uif_inscripcion_numero as string) ?? '',
        uif_inscripcion_fecha: (c.uif_inscripcion_fecha as string) ?? '',
        notas,
      })
      setLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(p => ({ ...p, [key]: value }))
  }

  const esJuridica = form.tipo_persona !== 'humana'
  const requiereConyuge = !esJuridica && (form.estado_civil === 'casado' || form.estado_civil === 'union_convivencial')
  const esSoltero = !esJuridica && form.estado_civil === 'soltero'

  // Calcular edad desde fecha_nacimiento
  const edad = form.fecha_nacimiento
    ? Math.floor((Date.now() - new Date(form.fecha_nacimiento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.apellido) {
      toast.error('Nombre y apellido son obligatorios.')
      return
    }
    setSaving(true)

    const notasFinal = form.notas || ''

    const payload = {
      tipo_persona: form.tipo_persona,
      nombre: form.nombre, apellido: form.apellido,
      tipo_documento: esJuridica ? null : (form.tipo_documento || null),
      dni: esJuridica ? null : (form.dni || null),
      cuil: form.cuil || null,
      sexo: esJuridica ? null : (form.sexo || null),
      fecha_nacimiento: form.fecha_nacimiento || null,
      lugar_nacimiento: esJuridica ? null : (form.lugar_nacimiento || null),
      nacionalidad: form.nacionalidad || null,
      estado_civil: esJuridica ? null : (form.estado_civil || null),
      conyuge_nombre: requiereConyuge ? (form.conyuge_nombre || null) : null,
      conyuge_dni: requiereConyuge ? (form.conyuge_dni || null) : null,
      conyuge_es_pep: requiereConyuge ? form.conyuge_es_pep : false,
      dom_calle: form.dom_calle || null, dom_numero: form.dom_numero || null,
      dom_piso: form.dom_piso || null, dom_localidad: form.dom_localidad || null,
      dom_provincia: form.dom_provincia || null,
      dom_codigo_postal: form.dom_codigo_postal || null,
      dom_pais: form.dom_pais || 'AR',
      email: form.email || null, telefono: form.telefono || null,
      profesion: form.profesion || null, empleador: form.empleador || null,
      ingreso_mensual: form.ingreso_mensual ? Number(form.ingreso_mensual) : null,
      patrimonio_aprox: form.patrimonio_aprox ? Number(form.patrimonio_aprox) : null,
      es_pep: form.es_pep,
      tipo_pep: form.es_pep ? (form.tipo_pep || null) : null,
      cargo_pep: form.es_pep ? (form.cargo_pep || null) : null,
      jurisdiccion_pep: form.es_pep ? (form.jurisdiccion_pep || null) : null,
      periodo_pep_desde: form.es_pep && form.periodo_pep_desde ? form.periodo_pep_desde : null,
      periodo_pep_hasta: form.es_pep && form.periodo_pep_hasta ? form.periodo_pep_hasta : null,
      es_sujeto_obligado: form.es_sujeto_obligado,
      uif_inscripcion_numero: form.es_sujeto_obligado ? (form.uif_inscripcion_numero || null) : null,
      uif_inscripcion_fecha: form.es_sujeto_obligado && form.uif_inscripcion_fecha ? form.uif_inscripcion_fecha : null,
      nombre_padre: esSoltero ? (form.nombre_padre || null) : null,
      nombre_madre: esSoltero ? (form.nombre_madre || null) : null,
      notas: notasFinal || null,
    }

    const { error } = await supabase.from('clientes').update(payload).eq('id', id)

    setSaving(false)
    if (error) {
      toast.error('Error al guardar los cambios.')
      return
    }
    toast.success('Cambios guardados.')
    router.push(`/crm/clientes/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin text-lime-400" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/crm/clientes/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Volver a la ficha
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Editar cliente</h1>
      </div>

      {/* Tipo de persona */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardContent className="p-4">
          <Label className="text-zinc-300 text-sm mb-3 block">Tipo de cliente</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { v: 'humana' as TipoPersona, label: 'Persona humana', icon: User },
              { v: 'juridica' as TipoPersona, label: 'Persona jurídica', icon: Building2 },
              { v: 'fideicomiso' as TipoPersona, label: 'Fideicomiso', icon: FileText },
            ]).map(({ v, label, icon: Icon }) => {
              const active = form.tipo_persona === v
              return (
                <button key={v} type="button" onClick={() => set('tipo_persona', v)}
                  className={`p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                    active ? 'border-lime-400 bg-lime-400/5' : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'
                  }`}>
                  <Icon size={18} className={active ? 'text-lime-400' : 'text-zinc-500'} />
                  <span className={`text-sm font-medium ${active ? 'text-white' : 'text-zinc-300'}`}>{label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* IDENTIFICACIÓN */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <User size={14} className="text-lime-400" />
              {esJuridica ? 'Datos de la entidad' : 'Identificación'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  {esJuridica ? 'Denominación o razón social' : 'Nombre'} <span className="text-lime-400">*</span>
                </Label>
                <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} required className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  {esJuridica ? 'Tipo (SA, SRL, SAS…)' : 'Apellido'} <span className="text-lime-400">*</span>
                </Label>
                {esJuridica ? (
                  <Select value={form.apellido} onValueChange={v => set('apellido', v)}>
                    <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      {TIPOS_JURIDICA.map(t => <SelectItem key={t} value={t} className={selectItemCls}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.apellido} onChange={e => set('apellido', e.target.value)} required className={inputCls} />
                )}
              </div>
            </div>

            {esJuridica ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 uppercase text-xs">CUIT</Label>
                  <Input value={form.cuil} onChange={e => set('cuil', e.target.value)} placeholder="30-12345678-9" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Fecha de inscripción</Label>
                  <Input type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} className={inputCls} />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Tipo de documento</Label>
                    <Select value={form.tipo_documento} onValueChange={v => set('tipo_documento', v as TipoDocumento)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {(['DNI', 'CI', 'Pasaporte'] as TipoDocumento[]).map(t =>
                          <SelectItem key={t} value={t} className={selectItemCls}>{t}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 uppercase text-xs">N° documento</Label>
                    <Input value={form.dni} onChange={e => set('dni', e.target.value)} placeholder="12345678" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 uppercase text-xs">CUIT/CUIL</Label>
                    <Input value={form.cuil} onChange={e => set('cuil', e.target.value)} placeholder="20-12345678-9" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Sexo</Label>
                    <Select value={form.sexo} onValueChange={v => set('sexo', v as Sexo)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="F" className={selectItemCls}>Femenino</SelectItem>
                        <SelectItem value="M" className={selectItemCls}>Masculino</SelectItem>
                        <SelectItem value="X" className={selectItemCls}>X</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Fecha de nacimiento</Label>
                    <Input type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} className={inputCls} />
                    {edad !== null && (
                      <p className="text-xs text-lime-400 mt-1">Edad: {edad} años</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Nacionalidad</Label>
                    <Select value={form.nacionalidad} onValueChange={v => set('nacionalidad', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {NACIONALIDADES_COMUNES.map(n =>
                          <SelectItem key={n.v} value={n.v} className={selectItemCls}>{n.label}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Lugar de nacimiento</Label>
                  <Input value={form.lugar_nacimiento} onChange={e => set('lugar_nacimiento', e.target.value)}
                    placeholder="Ciudad, Provincia, País" className={inputCls} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Estado civil</Label>
                    <Select value={form.estado_civil} onValueChange={v => set('estado_civil', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {ESTADOS_CIVILES.map(e =>
                          <SelectItem key={e.v} value={e.v} className={selectItemCls}>{e.label}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Teléfono</Label>
                    <Input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                      placeholder="+54 11 1234-5678" className={inputCls} />
                  </div>
                </div>

                {/* Nombres de padres cuando es soltero */}
                {esSoltero && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/50">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300">Nombre del padre</Label>
                      <Input value={form.nombre_padre} onChange={e => set('nombre_padre', e.target.value)}
                        placeholder="Nombre completo del padre" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300">Nombre de la madre</Label>
                      <Input value={form.nombre_madre} onChange={e => set('nombre_madre', e.target.value)}
                        placeholder="Nombre completo de la madre" className={inputCls} />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="nombre@ejemplo.com" className={inputCls} />
            </div>
          </CardContent>
        </Card>

        {/* CÓNYUGE */}
        {requiereConyuge && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <Heart size={14} className="text-lime-400" />Cónyuge / Conviviente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Nombre completo del cónyuge</Label>
                  <Input value={form.conyuge_nombre} onChange={e => set('conyuge_nombre', e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">DNI del cónyuge</Label>
                  <Input value={form.conyuge_dni} onChange={e => set('conyuge_dni', e.target.value)} className={inputCls} />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={form.conyuge_es_pep}
                  onCheckedChange={(v: boolean | 'indeterminate') => set('conyuge_es_pep', !!v)}
                  className="border-zinc-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
                <span className="text-zinc-200 text-sm">El cónyuge es Persona Expuesta Políticamente (PEP)</span>
              </label>
            </CardContent>
          </Card>
        )}

        {/* DOMICILIO */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <MapPin size={14} className="text-lime-400" />
              {esJuridica ? 'Domicilio fiscal' : 'Domicilio real'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-7 space-y-1.5">
                <Label className="text-zinc-300">Calle</Label>
                <Input value={form.dom_calle} onChange={e => set('dom_calle', e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-6 sm:col-span-3 space-y-1.5">
                <Label className="text-zinc-300">Número</Label>
                <Input value={form.dom_numero} onChange={e => set('dom_numero', e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-6 sm:col-span-2 space-y-1.5">
                <Label className="text-zinc-300">Piso/Dto.</Label>
                <Input value={form.dom_piso} onChange={e => set('dom_piso', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-5 space-y-1.5">
                <Label className="text-zinc-300">Localidad</Label>
                <Input value={form.dom_localidad} onChange={e => set('dom_localidad', e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-7 sm:col-span-4 space-y-1.5">
                <Label className="text-zinc-300">Provincia</Label>
                <Select value={form.dom_provincia} onValueChange={v => set('dom_provincia', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className={selectContentCls + ' max-h-[300px]'}>
                    {PROVINCIAS_AR.map(p => <SelectItem key={p} value={p} className={selectItemCls}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-5 sm:col-span-3 space-y-1.5">
                <Label className="text-zinc-300">Cód. postal</Label>
                <Input value={form.dom_codigo_postal} onChange={e => set('dom_codigo_postal', e.target.value)} className={inputCls} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PERFIL ECONÓMICO */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Briefcase size={14} className="text-lime-400" />Perfil económico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{esJuridica ? 'Actividad / objeto social' : 'Profesión / actividad'}</Label>
                <Input value={form.profesion} onChange={e => set('profesion', e.target.value)} className={inputCls} />
              </div>
              {!esJuridica && (
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Empleador</Label>
                  <Input value={form.empleador} onChange={e => set('empleador', e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">{esJuridica ? 'Facturación anual (ARS)' : 'Ingreso mensual (ARS)'}</Label>
                <Input type="number" value={form.ingreso_mensual} onChange={e => set('ingreso_mensual', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Patrimonio aprox. (ARS)</Label>
                <Input type="number" value={form.patrimonio_aprox} onChange={e => set('patrimonio_aprox', e.target.value)} className={inputCls} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CLASIFICACIÓN UIF */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <ShieldAlert size={14} className="text-lime-400" />Clasificación UIF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-zinc-800/40">
              <Checkbox checked={form.es_pep}
                onCheckedChange={(v: boolean | 'indeterminate') => set('es_pep', !!v)}
                className="mt-0.5 border-zinc-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
              <div>
                <p className="text-zinc-200 text-sm font-medium">Persona Expuesta Políticamente (PEP)</p>
                <p className="text-zinc-500 text-xs">Funcionarios públicos, sus familiares o allegados.</p>
              </div>
            </label>

            {form.es_pep && (
              <div className="ml-7 space-y-4 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Tipo de PEP <span className="text-lime-400">*</span></Label>
                    <Select value={form.tipo_pep} onValueChange={v => set('tipo_pep', v as TipoPEP)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="funcionario" className={selectItemCls}>Funcionario público</SelectItem>
                        <SelectItem value="familiar" className={selectItemCls}>Familiar de funcionario</SelectItem>
                        <SelectItem value="allegado" className={selectItemCls}>Allegado / vínculo asociativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Cargo o vínculo</Label>
                    <Input value={form.cargo_pep} onChange={e => set('cargo_pep', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Jurisdicción</Label>
                    <Input value={form.jurisdiccion_pep} onChange={e => set('jurisdiccion_pep', e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Período desde</Label>
                    <Input type="date" value={form.periodo_pep_desde} onChange={e => set('periodo_pep_desde', e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Período hasta</Label>
                    <Input type="date" value={form.periodo_pep_hasta} onChange={e => set('periodo_pep_hasta', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-zinc-800/40">
              <Checkbox checked={form.es_sujeto_obligado}
                onCheckedChange={(v: boolean | 'indeterminate') => set('es_sujeto_obligado', !!v)}
                className="mt-0.5 border-zinc-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
              <div>
                <p className="text-zinc-200 text-sm font-medium">Sujeto Obligado UIF</p>
                <p className="text-zinc-500 text-xs">Bancos, escribanos, contadores, etc.</p>
              </div>
            </label>

            {form.es_sujeto_obligado && (
              <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">N° inscripción UIF</Label>
                  <Input value={form.uif_inscripcion_numero} onChange={e => set('uif_inscripcion_numero', e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Fecha de inscripción</Label>
                  <Input type="date" value={form.uif_inscripcion_fecha} onChange={e => set('uif_inscripcion_fecha', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NOTAS */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Notas internas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={form.notas} onChange={e => set('notas', e.target.value)}
              rows={3} className={inputCls + ' resize-none'} />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}
            className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}Guardar cambios
          </Button>
          <Link href={`/crm/clientes/${id}`}>
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
