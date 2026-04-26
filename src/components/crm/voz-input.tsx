'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DatosIndiceVoz } from '@/lib/claude/voz'

interface Props {
  onDatosExtraidos: (datos: DatosIndiceVoz) => void
}

// Tipado para Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: (e: SpeechRecognitionEvent) => void
  onerror: (e: SpeechRecognitionErrorEvent) => void
  onend: () => void
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

export function VozInput({ onDatosExtraidos }: Props) {
  const [escuchando, setEscuchando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [transcripcion, setTranscripcion] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const iniciarEscucha = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) {
      toast.error('Tu navegador no soporta reconocimiento de voz. Usá Chrome.')
      return
    }

    const recognition = new SR()
    recognition.lang = 'es-AR'
    recognition.continuous = true
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const texto = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
      setTranscripcion(texto)
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      toast.error(`Error de micrófono: ${e.error}`)
      setEscuchando(false)
    }

    recognition.onend = () => setEscuchando(false)

    recognition.start()
    setEscuchando(true)
    setTranscripcion('')
  }, [])

  const detenerYClasificar = useCallback(async () => {
    recognitionRef.current?.stop()
    setEscuchando(false)

    if (!transcripcion.trim()) {
      toast.warning('No se captó ningún texto.')
      return
    }

    setProcesando(true)
    try {
      const res = await fetch('/api/voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: transcripcion }),
      })
      const json = await res.json() as { datos?: DatosIndiceVoz; error?: string }
      if (!res.ok || !json.datos) {
        toast.error(json.error ?? 'Error al clasificar el dictado.')
        return
      }
      onDatosExtraidos(json.datos)
      const campos = Object.keys(json.datos).filter(k => json.datos![k as keyof DatosIndiceVoz])
      toast.success(`${campos.length} campos completados desde el dictado.`)
    } catch {
      toast.error('Error al procesar el dictado.')
    } finally {
      setProcesando(false)
    }
  }, [transcripcion, onDatosExtraidos])

  return (
    <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-200 text-sm font-medium">Carga por voz</p>
          <p className="text-zinc-500 text-xs">Dictá los datos al micrófono y los clasificamos con IA</p>
        </div>
        <div className="flex items-center gap-2">
          {escuchando ? (
            <Button
              type="button"
              onClick={detenerYClasificar}
              size="sm"
              className="bg-red-500 hover:bg-red-400 text-white gap-2 animate-pulse"
            >
              <MicOff size={14} />
              Detener
            </Button>
          ) : (
            <Button
              type="button"
              onClick={iniciarEscucha}
              disabled={procesando}
              size="sm"
              variant="outline"
              className="border-lime-400/50 text-lime-400 hover:bg-lime-400/10 gap-2"
            >
              {procesando
                ? <Loader2 size={14} className="animate-spin" />
                : <Mic size={14} />
              }
              {procesando ? 'Clasificando...' : 'Dictar'}
            </Button>
          )}
        </div>
      </div>

      {escuchando && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <p className="text-zinc-300 text-xs">Escuchando...</p>
        </div>
      )}

      {transcripcion && (
        <div className="bg-zinc-900 rounded-md p-3 text-zinc-300 text-sm leading-relaxed border border-zinc-700">
          {transcripcion}
        </div>
      )}
    </div>
  )
}
