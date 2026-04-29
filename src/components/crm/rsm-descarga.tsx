'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Loader2, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

const MESES = [
  { v: 1, label: 'Enero' }, { v: 2, label: 'Febrero' }, { v: 3, label: 'Marzo' },
  { v: 4, label: 'Abril' }, { v: 5, label: 'Mayo' }, { v: 6, label: 'Junio' },
  { v: 7, label: 'Julio' }, { v: 8, label: 'Agosto' }, { v: 9, label: 'Septiembre' },
  { v: 10, label: 'Octubre' }, { v: 11, label: 'Noviembre' }, { v: 12, label: 'Diciembre' },
]

export function RSMDescarga() {
  const ahora = new Date()
  // Por defecto, el mes anterior (que es el que se reporta)
  const mesPrevio = ahora.getMonth() === 0 ? 12 : ahora.getMonth()
  const anioPrevio = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear()

  const [anio, setAnio] = useState(anioPrevio)
  const [mes, setMes] = useState(mesPrevio)
  const [loading, setLoading] = useState(false)

  const aniosDisponibles = Array.from(
    { length: 5 },
    (_, i) => ahora.getFullYear() - i,
  )

  async function descargar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/uif/rsm?anio=${anio}&mes=${mes}`)
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        toast.error(j.error ?? 'No se pudo generar el RSM')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RSM_${anio}-${String(mes).padStart(2, '0')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('RSM descargado')
    } catch {
      toast.error('Error al descargar el RSM')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
          <FileSpreadsheet size={18} className="text-lime-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">Reporte Sistemático Mensual (RSM)</h3>
          <p className="text-zinc-400 text-xs mt-0.5">
            Genera CSV con las operaciones del mes que disparan obligación UIF.
            Vence el día 15 del mes siguiente — Res. 70/2011 + 242/2023.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {MESES.map(m => (
              <SelectItem key={m.v} value={String(m.v)} className="text-zinc-200 focus:bg-zinc-800">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(anio)} onValueChange={v => setAnio(Number(v))}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:ring-lime-400 sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {aniosDisponibles.map(a => (
              <SelectItem key={a} value={String(a)} className="text-zinc-200 focus:bg-zinc-800">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={descargar} disabled={loading}
          className="bg-lime-400 text-black hover:bg-lime-300 font-semibold gap-2 sm:ml-auto">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Descargar CSV
        </Button>
      </div>
    </div>
  )
}
