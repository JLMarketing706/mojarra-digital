'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Loader2, Camera, Upload, CheckCircle2, FileDown, AlertCircle, X,
} from 'lucide-react'
import { estadoTramiteLabel } from '@/lib/utils'

interface ParteJoin {
  rol: string | null
  nombre: string | null
  cliente: { nombre: string; apellido: string } | null
}

interface TramiteInfo {
  id: string
  tipo: string | null
  negocios_causales: string[] | null
  cliente: { id: string; nombre: string; apellido: string; dni: string | null; cuil: string | null } | null
  partes: ParteJoin[] | null
}

interface EntregaExistente {
  id: string
  fecha: string
  receptor_nombre: string
  receptor_dni: string
}

interface Props {
  tramiteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Callback al confirmarse exitosamente la entrega */
  onConfirmed?: () => void
}

function partesString(t: TramiteInfo): string {
  const partes = t.partes ?? []
  if (partes.length > 0) {
    const compradores = partes
      .filter(p => p.rol === 'comprador')
      .map(p => p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}` : p.nombre)
      .filter(Boolean)
    const vendedores = partes
      .filter(p => p.rol === 'vendedor')
      .map(p => p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}` : p.nombre)
      .filter(Boolean)
    const otros = partes
      .filter(p => p.rol !== 'comprador' && p.rol !== 'vendedor')
      .map(p => p.cliente ? `${p.cliente.apellido}, ${p.cliente.nombre}` : p.nombre)
      .filter(Boolean)
    const fragmentos: string[] = []
    if (compradores.length > 0) fragmentos.push(`Compradores: ${compradores.join(', ')}`)
    if (vendedores.length > 0) fragmentos.push(`Vendedores: ${vendedores.join(', ')}`)
    if (otros.length > 0) fragmentos.push(`Otros: ${otros.join(', ')}`)
    if (fragmentos.length > 0) return fragmentos.join('. ')
  }
  if (t.cliente) return `Cliente: ${t.cliente.apellido}, ${t.cliente.nombre}`
  return ''
}

function tipoEscritura(t: TramiteInfo): string {
  const causales = t.negocios_causales ?? []
  if (causales.length === 0) return t.tipo || 'Acto notarial'
  if (causales.length === 1) return causales[0]
  return causales.join(' + ')
}

