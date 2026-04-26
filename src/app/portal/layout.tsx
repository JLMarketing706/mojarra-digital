import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalNavbar } from '@/components/portal/navbar'
import type { Profile } from '@/types'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Si es staff, redirigir al CRM
  const rolesStaff = ['secretaria', 'protocolista', 'escribano']
  if (profile && rolesStaff.includes(profile.rol)) {
    redirect('/crm/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalNavbar
        profile={profile as Profile}
        userId={user.id}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
