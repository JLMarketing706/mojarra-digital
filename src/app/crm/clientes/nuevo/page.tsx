'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2, ArrowLeft, Upload, Scan, User, Building2,
  ShieldAlert, FileText, MapPin, Briefcase, Heart,
} from 'lucide-react'
import Link from 'next/link'
import type { DatosDocumento } from '@/lib/claude/ocr'
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
  { v: 'AR', label: 'Argentina' },
  { v: 'UY', label: 'Uruguaya' },
  { v: 'CL', label: 'Chilena' },
  { v: 'BR', label: 'Brasileña' },
  { v: 'BO', label: 'Boliviana' },
  { v: 'PY', label: 'Paraguaya' },
  { v: 'PE', label: 'Peruana' },
  { v: 'CO', label: 'Colombiana' },
  { v: 'VE', label: 'Venezolana' },
  { v: 'ES', label: 'Española' },
  { v: 'IT', label: 'Italiana' },
  { v: 'OTRO', label: 'Otra' },
]

interface FormData {
  tipo_persona: TipoPersona
  // Identificación
  nombre: string; apellido: string
  tipo_documento: TipoDocumento | ''
  dni: string; cuil: string
  sexo: Sexo | ''
  fecha_nacimiento: string
  lugar_nacimiento: string
  nacionalidad: string
  estado_civil: string
  // Cónyuge
  conyuge_nombre: string
  conyuge_dni: string
  conyuge_es_pep: boolean
  // Domicilio
  dom_calle: string; dom_numero: string; dom_piso: string
  dom_localidad: string; dom_provincia: string
  dom_codigo_postal: string; dom_pais: string
  // Contacto
  email: string; telefono: string
  // Perfil económico
  profesion: string
  empleador: string
  ingreso_mensual: string
  patrimonio_aprox: string
  // PEP
  es_pep: boolean
  tipo_pep: TipoPEP | ''
  cargo_pep: string
  jurisdiccion_pep: string
  periodo_pep_desde: string
  periodo_pep_hasta: string
  // Sujeto Obligado
  es_sujeto_obligado: boolean
  uif_inscripcion_numero: string
  uif_inscripcion_fecha: string
  // Otros
  notas: string
}

const EMPTY: FormData = {
  tipo_persona: 'humana',
  nombre: '', apellido: '', tipo_documento: '', dni: '', cuil: '',
  sexo: '', fecha_nacimiento: '', lugar_nacimiento: '', nacionalidad: 'AR',
  estado_civil: '',
  conyuge_nombre: '', conyuge_dni: '', conyuge_es_pep: false,
  dom_calle: '', dom_numero: '', dom_piso: '',
  dom_localidad: '', dom_provincia: '', dom_codigo_postal: '', dom_pais: 'AR',
  email: '', telefono: '',
  profesion: '', empleador: '', ingreso_mensual: '', patrimonio_aprox: '',
  es_pep: false, tipo_pep: '', cargo_pep: '', jurisdiccion_pep: '',
  periodo_pep_desde: '', periodo_pep_hasta: '',
  es_sujeto_obligado: false, uif_inscripcion_numero: '', uif_inscripcion_fecha: '',
  notas: '',
}

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'
const selectTriggerCls = 'bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400'
const selectContentCls = 'bg-zinc-900 border-zinc-700'
const selectItemCls = 'text-zinc-200 focus:bg-zinc-800'

