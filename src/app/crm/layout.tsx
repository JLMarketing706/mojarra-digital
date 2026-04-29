import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CRMSidebar } from '@/components/crm/sidebar'
import { CRMTopbar } from '@/components/crm/topbar'
import type { Profile } from '@/types'

const ROLES_STAFF = [
  'escribano_titular', 'oficial_cumplimiento', 'escribano_adscripto', 'empleado_admin',
  'secretaria', 'protocolista', 'escribano',
]

export default async function CRMLayout({
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

  if (!profile || !ROLES_STAFF.includes(profile.rol)) {
    redirect('/portal/dashboard')
  }

  // ¿Es super admin?
  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  const esSuperAdmin = !!superAdmin

  return (
    <div className="dark flex h-screen bg-[#0a0a0a] overflow-hidden">
      <CRMSidebar esSuperAdmin={esSuperAdmin} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <CRMTopbar
          profile={profile as Profile}
          userId={user.id}
        />
        <main className="flex-1 overflow-y-auto p-6 crm-scroll">
          {children}
        </main>
      </div>
    </div>
  )
}
