'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MicButton } from '@/components/crm/mic-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2, ArrowLeft, FileText, Coins, ShieldAlert, Calendar,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import type { Profile, TipoActo, FormaPago, NivelRiesgo } from '@/types'
import { LABEL_TIPO_ACTO, LABEL_FORMA_PAGO } from '@/types'
import { formatMonto, parseMonto } from '@/lib/utils'
import { useFormDraft } from '@/lib/use-form-draft'
import { DraftBanner, DraftSavedIndicator } from '@/components/crm/draft-banner'

// ─── Clases de estilo ─────────────────────────────────────
const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'
const selectTriggerCls = 'bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400'
const selectContentCls = 'bg-zinc-900 border-zinc-700'
const selectItemCls = 'text-zinc-200 focus:bg-zinc-800'

// ─── Tipos de trámite (dos niveles) ──────────────────────
const CATEGORIAS_TRAMITE: { label: string; subtipos: string[] }[] = [
  {
    label: 'Operaciones Inmobiliarias',
    subtipos: [
      'Escritura de compraventa',
      'Constitución de hipotecas',
      'Donación de inmueble',
      'Afectación a Vivienda (Bien de Familia)',
      'Reglamento de Propiedad Horizontal',
      'Estudio de títulos',
    ],
  },
  {
    label: 'Trámites Personales y Familiares',
    subtipos: [
      'Poder general',
      'Poder especial',
      'Autorización de viaje para menor',
      'Testamento',
      'Autorización para conducir vehículo',
      'Certificación de unión convivencial',
      'Venia matrimonial',
    ],
  },
  {
    label: 'Certificaciones y Actas',
    subtipos: [
      'Certificación de firmas',
      'Certificación de fotocopias',
      'Acta de constatación',
      'Acta de notificación',
      'Protocolización de documentos',
    ],
  },
  {
    label: 'Trámites Comerciales',
    subtipos: [
      'Constitución de sociedad (SA)',
      'Constitución de sociedad (SRL)',
      'Constitución de sociedad (SAS)',
      'Constitución de sociedad (otra)',
      'Transferencia de fondo de comercio',
      'Acta de asamblea',
      'Acta de directorio',
      'Contrato de alquiler (certificación)',
      'Cesión de cuotas sociales',
    ],
  },
  {
    label: 'Gestión Registral',
    subtipos: [
      'Solicitud de informe de dominio',
      'Solicitud de informe de inhibición',
      'Inscripción en Registro de la Propiedad',
      'Tramitación de segundo testimonio',
      'Cancelación de hipoteca',
    ],
  },
]

// ─── Monedas ─────────────────────────────────────────────
const MONEDAS = [
  { v: 'ARS', label: 'Pesos argentinos ($)' },
  { v: 'USD', label: 'Dólares estadounidenses (US$)' },
  { v: 'EUR', label: 'Euros (€)' },
  { v: 'BRL', label: 'Reales (R$)' },
  { v: 'CRYPTO', label: 'Criptomoneda' },
]

const TIPOS_ACTO_LIST: TipoActo[] = [
  'compraventa_inmueble', 'constitucion_sociedad', 'cesion_cuotas',
  'fideicomiso', 'hipoteca', 'donacion', 'mutuo', 'otro',
]

const FORMAS_PAGO_LIST: FormaPago[] = [
  'efectivo', 'transferencia', 'cheque', 'mixto', 'permuta', 'credito_hipotecario', 'otra',
]

const ESTADOS_OPERACION = [
  { v: 'iniciado', label: 'Iniciado' },
  { v: 'en_proceso', label: 'En proceso' },
  { v: 'en_registro', label: 'En registro' },
  { v: 'observado', label: 'Observado' },
  { v: 'listo', label: 'Listo para retirar' },
  { v: 'entregado', label: 'Entregado' },
]

const RIESGO_BADGE: Record<NivelRiesgo, string> = {
  bajo: 'bg-green-500/15 text-green-300 border-green-500/30',
  medio: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  alto: 'bg-red-500/15 text-red-300 border-red-500/30',
}

interface ClienteRow {
  id: string; nombre: string; apellido: string
  dni: string | null; cuil: string | null
  es_pep: boolean; es_sujeto_obligado: boolean; nivel_riesgo: NivelRiesgo | null
}
interface SMVMRow { vigencia_desde: string; valor: number }

