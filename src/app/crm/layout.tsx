import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CRMShell } from '@/components/crm/crm-shell'
import { ROLES_STAFF, type Profile } from '@/types'

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
    // El portal del cliente final fue removido. Si alguien sin rol de staff
    // intenta entrar al CRM, lo mandamos al login.
    redirect('/login')
  }

  // ¿Es super admin?
  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  const esSuperAdmin = !!superAdmin

  // Estado de la escribanía para el banner de trial
  let estadoEscribania: string | null = null
  let trialUntil: string | null = null
  if (profile.escribania_id) {
    const { data: escribania } = await supabase
      .from('escribanias')
      .select('estado, trial_until')
      .eq('id', profile.escribania_id)
      .single()
    estadoEscribania = escribania?.estado ?? null
    trialUntil = escribania?.trial_until ?? null
  }

  return (
    <CRMShell
      profile={profile as Profile}
      userId={user.id}
      esSuperAdmin={esSuperAdmin}
      estadoEscribania={estadoEscribania}
      trialUntil={trialUntil}
    >
      {children}
    </CRMShell>
  )
}
