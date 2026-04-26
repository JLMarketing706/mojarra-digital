'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  config: Record<string, string>
}

export function IndiceExportButton({ config }: Props) {
  const [loading, setLoading] = useState(false)
  const anioActual = new Date().getFullYear()
  const anios = [anioActual, anioActual - 1, anioActual - 2]

  async function exportar(anio: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/indice/pdf?anio=${anio}`)
      if (!res.ok) { toast.error('Error al generar el PDF.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `indice-notarial-${anio}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Índice ${anio} descargado.`)
    } catch {
      toast.error('Error al generar el PDF.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : <Download size={14} />
          }
          Exportar PDF
          <ChevronDown size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
        {anios.map(a => (
          <DropdownMenuItem
            key={a}
            onClick={() => exportar(a)}
            className="text-zinc-200 focus:bg-zinc-800 cursor-pointer"
          >
            <Download size={13} className="mr-2 text-zinc-500" />
            Índice {a}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