// ─── Input de monto estilo calculadora ───────────────────
// Default 0,00. Cada dígito que se tipea acumula desde la derecha:
// "5"     → "0,05"
// "55"    → "0,55"
// "555"   → "5,55"
// "5555"  → "55,55"
// "55555" → "555,55"
// "555555"→ "5.555,55"
// Backspace borra dígito por dígito.
function MontoInput({
  label, value, onChange, helpText,
}: { label: string; value: string; onChange: (v: string) => void; helpText?: string }) {
  // Estado interno = solo dígitos, ej "5555" representa 55,55
  // Sincroniza con value externo (importante para restaurar drafts)
  const [digits, setDigits] = useState(() => valueToDigits(value))

  useEffect(() => {
    // Si cambia value desde afuera (ej: restoreDraft) y difiere, actualizar
    const externo = valueToDigits(value)
    if (externo !== digits) setDigits(externo)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault()
    if (e.key >= '0' && e.key <= '9') {
      // Limitar a 15 dígitos (hasta billones con 2 decimales)
      if (digits.length >= 15) return
      const nuevos = (digits + e.key).replace(/^0+/, '') // quitar ceros a izquierda
      actualizar(nuevos)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      actualizar(digits.slice(0, -1))
    } else if (e.key === 'Escape') {
      actualizar('')
    }
    // Permitir Tab para navegar
    if (e.key === 'Tab') return
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const txt = e.clipboardData.getData('text')
    // Extraer solo dígitos (permite que peguen "1.234,56" etc)
    const soloDigitos = txt.replace(/\D/g, '')
    if (!soloDigitos) return
    const num = parseInt(soloDigitos, 10)
    if (!isNaN(num)) actualizar(String(num))
  }

  function actualizar(nuevosDigits: string) {
    setDigits(nuevosDigits)
    if (!nuevosDigits) { onChange(''); return }
    // dígitos como entero → dividir por 100 para tener centavos
    const numero = parseInt(nuevosDigits, 10) / 100
    onChange(String(numero))
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300">{label}</Label>
      <Input
        value={digitsToDisplay(digits)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => { /* manejado por keydown */ }}
        inputMode="decimal"
        className={inputCls + ' text-right font-mono tabular-nums'}
      />
      {helpText && <p className="text-xs text-zinc-500">{helpText}</p>}
    </div>
  )
}

/** Convierte el value externo (ej "1234.56") a dígitos internos ("123456") */
function valueToDigits(value: string): string {
  if (!value) return ''
  const num = parseFloat(value)
  if (isNaN(num) || num <= 0) return ''
  // Multiplicar por 100 y redondear para evitar errores de punto flotante
  const cents = Math.round(num * 100)
  return String(cents)
}

/** Convierte dígitos internos a display formateado es-AR */
function digitsToDisplay(digits: string): string {
  if (!digits) return '0,00'
  const padded = digits.padStart(3, '0') // mínimo 3 dígitos para tener "0,XX"
  const enteros = padded.slice(0, -2)
  const decimales = padded.slice(-2)
  // Formatear los enteros con puntos de miles
  const enterosFmt = enteros.replace(/^0+/, '') || '0'
  const conPuntos = enterosFmt.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${conPuntos},${decimales}`
}

export default function NuevoTramitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [escribanos, setEscribanos] = useState<Profile[]>([])
  const [smvm, setSmvm] = useState<number>(308200)

  // Tipo de trámite (dos niveles)
  const [categoria, setCategoria] = useState('')
  const [subtipo, setSubtipo] = useState('')
  const subtiposActuales = CATEGORIAS_TRAMITE.find(c => c.label === categoria)?.subtipos ?? []

  // Moneda
  const [moneda, setMoneda] = useState('ARS')
  const [criptoNombre, setCriptoNombre] = useState('')

  const [form, setForm] = useState({
    tipo_acto: '' as TipoActo | '',
    cliente_id: searchParams.get('cliente_id') ?? '',
    escribano_id: '',
    descripcion: '',
    numero_referencia: '',
    notas_internas: '',
    numero_escritura: '',
    folio_protocolo: '',
    registro_notarial: '',
    fecha_escritura: '',
    monto: '',
    monto_efectivo: '',
    monto_moneda_extranjera: '',
    tipo_cambio: '',
    forma_pago: '' as FormaPago | '',
    origen_fondos: '',
    estado_inicial: 'iniciado',
  })

  useEffect(() => {
    async function load() {
      // Obtener el usuario actual para filtrar por escribanía
      const { data: { user } } = await supabase.auth.getUser()
      let escribaniaId: string | null = null

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('escribania_id')
          .eq('id', user.id)
          .single()
        escribaniaId = (profile as { escribania_id?: string } | null)?.escribania_id ?? null
      }

      let escQuery = supabase
        .from('profiles')
        .select('id, nombre, apellido, rol, email, activo, created_at')
        .in('rol', ['escribano', 'protocolista', 'escribano_titular', 'escribano_adscripto', 'escribano_subrogante', 'escribano_interino', 'oficial_cumplimiento'])
        .eq('activo', true)
        .order('apellido')

      // Filtrar por escribanía si disponible
      if (escribaniaId) {
        escQuery = escQuery.eq('escribania_id', escribaniaId)
      }

      const [cls, escs, smvmRows] = await Promise.all([
        supabase.from('clientes')
          .select('id, nombre, apellido, dni, cuil, es_pep, es_sujeto_obligado, nivel_riesgo')
          .order('apellido'),
        escQuery,
        supabase.from('smvm_historico')
          .select('vigencia_desde, valor')
          .order('vigencia_desde', { ascending: false })
          .limit(1),
      ])

      if (cls.data) setClientes(cls.data as ClienteRow[])

      const listaEscribanos = (escs.data ?? []) as Profile[]
      setEscribanos(listaEscribanos)

      // Auto-seleccionar si hay exactamente uno
      if (listaEscribanos.length === 1) {
        setForm(p => ({ ...p, escribano_id: listaEscribanos[0].id }))
      }

      if (smvmRows.data && smvmRows.data.length > 0) {
        setSmvm(Number((smvmRows.data[0] as SMVMRow).valor))
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(p => ({ ...p, [key]: value }))
  }

  // Auto-save: combina form + selecciones derivadas en un único objeto serializable
  type DraftShape = { form: typeof form; categoria: string; subtipo: string; moneda: string; criptoNombre: string }
  const draftState: DraftShape = { form, categoria, subtipo, moneda, criptoNombre }
  const { hasDraft, restoreDraft, clearDraft, draftSavedAt } = useFormDraft<DraftShape>(
    'nuevo-tramite', draftState,
    s => { setForm(s.form); setCategoria(s.categoria); setSubtipo(s.subtipo); setMoneda(s.moneda); setCriptoNombre(s.criptoNombre) },
  )

  // Cálculo en vivo UIF
  const monto = parseMonto(form.monto)
  const efectivo = parseMonto(form.monto_efectivo)
  const umbralEfectivo = smvm * 750
  const umbralCompraventa = smvm * 700

  const disparaPorTipo = ['constitucion_sociedad', 'cesion_cuotas', 'fideicomiso'].includes(form.tipo_acto)
  const disparaPorEfectivo = form.tipo_acto === 'compraventa_inmueble' && efectivo > 0 && efectivo >= umbralEfectivo
  const disparaPorCompraventa = form.tipo_acto === 'compraventa_inmueble' && monto >= umbralCompraventa
  const disparaUIF = disparaPorTipo || disparaPorEfectivo || disparaPorCompraventa

  const clienteSeleccionado = clientes.find(c => c.id === form.cliente_id)

  // El tipo final que se guarda en DB es el subtipo elegido
  const tipoFinal = subtipo || categoria

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cliente_id) { toast.error('Tenés que seleccionar un cliente.'); return }
    if (!tipoFinal) { toast.error('Indicá el tipo de operación.'); return }
    setSaving(true)

    // Calcular monto en ARS si la moneda es extranjera
    let montoARS = parseMonto(form.monto)
    const montoExt = parseMonto(form.monto_moneda_extranjera)
    const tc = parseMonto(form.tipo_cambio)
    if (moneda !== 'ARS' && montoExt > 0 && tc > 0) {
      montoARS = montoExt * tc
    }

    // Determinar moneda_extranjera y nombre
    let monedaExtNombre = ''
    if (moneda === 'CRYPTO') monedaExtNombre = criptoNombre || 'Cripto'
    else if (moneda !== 'ARS') monedaExtNombre = moneda

    const payload = {
      tipo: tipoFinal,
      tipo_acto: form.tipo_acto || null,
      cliente_id: form.cliente_id,
      escribano_id: form.escribano_id || null,
      descripcion: form.descripcion || null,
      numero_referencia: form.numero_referencia || null,
      notas_internas: form.notas_internas || null,
      numero_escritura: form.numero_escritura || null,
      folio_protocolo: form.folio_protocolo || null,
      registro_notarial: form.registro_notarial || null,
      fecha_escritura: form.fecha_escritura || null,
      monto: montoARS || null,
      monto_efectivo: efectivo || 0,
      monto_moneda_extranjera: moneda !== 'ARS' ? (montoExt || null) : null,
      moneda_extranjera: monedaExtNombre || null,
      tipo_cambio: tc || null,
      forma_pago: form.forma_pago || null,
      origen_fondos: form.origen_fondos || null,
      estado: form.estado_inicial,
      cumplimiento_dd: 'pendiente',
    }

    const { data: tramite, error } = await supabase
      .from('tramites')
      .insert(payload)
      .select()
      .single()

    if (error || !tramite) {
      console.error(error)
      toast.error('Error al crear la operación.')
      setSaving(false)
      return
    }

    await supabase.from('tramite_hitos').insert({
      tramite_id: tramite.id,
      descripcion: `Operación creada en estado: ${ESTADOS_OPERACION.find(e => e.v === form.estado_inicial)?.label ?? form.estado_inicial}`,
    })

    type AlertaInsert = { tramite_id: string; tipo?: string; tipo_alerta?: string; descripcion: string }
    const alertas: AlertaInsert[] = []
    const t = tramite as { id: string; dispara_uif: boolean }
    if (t.dispara_uif) {
      if (disparaPorEfectivo) alertas.push({ tramite_id: t.id, tipo: 'monto', tipo_alerta: 'monto_excedido', descripcion: `Pago en efectivo $${efectivo.toLocaleString('es-AR')} supera 750 SMVM` })
      if (disparaPorCompraventa) alertas.push({ tramite_id: t.id, tipo: 'monto', tipo_alerta: 'monto_excedido', descripcion: `Compraventa $${monto.toLocaleString('es-AR')} supera 700 SMVM` })
      if (disparaPorTipo) alertas.push({ tramite_id: t.id, tipo: 'otro', tipo_alerta: 'monto_excedido', descripcion: `Acto "${LABEL_TIPO_ACTO[form.tipo_acto as TipoActo]}" requiere UIF sin mínimo` })
    }
    if (clienteSeleccionado?.es_pep) alertas.push({ tramite_id: t.id, tipo: 'pep', tipo_alerta: 'pep_detectado', descripcion: 'Cliente PEP — debida diligencia reforzada' })
    if (clienteSeleccionado?.es_sujeto_obligado) alertas.push({ tramite_id: t.id, tipo: 'sujeto_obligado', tipo_alerta: 'sujeto_obligado', descripcion: 'Cliente es Sujeto Obligado UIF' })
    if (alertas.length > 0) await supabase.from('alertas_uif').insert(alertas)

    setSaving(false)
    clearDraft()
    toast.success(t.dispara_uif ? 'Operación creada · Dispara UIF' : 'Operación creada.')
    router.push(`/crm/tramites/${tramite.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/crm/tramites">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Operaciones
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Nueva operación</h1>
        <p className="text-zinc-500 text-sm">
          El sistema calcula automáticamente si la operación dispara obligación UIF según el tipo de acto y los montos.
        </p>
      </div>

      <DraftBanner
        hasDraft={hasDraft}
        draftSavedAt={draftSavedAt}
        onRestore={restoreDraft}
        onDiscard={clearDraft}
      />

      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
        {/* IDENTIFICACIÓN */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <FileText size={14} className="text-lime-400" />Identificación de la operación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Dos desplegables de tipo de trámite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Categoría <span className="text-lime-400">*</span></Label>
                <Select value={categoria} onValueChange={v => { setCategoria(v); setSubtipo('') }}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Seleccioná categoría" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {CATEGORIAS_TRAMITE.map(c => (
                      <SelectItem key={c.label} value={c.label} className={selectItemCls}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Tipo de operación <span className="text-lime-400">*</span></Label>
                <Select value={subtipo} onValueChange={setSubtipo} disabled={!categoria}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={categoria ? 'Seleccioná tipo' : '— elegí categoría primero —'} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {subtiposActuales.map(s => (
                      <SelectItem key={s} value={s} className={selectItemCls}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de acto UIF */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Tipo de acto UIF</Label>
              <Select value={form.tipo_acto} onValueChange={v => set('tipo_acto', v as TipoActo)}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Seleccioná (define obligación UIF)" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {TIPOS_ACTO_LIST.map(t => (
                    <SelectItem key={t} value={t} className={selectItemCls}>{LABEL_TIPO_ACTO[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente y Escribano */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Cliente <span className="text-lime-400">*</span></Label>
                <Select value={form.cliente_id} onValueChange={v => set('cliente_id', v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Seleccioná cliente" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls + ' max-h-64'}>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id} className={selectItemCls}>
                        {c.apellido}, {c.nombre} {c.dni ? `· ${c.dni}` : c.cuil ? `· ${c.cuil}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clienteSeleccionado && (
                  <div className="flex items-center gap-2 mt-1.5">
                    {clienteSeleccionado.nivel_riesgo && (
                      <Badge className={`text-xs uppercase border ${RIESGO_BADGE[clienteSeleccionado.nivel_riesgo]}`}>
                        Riesgo {clienteSeleccionado.nivel_riesgo}
                      </Badge>
                    )}
                    {clienteSeleccionado.es_pep && <Badge className="bg-yellow-500/20 text-yellow-300 border-0 text-xs">PEP</Badge>}
                    {clienteSeleccionado.es_sujeto_obligado && <Badge className="bg-orange-500/20 text-orange-300 border-0 text-xs">SO</Badge>}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Escribano/a asignado</Label>
                <Select value={form.escribano_id} onValueChange={v => set('escribano_id', v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={escribanos.length === 0 ? 'Sin escribanos en esta escribanía' : 'Sin asignar'} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {escribanos.map(e => (
                      <SelectItem key={e.id} value={e.id} className={selectItemCls}>
                        {e.apellido}, {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {escribanos.length === 1 && (
                  <p className="text-xs text-lime-400 mt-1">Auto-seleccionado (único escribano)</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Número de referencia interno</Label>
              <Input value={form.numero_referencia} onChange={e => set('numero_referencia', e.target.value)}
                placeholder="Ej: 2024-001" className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Descripción</Label>
                <MicButton value={form.descripcion} onChange={v => set('descripcion', v)} />
              </div>
              <Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="Descripción breve de la operación..." rows={2}
                className={inputCls + ' resize-none'} />
            </div>
          </CardContent>
        </Card>

        {/* DATOS DE ESCRITURA */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Calendar size={14} className="text-lime-400" />Datos de la escritura (opcional al iniciar)
            </CardTitle>
            <p className="text-xs text-zinc-500">Podés completarlos al momento de la firma.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">N° escritura</Label>
                <Input value={form.numero_escritura} onChange={e => set('numero_escritura', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Folio</Label>
                <Input value={form.folio_protocolo} onChange={e => set('folio_protocolo', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Fecha</Label>
                <Input type="date" value={form.fecha_escritura} onChange={e => set('fecha_escritura', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Registro notarial</Label>
                <Input value={form.registro_notarial} onChange={e => set('registro_notarial', e.target.value)} placeholder="N°123 CABA" className={inputCls} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MONTOS Y PAGOS */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Coins size={14} className="text-lime-400" />Montos y forma de pago
            </CardTitle>
            <p className="text-xs text-zinc-500">
              SMVM vigente: ${smvm.toLocaleString('es-AR')} · Umbral 750 SMVM (efectivo): ${(smvm * 750).toLocaleString('es-AR')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Selector de moneda */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Moneda de la operación</Label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {MONEDAS.map(m => (
                    <SelectItem key={m.v} value={m.v} className={selectItemCls}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Si crypto, especificar cuál */}
            {moneda === 'CRYPTO' && (
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Tipo de criptomoneda</Label>
                <Input value={criptoNombre} onChange={e => setCriptoNombre(e.target.value)}
                  placeholder="Ej: Bitcoin, Ethereum, USDT..." className={inputCls} />
              </div>
            )}

            {moneda === 'ARS' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MontoInput
                  label="Monto total operación (ARS)"
                  value={form.monto}
                  onChange={v => set('monto', v)}
                />
                <MontoInput
                  label={`Importe en efectivo (ARS)${efectivo > 0 && efectivo >= smvm * 750 ? ' ⚠ supera 750 SMVM' : ''}`}
                  value={form.monto_efectivo}
                  onChange={v => set('monto_efectivo', v)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MontoInput
                  label={`Monto en ${moneda === 'CRYPTO' ? (criptoNombre || 'Cripto') : moneda}`}
                  value={form.monto_moneda_extranjera}
                  onChange={v => set('monto_moneda_extranjera', v)}
                />
                <MontoInput
                  label="Tipo de cambio (1 unidad = ARS)"
                  value={form.tipo_cambio}
                  onChange={v => set('tipo_cambio', v)}
                />
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Equivalente en ARS</Label>
                  <Input
                    readOnly
                    value={parseMonto(form.monto_moneda_extranjera) > 0 && parseMonto(form.tipo_cambio) > 0
                      ? formatMonto(parseMonto(form.monto_moneda_extranjera) * parseMonto(form.tipo_cambio))
                      : '—'}
                    className={inputCls + ' opacity-60 cursor-not-allowed'}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Forma de pago</Label>
                <Select value={form.forma_pago} onValueChange={v => set('forma_pago', v as FormaPago)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {FORMAS_PAGO_LIST.map(f => (
                      <SelectItem key={f} value={f} className={selectItemCls}>{LABEL_FORMA_PAGO[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Origen de los fondos</Label>
                <MicButton value={form.origen_fondos} onChange={v => set('origen_fondos', v)} />
              </div>
              <Textarea value={form.origen_fondos} onChange={e => set('origen_fondos', e.target.value)}
                placeholder="Ej: venta de inmueble anterior, ahorros, herencia, préstamo bancario..." rows={2}
                className={inputCls + ' resize-none'} />
              <p className="text-xs text-zinc-500">
                Res. UIF 78/2025: la documentación de respaldo se carga en la ficha de la operación.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PREVIEW UIF */}
        {(form.tipo_acto || disparaUIF) && (
          <Card className={`border ${disparaUIF ? 'bg-red-500/5 border-red-500/30' : 'bg-green-500/5 border-green-500/30'}`}>
            <CardContent className="p-4 flex items-start gap-3">
              {disparaUIF
                ? <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5" />
                : <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-semibold ${disparaUIF ? 'text-red-300' : 'text-green-300'}`}>
                  {disparaUIF ? 'Esta operación dispara obligación UIF' : 'Esta operación no dispara obligación UIF'}
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  {disparaPorTipo && <li className="text-red-400/80">• {LABEL_TIPO_ACTO[form.tipo_acto as TipoActo]}: requiere UIF sin mínimo</li>}
                  {disparaPorEfectivo && <li className="text-red-400/80">• Efectivo ${efectivo.toLocaleString('es-AR')} ≥ 750 SMVM (${(smvm * 750).toLocaleString('es-AR')})</li>}
                  {disparaPorCompraventa && !disparaPorEfectivo && <li className="text-red-400/80">• Compraventa total ${monto.toLocaleString('es-AR')} ≥ 700 SMVM</li>}
                  {!disparaUIF && form.tipo_acto && <li className="text-green-400/80">• El sistema validará al guardar.</li>}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NOTAS */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-zinc-300">Notas internas</CardTitle>
            <MicButton value={form.notas_internas} onChange={v => set('notas_internas', v)} />
          </CardHeader>
          <CardContent>
            <Textarea value={form.notas_internas} onChange={e => set('notas_internas', e.target.value)}
              placeholder="Notas visibles solo para el staff..."
              rows={2}
              className={inputCls + ' resize-none'} />
          </CardContent>
        </Card>

        {/* ESTADO INICIAL */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Estado inicial de la operación</CardTitle>
            <p className="text-xs text-zinc-500">Podés crearla directamente en el estado que corresponda (ej: si ya fue enviada al registro).</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ESTADOS_OPERACION.map(e => (
                <button
                  key={e.v}
                  type="button"
                  onClick={() => set('estado_inicial', e.v)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-all ${
                    form.estado_inicial === e.v
                      ? 'border-lime-400 bg-lime-400/10 text-lime-400'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 items-center">
          <Button type="submit" disabled={saving}
            className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}Crear operación
          </Button>
          <Link href="/crm/tramites">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
          <DraftSavedIndicator savedAt={draftSavedAt} />
        </div>
      </form>
    </div>
  )
}
