'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Save, Settings } from 'lucide-react'

interface ConfigEntry { clave: string; valor: string; descripcion: string | null }

const CONFIG_FIELDS: { clave: string; label: string; placeholder: string; tipo?: string }[] = [
  { clave: 'nombre_escribania', label: 'Nombre de la escribanía', placeholder: 'Escribanía Juan García' },
  { clave: 'direccion_escribania', label: 'Dirección', placeholder: 'Av. Corrientes 1234, CABA' },
  { clave: 'matricula_escribano', label: 'Matrícula del escribano', placeholder: 'Ej: 1234 CABA' },
  { clave: 'telefono_escribania', label: 'Teléfono', placeholder: '+54 11 1234-5678' },
  { clave: 'email_escribania', label: 'Email institucional', placeholder: 'info@escribania.com.ar' },
  {
    clave: 'salario_minimo',
    label: 'SMVM vigente ($)',
    placeholder: '234315',
    tipo: 'number',
  },
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
  }, [])

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

  const umbraleUIF = config.salario_minimo
    ? `$${(Number(config.salario_minimo) * 700).toLocaleString('es-AR')}`
    : '—'

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={20} className="text-zinc-400" />
          <h1 className="text-2xl font-semibold text-white">Configuración</h1>
        </div>
        <p className="text-zinc-400 text-sm">Datos de la escribanía y parámetros del sistema.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 max-w-xl">
        {/* Datos de la escribanía */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Datos de la escribanía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CONFIG_FIELDS.filter(f => f.clave !== 'salario_minimo').map(f => (
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

        {/* Parámetros UIF */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Parámetros UIF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">SMVM vigente ($)</Label>
              <Input
                type="number"
                value={config['salario_minimo'] ?? ''}
                onChange={e => setConfig(p => ({ ...p, salario_minimo: e.target.value }))}
                placeholder="234315"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
              />
              <p className="text-zinc-500 text-xs">
                Umbral actual (700 SMVM): <span className="text-yellow-400 font-medium">{umbraleUIF}</span>
              </p>
            </div>
            <Separator className="bg-zinc-800" />
            <div className="text-xs text-zinc-500 space-y-1">
              <p>· Trámites que superen este umbral generarán alerta UIF automática.</p>
              <p>· Actualizar cada vez que el Poder Ejecutivo modifique el SMVM.</p>
            </div>
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
