'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Save, Settings, Users, ArrowRight, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
interface ConfigEntry { clave: string; valor: string; descripcion: string | null }

const CONFIG_FIELDS: { clave: string; label: string; placeholder: string; tipo?: string }[] = [
  { clave: 'nombre_escribania', label: 'Nombre de la escribanía', placeholder: 'Escribanía Juan García' },
  { clave: 'direccion_escribania', label: 'Dirección', placeholder: 'Av. Corrientes 1234, CABA' },
  { clave: 'matricula_escribano', label: 'Matrícula del escribano', placeholder: 'Ej: 1234 CABA' },
  { clave: 'telefono_escribania', label: 'Teléfono', placeholder: '+54 11 1234-5678' },
  { clave: 'email_escribania', label: 'Email institucional', placeholder: 'info@escribania.com.ar' },
]

interface SmvmInfo {
  vigencia_desde: string
  valor: number
  norma_origen: string | null
}

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [smvmInfo, setSmvmInfo] = useState<SmvmInfo | null>(null)
  const [actualizandoSmvm, setActualizandoSmvm] = useState(false)
  const [esSuperAdmin, setEsSuperAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: cfg }, { data: smvm }, { data: { user } }] = await Promise.all([
        supabase.from('configuracion').select('clave, valor, descripcion'),
        supabase
          .from('smvm_historico')
          .select('vigencia_desde, valor, norma_origen')
          .order('vigencia_desde', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.auth.getUser(),
      ])
      if (cfg) {
        setConfig(Object.fromEntries((cfg as ConfigEntry[]).map(c => [c.clave, c.valor])))
      }
      if (smvm) setSmvmInfo(smvm as SmvmInfo)
      if (user) {
        const { data: sa } = await supabase
          .from('super_admins').select('profile_id').eq('profile_id', user.id).maybeSingle()
        setEsSuperAdmin(!!sa)
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function actualizarSmvm() {
    setActualizandoSmvm(true)
    try {
      const r = await fetch('/api/cron/update-smvm', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) {
        toast.error(`No se pudo actualizar el SMVM: ${data.error ?? 'error desconocido'}`)
      } else {
        if (data.sin_cambios) {
          toast.success('SMVM ya estaba al día.')
        } else {
          toast.success(data.mensaje ?? 'SMVM actualizado.')
        }
        // Refrescar el valor en la UI
        const { data: smvm } = await supabase
          .from('smvm_historico')
          .select('vigencia_desde, valor, norma_origen')
          .order('vigencia_desde', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (smvm) setSmvmInfo(smvm as SmvmInfo)
      }
    } catch (e) {
      toast.error('Error de red al actualizar el SMVM.')
      console.error(e)
    } finally {
      setActualizandoSmvm(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const upserts = CONFIG_FIELDS.map(f => ({
      clave: f.clave,
      valor: config[f.clave] ?? '',
      descripcion: f.label,
    }))

    const { error } = await supabase
      .from('configuracion')
      .upsert(upserts, { onConflict: 'clave' })

    setSaving(false)

    if (error) {
      toast.error('Error al guardar la configuración.')
    } else {
      toast.success('Configuración guardada correctamente.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={20} className="text-zinc-400" />
          <h1 className="text-2xl font-semibold text-white">Configuración</h1>
        </div>
        <p className="text-zinc-400 text-sm">Datos de la escribanía y parámetros del sistema.</p>
      </div>

      {/* Atajo a Equipo */}
      <Link href="/crm/configuracion/equipo">
        <Card className="bg-zinc-900 border-zinc-800 hover:border-lime-400/30 transition-colors cursor-pointer mb-6 max-w-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
              <Users size={18} className="text-lime-400" />
            </div>
            <div className="flex-1">
              <p className="text-zinc-200 text-sm font-medium">Gestionar equipo</p>
              <p className="text-zinc-500 text-xs">Invitar, asignar roles y desactivar miembros de la escribanía.</p>
            </div>
            <ArrowRight size={14} className="text-zinc-500" />
          </CardContent>
        </Card>
      </Link>

      <form onSubmit={handleSave} className="space-y-5 max-w-xl">
        {/* Datos de la escribanía */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Datos de la escribanía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CONFIG_FIELDS.map(f => (
              <div key={f.clave} className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">{f.label}</Label>
                <Input
                  type={f.tipo ?? 'text'}
                  value={config[f.clave] ?? ''}
                  onChange={e => setConfig(p => ({ ...p, [f.clave]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SMVM (auto-actualizado) */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              SMVM vigente
              <span className="text-[10px] uppercase tracking-wider bg-lime-400/15 border border-lime-400/30 text-lime-400 px-1.5 py-0.5 rounded">
                Auto
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {smvmInfo ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-semibold text-white">
                    ${Number(smvmInfo.valor).toLocaleString('es-AR')}
                  </span>
                  <span className="text-xs text-zinc-500">
                    desde {new Date(smvmInfo.vigencia_desde + 'T00:00:00').toLocaleDateString('es-AR')}
                  </span>
                </div>
                {smvmInfo.norma_origen && (
                  <p className="text-xs text-zinc-500">{smvmInfo.norma_origen}</p>
                )}
                <div className="text-xs text-zinc-500 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-zinc-800">
                  <span>700 SMVM (compraventa): <span className="text-zinc-300 font-mono">${(Number(smvmInfo.valor) * 700).toLocaleString('es-AR')}</span></span>
                  <span>700 SMVM (efectivo): <span className="text-zinc-300 font-mono">${(Number(smvmInfo.valor) * 700).toLocaleString('es-AR')}</span></span>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Sin datos de SMVM cargados todavía.</p>
            )}

            <Separator className="bg-zinc-800" />

            <div className="text-xs text-zinc-500 space-y-1">
              <p className="flex items-start gap-1.5">
                <CheckCircle2 size={11} className="text-lime-400 shrink-0 mt-0.5" />
                Se actualiza automáticamente el día 2 de cada mes desde la página oficial del Consejo del Salario.
              </p>
              <p className="flex items-start gap-1.5">
                <AlertCircle size={11} className="text-zinc-500 shrink-0 mt-0.5" />
                Las escrituras que superen 700 SMVM generan alerta UIF automática.
              </p>
            </div>

            {esSuperAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={actualizarSmvm}
                disabled={actualizandoSmvm}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
              >
                {actualizandoSmvm
                  ? <Loader2 size={13} className="animate-spin" />
                  : <RefreshCw size={13} />}
                Forzar actualización ahora
              </Button>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar configuración
        </Button>
      </form>
    </div>
  )
}
