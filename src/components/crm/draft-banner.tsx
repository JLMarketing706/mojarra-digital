'use client'

import { Button } from '@/components/ui/button'
import { History, X, Save } from 'lucide-react'

interface Props {
  hasDraft: boolean
  draftSavedAt: number | null
  onRestore: () => void
  onDiscard: () => void
}

function timeAgo(ts: number): string {
  const seg = Math.floor((Date.now() - ts) / 1000)
  if (seg < 60) return 'hace unos segundos'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  const d = Math.floor(hr / 24)
  return `hace ${d} días`
}

export function DraftBanner({ hasDraft, draftSavedAt, onRestore, onDiscard }: Props) {
  if (!hasDraft) return null
  return (
    <div className="mb-4 p-3 rounded-lg border border-lime-400/30 bg-lime-400/5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-2">
        <History size={16} className="text-lime-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-lime-300 text-sm font-medium">Hay un borrador guardado.</p>
          <p className="text-zinc-400 text-xs">
            Última edición {draftSavedAt ? timeAgo(draftSavedAt) : ''}. ¿Querés continuar donde lo dejaste?
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRestore} size="sm" className="bg-lime-400 text-black hover:bg-lime-300 font-medium gap-1.5">
          <Save size={13} />Recuperar
        </Button>
        <Button onClick={onDiscard} variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-1.5">
          <X size={13} />Descartar
        </Button>
      </div>
    </div>
  )
}

export function DraftSavedIndicator({ savedAt }: { savedAt: number | null }) {
  if (!savedAt) return null
  return (
    <span className="text-xs text-zinc-500 italic">
      ✓ Guardado automáticamente {timeAgo(savedAt)}
    </span>
  )
}
