'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Upload, Loader2, FileText, Trash2, CheckCircle2, ExternalLink,
  Paperclip, ShieldCheck, AlertTriangle, X,
} from 'lucide-react'
import { formatFecha } from '@/lib/utils'
import type { CategoriaDoc, Documento } from '@/types'
import { SUBCATEGORIAS_DOC } from '@/types'

const inputCls = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 text-xs h-8'

interface Props {
  /**
   * Identificación del propietario del documento.
   * Siempre va a ir al legajo del cliente.
   */
  clienteId?: string
  tramiteId?: string

  /**
   * Categoría UIF que estamos respaldando.
   * Por defecto se elige según el contexto.
   */
  categoria: CategoriaDoc

  /**
   * Subcategoría sugerida (preselecciona el dropdown).
   * Ej: 'sentencia_divorcio', 'dni_frente'
   */
  subcategoriaDefault?: string

  /**
   * Campo del modelo que este documento valida.
   * Ej: 'estado_civil', 'es_pep', 'origen_fondos'
   */
  campoValida?: string

  /**
   * Texto descriptivo opcional.
   */
  label?: string
  helpText?: string

  /**
   * Variante visual.
   * `inline` = compacto, para incrustar dentro de un form
   * `card`   = tarjeta completa, para sección dedicada
   */
  variant?: 'inline' | 'card'

  /**
   * Si es true, requiere que el escribano marque el doc como verificado.
   */
  requiereVerificacion?: boolean
}

