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
import { Loader2, ArrowLeft, FileDown, Upload, CheckCircle2, Search, X } from 'lucide-react'
import Link from 'next/link'

interface TramiteSimple { id: string; tipo: string; numero_referencia: string | null }
interface ClienteSimple { id: string; nombre: string; apellido: string; dni: string | null; cuil: string | null }

export default function NuevaEntregaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [tramites, setTramites] = useState<TramiteSimple[]>([])
  const [clientes, setClientes] = useState<ClienteSimple[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteSimple | null>(null)
  const [form, setForm] = useState({
    tramite_id: searchParams.get('tramite_id') ?? '',
    receptor_nombre: '',
    receptor_dni: '',
    observaciones: '',
  })
  const [entregaId, setEntregaId] = useState<string | null>(null)
  const [tramiteIdRegistrada, setTramiteIdRegistrada] = useState<string | null>(null)
  const [reciboSubido, setReciboSubido] = useState<string | null>(null)
  const [subiendoRecibo, setSubiendoRecibo] = useState(false)

  useEffect(() => {
    supabase
      .from('tramites')
      .select('id, tipo, numero_referencia')
      .neq('estado', 'entregado')
      .order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setTramites(data) })
    supabase
      .from('clientes')
      .select('id, nombre, apellido, dni, cuil')
      .order('apellido')
      .limit(1000)
      .then(({ data }) => { if (data) setClientes(data as ClienteSimple[]) })
  }, [])

  // Filtrar clientes por búsqueda (nombre, apellido, DNI, CUIT)
  const resultados = busqueda.trim().length === 0 ? [] : clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      (c.dni ?? '').includes(busqueda) ||
      (c.cuil ?? '').includes(busqueda)
    )
  }).slice(0, 8)

  function seleccionarCliente(c: ClienteSimple) {
    setClienteSeleccionado(c)
    setForm(p => ({
      ...p,
      receptor_nombre: `${c.apellido}, ${c.nombre}`,
      receptor_dni: c.dni ?? c.cuil ?? '',
    }))
    setBusqueda('')
    setMostrarResultados(false)
  }

  function limpiarCliente() {
    setClienteSeleccionado(null)
    setForm(p => ({ ...p, receptor_nombre: '', receptor_dni: '' }))
  }

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tramite_id || !form.receptor_nombre || !form.receptor_dni) {
      toast.error('Trámite, nombre y DNI del receptor son obligatorios.')
      return
    }
    setSaving(true)

    const { data: entrega, error: entregaError } = await supabase
      .from('entregas')
      .insert({
        tramite_id: form.tramite_id,
        receptor_nombre: form.receptor_nombre,
        receptor_dni: form.receptor_dni,
        observaciones: form.observaciones || null,
        fecha: new Date().toISOString(),
      })
      .select()
      .single()

    if (entregaError) {
      if (entregaError.code === '23505') {
        toast.error('Este trámite ya tiene una entrega registrada.')
      } else {
        toast.error('Error al registrar la entrega.')
      }
      setSaving(false)
      return
    }

    // Actualizar estado del trámite a "entregado"
    await supabase
      .from('tramites')
      .update({ estado: 'entregado', updated_at: new Date().toISOString() })
      .eq('id', form.tramite_id)

    await supabase.from('tramite_hitos').insert({
      tramite_id: form.tramite_id,
      descripcion: `Documentación entregada a ${form.receptor_nombre} (DNI ${form.receptor_dni})`,
    })

    setSaving(false)
    toast.success('Entrega registrada. Trámite marcado como entregado.')
    setEntregaId(entrega.id)
    setTramiteIdRegistrada(form.tramite_id)
  }

  async function subirRecibo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !tramiteIdRegistrada) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10 MB.'); return }
    setSubiendoRecibo(true)
    try {
      const ext = file.name.split('.').pop() ?? 'pdf'
      const path = `tramites/${tramiteIdRegistrada}/recibo-firmado-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('documentos-privados')
        .upload(path, file, { contentType: file.type })
      if (upErr) { toast.error('Error al subir.'); setSubiendoRecibo(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('documentos').insert({
        tramite_id: tramiteIdRegistrada,
        nombre: file.name,
        tipo: file.type === 'application/pdf' ? 'pdf' : 'imagen',
        url: '',
        storage_path: path,
        mime_type: file.type,
        tamano_bytes: file.size,
        categoria: 'otros',
        subcategoria: 'recibo_firmado',
        subido_por: user?.id ?? null,
        visible_cliente: false,
        verificado: true,
      })
      if (insErr) { toast.error('Subido pero falló registrar.'); setSubiendoRecibo(false); return }

      setReciboSubido(file.name)
      toast.success('Recibo firmado adjuntado.')
    } finally {
      setSubiendoRecibo(false)
      e.target.value = ''
    }
  }

  if (entregaId) {
    return (
      <div className="max-w-md">
        <div className="p-6 rounded-xl border border-lime-500/30 bg-lime-500/5 text-center">
          <div className="w-12 h-12 rounded-full bg-lime-500/20 flex items-center justify-center mx-auto mb-4">
            <FileDown className="text-lime-400" size={22} />
          </div>
          <h2 className="text-white font-semibold mb-2">¡Entrega registrada!</h2>
          <p className="text-zinc-400 text-sm mb-6">El trámite fue marcado como entregado.</p>
          <div className="flex flex-col gap-2">
            <a href={`/api/recibo?id=${entregaId}`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
                <FileDown size={15} />Descargar recibo PDF
              </Button>
            </a>

            {/* Subir recibo firmado */}
            {reciboSubido ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-lime-500/10 border border-lime-500/30 text-lime-300 text-sm">
                <CheckCircle2 size={14} />
                <span className="truncate flex-1">{reciboSubido}</span>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 w-full h-9 px-3 rounded-md border cursor-pointer transition-colors ${
                subiendoRecibo
                  ? 'border-lime-400/30 bg-lime-400/5 text-lime-300'
                  : 'border-zinc-700 bg-zinc-800/40 text-zinc-300 hover:border-lime-400/50 hover:bg-zinc-800'
              }`}>
                {subiendoRecibo
                  ? <><Loader2 size={14} className="animate-spin" />Subiendo recibo...</>
                  : <><Upload size={14} />Adjuntar recibo firmado</>
                }
                <input type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={subirRecibo} disabled={subiendoRecibo} />
              </label>
            )}

            <Link href="/crm/entregas">
              <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Ver todas las entregas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href="/crm/entregas">
        <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-6">
          <ArrowLeft size={14} />Entregas
        </Button>
      </Link>
      <h1 className="text-2xl font-semibold text-white mb-6">Nueva entrega</h1>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-sm text-zinc-300">Entrega de Documentación</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Trámite *</Label>
              <Select value={form.tramite_id} onValueChange={v => set('tramite_id', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400">
                  <SelectValue placeholder="Seleccioná el trámite" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-52">
                  {tramites.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-zinc-200 focus:bg-zinc-800">
                      {t.tipo}{t.numero_referencia ? ` · ${t.numero_referencia}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Receptor (cliente) <span className="text-lime-400">*</span></Label>

              {clienteSeleccionado ? (
                <div className="flex items-center gap-3 p-3 rounded-md border border-lime-400/30 bg-lime-400/5">
                  <CheckCircle2 size={16} className="text-lime-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-sm font-medium truncate">
                      {clienteSeleccionado.apellido}, {clienteSeleccionado.nombre}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      {clienteSeleccionado.dni ? `DNI ${clienteSeleccionado.dni}` : ''}
                      {clienteSeleccionado.dni && clienteSeleccionado.cuil ? ' · ' : ''}
                      {clienteSeleccionado.cuil ? `CUIT ${clienteSeleccionado.cuil}` : ''}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={limpiarCliente}
                    className="text-zinc-400 hover:text-white h-7 w-7 p-0 shrink-0">
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); setMostrarResultados(true) }}
                    onFocus={() => setMostrarResultados(true)}
                    onBlur={() => setTimeout(() => setMostrarResultados(false), 150)}
                    placeholder="Buscar cliente por nombre, apellido, DNI o CUIT..."
                    className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                  />
                  {mostrarResultados && resultados.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {resultados.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => seleccionarCliente(c)}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                        >
                          <p className="text-zinc-200 text-sm">{c.apellido}, {c.nombre}</p>
                          <p className="text-zinc-500 text-xs">
                            {c.dni ? `DNI ${c.dni}` : ''}
                            {c.dni && c.cuil ? ' · ' : ''}
                            {c.cuil ? `CUIT ${c.cuil}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {mostrarResultados && busqueda.trim().length > 0 && resultados.length === 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-zinc-500 text-xs">
                      Sin resultados para "{busqueda}".
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Observaciones</Label>
              <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                placeholder="Notas sobre la entrega..." rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Registrar entrega
          </Button>
          <Link href="/crm/entregas">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
