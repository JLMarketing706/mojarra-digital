'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2, Upload, Scan, CheckCircle2, FileText, X, ArrowRight
} from 'lucide-react'
import type { DatosDocumento } from '@/lib/claude/ocr'
import Link from 'next/link'

const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión convivencial']

interface FormData {
  nombre: string
  apellido: string
  dni: string
  cuil: string
  estado_civil: string
  domicilio: string
  email: string
  telefono: string
  notas: string
}

const EMPTY_FORM: FormData = {
  nombre: '', apellido: '', dni: '', cuil: '',
  estado_civil: '', domicilio: '', email: '', telefono: '', notas: '',
}

export default function CargaDatosPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [archivos, setArchivos] = useState<File[]>([])
  const [procesandoOCR, setProcesandoOCR] = useState(false)
  const [camposAutocompletados, setCamposAutocompletados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  function set(key: keyof FormData, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function procesarDocumentoOCR(archivo: File) {
    setProcesandoOCR(true)
    setCamposAutocompletados([])

    try {
      const fd = new FormData()
      fd.append('archivo', archivo)

      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      const json = await res.json() as { datos?: DatosDocumento; error?: string }

      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Error al leer el documento.')
        return
      }

      const datos = json.datos!
      const completados: string[] = []

      const mapeo: Array<[keyof DatosDocumento, keyof FormData]> = [
        ['nombre', 'nombre'],
        ['apellido', 'apellido'],
        ['dni', 'dni'],
        ['cuil', 'cuil'],
        ['domicilio', 'domicilio'],
      ]

      setForm(prev => {
        const next = { ...prev }
        for (const [src, dst] of mapeo) {
          const val = datos[src] as string | undefined
          if (val) {
            next[dst] = val
            completados.push(dst)
          }
        }
        return next
      })

      setCamposAutocompletados(completados)

      if (completados.length > 0) {
        toast.success(`${completados.length} campo${completados.length > 1 ? 's' : ''} completado${completados.length > 1 ? 's' : ''} automáticamente.`)
      } else {
        toast.warning('No se pudieron extraer datos del documento. Completá los campos manualmente.')
      }
    } catch {
      toast.error('Error al procesar el documento.')
    } finally {
      setProcesandoOCR(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setArchivos(prev => [...prev, ...files])

    // Si es imagen o PDF pequeño, procesar con OCR automáticamente
    const docPrincipal = files[0]
    const tiposOCR = ['image/jpeg', 'image/png', 'image/webp']
    if (tiposOCR.includes(docPrincipal.type) || docPrincipal.type === 'application/pdf') {
      procesarDocumentoOCR(docPrincipal)
    }
  }

  function quitarArchivo(idx: number) {
    setArchivos(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.apellido || !form.dni) {
      toast.error('Completá al menos nombre, apellido y DNI.')
      return
    }

    setEnviando(true)

    try {
      // Crear cliente en la base de datos
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nombre: form.nombre,
          apellido: form.apellido,
          dni: form.dni || null,
          cuil: form.cuil || null,
          estado_civil: form.estado_civil || null,
          domicilio: form.domicilio || null,
          email: form.email || null,
          telefono: form.telefono || null,
          notas: form.notas || null,
        })
        .select()
        .single()

      if (clienteError) throw clienteError

      // Subir documentos si hay
      for (const archivo of archivos) {
        const ext = archivo.name.split('.').pop()
        const path = `clientes/${cliente.id}/${Date.now()}-${archivo.name}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documentos-privados')
          .upload(path, archivo)

        if (uploadError) {
          console.error('Error subiendo documento:', uploadError)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('documentos-privados')
          .getPublicUrl(uploadData.path)

        await supabase.from('documentos').insert({
          cliente_id: cliente.id,
          nombre: archivo.name,
          tipo: ext === 'pdf' ? 'pdf' : 'imagen',
          url: publicUrl,
          visible_cliente: false,
        })
      }

      setEnviado(true)
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar los datos. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-lime-400/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-lime-400" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">¡Datos recibidos!</h1>
        <p className="text-zinc-400 mb-8">
          Tu información fue cargada correctamente. El equipo de la escribanía va a procesar tu documentación.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Volver al inicio
            </Button>
          </Link>
          <Link href="/registro">
            <Button className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2">
              Crear cuenta para seguir mi trámite <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Cargá tus datos</h1>
        <p className="text-zinc-400">
          Podés subir una foto de tu DNI y completamos los campos automáticamente, o ingresarlos de forma manual.
        </p>
      </div>

      {/* Zona de carga de documentos */}
      <div className="mb-8">
        <div
          className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-lime-400/50 transition-colors group"
          onClick={() => fileInputRef.current?.click()}
        >
          {procesandoOCR ? (
            <div className="flex flex-col items-center gap-3">
              <Scan size={28} className="text-lime-400 animate-pulse" />
              <p className="text-zinc-300 font-medium">Leyendo documento con IA...</p>
              <p className="text-zinc-500 text-sm">Esto tarda unos segundos</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload size={28} className="text-zinc-500 group-hover:text-lime-400 transition-colors" />
              <div>
                <p className="text-zinc-300 font-medium">Subí tu DNI o documento</p>
                <p className="text-zinc-500 text-sm mt-1">JPG, PNG, WEBP o PDF — máx. 5MB</p>
              </div>
              <Badge variant="outline" className="border-lime-400/30 text-lime-400 text-xs">
                Autocompletado con IA
              </Badge>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Lista de archivos adjuntos */}
        {archivos.length > 0 && (
          <div className="mt-3 space-y-2">
            {archivos.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-zinc-400 shrink-0" />
                  <span className="text-zinc-300 text-sm truncate">{f.name}</span>
                  <span className="text-zinc-600 text-xs shrink-0">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => quitarArchivo(i)}
                  className="text-zinc-500 hover:text-red-400 transition-colors ml-2"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario de datos */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="text-zinc-300 flex items-center gap-2">
              Nombre *
              {camposAutocompletados.includes('nombre') && (
                <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0">
                  <Scan size={10} className="mr-1" />IA
                </Badge>
              )}
            </Label>
            <Input
              id="nombre"
              placeholder="Juan"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              required
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 data-[auto=true]:border-lime-400/40"
              data-auto={camposAutocompletados.includes('nombre')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apellido" className="text-zinc-300 flex items-center gap-2">
              Apellido *
              {camposAutocompletados.includes('apellido') && (
                <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0">
                  <Scan size={10} className="mr-1" />IA
                </Badge>
              )}
            </Label>
            <Input
              id="apellido"
              placeholder="García"
              value={form.apellido}
              onChange={e => set('apellido', e.target.value)}
              required
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="dni" className="text-zinc-300 flex items-center gap-2">
              DNI *
              {camposAutocompletados.includes('dni') && (
                <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0">
                  <Scan size={10} className="mr-1" />IA
                </Badge>
              )}
            </Label>
            <Input
              id="dni"
              placeholder="12345678"
              value={form.dni}
              onChange={e => set('dni', e.target.value)}
              required
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cuil" className="text-zinc-300 flex items-center gap-2">
              CUIL
              {camposAutocompletados.includes('cuil') && (
                <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0">
                  <Scan size={10} className="mr-1" />IA
                </Badge>
              )}
            </Label>
            <Input
              id="cuil"
              placeholder="20-12345678-9"
              value={form.cuil}
              onChange={e => set('cuil', e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Estado civil</Label>
            <Select
              value={form.estado_civil}
              onValueChange={v => set('estado_civil', v)}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white focus:ring-lime-400">
                <SelectValue placeholder="Seleccioná" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {ESTADOS_CIVILES.map(e => (
                  <SelectItem key={e} value={e} className="text-zinc-200 focus:bg-zinc-800">
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefono" className="text-zinc-300">Teléfono</Label>
            <Input
              id="telefono"
              placeholder="+54 11 1234-5678"
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="domicilio" className="text-zinc-300 flex items-center gap-2">
            Domicilio
            {camposAutocompletados.includes('domicilio') && (
              <Badge className="bg-lime-400/10 text-lime-400 border-0 text-xs px-1.5 py-0">
                <Scan size={10} className="mr-1" />IA
              </Badge>
            )}
          </Label>
          <Input
            id="domicilio"
            placeholder="Av. Corrientes 1234, CABA"
            value={form.domicilio}
            onChange={e => set('domicilio', e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-zinc-300">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nombre@ejemplo.com"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notas" className="text-zinc-300">
            Observaciones <span className="text-zinc-500 text-xs">(opcional)</span>
          </Label>
          <Textarea
            id="notas"
            placeholder="Información adicional relevante..."
            rows={3}
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400 resize-none"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={enviando || procesandoOCR}
            className="w-full sm:w-auto bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2 px-8"
            size="lg"
          >
            {enviando ? (
              <><Loader2 size={16} className="animate-spin" /> Guardando...</>
            ) : (
              <>Enviar datos <ArrowRight size={16} /></>
            )}
          </Button>
        </div>

        <p className="text-xs text-zinc-600 pt-1">
          Tus datos son tratados con absoluta confidencialidad conforme a la Ley 25.326 de Protección de Datos Personales.
        </p>
      </form>
    </div>
  )
}
