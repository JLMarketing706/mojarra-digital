'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react'

interface Mensaje { role: 'user' | 'assistant'; content: string }

const SUGERENCIAS = [
  '¿Cuál es el umbral SMVM para compraventa?',
  '¿Qué documentación pide la UIF para PEP?',
  '¿Cómo genero una DDJJ de origen de fondos?',
  'Diferencia entre SA, SRL y SAS',
]

export function AsistenteWidget() {
  const [abierto, setAbierto] = useState(false)
  const [input, setInput] = useState('')
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [enviando, setEnviando] = useState(false)
  const [uso, setUso] = useState<number | null>(null)
  const [limite, setLimite] = useState<number>(50)
  const [agotado, setAgotado] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensajes, enviando])

  async function enviar(texto?: string) {
    const t = (texto ?? input).trim()
    if (!t || enviando || agotado) return
    setInput('')
    const nuevos: Mensaje[] = [...mensajes, { role: 'user', content: t }]
    setMensajes(nuevos)
    setEnviando(true)
    try {
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajes: nuevos }),
      })
      const json = await res.json() as {
        respuesta?: string; error?: string;
        uso?: number; limite?: number; limiteAlcanzado?: boolean
      }
      if (json.uso !== undefined) setUso(json.uso)
      if (json.limite !== undefined) setLimite(json.limite)
      if (json.limiteAlcanzado) setAgotado(true)
      if (!res.ok) {
        setMensajes(prev => [...prev, { role: 'assistant', content: `⚠ ${json.error ?? 'Error al conectar.'}` }])
      } else {
        setMensajes(prev => [...prev, { role: 'assistant', content: json.respuesta ?? '' }])
      }
    } catch {
      setMensajes(prev => [...prev, { role: 'assistant', content: '⚠ No se pudo conectar con el asistente.' }])
    } finally {
      setEnviando(false)
    }
  }

  function limpiar() {
    setMensajes([])
    setInput('')
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setAbierto(true)}
        className={`fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-lime-400 text-black shadow-lg hover:bg-lime-300 transition-all flex items-center justify-center ${
          abierto ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        aria-label="Abrir asistente"
      >
        <Bot size={20} />
      </button>

      {/* Panel chat */}
      {abierto && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-2rem)] rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-lime-400/20 flex items-center justify-center">
                <Sparkles size={13} className="text-lime-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Asistente Mojarra</p>
                <p className="text-xs text-zinc-500">Notarial · UIF · Sistema</p>
              </div>
            </div>
            <div className="flex gap-1">
              {mensajes.length > 0 && (
                <Button
                  variant="ghost" size="sm"
                  onClick={limpiar}
                  className="h-7 text-xs text-zinc-400 hover:text-white"
                >
                  Limpiar
                </Button>
              )}
              <Button
                variant="ghost" size="sm"
                onClick={() => setAbierto(false)}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3 bg-zinc-950">
            {mensajes.length === 0 ? (
              <div className="space-y-3">
                <div className="text-center py-2">
                  <Bot size={32} className="text-lime-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-300 font-medium">¡Hola! Soy tu asistente.</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Preguntame sobre normativa UIF, operaciones notariales o cómo usar el sistema.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {SUGERENCIAS.map(s => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      className="w-full text-left p-2 rounded-md text-xs text-zinc-300 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mensajes.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-lime-400 text-black'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {enviando && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-lime-400" />
                  <span className="text-xs text-zinc-400">Pensando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Banner de límite alcanzado */}
          {agotado && (
            <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/30 text-red-300 text-xs">
              Ya usaste tus {limite} consultas de hoy. El contador se reinicia mañana.
            </div>
          )}

          {/* Input */}
          <div className="border-t border-zinc-800 p-2 bg-zinc-900">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                placeholder={agotado ? 'Límite diario alcanzado' : 'Hacé tu pregunta...'}
                disabled={enviando || agotado}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-lime-400 disabled:opacity-50"
              />
              <Button
                onClick={() => enviar()}
                disabled={!input.trim() || enviando || agotado}
                size="sm"
                className="bg-lime-400 text-black hover:bg-lime-300 h-9 w-9 p-0 shrink-0 disabled:opacity-50"
              >
                <Send size={14} />
              </Button>
            </div>
            {uso !== null && !agotado && (
              <p className="text-xs text-zinc-500 mt-1.5 text-right">
                {uso}/{limite} consultas hoy
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
