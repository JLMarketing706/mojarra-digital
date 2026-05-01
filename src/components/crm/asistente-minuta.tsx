'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Copy, Check, Loader2, Sparkles, AlertTriangle, Info, Lightbulb, XCircle,
} from 'lucide-react'
import type { ObservacionMinuta } from '@/lib/claude/minutas'

interface Props {
  tramite: Record<string, unknown>
  inmueble: Record<string, unknown> | null
}

interface BloqueMinuta {
  titulo: string
  contenido: string
  copiado?: boolean
}

function formatearBloques(tramite: Record<string, unknown>, inmueble: Record<string, unknown> | null): BloqueMinuta[] {
  const c = tramite.cliente as Record<string, string | null> | null
  const e = tramite.escribano as { nombre: string; apellido: string } | null

  const bloques: BloqueMinuta[] = []

  if (c) {
    const parteTexto = [
      c.apellido && c.nombre ? `${c.apellido.toUpperCase()}, ${c.nombre.toUpperCase()}` : null,
      c.dni ? `D.N.I. Nº ${c.dni}` : null,
      c.cuil ? `C.U.I.L. ${c.cuil}` : null,
      c.estado_civil ? `estado civil: ${c.estado_civil}` : null,
      c.domicilio ? `con domicilio en ${c.domicilio}` : null,
    ].filter(Boolean).join(', ')
    bloques.push({ titulo: 'Datos del cliente / parte', contenido: parteTexto })
  }

  if (inmueble) {
    const inmTexto = [
      inmueble.domicilio ? `Inmueble ubicado en ${inmueble.domicilio}` : null,
      inmueble.partido ? `Partido de ${inmueble.partido}` : null,
      inmueble.nomenclatura_catastral ? `Nomenclatura catastral: ${inmueble.nomenclatura_catastral}` : null,
      inmueble.matricula ? `Matrícula Nº ${inmueble.matricula}` : null,
      inmueble.titular ? `Titular registral: ${inmueble.titular}` : null,
    ].filter(Boolean).join(' — ')
    if (inmTexto) bloques.push({ titulo: 'Datos del inmueble', contenido: inmTexto })
  }

  if (tramite.tipo) {
    bloques.push({
      titulo: 'Tipo de acto',
      contenido: String(tramite.tipo).toUpperCase(),
    })
  }

  if (e) {
    bloques.push({
      titulo: 'Escribano/a autorizante',
      contenido: `${e.apellido.toUpperCase()}, ${e.nombre.toUpperCase()}`,
    })
  }

  if (tramite.descripcion) {
    bloques.push({ titulo: 'Descripción del acto', contenido: String(tramite.descripcion) })
  }

  return bloques
}

const OBS_ICON: Record<string, React.ReactNode> = {
  error: <AlertTriangle size={14} className="text-red-400" />,
  advertencia: <AlertTriangle size={14} className="text-yellow-400" />,
  sugerencia: <Lightbulb size={14} className="text-blue-400" />,
}
const OBS_COLOR: Record<string, string> = {
  error: 'border-red-500/30 bg-red-500/5',
  advertencia: 'border-yellow-500/30 bg-yellow-500/5',
  sugerencia: 'border-blue-500/30 bg-blue-500/5',
}

export function AsistenteMinuta({ tramite, inmueble }: Props) {
  const bloques = formatearBloques(tramite, inmueble)
  const [copiados, setCopiados] = useState<Set<number>>(new Set())
  const [revisando, setRevisando] = useState(false)
  const [observaciones, setObservaciones] = useState<ObservacionMinuta[] | null>(null)
  const [errorIA, setErrorIA] = useState<string | null>(null)

  async function copiar(idx: number, texto: string) {
    await navigator.clipboard.writeText(texto)
    setCopiados(prev => new Set(prev).add(idx))
    setTimeout(() => {
      setCopiados(prev => { const s = new Set(prev); s.delete(idx); return s })
    }, 2000)
  }

  async function revisarConIA() {
    setRevisando(true)
    setObservaciones(null)
    setErrorIA(null)
    try {
      const res = await fetch('/api/minutas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tramiteId: tramite.id }),
      })
      const json = await res.json() as { observaciones?: ObservacionMinuta[]; error?: string }
      if (!res.ok) {
        setErrorIA(json.error ?? 'Error al analizar el trámite.')
        return
      }
      setObservaciones(json.observaciones ?? [])
    } catch {
      setErrorIA('No se pudo conectar con el servicio de IA. Intentá de nuevo.')
    } finally {
      setRevisando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Botón revisión IA */}
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-sm">
          {bloques.length} bloques de datos listos para copiar.
        </p>
        <Button
          onClick={revisarConIA}
          disabled={revisando}
          variant="outline"
          className="border-lime-400/40 text-lime-400 hover:bg-lime-400/10 gap-2"
        >
          {revisando
            ? <Loader2 size={14} className="animate-spin" />
            : <Sparkles size={14} />
          }
          {revisando ? 'Analizando con IA...' : 'Revisar datos con IA'}
        </Button>
      </div>

      {/* Error IA */}
      {errorIA && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
          <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{errorIA}</p>
        </div>
      )}

      {/* Observaciones de la IA */}
      {observaciones !== null && (
        <div className="space-y-2">
          {observaciones.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-lime-500/30 bg-lime-500/5">
              <Check size={15} className="text-lime-400" />
              <p className="text-lime-300 text-sm">Los datos están completos y sin inconsistencias.</p>
            </div>
          ) : (
            observaciones.map((obs, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${OBS_COLOR[obs.tipo]}`}>
                {OBS_ICON[obs.tipo]}
                <div>
                  {obs.campo && (
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                      {obs.campo} ·{' '}
                    </span>
                  )}
                  <span className="text-zinc-200 text-sm">{obs.mensaje}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bloques copiables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bloques.length === 0 ? (
          <div className="col-span-2 text-center py-10 border border-dashed border-zinc-700 rounded-lg">
            <Info size={28} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No hay datos suficientes en el trámite para generar bloques.</p>
          </div>
        ) : (
          bloques.map((bloque, idx) => (
            <Card key={idx} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs text-zinc-400 uppercase tracking-wide">
                  {bloque.titulo}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copiar(idx, bloque.contenido)}
                  className={`h-7 gap-1.5 text-xs shrink-0 ${
                    copiados.has(idx)
                      ? 'text-lime-400 bg-lime-400/10'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {copiados.has(idx)
                    ? <><Check size={13} />Copiado</>
                    : <><Copy size={13} />Copiar</>
                  }
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-200 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                  {bloque.contenido}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p className="text-zinc-500 text-xs">
          Hacé clic en "Copiar" para llevar cada bloque directamente al sistema registral.
          Revisá los datos con IA antes de enviar al registro para detectar posibles inconsistencias.
        </p>
      </div>
    </div>
  )
}
