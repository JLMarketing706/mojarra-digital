import { Card, CardContent } from '@/components/ui/card'
import { FileSignature, Construction } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Certificaciones' }

export default function CertificacionesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
          <FileSignature size={24} className="text-lime-400" />
          Certificaciones
        </h1>
        <p className="text-zinc-400 text-sm">
          Certificaciones de firmas, de fotocopias y demás certificaciones notariales.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Construction size={48} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-200 mb-2">Próximamente</h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            En esta sección vas a poder gestionar certificaciones de firmas,
            de fotocopias, contratos de alquiler y otros actos certificatorios
            — separados del registro de escrituras del protocolo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
