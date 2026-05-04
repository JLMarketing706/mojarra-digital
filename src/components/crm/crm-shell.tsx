'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { CRMSidebar } from './sidebar'
import { CRMTopbar } from './topbar'
import { TrialBanner } from './trial-banner'
import { CRMFooter } from './footer'
import { AsistenteWidget } from './asistente-widget'
import type { Profile } from '@/types'

interface Props {
  children: React.ReactNode
  profile: Profile | null
  userId: string
  esSuperAdmin: boolean
  estadoEscribania: string | null
  trialUntil: string | null
}

export function CRMShell({
  children, profile, userId, esSuperAdmin, estadoEscribania, trialUntil,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar el drawer mobile al cambiar de página
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="dark flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Backdrop solo visible en mobile cuando el drawer está abierto */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <CRMSidebar
        esSuperAdmin={esSuperAdmin}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <CRMTopbar
          profile={profile}
          userId={userId}
          onMobileMenuToggle={() => setMobileOpen(p => !p)}
        />
        {estadoEscribania && (
          <TrialBanner estado={estadoEscribania} trialUntil={trialUntil} />
        )}
        <main className="flex-1 overflow-y-auto crm-scroll">
          <div className="p-3 sm:p-4 md:p-6">{children}</div>
          <CRMFooter />
        </main>
      </div>

      <AsistenteWidget />
    </div>
  )
}
