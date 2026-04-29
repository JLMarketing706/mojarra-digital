'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ClipboardList, FileCheck2, Save, Calculator } from 'lucide-react'
import Link from 'next/link'
import type { AutoevaluacionRiesgo } from '@/types'

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none'

interface StatsRow {
  total_clientes: number
  clientes_alto: number
  clientes_medio: number
  clientes_bajo: number
  total_operaciones: number
  operaciones_uif: number
  total_pep: number
  total_bf: number
  total_ros: number
  total_ros_la: number
  total_ros_ft: number
  total_ros_fp: number
}

export default function RSAPage() {
  const supabase = createClient()
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear() - 1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<StatsRow | null>(null)
  const [registro, setRegistro] = useState<AutoevaluacionRiesgo | null>(null)

  const [form, setForm] = useState({
    metodologia: '',
    riesgos_identificados: '',
    controles_aplicados: '',
    plan_mitigacion: '',
    conclusiones: '',
  })

  const cargarRSA = useCallback(async () => {
    setLoading(true)
    // Stats agregados
    const { data: statsData } = await supabase.rpc('calcular_stats_rsa', { p_anio: anio })
    if (Array.isArray(statsData) && statsData[0]) {
      setStats(statsData[0] as StatsRow)
    }
    // Registro existente
    const { data: rsa } = await supabase
      .from('autoevaluaciones_riesgo')
      .select('*')
      .eq('anio', anio)
      .maybeSingle()
    if (rsa) {
      const a = rsa as AutoevaluacionRiesgo
      setRegistro(a)
      setForm({
        metodologia: a.metodologia ?? '',
        riesgos_identificados: a.riesgos_identificados ?? '',
        controles_aplicados: a.controles_aplicados ?? '',
        plan_mitigacion: a.plan_mitigacion ?? '',
        conclusiones: a.conclusiones ?? '',
      })
    } else {
      setRegistro(null)
      setForm({ metodologia: '', riesgos_identificados: '', controles_aplicados: '', plan_mitigacion: '', conclusiones: '' })
    }
    setLoading(false)
  }, [supabase, anio])

  useEffect(() => { cargarRSA() }, [cargarRSA])

  function set<K extends keyof typeof form>(k: K, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function guardar(estado: 'borrador' | 'cerrado' = 'borrador') {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      anio,
      ...form,
      ...(stats && {
        total_clientes: stats.total_clientes,
        clientes_riesgo_alto: stats.clientes_alto,
        clientes_riesgo_medio: stats.clientes_medio,
        clientes_riesgo_bajo: stats.clientes_bajo,
        total_operaciones: stats.total_operaciones,
        operaciones_uif: stats.operaciones_uif,
        total_pep: stats.total_pep,
        total_bf_identificados: stats.total_bf,
        total_ros: stats.total_ros,
        total_ros_la: stats.total_ros_la,
        total_ros_ft: stats.total_ros_ft,
        total_ros_fp: stats.total_ros_fp,
      }),
      estado,
      ...(estado === 'cerrado' && { fecha_cierre: new Date().toISOString().split('T')[0] }),
      preparado_por: user?.id ?? null,
    }
    const { error } = await supabase
      .from('autoevaluaciones_riesgo')
      .upsert(payload, { onConflict: 'anio' })
    setSaving(false)
    if (error) {
      console.error(error)
      toast.error('No se pudo guardar.')
      return
    }
    toast.success(estado === 'cerrado' ? 'RSA cerrado.' : 'Borrador guardado.')
    cargarRSA()
  }

  const aniosDisp = Array.from({ length: 5 }, (_, i) => ahora.getFullYear() - i)

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Cumplimiento
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <ClipboardList size={20} className="text-lime-400" />Reporte Sistemático Anual (RSA)
        </h1>
        <p className="text-zinc-500 text-sm">
          Autoevaluación de riesgos LA/FT del año. Res. UIF 242/2023 art. 28. Se presenta entre el 2/ene y el 15/mar del año siguiente.
        </p>
      </div>

      {/* Selector de año */}
      <div className="flex items-center gap-3 mb-6">
        <Label className="text-zinc-300 text-sm">Año:</Label>
        <Select value={String(anio)} onValueChange={v => setAnio(Number(v))}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white w-32"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {aniosDisp.map(a => (
              <SelectItem key={a} value={String(a)} className="text-zinc-200 focus:bg-zinc-800">{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {registro && (
          <Badge className={`text-xs uppercase border ${
            registro.estado === 'presentado' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
            : registro.estado === 'cerrado' ? 'bg-green-500/15 text-green-300 border-green-500/30'
            : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
          }`}>{registro.estado}</Badge>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-zinc-500" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats agregados */}
          <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <Calculator size={14} className="text-lime-400" />Datos agregados {anio}
              </CardTitle>
              <p className="text-xs text-zinc-500">Calculados automáticamente desde los registros del año.</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {stats && (
                <>
                  <SR label="Operaciones" v={stats.total_operaciones} />
                  <SR label="Disparan UIF" v={stats.operaciones_uif} hi />
                  <div className="my-2 h-px bg-zinc-800" />
                  <SR label="Clientes nuevos" v={stats.total_clientes} />
                  <SR label="• Riesgo alto" v={stats.clientes_alto} />
                  <SR label="• Riesgo medio" v={stats.clientes_medio} />
                  <SR label="• Riesgo bajo" v={stats.clientes_bajo} />
                  <div className="my-2 h-px bg-zinc-800" />
                  <SR label="PEPs detectados" v={stats.total_pep} />
                  <SR label="BF identificados" v={stats.total_bf} />
                  <div className="my-2 h-px bg-zinc-800" />
                  <SR label="ROS reportados" v={stats.total_ros} hi />
                  <SR label="• Lavado de activos" v={stats.total_ros_la} />
                  <SR label="• Financiam. terror." v={stats.total_ros_ft} />
                  <SR label="• Financ. proliferación" v={stats.total_ros_fp} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Formulario RSA */}
          <div className="lg:col-span-2 space-y-4">
            {(['metodologia', 'riesgos_identificados', 'controles_aplicados', 'plan_mitigacion', 'conclusiones'] as const).map(k => (
              <Card key={k} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-zinc-300">{LABELS[k]}</CardTitle>
                  <p className="text-xs text-zinc-500">{HELPS[k]}</p>
                </CardHeader>
                <CardContent>
                  <Textarea value={form[k]} onChange={e => set(k, e.target.value)}
                    rows={4} className={inputCls}
                    placeholder={PLACEHOLDERS[k]} />
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-3">
              <Button onClick={() => guardar('borrador')} disabled={saving}
                variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                <Save size={14} />Guardar borrador
              </Button>
              <Button onClick={() => guardar('cerrado')} disabled={saving}
                className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                <FileCheck2 size={14} />Cerrar RSA
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SR({ label, v, hi = false }: { label: string; v: number; hi?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={hi ? 'text-lime-400 font-semibold' : 'text-zinc-200'}>{v}</span>
    </div>
  )
}

const LABELS: Record<string, string> = {
  metodologia: '1. Metodología',
  riesgos_identificados: '2. Riesgos identificados',
  controles_aplicados: '3. Controles aplicados',
  plan_mitigacion: '4. Plan de mitigación',
  conclusiones: '5. Conclusiones',
}
const HELPS: Record<string, string> = {
  metodologia: 'Cómo evaluó la escribanía los riesgos LA/FT durante el año.',
  riesgos_identificados: 'Riesgos detectados por tipo de cliente, operación y jurisdicción.',
  controles_aplicados: 'Procedimientos, validaciones y controles ejecutados.',
  plan_mitigacion: 'Acciones planificadas para reducir los riesgos identificados.',
  conclusiones: 'Conclusiones generales y mejoras propuestas para el año siguiente.',
}
const PLACEHOLDERS: Record<string, string> = {
  metodologia: 'Ej: Se aplicó análisis basado en factores de riesgo conforme Res. 242/2023...',
  riesgos_identificados: 'Ej: Riesgo medio en operaciones de compraventa con monto > 500 SMVM...',
  controles_aplicados: 'Ej: Validación de DDJJ, screening contra listas PEP, revisión por OC...',
  plan_mitigacion: 'Ej: Reforzar capacitaciones, ampliar monitoreo continuo...',
  conclusiones: 'Ej: La escribanía mantuvo cumplimiento normativo del 100%...',
}
