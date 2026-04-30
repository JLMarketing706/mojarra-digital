'use client'

import { useCallback, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { toast } from 'sonner'

// Reconocimiento de voz nativo del navegador (Web Speech API).
// No usa Claude → sin costo. Sólo funciona en Chrome / Edge / Safari.
interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList }
interface SpeechRecognitionErrorEvent extends Event { error: string }
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

interface Props {
  /** Texto actual del campo. */
  value: string
  /** Recibe el texto actualizado (acumulado o reemplazado). */
  onChange: (next: string) => void
  /** Si true, el dictado reemplaza el contenido. Por defecto se acumula. */
  replace?: boolean
  className?: string
  title?: string
}

export function MicButton({ value, onChange, replace = false, className, title }: Props) {
  const [escuchando, setEscuchando] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const baseRef = useRef('')

  const start = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) {
      toast.error('Tu navegador no soporta dictado por voz. Probá con Chrome.')
      return
    }
    const recognition = new SR()
    recognition.lang = 'es-AR'
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition

    baseRef.current = replace ? '' : value

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcrito = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
      const sep = baseRef.current && !baseRef.current.endsWith(' ') ? ' ' : ''
      onChange(`${baseRef.current}${sep}${transcrito}`.trim())
    }
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      toast.error(`Error de micrófono: ${e.error}`)
      setEscuchando(false)
    }
    recognition.onend = () => setEscuchando(false)

    recognition.start()
    setEscuchando(true)
  }, [onChange, replace, value])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setEscuchando(false)
  }, [])

  return (
    <button
      type="button"
      onClick={escuchando ? stop : start}
      title={title ?? (escuchando ? 'Detener dictado' : 'Dictar por voz')}
      aria-label={escuchando ? 'Detener dictado' : 'Dictar por voz'}
      className={
        'inline-flex items-center gap-1.5 h-7 px-2 rounded-md border transition-colors text-xs font-medium ' +
        (escuchando
          ? 'bg-red-500/20 border-red-500/60 text-red-400 animate-pulse'
          : 'bg-zinc-800 border-zinc-700 text-lime-400 hover:bg-zinc-700 hover:border-lime-400/50') +
        (className ? ` ${className}` : '')
      }
    >
      <Mic size={12} />
      <span>{escuchando ? 'Grabando' : 'Grabar'}</span>
    </button>
  )
}
