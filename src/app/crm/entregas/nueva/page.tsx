'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, FileDown, Upload, CheckCircle2, Search, X, FileText } from 'lucide-react'
import Link from 'next/link'
import { estadoTramiteLabel } from '@/lib/utils'

interface ClienteEnTramite {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  cuil: string | null
}

interface TramiteRow {
  id: string
  tipo: string
  numero_referencia: string | null
  estado: string
  monto: number | null
  numero_escritura: string | null
  fecha_escritura: string | null
  cliente: ClienteEnTramite | null
}

export default function NuevaEntregaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [tramites, setTramites] = useState<TramiteRow[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [tramiteSeleccionado, setTramiteSeleccionado] = useState<TramiteRow | null>(null)

  const [observaciones, setObservaciones] = useState('')

  const [entregaId, setEntregaId] = useState<string | null>(null)
  const [tramiteIdRegistrada, setTramiteIdRegistrada] = useState<string | null>(null)
  const [reciboSubido, setReciboSubido] = useState<string | null>(null)
  const [subiendoRecibo, setSubiendoRecibo] = useState(false)

  // Cargar trámites pendientes con su cliente principal
  useEffect(() => {
    supabase
      .from('tramites')
      .select(`
        id, tipo, numero_referencia, estado, monto, numero_escritura, fecha_escritura,
        cliente:clientes(id, nombre, apellido, dni, cuil)
      `)
      .neq('estado', 'entregado')
      .order('updated_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setTramites(data as unknown as TramiteRow[])
      })
  }, [])

  // Si vino tramite_id por query string, preseleccionar
  useEffect(() => {
    const id = searchParams.get('tramite_id')
    if (id && tramites.length > 0 && !tramiteSeleccionado) {
      const t = tramites.find(t => t.id === id)
      if (t) setTramiteSeleccionado(t)
    }
  }, [tramites, searchParams, tramiteSeleccionado])

  // Filtrar por: tipo, ref, escritura, nombre/apellido/dni/cuit del cliente
  const resultados = busqueda.trim().length === 0 ? [] : tramites.filter(t => {
    const q = busqueda.toLowerCase()
    const c = t.cliente
    return (
      t.tipo.toLowerCase().includes(q) ||
      (t.numero_referencia ?? '').toLowerCase().includes(q) ||
      (t.numero_escritura ?? '').toLowerCase().includes(q) ||
      (c && c.nombre.toLowerCase().includes(q)) ||
      (c && c.apellido.toLowerCase().includes(q)) ||
      (c?.dni ?? '').includes(busqueda) ||
      (c?.cuil ?? '').includes(busqueda)
    )
  }).slice(0, 8)

  function seleccionar(t: TramiteRow) {
    setTramiteSeleccionado(t)
    setBusqueda('')
    setMostrarResultados(false)
  }

  function limpiar() {
    setTramiteSeleccionado(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tramiteSeleccionado) {
      toast.error('Buscá y seleccioná la operación a entregar.')
      return
    }
    const cliente = tramiteSeleccionado.cliente
    if (!cliente) {
      toast.error('La operación no tiene cliente vinculado.')
      return
    }
    setSaving(true)

    const receptorNombre = `${cliente.apellido}, ${cliente.nombre}`
    const receptorDocumento = cliente.dni ?? cliente.cuil ?? ''

    const { data: entrega, error: entregaError } = await supabase
      .from('entregas')
      .insert({
        tramite_id: tramiteSeleccionado.id,
        receptor_nombre: receptorNombre,
        receptor_dni: receptorDocumento,
        observaciones: observaciones || null,
        fecha: new Date().toISOString(),
      })
      .select()
      .single()

    if (entregaError) {
      if (entregaError.code === '23505') {
        toast.error('Esta operación ya tiene una entrega registrada.')
      } else {
        toast.error('Error al registrar la entrega.')
      }
      setSaving(false)
      return
    }

    await supabase
      .from('tramites')
      .update({ estado: 'entregado', updated_at: new Date().toISOString() })
      .eq('id', tramiteSeleccionado.id)

    await supabase.from('tramite_hitos').insert({
      tramite_id: tramiteSeleccionado.id,
      descripcion: `Documentación entregada a ${receptorNombre}${receptorDocumento ? ` (${receptorDocumento})` : ''}`,
    })

    setSaving(false)
    toast.success('Entrega registrada. Operación marcada como entregada.')
    setEntregaId(entrega.id)
    setTramiteIdRegistrada(tramiteSeleccionado.id)
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

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────
  if (entregaId) {
    return (
      <div className="max-w-md">
        <div className="p-6 rounded-xl border border-lime-500/30 bg-lime-500/5 text-center">
          <div className="w-12 h-12 rounded-full bg-lime-500/20 flex items-center justify-center mx-auto mb-4">
            <FileDown className="text-lime-400" size={22} />
          </div>
          <h2 className="text-white font-semibold mb-2">¡Entrega registrada!</h2>
          <p className="text-zinc-400 text-sm mb-6">La operación fue marcada como entregada.</p>
          <div className="flex flex-col gap-2">
            <a href={`/api/recibo?id=${entregaId}`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
                <FileDown size={15} />Descargar recibo PDF
              </Button>
            </a>

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

  // ── FORM ───────────────────────────────────────────────────
  return (
    <div>
      <Link href="/crm/entregas">
        <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 -ml-2 mb-6">
          <ArrowLeft size={14} />Entregas
        </Button>
      </Link>
      <h1 className="text-2xl font-semibold text-white mb-1">Nueva entrega</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Buscá la operación que vas a entregar. El cliente se completa automáticamente.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300">Entrega de Documentación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Buscador de operación */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Operación a entregar <span className="text-lime-400">*</span></Label>

              {tramiteSeleccionado ? (
                <div className="rounded-md border border-lime-400/30 bg-lime-400/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText size={16} className="text-lime-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-200 text-sm font-medium truncate">
                          {tramiteSeleccionado.tipo}
                        </p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {[
                            tramiteSeleccionado.numero_referencia && `Ref: ${tramiteSeleccionado.numero_referencia}`,
                            tramiteSeleccionado.numero_escritura && `Esc. N° ${tramiteSeleccionado.numero_escritura}`,
                            tramiteSeleccionado.monto && `$ ${Number(tramiteSeleccionado.monto).toLocaleString('es-AR')}`,
                            estadoTramiteLabel(tramiteSeleccionado.estado),
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={limpiar}
                      className="text-zinc-400 hover:text-white h-7 w-7 p-0 shrink-0">
                      <X size={14} />
                    </Button>
                  </div>

                  {/* Cliente vinculado a esa operación */}
                  {tramiteSeleccionado.cliente ? (
                    <div className="mt-3 pt-3 border-t border-lime-400/20">
                      <p className="text-[10px] uppercase tracking-wider text-lime-400/80 mb-1">Receptor (auto)</p>
                      <p className="text-zinc-200 text-sm">
                        {tramiteSeleccionado.cliente.apellido}, {tramiteSeleccionado.cliente.nombre}
                      </p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {tramiteSeleccionado.cliente.dni ? `DNI ${tramiteSeleccionado.cliente.dni}` : ''}
                        {tramiteSeleccionado.cliente.dni && tramiteSeleccionado.cliente.cuil ? ' · ' : ''}
                        {tramiteSeleccionado.cliente.cuil ? `CUIT ${tramiteSeleccionado.cliente.cuil}` : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-yellow-500/30 text-yellow-400 text-xs">
                      ⚠ Esta operación no tiene cliente vinculado.
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); setMostrarResultados(true) }}
                    onFocus={() => setMostrarResultados(true)}
                    onBlur={() => setTimeout(() => setMostrarResultados(false), 150)}
                    placeholder="Buscar operación por tipo, ref, escritura, cliente o DNI..."
                    className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
                  />
                  {mostrarResultados && resultados.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-72 overflow-y-auto">
                      {resultados.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={() => seleccionar(t)}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                        >
                          <p className="text-zinc-200 text-sm font-medium truncate">{t.tipo}</p>
                          <p className="text-zinc-500 text-xs">
                            {t.cliente ? `${t.cliente.apellido}, ${t.cliente.nombre}${t.cliente.dni ? ` · DNI ${t.cliente.dni}` : ''}` : 'sin cliente'}
                          </p>
                          {t.numero_referencia && (
                            <p className="text-zinc-600 text-[10px] mt-0.5">Ref: {t.numero_referencia}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {mostrarResultados && busqueda.trim().length > 0 && resultados.length === 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-zinc-500 text-xs">
                      Sin operaciones que coincidan con &quot;{busqueda}&quot;.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Observaciones</Label>
              <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                placeholder="Notas sobre la entrega..." rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saving || !tramiteSeleccionado || !tramiteSeleccionado.cliente}
            className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2 disabled:opacity-50">
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
