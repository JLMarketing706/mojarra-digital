'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { X, ChevronDown, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ClienteOpcion {
  id: string
  nombre: string
  apellido: string
  dni?: string | null
  cuil?: string | null
}

interface Props {
  value: string
  onChange: (id: string) => void
  clientes: ClienteOpcion[]
  disabled?: boolean
  placeholder?: string
  /** Altura del trigger. Default 'h-10', podés pasar 'h-9' u otra. */
  triggerHeight?: string
  /** ClassName extra para el trigger. */
  className?: string
}

function labelCliente(c: ClienteOpcion): string {
  const nombre = `${c.apellido}, ${c.nombre}`
  const id = c.dni || c.cuil
  return id ? `${nombre} — ${id}` : nombre
}

function matches(c: ClienteOpcion, q: string): boolean {
  if (!q) return true
  const haystack = [c.nombre, c.apellido, c.dni ?? '', c.cuil ?? '']
    .join(' ').toLowerCase()
  return haystack.includes(q)
}

export function ClienteCombobox({
  value,
  onChange,
  clientes,
  disabled = false,
  placeholder = 'Tipeá nombre, apellido o DNI…',
  triggerHeight = 'h-10',
  className,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const seleccionado = useMemo(
    () => clientes.find(c => c.id === value),
    [clientes, value]
  )

  // Cerrar al clickear afuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const q = query.trim().toLowerCase()
  const sugerencias = useMemo(
    () => clientes.filter(c => matches(c, q)).slice(0, 100),
    [clientes, q]
  )

  function pick(c: ClienteOpcion) {
    onChange(c.id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && sugerencias.length > 0) {
      e.preventDefault()
      pick(sugerencias[0])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 px-3 rounded-md border bg-zinc-800 border-zinc-700 transition-colors',
          triggerHeight,
          open && 'border-lime-400/60 ring-1 ring-lime-400/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => {
          if (disabled) return
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        {seleccionado && !open ? (
          <>
            <User size={14} className="text-lime-400 shrink-0" />
            <span className="flex-1 text-sm text-zinc-100 truncate">
              {labelCliente(seleccionado)}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={clear}
                className="text-zinc-500 hover:text-white shrink-0"
                aria-label="Quitar selección"
              >
                <X size={14} />
              </button>
            )}
          </>
        ) : (
          <>
            <Search size={14} className="text-zinc-500 shrink-0" />
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
              placeholder={seleccionado ? labelCliente(seleccionado) : placeholder}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-zinc-100 placeholder:text-zinc-500"
            />
          </>
        )}
        {!disabled && (
          <ChevronDown
            size={14}
            className={cn(
              'text-zinc-500 shrink-0 transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-md shadow-xl max-h-72 overflow-y-auto">
          {clientes.length === 0 ? (
            <div className="px-3 py-3 text-xs text-zinc-500 text-center">
              No hay clientes cargados todavía.
            </div>
          ) : sugerencias.length === 0 ? (
            <div className="px-3 py-3 text-xs text-zinc-500 text-center">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {q && (
                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                  {sugerencias.length === 100
                    ? 'Mostrando primeros 100 — refiná la búsqueda'
                    : `${sugerencias.length} ${sugerencias.length === 1 ? 'resultado' : 'resultados'}`}
                </div>
              )}
              <ul className="py-1">
                {sugerencias.map((c, i) => {
                  const label = labelCliente(c)
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => pick(c)}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-2',
                          c.id === value && 'bg-lime-400/10 text-lime-300',
                          i === 0 && q && c.id !== value && 'bg-zinc-800/50'
                        )}
                      >
                        <User size={12} className="text-zinc-500 shrink-0" />
                        <span className="flex-1 truncate">
                          {q ? <Highlight text={label} q={q} /> : label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

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
