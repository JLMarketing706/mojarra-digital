import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList, Construction } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Gestión Registral' }

export default function GestionRegistralPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <ClipboardList size={24} className="text-lime-400" />
          Gestión Registral
        </h1>
        <p className="text-zinc-400 text-sm">
          Solicitudes de informes, inscripciones y trámites en registros públicos.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Construction size={48} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-200 mb-2">Próximamente</h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            En esta sección vas a poder gestionar solicitudes de informe de dominio,
            inhibición, inscripciones registrales, segundos testimonios y cancelaciones de hipoteca.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
