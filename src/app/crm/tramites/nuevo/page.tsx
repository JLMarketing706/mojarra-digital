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
import { LABEL_TIPO_ACTO, LABEL_FORMA_PAGO, TIPOS_ACTO_UIF_INFO } from '@/types'
import { formatMonto, parseMonto } from '@/lib/utils'
import { useFormDraft } from '@/lib/use-form-draft'
import { DraftBanner, DraftSavedIndicator } from '@/components/crm/draft-banner'
import { CompradoresVendedoresForm, type PartePrincipal } from '@/components/crm/compradores-vendedores-form'
import { MontoInput as MontoInputShared } from '@/components/crm/monto-input'
import { ClienteQuickCreate } from '@/components/crm/cliente-quick-create'
import { NegociosCausalesInput } from '@/components/crm/negocios-causales-input'
import { ClienteCombobox } from '@/components/crm/cliente-combobox'
import { FormasPagoMultiInput, type FormaPagoEntry } from '@/components/crm/formas-pago-multi-input'
import { TIPOS_ACTO, causalesDe, type TipoActoValue } from '@/lib/tipos-acto'
import { PlazoRegistralCountdown } from '@/components/crm/plazo-registral-countdown'
import { UserPlus } from 'lucide-react'

// ─── Clases de estilo ─────────────────────────────────────
const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'
const selectTriggerCls = 'bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400'
const selectContentCls = 'bg-zinc-900 border-zinc-700'
const selectItemCls = 'text-zinc-200 focus:bg-zinc-800'

// Tipos de acto + negocios causales viven ahora en /lib/tipos-acto.ts

// ─── Monedas ─────────────────────────────────────────────
const MONEDAS = [
  { v: 'ARS', label: 'Pesos argentinos ($)' },
  { v: 'USD', label: 'Dólares estadounidenses (US$)' },
  { v: 'EUR', label: 'Euros (€)' },
  { v: 'BRL', label: 'Reales (R$)' },
  { v: 'CRYPTO', label: 'Criptomoneda' },
]

// La lista de tipo_acto UIF y sus descripciones está en types/index.ts
// → TIPOS_ACTO_UIF_INFO. Este archivo lo importa y rendea con título +
//   descripción. Solo los 4 actos vigentes según Res. UIF aparecen acá;
//   los slugs legacy (constitucion_sociedad, fideicomiso, etc) siguen
//   en el TYPE para no romper data vieja.

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

// MontoInput: wrapper que usa el componente compartido sin tipografía monoespaciada
function MontoInput({
  label, value, onChange, helpText,
}: { label: string; value: string; onChange: (v: string) => void; helpText?: string }) {
  return (
    <MontoInputShared
      label={label}
      value={value}
      onChange={onChange}
      helpText={helpText}
      className={inputCls}
    />
  )
}

