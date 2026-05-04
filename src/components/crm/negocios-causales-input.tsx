'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { X, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  options: string[]
  disabled?: boolean
  placeholder?: string
}

export function NegociosCausalesInput({
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cerrar al clickear afuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Filtrar sugerencias: las que matchean el query y no están ya seleccionadas
  const q = query.trim().toLowerCase()
  const sugerencias = options.filter(opt => {
    if (value.includes(opt)) return false
    if (!q) return true
    return opt.toLowerCase().includes(q)
  })

  function add(causal: string) {
    if (!value.includes(causal)) onChange([...value, causal])
    setQuery('')
    inputRef.current?.focus()
  }

  function remove(causal: string) {
    onChange(value.filter(v => v !== causal))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && query === '' && value.length > 0) {
      // Backspace en input vacío: borrar último chip
      remove(value[value.length - 1])
    } else if (e.key === 'Enter' && sugerencias.length > 0) {
      e.preventDefault()
      add(sugerencias[0])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Caja de chips + input */}
      <div
        className={cn(
          'flex flex-wrap gap-1.5 min-h-10 px-3 py-1.5 rounded-md border bg-zinc-900 border-zinc-700 transition-colors',
          open && 'border-lime-400/50 ring-1 ring-lime-400/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => {
          if (disabled) return
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        {value.map(v => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-lime-400/15 border border-lime-400/40 text-lime-300 text-xs font-medium px-2 py-0.5 rounded"
          >
            {v}
            {!disabled && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  remove(v)
                }}
                className="hover:text-white"
                aria-label={`Quitar ${v}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={
            value.length === 0
              ? placeholder ?? 'Tipeá o seleccioná negocios causales…'
              : ''
          }
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-zinc-100 placeholder:text-zinc-500"
        />
        {!disabled && (
          <ChevronDown
            size={16}
            className={cn(
              'text-zinc-500 self-center transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-md shadow-xl max-h-64 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500">
              Elegí primero un Tipo de acto
            </div>
          ) : sugerencias.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500 flex items-center gap-2">
              <Search size={12} />
              {q
                ? `Sin resultados para "${query}"`
                : 'Ya seleccionaste todas las causales disponibles'}
            </div>
          ) : (
            <ul className="py-1">
              {sugerencias.map((opt, i) => (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => add(opt)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors',
                      i === 0 && q && 'bg-zinc-800/50' // resalto el primero si hay query (Enter lo selecciona)
                    )}
                  >
                    {q ? <Highlight text={opt} q={q} /> : opt}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// Subrayado de la parte que matchea
function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q)
  if (i === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span className="text-lime-400 font-medium">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  )
}
