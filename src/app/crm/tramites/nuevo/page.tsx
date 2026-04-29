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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2, ArrowLeft, FileText, Coins, ShieldAlert, Calendar,
  AlertTriangle, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Profile, TipoActo, FormaPago, NivelRiesgo } from '@/types'
import { LABEL_TIPO_ACTO, LABEL_FORMA_PAGO } from '@/types'

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'
const selectTriggerCls = 'bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400'
const selectContentCls = 'bg-zinc-900 border-zinc-700'
const selectItemCls = 'text-zinc-200 focus:bg-zinc-800'

interface ClienteRow {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  cuil: string | null
  es_pep: boolean
  es_sujeto_obligado: boolean
  nivel_riesgo: NivelRiesgo | null
}

interface SMVMRow { vigencia_desde: string; valor: number }

const TIPOS_ACTO_LIST: TipoActo[] = [
  'compraventa_inmueble', 'constitucion_sociedad', 'cesion_cuotas',
  'fideicomiso', 'hipoteca', 'donacion', 'mutuo', 'otro',
]

const FORMAS_PAGO_LIST: FormaPago[] = [
  'efectivo', 'transferencia', 'cheque', 'mixto', 'permuta', 'credito_hipotecario', 'otra',
]

const RIESGO_BADGE: Record<NivelRiesgo, string> = {
  bajo: 'bg-green-500/15 text-green-300 border-green-500/30',
  medio: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  alto: 'bg-red-500/15 text-red-300 border-red-500/30',
}