export default function NuevoTramitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [escribanos, setEscribanos] = useState<Profile[]>([])
  const [smvm, setSmvm] = useState<number>(308200)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  // Si el modal se abre desde un slot de comprador/vendedor/otro, guardamos
  // un callback para asignar el cliente recién creado a ese slot puntual.
  const [asignarSlotPendiente, setAsignarSlotPendiente] = useState<((id: string) => void) | null>(null)

  // Tipo de acto notarial + negocios causales (multi-select)
  const [tipoActoNotarial, setTipoActoNotarial] = useState<TipoActoValue | ''>('')
  const [negociosCausales, setNegociosCausales] = useState<string[]>([])
  const causalesDisponibles = causalesDe(tipoActoNotarial)

  // Moneda
  const [moneda, setMoneda] = useState('ARS')
  const [criptoNombre, setCriptoNombre] = useState('')

  // Compradores y vendedores (solo para compraventa)
  const [compradores, setCompradores] = useState<PartePrincipal[]>([])
  const [vendedores, setVendedores] = useState<PartePrincipal[]>([])

  // Formas de pago (multi)
  const [formasPago, setFormasPago] = useState<FormaPagoEntry[]>([])
  // esCompraventa se calcula más abajo, después de declarar `form`

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
    // Plazos registrales
    registro_propiedad: '' as 'pba' | 'caba' | '',
    fecha_presentacion: '',
    primera_prorroga_activa: false,
    segunda_prorroga_activa: false,
    tercera_prorroga_activa: false,
    numero_expediente_registro: '',
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

  // Detectar compraventa: si alguna causal elegida contiene "compraventa", o el tipo_acto UIF lo es.
  const esCompraventa =
    negociosCausales.some(c => c.toLowerCase().includes('compraventa')) ||
    form.tipo_acto === 'compraventa_inmueble'

  // Auto-save: combina form + selecciones derivadas en un único objeto serializable
  type DraftShape = {
    form: typeof form
    tipoActoNotarial: TipoActoValue | ''
    negociosCausales: string[]
    moneda: string
    criptoNombre: string
    compradores: PartePrincipal[]
    vendedores: PartePrincipal[]
    formasPago: FormaPagoEntry[]
  }
  const draftState: DraftShape = {
    form, tipoActoNotarial, negociosCausales, moneda, criptoNombre, compradores, vendedores, formasPago,
  }
  const { hasDraft, restoreDraft, clearDraft, draftSavedAt } = useFormDraft<DraftShape>(
    'nuevo-tramite', draftState,
    s => {
      setForm(s.form)
      setTipoActoNotarial(s.tipoActoNotarial ?? '')
      setNegociosCausales(s.negociosCausales ?? [])
      setMoneda(s.moneda)
      setCriptoNombre(s.criptoNombre)
      setCompradores(s.compradores ?? [])
      setVendedores(s.vendedores ?? [])
      setFormasPago(s.formasPago ?? [])
    },
  )

  // Cálculo en vivo UIF
  const monto = parseMonto(form.monto)
  // El efectivo se deriva de las formas de pago cargadas (suma de las "efectivo")
  const efectivo = formasPago
    .filter(fp => fp.forma_pago === 'efectivo')
    .reduce((acc, fp) => acc + parseMonto(fp.monto), 0)
  const umbralEfectivo = smvm * 750
  const umbralCompraventa = smvm * 700

  // Estos actos disparan UIF sin importar el monto.
  // Incluyo los slugs legacy para que data vieja siga disparando como antes.
  const disparaPorTipo = [
    'organizacion_aportes', 'creacion_administracion_pj', 'cesion_cuotas',
    'constitucion_sociedad', 'fideicomiso', // legacy
  ].includes(form.tipo_acto)
  const disparaPorEfectivo = form.tipo_acto === 'compraventa_inmueble' && efectivo > 0 && efectivo >= umbralEfectivo
  const disparaPorCompraventa = form.tipo_acto === 'compraventa_inmueble' && monto >= umbralCompraventa
  const disparaUIF = disparaPorTipo || disparaPorEfectivo || disparaPorCompraventa

  const clienteSeleccionado = clientes.find(c => c.id === form.cliente_id)

  // El `tipo` legacy = primer negocio causal. Es por compatibilidad.
  const tipoFinal = negociosCausales[0] ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tipoActoNotarial) { toast.error('Elegí el Tipo de acto.'); return }
    if (negociosCausales.length === 0) { toast.error('Elegí al menos un negocio causal.'); return }

    // Validación según sea compraventa o no
    if (esCompraventa) {
      const compradoresValidos = compradores.filter(c => c.cliente_id)
      const vendedoresValidos = vendedores.filter(v => v.cliente_id)
      if (compradoresValidos.length === 0) {
        toast.error('Agregá al menos un comprador.'); return
      }
      if (vendedoresValidos.length === 0) {
        toast.error('Agregá al menos un vendedor.'); return
      }
    } else if (!form.cliente_id) {
      toast.error('Tenés que seleccionar un cliente.'); return
    }
    setSaving(true)

    // En compraventa, el cliente_id principal de la operación = primer comprador
    const clientePrincipalId = esCompraventa
      ? (compradores.find(c => c.cliente_id)?.cliente_id ?? form.cliente_id)
      : form.cliente_id

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
      tipo_acto_notarial: tipoActoNotarial || null,
      negocios_causales: negociosCausales,
      cliente_id: clientePrincipalId,
      escribano_id: form.escribano_id || null,
      descripcion: form.descripcion || null,
      numero_referencia: form.numero_referencia || null,
      notas_internas: form.notas_internas || null,
      numero_escritura: form.numero_escritura || null,
      folio_protocolo: form.folio_protocolo || null,
      registro_notarial: form.registro_notarial || null,
      fecha_escritura: form.fecha_escritura || null,
      // Gestión registral
      registro_propiedad: form.registro_propiedad || null,
      fecha_presentacion: form.fecha_presentacion || null,
      primera_prorroga_activa: form.primera_prorroga_activa,
      segunda_prorroga_activa: form.segunda_prorroga_activa,
      tercera_prorroga_activa: form.tercera_prorroga_activa,
      numero_expediente_registro: form.numero_expediente_registro?.trim() || null,
      monto: montoARS || null,
      monto_efectivo: efectivo || 0,
      monto_moneda_extranjera: moneda !== 'ARS' ? (montoExt || null) : null,
      moneda_extranjera: monedaExtNombre || null,
      tipo_cambio: tc || null,
      // Legacy: si hay 1 forma de pago la guardamos directo, si hay varias = "mixto"
      forma_pago: (() => {
        const fps = formasPago.filter(f => f.forma_pago)
        if (fps.length === 0) return null
        if (fps.length === 1) return fps[0].forma_pago
        return 'mixto'
      })(),
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
      toast.error('Error al crear la escritura.')
      setSaving(false)
      return
    }

    await supabase.from('tramite_hitos').insert({
      tramite_id: tramite.id,
      descripcion: `Escritura creada en estado: ${ESTADOS_OPERACION.find(e => e.v === form.estado_inicial)?.label ?? form.estado_inicial}`,
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

    // Insertar partes (compradores, vendedores y sus "otros" anidados) si es compraventa
    if (esCompraventa) {
      let orden = 0
      const principales: Array<{ tempId: string; payload: Record<string, unknown> }> = []
      for (const c of compradores.filter(p => p.cliente_id)) {
        principales.push({
          tempId: c.id,
          payload: {
            tramite_id: t.id, cliente_id: c.cliente_id, rol: 'comprador',
            observacion: c.observacion || null, orden: orden++,
          },
        })
      }
      for (const v of vendedores.filter(p => p.cliente_id)) {
        principales.push({
          tempId: v.id,
          payload: {
            tramite_id: t.id, cliente_id: v.cliente_id, rol: 'vendedor',
            observacion: v.observacion || null, orden: orden++,
          },
        })
      }

      if (principales.length > 0) {
        const { data: insertados, error: errPart } = await supabase
          .from('tramite_partes')
          .insert(principales.map(p => p.payload))
          .select('id, cliente_id, rol, orden')
        if (errPart) console.error('Error insertando partes principales:', errPart)

        // Mapear tempId → id real, para usar como parte_padre_id de los "otros"
        const idMap = new Map<string, string>()
        if (insertados) {
          for (let i = 0; i < principales.length; i++) {
            idMap.set(principales[i].tempId, (insertados[i] as { id: string }).id)
          }
        }

        // Insertar "otros" como nombres sueltos (sin cliente_id) y sincronizar
        // cónyuge / padre / madre al legajo del cliente principal correspondiente.
        const otrosPayload: Array<Record<string, unknown>> = []
        const updatesPorCliente = new Map<string, Record<string, unknown>>()

        for (const c of [...compradores, ...vendedores].filter(p => p.cliente_id)) {
          const padreReal = idMap.get(c.id)
          if (!padreReal) continue
          for (const o of c.otros.filter(o => o.nombre.trim())) {
            otrosPayload.push({
              tramite_id: t.id,
              cliente_id: null,
              rol: o.rol,
              nombre: o.nombre.trim(),
              dni: o.dni.trim() || null,
              observacion: o.observacion || null,
              parte_padre_id: padreReal,
              orden: orden++,
            })

            // Sincronizar al legajo del principal según el rol
            const updates = updatesPorCliente.get(c.cliente_id) ?? {}
            if (o.rol === 'conyuge' || o.rol === 'conviviente') {
              updates.conyuge_nombre = o.nombre.trim()
              if (o.dni.trim()) updates.conyuge_dni = o.dni.trim()
            } else if (o.rol === 'padre') {
              updates.nombre_padre = o.nombre.trim()
            } else if (o.rol === 'madre') {
              updates.nombre_madre = o.nombre.trim()
            }
            if (Object.keys(updates).length > 0) {
              updatesPorCliente.set(c.cliente_id, updates)
            }
          }
        }

        // Aplicar updates al legajo de cada cliente principal
        for (const [clienteId, updates] of updatesPorCliente) {
          if (Object.keys(updates).length > 0) {
            await supabase.from('clientes').update(updates).eq('id', clienteId)
          }
        }

        if (otrosPayload.length > 0) {
          const { error: errOtros } = await supabase.from('tramite_partes').insert(otrosPayload)
          if (errOtros) console.error('Error insertando otros:', errOtros)
        }
      }
    }

    // Insertar formas de pago (si hay)
    const formasPagoValidas = formasPago.filter(fp => fp.forma_pago && parseMonto(fp.monto) > 0)
    if (formasPagoValidas.length > 0) {
      const { error: errFp } = await supabase
        .from('tramite_formas_pago')
        .insert(formasPagoValidas.map((fp, i) => ({
          tramite_id: t.id,
          forma_pago: fp.forma_pago,
          monto: parseMonto(fp.monto),
          observacion: fp.observacion?.trim() || null,
          orden: i,
        })))
      if (errFp) console.error('Error insertando formas de pago:', errFp)
    }

    setSaving(false)
    clearDraft()
    toast.success(t.dispara_uif ? 'Escritura creada · Dispara UIF' : 'Escritura creada.')
    router.push(`/crm/tramites/${tramite.id}`)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/crm/tramites">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Escrituras
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Nueva escritura</h1>
        <p className="text-zinc-500 text-sm">
          El sistema calcula automáticamente si la escritura dispara obligación UIF según el tipo de acto y los montos.
        </p>
      </div>

      <DraftBanner
        hasDraft={hasDraft}
        draftSavedAt={draftSavedAt}
        onRestore={restoreDraft}
        onDiscard={clearDraft}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* IDENTIFICACIÓN */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <FileText size={14} className="text-lime-400" />Identificación de la escritura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Tipo de acto + Negocios causales (multi-select) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Tipo de acto <span className="text-lime-400">*</span></Label>
                <Select
                  value={tipoActoNotarial}
                  onValueChange={v => {
                    setTipoActoNotarial(v as TipoActoValue)
                    setNegociosCausales([]) // reset al cambiar de categoría
                  }}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Seleccioná tipo de acto" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {TIPOS_ACTO.map(t => (
                      <SelectItem key={t.value} value={t.value} className={selectItemCls}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  Tipo de negocio causal <span className="text-lime-400">*</span>
                  <span className="ml-2 text-zinc-500 text-xs font-normal">(podés elegir varios)</span>
                </Label>
                <NegociosCausalesInput
                  value={negociosCausales}
                  onChange={setNegociosCausales}
                  options={causalesDisponibles}
                  disabled={!tipoActoNotarial}
                  placeholder={
                    tipoActoNotarial
                      ? 'Tipeá o seleccioná causales…'
                      : '— elegí tipo de acto primero —'
                  }
                />
              </div>
            </div>

            {/* Tipo de acto UIF */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Tipo de acto UIF</Label>
              <Select value={form.tipo_acto} onValueChange={v => set('tipo_acto', v as TipoActo)}>
                <SelectTrigger className={selectTriggerCls + ' h-auto py-2 [&>span]:text-left'}>
                  <SelectValue placeholder="Seleccioná (define obligación UIF)" />
                </SelectTrigger>
                <SelectContent className={selectContentCls + ' max-w-[min(640px,calc(100vw-2rem))]'}>
                  {TIPOS_ACTO_UIF_INFO.map(t => (
                    <SelectItem
                      key={t.value}
                      value={t.value}
                      className={selectItemCls + ' py-2.5 items-start whitespace-normal'}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-zinc-100 leading-snug">
                          {t.titulo}
                        </span>
                        <span className="text-xs text-zinc-400 leading-snug">
                          {t.descripcion}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente y Escribano */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!esCompraventa && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-zinc-300">Cliente <span className="text-lime-400">*</span></Label>
                    <Button type="button" size="sm" variant="ghost"
                      onClick={() => setShowQuickCreate(true)}
                      className="h-6 px-2 text-xs text-lime-400 hover:bg-lime-400/10 gap-1">
                      <UserPlus size={11} />Crear rápido
                    </Button>
                  </div>
                  <ClienteCombobox
                    value={form.cliente_id}
                    onChange={v => set('cliente_id', v)}
                    clientes={clientes}
                  />
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
              )}
              <div className={`space-y-1.5 ${esCompraventa ? 'sm:col-span-2' : ''}`}>
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

            {/* Línea: número de referencia + registro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Número de referencia interno</Label>
                <Input value={form.numero_referencia} onChange={e => set('numero_referencia', e.target.value)}
                  placeholder="Ej: 2024-001" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Registro de la propiedad</Label>
                <Select
                  value={form.registro_propiedad}
                  onValueChange={v => set('registro_propiedad', v as 'pba' | 'caba')}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="— elegir —" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="pba" className={selectItemCls}>
                      Provincia de Buenos Aires (PBA)
                    </SelectItem>
                    <SelectItem value="caba" className={selectItemCls}>
                      Capital Federal (CABA)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Plazos registrales: 1 fecha de presentación + 3 prórrogas opcionales */}
            <div className="space-y-3">
              <Label className="text-zinc-300 text-sm">
                Plazos registrales
                <span className="ml-2 text-zinc-500 text-xs font-normal">
                  (las prórrogas se calculan automáticamente según el registro)
                </span>
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Fecha de presentación</Label>
                  <Input type="date" value={form.fecha_presentacion}
                    onChange={e => set('fecha_presentacion', e.target.value)}
                    className={inputCls + ' h-9'} />
                </div>
              </div>

              {/* Checkboxes de prórrogas (en línea) + input de Nº de expediente */}
              {form.fecha_presentacion && form.registro_propiedad && (
                <div className="rounded-md border border-zinc-700 bg-zinc-900/50 p-3 space-y-3">
                  <p className="text-xs text-zinc-400">
                    Activá las prórrogas a medida que se solicitan:
                  </p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {(
                      [
                        { key: 'primera_prorroga_activa', label: '1ra prórroga' },
                        { key: 'segunda_prorroga_activa', label: '2da prórroga' },
                        { key: 'tercera_prorroga_activa', label: '3ra prórroga' },
                      ] as const
                    ).map(p => (
                      <label
                        key={p.key}
                        className="inline-flex items-center gap-2 text-sm text-zinc-200 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={!!form[p.key]}
                          onChange={e => set(p.key, e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-lime-400 focus:ring-lime-400 focus:ring-offset-zinc-900"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>

                  {/* N° de expediente: aparece cuando la 2da prórroga está activa */}
                  {form.segunda_prorroga_activa && (
                    <div className="space-y-1 pt-2 border-t border-zinc-800">
                      <Label className="text-xs text-zinc-400">
                        N° de expediente del registro
                        <span className="ml-1.5 text-[10px] text-zinc-500 font-normal">
                          (lo asigna el registro al pedir la 2da prórroga)
                        </span>
                      </Label>
                      <Input
                        value={form.numero_expediente_registro}
                        onChange={e => set('numero_expediente_registro', e.target.value)}
                        placeholder="Ej: 22-1234567/2026"
                        className={inputCls + ' h-9'}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Preview del plazo si hay datos suficientes */}
              {form.registro_propiedad && form.fecha_presentacion && (
                <div className="mt-2">
                  <PlazoRegistralCountdown
                    registro={form.registro_propiedad}
                    estado={{
                      fecha_presentacion: form.fecha_presentacion,
                      primera_prorroga_activa: form.primera_prorroga_activa,
                      segunda_prorroga_activa: form.segunda_prorroga_activa,
                      tercera_prorroga_activa: form.tercera_prorroga_activa,
                    }}
                    numeroExpediente={form.numero_expediente_registro}
                    asCard={false}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Descripción</Label>
                <MicButton value={form.descripcion} onChange={v => set('descripcion', v)} />
              </div>
              <Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="Descripción breve de la escritura..." rows={2}
                className={inputCls + ' resize-none'} />
            </div>
          </CardContent>
        </Card>

        {/* COMPRADORES / VENDEDORES (solo para compraventa) */}
        {esCompraventa && (
          <CompradoresVendedoresForm
            clientes={clientes.map(c => ({ id: c.id, nombre: c.nombre, apellido: c.apellido, dni: c.dni }))}
            compradores={compradores}
            vendedores={vendedores}
            onChange={(c, v) => { setCompradores(c); setVendedores(v) }}
            onCrearCliente={(asignar) => {
              setAsignarSlotPendiente(() => asignar)
              setShowQuickCreate(true)
            }}
          />
        )}

        {/* Modal de creación rápida — agrega el cliente nuevo a la lista local
            y lo asigna al slot que abrió el modal (o al cliente principal si no
            hay slot pendiente y la operación no es compraventa). */}
        <ClienteQuickCreate
          open={showQuickCreate}
          onClose={() => { setShowQuickCreate(false); setAsignarSlotPendiente(null) }}
          onCreated={(c) => {
            const nuevo: ClienteRow = {
              id: c.id, nombre: c.nombre, apellido: c.apellido,
              dni: c.dni, cuil: c.cuil,
              es_pep: false, es_sujeto_obligado: false, nivel_riesgo: null,
            }
            setClientes(prev => [nuevo, ...prev])
            if (asignarSlotPendiente) {
              asignarSlotPendiente(c.id)
            } else if (!esCompraventa) {
              setForm(p => ({ ...p, cliente_id: c.id }))
            }
            setShowQuickCreate(false)
            setAsignarSlotPendiente(null)
          }}
        />

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
              <Label className="text-zinc-300">Moneda de la escritura</Label>
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
              <MontoInput
                label="Monto total de la escritura (ARS)"
                value={form.monto}
                onChange={v => set('monto', v)}
              />
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

            {/* Formas de pago: una o varias */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Formas de pago
                <span className="ml-2 text-zinc-500 text-xs font-normal">
                  (podés combinar varias: ej. 50% efectivo + 30% transferencia + 20% cheque)
                </span>
              </Label>
              <FormasPagoMultiInput
                value={formasPago}
                onChange={setFormasPago}
                montoTotal={
                  moneda === 'ARS'
                    ? parseMonto(form.monto)
                    : (parseMonto(form.monto_moneda_extranjera) * parseMonto(form.tipo_cambio)) || undefined
                }
                smvm={smvm}
              />
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
                Res. UIF 78/2025: la documentación de respaldo se carga en la ficha de la escritura.
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
                  {disparaUIF ? 'Esta escritura dispara obligación UIF' : 'Esta escritura no dispara obligación UIF'}
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
            <CardTitle className="text-sm text-zinc-300">Estado inicial de la escritura</CardTitle>
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
            {saving && <Loader2 size={14} className="animate-spin" />}Crear escritura
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