export function EntregaDialog({ tramiteId, open, onOpenChange, onConfirmed }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const archivoRef = useRef<HTMLInputElement>(null)
  const camaraRef = useRef<HTMLInputElement>(null)

  const [cargando, setCargando] = useState(false)
  const [tramite, setTramite] = useState<TramiteInfo | null>(null)
  const [entregaExistente, setEntregaExistente] = useState<EntregaExistente | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [archivoRecibo, setArchivoRecibo] = useState<File | null>(null)

  // Form fields
  const [receptorNombre, setReceptorNombre] = useState('')
  const [receptorDni, setReceptorDni] = useState('')
  const [fecha, setFecha] = useState('')
  const [descripcion, setDescripcion] = useState('')

  // Cargar datos del trámite cuando se abre el dialog
  useEffect(() => {
    if (!open) return
    setCargando(true)
    setTramite(null)
    setEntregaExistente(null)
    setArchivoRecibo(null)
    Promise.all([
      supabase
        .from('tramites')
        .select(`
          id, tipo, negocios_causales,
          cliente:clientes(id, nombre, apellido, dni, cuil),
          partes:tramite_partes(rol, nombre, cliente:clientes(nombre, apellido))
        `)
        .eq('id', tramiteId)
        .single(),
      supabase
        .from('entregas')
        .select('id, fecha, receptor_nombre, receptor_dni')
        .eq('tramite_id', tramiteId)
        .maybeSingle(),
    ]).then(([tr, en]) => {
      const t = tr.data as unknown as TramiteInfo | null
      if (t) {
        setTramite(t)
        // Auto-fill: receptor = cliente principal por default
        if (t.cliente) {
          setReceptorNombre(`${t.cliente.apellido}, ${t.cliente.nombre}`)
          setReceptorDni(t.cliente.dni ?? t.cliente.cuil ?? '')
        }
        // Auto-fill: descripción = tipo + intervinientes
        const desc = `Entrega de: ${tipoEscritura(t)}.\n${partesString(t)}`.trim()
        setDescripcion(desc)
      }
      if (en.data) setEntregaExistente(en.data as EntregaExistente)
      setFecha(new Date().toISOString().split('T')[0])
      setCargando(false)
    })
  }, [open, tramiteId, supabase])

  const yaEntregada = !!entregaExistente
  const archivoElegido = archivoRecibo
  const archivoLabel = useMemo(() => {
    if (!archivoElegido) return null
    return archivoElegido.name
  }, [archivoElegido])

  async function confirmar() {
    if (!receptorNombre.trim()) { toast.error('Cargá el nombre del receptor.'); return }
    if (!fecha) { toast.error('Cargá la fecha de entrega.'); return }
    setGuardando(true)

    // 1. Insertar la entrega (si no existía)
    let entregaId = entregaExistente?.id ?? null
    if (!yaEntregada) {
      const { data: ent, error: errEnt } = await supabase
        .from('entregas')
        .insert({
          tramite_id: tramiteId,
          receptor_nombre: receptorNombre.trim(),
          receptor_dni: receptorDni.trim(),
          observaciones: descripcion.trim() || null,
          fecha: new Date(fecha + 'T00:00:00').toISOString(),
        })
        .select('id')
        .single()
      if (errEnt) {
        if (errEnt.code === '23505') {
          toast.error('Esta escritura ya tiene una entrega registrada.')
        } else {
          toast.error('Error al registrar la entrega.')
          console.error(errEnt)
        }
        setGuardando(false)
        return
      }
      entregaId = (ent as { id: string }).id
    }

    // 2. Actualizar el estado del trámite
    const { error: errEst } = await supabase
      .from('tramites')
      .update({ estado: 'entregado', updated_at: new Date().toISOString() })
      .eq('id', tramiteId)
    if (errEst) {
      toast.error('Error al actualizar el estado de la escritura.')
      setGuardando(false)
      return
    }

    // 3. Insertar hito
    await supabase.from('tramite_hitos').insert({
      tramite_id: tramiteId,
      descripcion: `Documentación entregada a ${receptorNombre.trim()}${receptorDni ? ` (${receptorDni.trim()})` : ''}`,
    })

    // 4. Subir archivo del recibo si fue elegido
    if (archivoRecibo && entregaId) {
      const ext = archivoRecibo.name.split('.').pop() ?? 'jpg'
      const path = `tramites/${tramiteId}/recibo-${entregaId}-${Date.now()}.${ext}`
      const { data: up, error: errUp } = await supabase.storage
        .from('documentos-privados')
        .upload(path, archivoRecibo)
      if (!errUp && up) {
        await supabase.from('documentos').insert({
          tramite_id: tramiteId,
          nombre: archivoRecibo.name || `Recibo firmado ${entregaId}`,
          tipo: archivoRecibo.type.includes('image') ? 'imagen' : 'pdf',
          categoria: 'otros',
          subcategoria: 'recibo_firmado',
          url: '',
          storage_path: up.path,
          mime_type: archivoRecibo.type,
          tamano_bytes: archivoRecibo.size,
        })
      } else if (errUp) {
        console.error(errUp)
        toast.warning('Entrega registrada, pero no se pudo subir la firma. Probá de nuevo.')
      }
    }

    setGuardando(false)
    toast.success(`Estado: ${estadoTramiteLabel('entregado')}`)
    router.refresh()
    onConfirmed?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-lime-400" />
            Entrega de documentación
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Cargá los datos del receptor para registrar la entrega y marcar
            la escritura como entregada.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="py-8 flex items-center justify-center text-zinc-500">
            <Loader2 size={16} className="animate-spin mr-2" /> Cargando...
          </div>
        ) : (
          <div className="space-y-4">
            {yaEntregada && (
              <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 flex items-start gap-2">
                <AlertCircle size={13} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300 space-y-1 flex-1">
                  <p>Esta escritura ya tiene una entrega registrada el{' '}
                    {new Date(entregaExistente.fecha).toLocaleDateString('es-AR')}{' '}
                    a <strong>{entregaExistente.receptor_nombre}</strong>.
                  </p>
                  <a href={`/api/recibo?id=${entregaExistente.id}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline">
                    <FileDown size={11} /> Ver recibo PDF
                  </a>
                </div>
              </div>
            )}

            {/* Receptor + DNI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">Receptor *</Label>
                <Input
                  value={receptorNombre}
                  onChange={e => setReceptorNombre(e.target.value)}
                  placeholder="Apellido, Nombre"
                  disabled={yaEntregada}
                  className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-400">DNI / CUIT del receptor</Label>
                <Input
                  value={receptorDni}
                  onChange={e => setReceptorDni(e.target.value)}
                  placeholder="12.345.678"
                  disabled={yaEntregada}
                  className="bg-zinc-800 border-zinc-700 text-white text-sm h-9 font-mono"
                />
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Fecha de entrega *</Label>
              <Input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                disabled={yaEntregada}
                max={new Date().toISOString().split('T')[0]}
                className="bg-zinc-800 border-zinc-700 text-white text-sm h-9 w-full sm:w-48"
              />
            </div>

            {/* Descripción auto-completada */}
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">
                Descripción
                <span className="ml-2 text-[10px] text-zinc-500 font-normal">
                  (autocompletada con el tipo de escritura y los intervinientes)
                </span>
              </Label>
              <Textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={3}
                disabled={yaEntregada}
                className="bg-zinc-800 border-zinc-700 text-white text-sm resize-none"
              />
            </div>

            {/* Archivo / foto del recibo firmado */}
            {!yaEntregada && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">
                  Recibo firmado
                  <span className="ml-2 text-[10px] text-zinc-500 font-normal">
                    (opcional — sacá una foto desde el celu o subí archivo)
                  </span>
                </Label>

                {archivoLabel ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-lime-400/10 border border-lime-400/30">
                    <span className="text-lime-300 text-xs truncate">{archivoLabel}</span>
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => setArchivoRecibo(null)}
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => camaraRef.current?.click()}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 h-10"
                    >
                      <Camera size={14} /> Sacar foto
                    </Button>
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => archivoRef.current?.click()}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 h-10"
                    >
                      <Upload size={14} /> Subir archivo
                    </Button>
                  </div>
                )}

                <input
                  ref={camaraRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={e => setArchivoRecibo(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={archivoRef}
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={e => setArchivoRecibo(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline" size="sm"
                onClick={() => onOpenChange(false)}
                disabled={guardando}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={confirmar}
                disabled={guardando || !receptorNombre.trim() || !fecha}
                className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-1.5"
              >
                {guardando && <Loader2 size={13} className="animate-spin" />}
                {yaEntregada ? 'Marcar como entregada' : 'Confirmar entrega'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
