'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Plus, FileSearch, ExternalLink } from 'lucide-react'
import { formatFecha } from '@/lib/utils'

const TIPOS_INFORME = [
  'Dominio (CABA)', 'Dominio (Provincia de Buenos Aires)',
  'Inhibiciones (CABA)', 'Inhibiciones (Pcia. de Buenos Aires)',
  'Anotaciones personales', 'Certificado catastral',
]

const ESTADO_COLORS: Record<string, string> = {
  solicitado: 'bg-yellow-500/20 text-yellow-300',
  recibido: 'bg-lime-500/20 text-lime-300',
  observado: 'bg-red-500/20 text-red-300',
}

interface Informe {
  id: string
  tipo: string
  matricula: string | null
  partido: string | null
  nomenclatura_catastral: string | null
  titular: string | null
  estado: string
  tramite_id: string | null
  created_at: string
}

interface InformeInsert {
  tipo: string
  matricula: string | null
  partido: string | null
  nomenclatura_catastral: string | null
  titular: string | null
  estado: string
  tramite_id: string | null
}

export default function InformesPage() {
  const supabase = createClient()
  const [informes, setInformes] = useState<Informe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    tipo: '', matricula: '', partido: '',
    nomenclatura_catastral: '', titular: '', tramite_id: '',
  })

  async function cargar() {
    const { data } = await supabase
      .from('informes_registrales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setInformes(data as Informe[])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tipo) { toast.error('Seleccioná el tipo de informe.'); return }
    setSaving(true)

    const insert: InformeInsert = {
      tipo: form.tipo,
      matricula: form.matricula || null,
      partido: form.partido || null,
      nomenclatura_catastral: form.nomenclatura_catastral || null,
      titular: form.titular || null,
      estado: 'solicitado',
      tramite_id: form.tramite_id || null,
    }

    const { error } = await supabase.from('informes_registrales').insert(insert)
    setSaving(false)

    if (error) { toast.error('Error al registrar el informe.'); return }
    toast.success('Informe registrado.')
    setForm({ tipo: '', matricula: '', partido: '', nomenclatura_catastral: '', titular: '', tramite_id: '' })
    setMostrarForm(false)
    cargar()
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('informes_registrales').update({ estado }).eq('id', id)
    toast.success(`Estado actualizado a "${estado}".`)
    cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Informes Registrales</h1>
          <p className="text-zinc-400 text-sm">{informes.length} pedidos registrados</p>
        </div>
        <Button onClick={() => setMostrarForm(v => !v)}
          className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
          <Plus size={16} />{mostrarForm ? 'Cancelar' : 'Nuevo pedido'}
        </Button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Solicitar informe</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Tipo de informe *</Label>
                  <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                      <SelectValue placeholder="Seleccioná" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {TIPOS_INFORME.map(t => <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Titular</Label>
                  <Input value={form.titular} onChange={e => set('titular', e.target.value)}
                    placeholder="García, Juan" className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Matrícula</Label>
                  <Input value={form.matricula} onChange={e => set('matricula', e.target.value)}
                    placeholder="123-456" className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Partido</Label>
                  <Input value={form.partido} onChange={e => set('partido', e.target.value)}
                    placeholder="La Matanza" className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Nomenclatura catastral</Label>
                  <Input value={form.nomenclatura_catastral} onChange={e => set('nomenclatura_catastral', e.target.value)}
                    placeholder="01-01-001-0001" className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400" />
                </div>
              </div>
              <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Registrar pedido
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listado */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-zinc-500" /></div>
      ) : informes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-xl">
          <FileSearch size={36} className="text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500">No hay pedidos de informes registrados.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Titular</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Matrícula</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {informes.map(inf => (
                <tr key={inf.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-200">{inf.tipo}</td>
                  <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">{inf.titular ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs hidden md:table-cell">{inf.matricula ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${ESTADO_COLORS[inf.estado] ?? 'bg-zinc-700 text-zinc-400'}`}>
                      {inf.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                    {formatFecha(inf.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Select value={inf.estado} onValueChange={v => cambiarEstado(inf.id, v)}>
                      <SelectTrigger className="h-7 w-32 bg-zinc-800 border-zinc-700 text-zinc-300 text-xs focus:ring-lime-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {['solicitado', 'recibido', 'observado'].map(e => (
                          <SelectItem key={e} value={e} className="text-zinc-200 focus:bg-zinc-800 text-xs capitalize">{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