export function UploadDocumento({
  clienteId,
  tramiteId,
  categoria,
  subcategoriaDefault,
  campoValida,
  label,
  helpText,
  variant = 'inline',
  requiereVerificacion = true,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [subcategoria, setSubcategoria] = useState(subcategoriaDefault ?? '')
  const [fechaEmision, setFechaEmision] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const cargar = useCallback(async () => {
    let q = supabase
      .from('documentos')
      .select('*')
      .eq('categoria', categoria)
      .order('created_at', { ascending: false })
    if (clienteId) q = q.eq('cliente_id', clienteId)
    if (tramiteId) q = q.eq('tramite_id', tramiteId)
    if (campoValida) q = q.eq('campo_valida', campoValida)
    const { data } = await q
    setDocs((data ?? []) as Documento[])
    setLoading(false)
  }, [supabase, categoria, clienteId, tramiteId, campoValida])

  useEffect(() => { cargar() }, [cargar])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Máximo 10MB.')
      return
    }
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const ext = file.name.split('.').pop() || 'bin'
      const ts = Date.now()
      const path = `${clienteId ?? tramiteId ?? 'general'}/${categoria}/${ts}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('documentos-privados')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        toast.error('Error al subir el archivo.')
        return
      }

      const subc = subcategoriaDefault || subcategoria || 'otro'
      const { error: insErr } = await supabase.from('documentos').insert({
        cliente_id: clienteId ?? null,
        tramite_id: tramiteId ?? null,
        nombre: file.name,
        tipo: subc,
        // No persistimos URL firmada larga: se genera on-demand desde /api/documentos/[id]
        url: '',
        storage_path: path,
        mime_type: file.type,
        tamano_bytes: file.size,
        categoria,
        subcategoria: subc,
        campo_valida: campoValida ?? null,
        fecha_emision: fechaEmision || null,
        fecha_vencimiento: fechaVencimiento || null,
        observaciones: observaciones || null,
        subido_por: user?.id ?? null,
        visible_cliente: false,
        verificado: false,
      })
      if (insErr) {
        console.error(insErr)
        toast.error('Subido al storage pero falló registrar en DB.')
        return
      }
      toast.success('Documento subido.')
      // reset
      setFechaEmision(''); setFechaVencimiento(''); setObservaciones('')
      setShowForm(false)
      cargar()
      router.refresh()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    if (doc.storage_path) {
      await supabase.storage.from('documentos-privados').remove([doc.storage_path])
    }
    await supabase.from('documentos').delete().eq('id', doc.id)
    toast.success('Eliminado.')
    cargar()
    router.refresh()
  }

  async function verificar(doc: Documento) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('documentos').update({
      verificado: !doc.verificado,
      verificado_por: !doc.verificado ? user?.id : null,
      verificado_at: !doc.verificado ? new Date().toISOString() : null,
    }).eq('id', doc.id)
    if (error) { toast.error('No se pudo actualizar.'); return }
    toast.success(doc.verificado ? 'Marcado como no verificado.' : 'Verificado ✓')
    cargar()
  }

  const subcatOpts = SUBCATEGORIAS_DOC[categoria] ?? []

  return (
    <div className={variant === 'card'
      ? 'rounded-lg border border-zinc-800 bg-zinc-900 p-4'
      : 'rounded-md border border-zinc-800 bg-zinc-900/60 p-3'
    }>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Paperclip size={13} className="text-lime-400 shrink-0" />
          <span className="text-zinc-300 text-xs font-medium">
            {label ?? 'Documentación de respaldo'}
          </span>
          {docs.length > 0 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-zinc-800 border border-zinc-700 text-zinc-400">
              {docs.length}
            </Badge>
          )}
        </div>
        <Button type="button" size="sm" variant="ghost"
          onClick={() => setShowForm(s => !s)}
          className="h-6 px-2 text-xs text-zinc-400 hover:text-lime-400">
          {showForm ? <X size={12} /> : <Upload size={12} />}
          <span className="ml-1">{showForm ? 'Cerrar' : 'Adjuntar'}</span>
        </Button>
      </div>

      {helpText && !showForm && docs.length === 0 && (
        <p className="text-zinc-500 text-xs mb-2">{helpText}</p>
      )}

      {/* Form de subida */}
      {showForm && (
        <div className="space-y-2 p-3 rounded-md bg-zinc-800/60 border border-zinc-700 mb-3">
          {subcatOpts.length > 0 && !subcategoriaDefault && (
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Tipo de documento</Label>
              <Select value={subcategoria} onValueChange={setSubcategoria}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Seleccioná" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {subcatOpts.map(s => (
                    <SelectItem key={s.v} value={s.v} className="text-zinc-200 focus:bg-zinc-800 text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Fecha emisión</Label>
              <Input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Vencimiento (si aplica)</Label>
              <Input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
              placeholder="Opcional..." className="bg-zinc-800 border-zinc-700 text-white text-xs resize-none" />
          </div>
          <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border-2 border-dashed cursor-pointer transition-colors ${
            uploading ? 'border-lime-400/30 bg-lime-400/5' : 'border-zinc-700 hover:border-lime-400/50 hover:bg-zinc-800/30'
          }`}>
            {uploading ? <Loader2 size={14} className="animate-spin text-lime-400" /> : <Upload size={14} className="text-zinc-400" />}
            <span className="text-xs text-zinc-300">
              {uploading ? 'Subiendo...' : 'Click para seleccionar archivo (PDF/JPG/PNG, máx 10MB)'}
            </span>
            <input type="file" className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFile} disabled={uploading} />
          </label>
        </div>
      )}

      {/* Lista de docs */}
      {loading ? (
        <p className="text-zinc-600 text-xs">Cargando...</p>
      ) : docs.length === 0 && !showForm ? (
        <p className="text-zinc-600 text-xs italic">Sin documentos adjuntos.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map(d => {
            const subcatLabel = subcatOpts.find(s => s.v === d.subcategoria)?.label ?? d.subcategoria
            const vencido = d.fecha_vencimiento && new Date(d.fecha_vencimiento) < new Date()
            return (
              <div key={d.id}
                className={`flex items-center gap-2 p-2 rounded-md border ${
                  d.verificado ? 'border-lime-400/20 bg-lime-400/5' : 'border-zinc-800 bg-zinc-800/30'
                }`}>
                <FileText size={13} className="text-zinc-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a href={`/api/documentos/${d.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-200 text-xs font-medium truncate hover:text-lime-400 max-w-[180px]">
                      {d.nombre}
                    </a>
                    {subcatLabel && (
                      <Badge className="text-[10px] px-1 py-0 bg-zinc-800 border border-zinc-700 text-zinc-400">
                        {subcatLabel}
                      </Badge>
                    )}
                    {d.verificado && (
                      <Badge className="text-[10px] px-1 py-0 bg-lime-400/10 border border-lime-400/30 text-lime-300">
                        <CheckCircle2 size={9} className="mr-0.5" />Verificado
                      </Badge>
                    )}
                    {vencido && (
                      <Badge className="text-[10px] px-1 py-0 bg-red-500/10 border border-red-500/30 text-red-300">
                        <AlertTriangle size={9} className="mr-0.5" />Vencido
                      </Badge>
                    )}
                  </div>
                  {(d.fecha_emision || d.fecha_vencimiento) && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {d.fecha_emision && `Emitido ${formatFecha(d.fecha_emision)}`}
                      {d.fecha_emision && d.fecha_vencimiento && ' · '}
                      {d.fecha_vencimiento && `Vence ${formatFecha(d.fecha_vencimiento)}`}
                    </p>
                  )}
                </div>
                <a href={`/api/documentos/${d.id}`} target="_blank" rel="noopener noreferrer">
                  <Button type="button" size="sm" variant="ghost"
                    className="h-6 w-6 p-0 text-zinc-500 hover:text-lime-400">
                    <ExternalLink size={12} />
                  </Button>
                </a>
                {requiereVerificacion && (
                  <Button type="button" size="sm" variant="ghost"
                    onClick={() => verificar(d)}
                    className={`h-6 w-6 p-0 ${
                      d.verificado ? 'text-lime-400 hover:text-zinc-500' : 'text-zinc-500 hover:text-lime-400'
                    }`}
                    title={d.verificado ? 'Quitar verificación' : 'Marcar como verificado'}>
                    <ShieldCheck size={12} />
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => eliminar(d)}
                  className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400">
                  <Trash2 size={12} />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
