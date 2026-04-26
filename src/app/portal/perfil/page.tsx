'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

export default function PerfilPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido, telefono')
        .eq('id', user.id)
        .single()
      if (profile) {
        setForm({
          nombre: profile.nombre ?? '',
          apellido: profile.apellido ?? '',
          telefono: profile.telefono ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono || null })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      toast.error('Error al guardar los cambios.')
    } else {
      toast.success('Perfil actualizado.')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Mi perfil</h1>
        <p className="text-muted-foreground text-sm">Actualizá tus datos personales.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={form.apellido}
                  onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                placeholder="+54 11 1234-5678"
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
