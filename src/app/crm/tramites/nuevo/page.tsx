'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Profile } from '@/types'

const TIPOS_TRAMITE = [
  'Escritura de compra-venta', 'Escritura de hipoteca', 'Poder general', 'Poder especial',
  'Certificación de firma', 'Certificación de fotocopia', 'Sucesión / declaratoria de herederos',
  'Constitución de sociedad', 'Modificación de sociedad', 'Subdivisión / unificación de inmueble', 'Otro',
]

const SALARIO_MINIMO_DEFAULT = 234315

export default function NuevoTramitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [escribanos, setEscribanos] = useState<Profile[]>([])
  const [salarioMinimo, setSalarioMinimo] = useState(SALARIO_MINIMO_DEFAULT)

  const [form, setForm] = useState({
    tipo: '',
    cliente_id: searchParams.get('cliente_id') ?? '',
    escribano_id: '',
    descripcion: '',
    monto: '',
    numero_referencia: '',
    notas_internas: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: cls }, { data: escs }, { data: conf }] = await Promise.all([
        supabase.from('clientes').select('id, nombre, apellido, dni').order('apellido'),
        supabase.from('profiles').select('id, nombre, apellido, rol').in('rol', ['escribano', 'protocolista']).order('apellido'),
        supabase.from('configuracion').select('valor').eq('clave', 'salario_minimo').single(),
      ])
      if (cls) setClientes(cls as Cliente[])
      if (escs) setEscribanos(escs as Profile[])
      if (conf) setSalarioMinimo(Number(conf.valor))
    }
    load()
  }, [])

  function set(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  function calcularUIF(): boolean {
    if (!form.monto) return false
    return Number(form.monto) > salarioMinimo * 700
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tipo || !form.cliente_id) { toast.error('Tipo y cliente son obligatorios.'); return }
    setSaving(true)

    const requiere_uif = calcularUIF()

    // Verificar si el cliente es PEP o Sujeto Obligado
    const { data: cliente } = await supabase
      .from('clientes')
      .select('es_pep, es_sujeto_obligado')
      .eq('id', form.cliente_id)
      .single()

    const { data: tramite, error } = await supabase.from('tramites').insert({
      tipo: form.tipo,
      cliente_id: form.cliente_id,
      escribano_id: form.escribano_id || null,
      descripcion: form.descripcion || null,
      monto: form.monto ? Number(form.monto) : null,
      numero_referencia: form.numero_referencia || null,
      notas_internas: form.notas_internas || null,
      estado: 'iniciado',
      requiere_uif,
    }).select().single()

    if (error || !tramite) { toast.error('Error al crear el trámite.'); setSaving(false); return }

    // Hito inicial
    await supabase.from('tramite_hitos').insert({
      tramite_id: tramite.id,
      descripcion: 'Trámite iniciado',
    })

    // Alertas UIF automáticas
    const alertas = []
    if (requiere_uif) {
      alertas.push({ tramite_id: tramite.id, tipo_alerta: 'monto_excedido', descripcion: `Monto $${Number(form.monto).toLocaleString('es-AR')} supera 700 SMVM` })
    }
    if (cliente?.es_pep) {
      alertas.push({ tramite_id: tramite.id, tipo_alerta: 'pep_detectado', descripcion: 'Cliente clasificado como PEP' })
    }
    if (cliente?.es_sujeto_obligado) {
      alertas.push({ tramite_id: tramite.id, tipo_alerta: 'sujeto_obligado', descripcion: 'Cliente es Sujeto Obligado' })
    }
    if (alertas.length > 0) {
      await supabase.from('alertas_uif').insert(alertas)
    }

    setSaving(false)
    toast.success('Trámite creado.')
    router.push(`/crm/tramites/${tramite.id}`)
  }

  const montoNum = Number(form.monto)
  const umbral = salarioMinimo * 700
  const superaUIF = form.monto && montoNum > umbral

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/tramites">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Trámites
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1">Nuevo trámite</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Datos del trámite</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Tipo de acto *</Label>
              <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                  <SelectValue placeholder="Seleccioná el tipo de trámite" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {TIPOS_TRAMITE.map(t => <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={v => set('cliente_id', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                    <SelectValue placeholder="Seleccioná cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 max-h-48">
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-zinc-200 focus:bg-zinc-800">
                        {c.apellido}, {c.nombre} {c.dni ? `· ${c.dni}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Escribano/a asignado</Label>
                <Select value={form.escribano_id} onValueChange={v => set('escribano_id', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {escribanos.map(e => (
                      <SelectItem key={e.id} value={e.id} className="text-zinc-200 focus:bg-zinc-800">
                        {e.apellido}, {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Número de referencia</Label>
                <Input value={form.numero_referencia} onChange={e => set('numero_referencia', e.target.value)}
                  placeholder="Ej: 2024-001"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Monto estimado ($)</Label>
                <Input type="number" value={form.monto} onChange={e => set('monto', e.target.value)}
                  placeholder="0"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
                {superaUIF && (
                  <p className="text-yellow-400 text-xs flex items-center gap-1 mt-1">
                    ⚠ Supera umbral UIF ({(700).toLocaleString()} SMVM · ${umbral.toLocaleString('es-AR')})
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Descripción</Label>
              <Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="Descripción breve del trámite..."
                rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Notas internas</Label>
              <Textarea value={form.notas_internas} onChange={e => set('notas_internas', e.target.value)}
                placeholder="Notas visibles solo para el staff..."
                rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Crear trámite
          </Button>
          <Link href="/crm/tramites">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