export default function NuevoTramitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [escribanos, setEscribanos] = useState<Profile[]>([])
  const [smvm, setSmvm] = useState<number>(308200)

  const [form, setForm] = useState({
    // Identificación
    tipo: '' as string,
    tipo_acto: '' as TipoActo | '',
    cliente_id: searchParams.get('cliente_id') ?? '',
    escribano_id: '',
    descripcion: '',
    numero_referencia: '',
    notas_internas: '',
    // Escritura
    numero_escritura: '',
    folio_protocolo: '',
    registro_notarial: '',
    fecha_escritura: '',
    // Montos
    monto: '',
    monto_efectivo: '',
    monto_moneda_extranjera: '',
    moneda_extranjera: '',
    tipo_cambio: '',
    forma_pago: '' as FormaPago | '',
    origen_fondos: '',
  })

  useEffect(() => {
    async function load() {
      const [cls, escs, smvmRows] = await Promise.all([
        supabase.from('clientes')
          .select('id, nombre, apellido, dni, cuil, es_pep, es_sujeto_obligado, nivel_riesgo')
          .order('apellido'),
        supabase.from('profiles')
          .select('id, nombre, apellido, rol, email, activo, created_at')
          .in('rol', ['escribano', 'protocolista', 'escribano_titular', 'oficial_cumplimiento'])
          .order('apellido'),
        supabase.from('smvm_historico')
          .select('vigencia_desde, valor')
          .order('vigencia_desde', { ascending: false })
          .limit(1),
      ])
      if (cls.data) setClientes(cls.data as ClienteRow[])
      if (escs.data) setEscribanos(escs.data as Profile[])
      if (smvmRows.data && smvmRows.data.length > 0) {
        setSmvm(Number((smvmRows.data[0] as SMVMRow).valor))
      }
    }
    load()
  }, [supabase])

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(p => ({ ...p, [key]: value }))
  }

  // Cálculo en vivo del estado UIF (preview, el real lo calcula el trigger en DB)
  const monto = Number(form.monto) || 0
  const efectivo = Number(form.monto_efectivo) || 0
  const umbralEfectivo = smvm * 750
  const umbralCompraventa = smvm * 700

  const disparaPorTipo = ['constitucion_sociedad', 'cesion_cuotas', 'fideicomiso'].includes(form.tipo_acto)
  const disparaPorEfectivo = form.tipo_acto === 'compraventa_inmueble' && efectivo > 0 && efectivo >= umbralEfectivo
  const disparaPorCompraventa = form.tipo_acto === 'compraventa_inmueble' && monto >= umbralCompraventa
  const disparaUIF = disparaPorTipo || disparaPorEfectivo || disparaPorCompraventa

  const clienteSeleccionado = clientes.find(c => c.id === form.cliente_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cliente_id) { toast.error('Tenés que seleccionar un cliente.'); return }
    if (!form.tipo) { toast.error('Indicá el tipo de trámite.'); return }
    setSaving(true)

    const payload = {
      tipo: form.tipo,
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
      monto: form.monto ? Number(form.monto) : null,
      monto_efectivo: form.monto_efectivo ? Number(form.monto_efectivo) : 0,
      monto_moneda_extranjera: form.monto_moneda_extranjera ? Number(form.monto_moneda_extranjera) : null,
      moneda_extranjera: form.moneda_extranjera || null,
      tipo_cambio: form.tipo_cambio ? Number(form.tipo_cambio) : null,
      forma_pago: form.forma_pago || null,
      origen_fondos: form.origen_fondos || null,
      estado: 'iniciado',
      cumplimiento_dd: 'pendiente',
    }

    const { data: tramite, error } = await supabase
      .from('tramites')
      .insert(payload)
      .select()
      .single()

    if (error || !tramite) {
      console.error(error)
      toast.error('Error al crear el trámite.')
      setSaving(false)
      return
    }

    // Hito inicial
    await supabase.from('tramite_hitos').insert({
      tramite_id: tramite.id,
      descripcion: 'Trámite iniciado',
    })

    // Crear alertas UIF según condiciones
    type AlertaInsert = { tramite_id: string; tipo?: string; tipo_alerta?: string; descripcion: string }
    const alertas: AlertaInsert[] = []
    const t = tramite as { id: string; dispara_uif: boolean; monto_efectivo?: number; monto?: number }
    if (t.dispara_uif) {
      if (disparaPorEfectivo) {
        alertas.push({
          tramite_id: t.id, tipo: 'monto', tipo_alerta: 'monto_excedido',
          descripcion: `Pago en efectivo $${efectivo.toLocaleString('es-AR')} supera 750 SMVM (${umbralEfectivo.toLocaleString('es-AR')})`,
        })
      }
      if (disparaPorCompraventa) {
        alertas.push({
          tramite_id: t.id, tipo: 'monto', tipo_alerta: 'monto_excedido',
          descripcion: `Compraventa $${monto.toLocaleString('es-AR')} supera 700 SMVM (sujeción UIF)`,
        })
      }
      if (disparaPorTipo) {
        alertas.push({
          tramite_id: t.id, tipo: 'otro', tipo_alerta: 'monto_excedido',
          descripcion: `Acto "${LABEL_TIPO_ACTO[form.tipo_acto as TipoActo]}" requiere UIF sin mínimo`,
        })
      }
    }
    if (clienteSeleccionado?.es_pep) {
      alertas.push({
        tramite_id: t.id, tipo: 'pep', tipo_alerta: 'pep_detectado',
        descripcion: 'Cliente PEP — debida diligencia reforzada',
      })
    }
    if (clienteSeleccionado?.es_sujeto_obligado) {
      alertas.push({
        tramite_id: t.id, tipo: 'sujeto_obligado', tipo_alerta: 'sujeto_obligado',
        descripcion: 'Cliente es Sujeto Obligado UIF',
      })
    }
    if (alertas.length > 0) {
      await supabase.from('alertas_uif').insert(alertas)
    }

    setSaving(false)
    toast.success(t.dispara_uif ? 'Trámite creado · Dispara UIF' : 'Trámite creado.')
    router.push(`/crm/tramites/${tramite.id}`)
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/tramites">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Trámites
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Nuevo trámite</h1>
        <p className="text-zinc-500 text-sm">
          El sistema calcula automáticamente si el trámite dispara obligación UIF según el tipo de acto y los montos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
        {/* IDENTIFICACIÓN */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <FileText size={14} className="text-lime-400" />Identificación del trámite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Tipo de trámite <span className="text-lime-400">*</span></Label>
                <Input value={form.tipo} onChange={e => set('tipo', e.target.value)}
                  placeholder="Ej: Escritura compraventa, Poder general..." className={inputCls} />
              </div>
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
            </div>

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
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {escribanos.map(e => (
                      <SelectItem key={e.id} value={e.id} className={selectItemCls}>
                        {e.apellido}, {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Número de referencia interno</Label>
                <Input value={form.numero_referencia} onChange={e => set('numero_referencia', e.target.value)}
                  placeholder="Ej: 2024-001" className={inputCls} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Descripción</Label>
              <Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="Descripción breve del trámite..." rows={2}
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

        {/* PAGOS Y MONTOS */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Coins size={14} className="text-lime-400" />Montos y forma de pago
            </CardTitle>
            <p className="text-xs text-zinc-500">
              SMVM vigente: ${smvm.toLocaleString('es-AR')} · Umbral 750 SMVM (efectivo): ${umbralEfectivo.toLocaleString('es-AR')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Monto total operación (ARS)</Label>
                <Input type="number" value={form.monto} onChange={e => set('monto', e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  Importe en efectivo (ARS)
                  {efectivo > 0 && efectivo >= umbralEfectivo && (
                    <span className="ml-2 text-xs text-red-400 font-medium">⚠ supera 750 SMVM</span>
                  )}
                </Label>
                <Input type="number" value={form.monto_efectivo} onChange={e => set('monto_efectivo', e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Forma de pago general</Label>
                <Select value={form.forma_pago} onValueChange={v => set('forma_pago', v as FormaPago)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {FORMAS_PAGO_LIST.map(f => (
                      <SelectItem key={f} value={f} className={selectItemCls}>{LABEL_FORMA_PAGO[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Moneda extranjera</Label>
                <Input value={form.moneda_extranjera} onChange={e => set('moneda_extranjera', e.target.value)}
                  placeholder="USD, EUR..." className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Tipo de cambio</Label>
                <Input type="number" step="0.01" value={form.tipo_cambio} onChange={e => set('tipo_cambio', e.target.value)}
                  placeholder="1000.00" className={inputCls} />
              </div>
            </div>

            {form.moneda_extranjera && (
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Monto en moneda extranjera</Label>
                <Input type="number" value={form.monto_moneda_extranjera}
                  onChange={e => set('monto_moneda_extranjera', e.target.value)} className={inputCls} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Origen de los fondos</Label>
              <Textarea value={form.origen_fondos} onChange={e => set('origen_fondos', e.target.value)}
                placeholder="Ej: venta de inmueble anterior, ahorros, herencia, préstamo bancario..." rows={2}
                className={inputCls + ' resize-none'} />
              <p className="text-xs text-zinc-500">
                Res. UIF 78/2025: la documentación de respaldo se carga después en la ficha del trámite.
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
                  {disparaUIF ? 'Este trámite dispara obligación UIF' : 'Este trámite no dispara obligación UIF'}
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  {disparaPorTipo && (
                    <li className="text-red-400/80">
                      • {LABEL_TIPO_ACTO[form.tipo_acto as TipoActo]}: requiere UIF sin mínimo
                    </li>
                  )}
                  {disparaPorEfectivo && (
                    <li className="text-red-400/80">
                      • Efectivo ${efectivo.toLocaleString('es-AR')} ≥ 750 SMVM (${umbralEfectivo.toLocaleString('es-AR')})
                    </li>
                  )}
                  {disparaPorCompraventa && !disparaPorEfectivo && (
                    <li className="text-red-400/80">
                      • Compraventa total ${monto.toLocaleString('es-AR')} ≥ 700 SMVM (${umbralCompraventa.toLocaleString('es-AR')})
                    </li>
                  )}
                  {!disparaUIF && form.tipo_acto && (
                    <li className="text-green-400/80">• El sistema validará al guardar.</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NOTAS */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Notas internas</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notas_internas} onChange={e => set('notas_internas', e.target.value)}
              placeholder="Notas visibles solo para el staff..." rows={2}
              className={inputCls + ' resize-none'} />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}
            className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}Crear trámite
          </Button>
          <Link href="/crm/tramites">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
