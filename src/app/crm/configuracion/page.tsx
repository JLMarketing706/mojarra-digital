'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save, Settings, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ConfigEntry { clave: string; valor: string; descripcion: string | null }

const CONFIG_FIELDS: { clave: string; label: string; placeholder: string; tipo?: string }[] = [
  { clave: 'nombre_escribania', label: 'Nombre de la escribanía', placeholder: 'Escribanía Juan García' },
  { clave: 'numero_registro_escribania', label: 'Número de registro de la escribanía', placeholder: 'Ej: Registro N° 123' },
  { clave: 'direccion_escribania', label: 'Dirección', placeholder: 'Av. Corrientes 1234, CABA' },
  { clave: 'matricula_escribano', label: 'Matrícula del escribano', placeholder: 'Ej: 1234 CABA' },
  { clave: 'telefono_escribania', label: 'Teléfono', placeholder: '+54 11 1234-5678' },
  { clave: 'email_escribania', label: 'Email institucional', placeholder: 'info@escribania.com.ar' },
]

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('configuracion')
      .select('clave, valor, descripcion')
      .then(({ data }) => {
        if (data) {
          setConfig(Object.fromEntries((data as ConfigEntry[]).map(c => [c.clave, c.valor])))
        }
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

        <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar configuración
        </Button>
      </form>
    </div>
  )
}
