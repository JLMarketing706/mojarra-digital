'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, CalendarDays } from 'lucide-react'

const TIPOS = ['Firma de escritura', 'Consulta', 'Entrega de documentos', 'Poder', 'Certificación', 'Otro']

export default function SolicitarTurnoPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [form, setForm] = useState({ fecha: '', hora: '', tipo: '', notas: '' })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fecha || !form.hora) { toast.error('Elegí fecha y hora.'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesión expirada.'); setLoading(false); return }

    const { data: cliente } = await supabase
      .from('clientes').select('id').eq('user_id', user.id).single()

    const fechaISO = new Date(`${form.fecha}T${form.hora}:00`).toISOString()

    const { error } = await supabase.from('turnos').insert({
      cliente_id: cliente?.id ?? null,
      fecha: fechaISO,
      tipo: form.tipo || null,
      notas: form.notas || null,
      estado: 'pendiente',
    })

    setLoading(false)
    if (error) { toast.error('Error al solicitar el turno.'); return }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-14 h-14 rounded-full bg-lime-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-lime-500" size={28} />
        </div>
        <h1 className="text-xl font-semibold mb-2">¡Solicitud enviada!</h1>
        <p className="text-muted-foreground text-sm">
          La escribanía va a confirmar tu turno a la brevedad. Te notificamos por este portal.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={20} className="text-lime-500" />
          <h1 className="text-2xl font-semibold">Solicitar turno</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Elegí fecha y horario preferido. La escribanía lo confirmará.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos del turno</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha preferida *</Label>
                <Input type="date" value={form.fecha}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => set('fecha', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Horario *</Label>
                <Input type="time" value={form.hora} onChange={e => set('hora', e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de operación</Label>
              <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccioná (opcional)" /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                placeholder="Contanos de qué se trata tu consulta..." rows={3}
                className="resize-none" />
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
              Solicitar turno
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