export default function NuevoClientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [procesandoOCR, setProcesandoOCR] = useState(false)
  const [camposOCR, setCamposOCR] = useState<string[]>([])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(p => ({ ...p, [key]: value }))
  }

  const requiereConyuge = form.estado_civil === 'casado' || form.estado_civil === 'union_convivencial'

  const [archivoFrente, setArchivoFrente] = useState<File | null>(null)
  const [archivoDorso, setArchivoDorso] = useState<File | null>(null)

  async function ejecutarOCR() {
    if (!archivoFrente) {
      toast.error('Subí al menos la foto del frente.')
      return
    }
    setProcesandoOCR(true)
    try {
      const fd = new FormData()
      fd.append('frente', archivoFrente)
      if (archivoDorso) fd.append('dorso', archivoDorso)
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      const json = (await res.json()) as { datos?: DatosDocumento; error?: string }
      if (!res.ok || !json.datos) {
        toast.error(json.error ?? 'Error en OCR.')
        return
      }
      const d = json.datos
      const completados: string[] = []
      setForm(prev => {
        const next = { ...prev }
        if (d.nombre) { next.nombre = d.nombre; completados.push('nombre') }
        if (d.apellido) { next.apellido = d.apellido; completados.push('apellido') }
        if (d.dni) { next.dni = d.dni; completados.push('dni'); next.tipo_documento = 'DNI' }
        if (d.cuil) { next.cuil = d.cuil; completados.push('cuil') }
        if (d.domicilio) { next.dom_calle = d.domicilio; completados.push('dom_calle') }
        return next
      })
      setCamposOCR(completados)
      toast.success(`${completados.length} campos completados con IA.`)
    } catch {
      toast.error('Error al procesar el documento.')
    } finally {
      setProcesandoOCR(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.apellido) {
      toast.error('Nombre y apellido son obligatorios.')
      return
    }
    if (form.es_pep && !form.tipo_pep) {
      toast.error('Si es PEP, indicá el tipo (funcionario / familiar / allegado).')
      return
    }
    setSaving(true)

    const payload = {
      tipo_persona: form.tipo_persona,
      nombre: form.nombre, apellido: form.apellido,
      tipo_documento: form.tipo_documento || null,
      dni: form.dni || null, cuil: form.cuil || null,
      sexo: form.sexo || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      lugar_nacimiento: form.lugar_nacimiento || null,
      nacionalidad: form.nacionalidad || null,
      estado_civil: form.estado_civil || null,
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
      notas: form.notas || null,
    }

    const { data, error } = await supabase.from('clientes').insert(payload).select().single()
    setSaving(false)

    if (error) {
      console.error(error)
      toast.error('Error al guardar el cliente.')
      return
    }

    const niv = (data as { nivel_riesgo?: string }).nivel_riesgo
    if (niv === 'alto') {
      toast.warning('Cliente creado · Riesgo ALTO. Adjuntá la documentación de respaldo más abajo.')
    } else {
      toast.success(`Cliente creado · Riesgo ${niv ?? 'bajo'}. Ya podés adjuntar la documentación.`)
    }

    // Si tiene estado civil que requiere respaldo (casado/divorciado/viudo/unión),
    // redirigir directo a la zona de carga de documentos del legajo.
    const requiereDocs = ['casado', 'divorciado', 'viudo', 'union_convivencial'].includes(form.estado_civil)
    router.push(`/crm/clientes/${data.id}${requiereDocs ? '#legajo' : ''}`)
  }

  const ocrBadge = (campo: string) =>
    camposOCR.includes(campo) && (
      <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0 ml-2">
        <Scan size={10} className="mr-1" />IA
      </Badge>
    )

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/clientes">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Clientes
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Nuevo cliente</h1>
        <p className="text-zinc-500 text-sm">
          Los datos marcados con <span className="text-lime-400 font-medium">*</span> son obligatorios según Res. UIF 242/2023.
        </p>
      </div>

      {/* Selector tipo de persona */}
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
                    active
                      ? 'border-lime-400 bg-lime-400/5'
                      : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'
                  }`}>
                  <Icon size={18} className={active ? 'text-lime-400' : 'text-zinc-500'} />
                  <span className={`text-sm font-medium ${active ? 'text-white' : 'text-zinc-300'}`}>{label}</span>
                </button>
              )
            })}
          </div>
          {form.tipo_persona !== 'humana' && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-sm text-yellow-300">
              Para {form.tipo_persona === 'juridica' ? 'personas jurídicas' : 'fideicomisos'} cargás los datos básicos del representante acá.
              Los datos completos de la entidad y los beneficiarios finales se cargan desde la ficha del cliente, después de crearlo.
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR */}
      {form.tipo_persona === 'humana' && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
                {procesandoOCR ? <Loader2 size={18} className="text-lime-400 animate-spin" /> : <Scan size={18} className="text-lime-400" />}
              </div>
              <div>
                <p className="text-zinc-200 text-sm font-medium">
                  {procesandoOCR ? 'Leyendo documento...' : 'Escanear DNI con IA'}
                </p>
                <p className="text-zinc-500 text-xs">Subí frente y dorso del DNI para autocompletar los campos</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 cursor-pointer">
                <span className="text-zinc-400 text-xs uppercase tracking-wide">Frente *</span>
                <div className="border border-dashed border-zinc-700 rounded-md p-3 text-center text-zinc-300 text-sm hover:border-lime-400 transition-colors">
                  <Upload size={14} className="inline mr-1.5" />
                  {archivoFrente ? archivoFrente.name : 'Elegir archivo'}
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={procesandoOCR}
                  onChange={e => setArchivoFrente(e.target.files?.[0] ?? null)}
                />
              </label>

              <label className="flex flex-col gap-1.5 cursor-pointer">
                <span className="text-zinc-400 text-xs uppercase tracking-wide">Dorso (opcional)</span>
                <div className="border border-dashed border-zinc-700 rounded-md p-3 text-center text-zinc-300 text-sm hover:border-lime-400 transition-colors">
                  <Upload size={14} className="inline mr-1.5" />
                  {archivoDorso ? archivoDorso.name : 'Elegir archivo'}
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={procesandoOCR}
                  onChange={e => setArchivoDorso(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <Button
              type="button"
              onClick={ejecutarOCR}
              disabled={!archivoFrente || procesandoOCR}
              className="w-full bg-lime-400 text-black hover:bg-lime-300 font-semibold disabled:opacity-50"
            >
              {procesandoOCR
                ? <><Loader2 size={14} className="animate-spin mr-2" />Procesando...</>
                : <><Scan size={14} className="mr-2" />Escanear y completar</>}
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* IDENTIFICACIÓN */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <User size={14} className="text-lime-400" />
              Identificación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 flex items-center">
                  Nombre <span className="text-lime-400 ml-1">*</span>{ocrBadge('nombre')}
                </Label>
                <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} required className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 flex items-center">
                  Apellido <span className="text-lime-400 ml-1">*</span>{ocrBadge('apellido')}
                </Label>
                <Input value={form.apellido} onChange={e => set('apellido', e.target.value)} required className={inputCls} />
              </div>
            </div>
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
                <Label className="text-zinc-300 uppercase text-xs flex items-center">N° documento{ocrBadge('dni')}</Label>
                <Input value={form.dni} onChange={e => set('dni', e.target.value)} placeholder="12345678" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 uppercase text-xs flex items-center">CUIT/CUIL{ocrBadge('cuil')}</Label>
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

            {form.estado_civil && form.estado_civil !== 'soltero' && (
              <div className="p-3 rounded-lg bg-lime-400/5 border border-lime-400/20 flex gap-2 items-start">
                <Upload size={14} className="text-lime-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-lime-300 text-xs font-medium">
                    Vas a poder adjuntar la documentación de respaldo después de guardar
                  </p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {form.estado_civil === 'casado' && 'Acta de matrimonio.'}
                    {form.estado_civil === 'divorciado' && 'Sentencia de divorcio firme.'}
                    {form.estado_civil === 'viudo' && 'Acta de defunción del cónyuge.'}
                    {form.estado_civil === 'union_convivencial' && 'Declaración de unión convivencial.'}
                    {' '}En la ficha del cliente vas a tener la zona de carga.
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="nombre@ejemplo.com" className={inputCls} />
            </div>
          </CardContent>
        </Card>

        {/* CÓNYUGE (si casado) */}
        {requiereConyuge && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <Heart size={14} className="text-lime-400" />
                Cónyuge / Conviviente
              </CardTitle>
              <p className="text-xs text-zinc-500">Necesario para evaluar PEP por parentesco (Res. UIF 192/2024).</p>
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
              Domicilio real
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-7 space-y-1.5">
                <Label className="text-zinc-300 flex items-center">Calle{ocrBadge('dom_calle')}</Label>
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
              <Briefcase size={14} className="text-lime-400" />
              Perfil económico
            </CardTitle>
            <p className="text-xs text-zinc-500">Datos para calcular el perfil patrimonial (art. 16 Res. 242/2023).</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Profesión / actividad principal</Label>
                <Input value={form.profesion} onChange={e => set('profesion', e.target.value)}
                  placeholder="Médico, abogado, comerciante..." className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Empleador (si aplica)</Label>
                <Input value={form.empleador} onChange={e => set('empleador', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Ingreso mensual aproximado (ARS)</Label>
                <Input type="number" value={form.ingreso_mensual} onChange={e => set('ingreso_mensual', e.target.value)}
                  placeholder="500000" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Patrimonio aproximado (ARS)</Label>
                <Input type="number" value={form.patrimonio_aprox} onChange={e => set('patrimonio_aprox', e.target.value)}
                  placeholder="50000000" className={inputCls} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CLASIFICACIÓN UIF */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <ShieldAlert size={14} className="text-lime-400" />
              Clasificación UIF
            </CardTitle>
            <p className="text-xs text-zinc-500">El sistema calcula automáticamente el nivel de riesgo (bajo/medio/alto) al guardar.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-zinc-800/40">
              <Checkbox checked={form.es_pep}
                onCheckedChange={(v: boolean | 'indeterminate') => set('es_pep', !!v)}
                className="mt-0.5 border-zinc-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
              <div>
                <p className="text-zinc-200 text-sm font-medium">Persona Expuesta Políticamente (PEP)</p>
                <p className="text-zinc-500 text-xs">Funcionarios públicos, sus familiares o allegados (Res. UIF 35/2023, 192/2024).</p>
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
                    <Input value={form.cargo_pep} onChange={e => set('cargo_pep', e.target.value)}
                      placeholder="Diputado nacional / Hijo de gobernador..." className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Jurisdicción</Label>
                    <Input value={form.jurisdiccion_pep} onChange={e => set('jurisdiccion_pep', e.target.value)}
                      placeholder="Nacional / CABA / ..." className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Período desde</Label>
                    <Input type="date" value={form.periodo_pep_desde}
                      onChange={e => set('periodo_pep_desde', e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Período hasta (vacío = vigente)</Label>
                    <Input type="date" value={form.periodo_pep_hasta}
                      onChange={e => set('periodo_pep_hasta', e.target.value)} className={inputCls} />
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
                <p className="text-zinc-500 text-xs">Bancos, escribanos, contadores, inmobiliarias, casinos, etc. (Ley 25.246).</p>
              </div>
            </label>

            {form.es_sujeto_obligado && (
              <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Número de inscripción UIF</Label>
                  <Input value={form.uif_inscripcion_numero}
                    onChange={e => set('uif_inscripcion_numero', e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Fecha de inscripción</Label>
                  <Input type="date" value={form.uif_inscripcion_fecha}
                    onChange={e => set('uif_inscripcion_fecha', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NOTAS */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Notas internas</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notas} onChange={e => set('notas', e.target.value)}
              placeholder="Observaciones internas..." rows={3}
              className={inputCls + ' resize-none'} />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}
            className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}Guardar cliente
          </Button>
          <Link href="/crm/clientes">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
