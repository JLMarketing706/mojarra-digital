'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2, ArrowLeft, BookOpenText, Plus, X, CheckCircle2,
  ScrollText, FileSignature, Eye,
} from 'lucide-react'
import Link from 'next/link'
import { formatFechaHora } from '@/lib/utils'
import type { ManualProcedimientos, ManualAcuse } from '@/types'

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400'

export default function ManualPage() {
  const supabase = createClient()
  const [manuales, setManuales] = useState<ManualProcedimientos[]>([])
  const [vigente, setVigente] = useState<ManualProcedimientos | null>(null)
  const [acuses, setAcuses] = useState<ManualAcuse[]>([])
  const [yoLei, setYoLei] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    version: '',
    titulo: 'Manual de procedimientos PLA/FT',
    contenido: '',
    resumen_cambios: '',
    vigente: true,
  })

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: list } = await supabase
      .from('manual_procedimientos')
      .select('*')
      .order('created_at', { ascending: false })
    if (list) {
      setManuales(list as ManualProcedimientos[])
      const vig = (list as ManualProcedimientos[]).find(m => m.vigente) ?? null
      setVigente(vig)
      if (vig) {
        const { data: ack } = await supabase
          .from('manual_acuses')
          .select('*, profile:profiles(*)')
          .eq('manual_id', vig.id)
        if (ack) setAcuses(ack as ManualAcuse[])
        const { data: { user } } = await supabase.auth.getUser()
        setYoLei(!!ack?.find(a => a.profile_id === user?.id))
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(p => ({ ...p, [k]: v })) }

  async function publicar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.version || !form.contenido) { toast.error('Versión y contenido son obligatorios.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('manual_procedimientos').insert({
      version: form.version,
      titulo: form.titulo,
      contenido: form.contenido,
      resumen_cambios: form.resumen_cambios || null,
      vigente: form.vigente,
      fecha_vigencia: form.vigente ? new Date().toISOString().split('T')[0] : null,
      aprobado_por: form.vigente ? user?.id : null,
      fecha_aprobacion: form.vigente ? new Date().toISOString() : null,
      created_by: user?.id,
    })
    setSaving(false)
    if (error) {
      console.error(error)
      toast.error(error.message.includes('duplicate') ? 'Esa versión ya existe.' : 'Error al guardar.')
      return
    }
    toast.success('Manual publicado.')
    setForm({ version: '', titulo: 'Manual de procedimientos PLA/FT', contenido: '', resumen_cambios: '', vigente: true })
    setShowForm(false)
    cargar()
  }

  async function darAcuse() {
    if (!vigente) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('manual_acuses').insert({
      manual_id: vigente.id,
      profile_id: user.id,
    })
    if (error) {
      toast.error('No se pudo registrar el acuse.')
      return
    }
    toast.success('Acuse de lectura registrado.')
    cargar()
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/crm/cumplimiento">
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-4">
            <ArrowLeft size={14} />Cumplimiento
          </Button>
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
              <BookOpenText size={20} className="text-lime-400" />Manual de procedimientos PLA/FT
            </h1>
            <p className="text-zinc-500 text-sm">
              Versión vigente del manual + control de versiones + acuses de lectura del personal.
              Res. UIF 242/2023.
            </p>
          </div>
          <Button onClick={() => setShowForm(s => !s)}
            className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancelar' : 'Publicar nueva versión'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Nueva versión del manual</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={publicar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Versión <span className="text-lime-400">*</span></Label>
                  <Input value={form.version} onChange={e => set('version', e.target.value)}
                    placeholder="Ej: 2.0" className={inputCls} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-zinc-300">Título</Label>
                  <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Resumen de cambios (vs versión anterior)</Label>
                <Textarea value={form.resumen_cambios} onChange={e => set('resumen_cambios', e.target.value)}
                  rows={2} placeholder="Qué cambió respecto de la versión anterior..."
                  className={inputCls + ' resize-none'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Contenido del manual <span className="text-lime-400">*</span></Label>
                <Textarea value={form.contenido} onChange={e => set('contenido', e.target.value)}
                  rows={14} placeholder="Cuerpo completo del manual..."
                  className={inputCls + ' resize-y font-mono text-xs'} />
                <p className="text-xs text-zinc-500">
                  Soporta texto plano. El sistema guarda inalterable cada versión publicada.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.vigente}
                  onChange={e => set('vigente', e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-800 text-lime-400 focus:ring-lime-400" />
                <span className="text-zinc-200">Marcar como versión vigente (las anteriores quedarán archivadas)</span>
              </label>
              <Button type="submit" disabled={saving}
                className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Publicar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-zinc-500" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {vigente ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className="bg-lime-400/15 text-lime-300 border border-lime-400/30 text-xs">
                          <CheckCircle2 size={11} className="mr-1" />Vigente
                        </Badge>
                        <Badge className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono">
                          v{vigente.version}
                        </Badge>
                      </div>
                      <CardTitle className="text-base text-white">{vigente.titulo}</CardTitle>
                      {vigente.fecha_vigencia && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Vigente desde {vigente.fecha_vigencia}
                        </p>
                      )}
                    </div>
                    {!yoLei && (
                      <Button onClick={darAcuse}
                        className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-2">
                        <FileSignature size={14} />Acuse de lectura
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {vigente.resumen_cambios && (
                    <div className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                      <p className="text-zinc-500 text-xs mb-1">Resumen de cambios</p>
                      <p className="text-zinc-300 text-sm">{vigente.resumen_cambios}</p>
                    </div>
                  )}
                  <div className="prose prose-sm prose-invert max-w-none">
                    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {vigente.contenido}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="border border-dashed border-zinc-700 rounded-lg py-12 text-center">
                <ScrollText size={32} className="text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">Sin manual publicado.</p>
                <p className="text-zinc-500 text-xs mt-1">
                  La Res. 242/2023 obliga a tener un manual de procedimientos PLA/FT vigente.
                </p>
              </div>
            )}

            {/* Versiones anteriores */}
            {manuales.filter(m => !m.vigente).length > 0 && (
              <>
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mt-8">
                  Versiones anteriores
                </h2>
                <div className="space-y-2">
                  {manuales.filter(m => !m.vigente).map(m => (
                    <Card key={m.id} className="bg-zinc-900 border-zinc-800">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-xs">
                            v{m.version}
                          </Badge>
                          <span className="text-zinc-300 text-sm">{m.titulo}</span>
                        </div>
                        <span className="text-zinc-500 text-xs">{formatFechaHora(m.created_at)}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Acuses */}
          <div className="space-y-4">
            {vigente && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Eye size={14} className="text-lime-400" />
                    Acuses de lectura ({acuses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {acuses.length === 0 ? (
                    <p className="text-zinc-500 text-xs">Aún nadie acusó recibo.</p>
                  ) : (
                    <ul className="space-y-2">
                      {acuses.map(a => (
                        <li key={a.id} className="flex items-center justify-between text-sm gap-2">
                          <span className="text-zinc-300 truncate">
                            {a.profile ? `${a.profile.nombre} ${a.profile.apellido}` : '—'}
                          </span>
                          <span className="text-zinc-500 text-xs shrink-0">
                            {formatFechaHora(a.fecha_acuse)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
