import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Stamp, Building, Calendar, Settings, Users, Shield } from 'lucide-react'
import { LABEL_ROL, type Rol } from '@/types'
import { formatFecha } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mi perfil' }

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, escribania:escribanias(razon_social, nombre_fantasia)')
    .eq('id', user.id)
    .single()

  const p = profile as (
    & { id: string; nombre: string; apellido: string; email: string; rol: Rol; created_at: string; activo: boolean }
    & { telefono?: string | null; registros_notariales?: string[] | null; escribania_id?: string | null }
    & { escribania?: { razon_social?: string; nombre_fantasia?: string } | null }
  ) | null

  if (!p) redirect('/login')

  const iniciales = `${p.nombre[0] ?? ''}${p.apellido[0] ?? ''}`.toUpperCase()
  const escribania = p.escribania?.nombre_fantasia || p.escribania?.razon_social || null

  const { data: superAdmin } = await supabase
    .from('super_admins').select('profile_id').eq('profile_id', user.id).maybeSingle()
  const esSuperAdmin = !!superAdmin

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <User size={20} className="text-zinc-400" />
        <h1 className="text-2xl font-semibold text-white">Mi perfil</h1>
      </div>

      {/* Identidad */}
      <Card className="bg-zinc-900 border-zinc-800 mb-4">
        <CardContent className="p-5 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-lime-400/15 text-lime-400 text-xl font-semibold">
              {iniciales || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-lg font-semibold truncate">
              {p.nombre} {p.apellido}
            </p>
            <p className="text-zinc-500 text-sm flex items-center gap-1.5 truncate">
              <Mail size={12} /> {p.email}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700">
                {LABEL_ROL[p.rol] ?? p.rol}
              </Badge>
              {esSuperAdmin && (
                <Badge className="text-xs bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 gap-1">
                  <Shield size={10} /> Super admin
                </Badge>
              )}
              {!p.activo && (
                <Badge className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Inactivo
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos */}
      <Card className="bg-zinc-900 border-zinc-800 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {escribania && (
            <Row label="Escribanía" value={escribania} icon={<Building size={13} className="text-zinc-500" />} />
          )}
          {p.telefono && (
            <Row label="Teléfono" value={p.telefono} />
          )}
          <Row label="Miembro desde" value={formatFecha(p.created_at)} icon={<Calendar size={13} className="text-zinc-500" />} />
        </CardContent>
      </Card>

      {/* Registros notariales (si tiene) */}
      {p.registros_notariales && p.registros_notariales.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Stamp size={13} className="text-lime-400" />
              Registros notariales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {p.registros_notariales.map(r => (
                <span key={r} className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-1 rounded">
                  {r}
                </span>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Para editar tus registros, pedile al titular de tu escribanía que
              los actualice desde Configuración → Equipo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Atajos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/crm/configuracion">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-lime-400/30 transition-colors cursor-pointer">
            <CardContent className="p-3 flex items-center gap-3">
              <Settings size={16} className="text-lime-400" />
              <div>
                <p className="text-zinc-200 text-sm font-medium">Configuración</p>
                <p className="text-zinc-500 text-xs">Datos de la escribanía</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/crm/configuracion/equipo">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-lime-400/30 transition-colors cursor-pointer">
            <CardContent className="p-3 flex items-center gap-3">
              <Users size={16} className="text-lime-400" />
              <div>
                <p className="text-zinc-200 text-sm font-medium">Gestionar equipo</p>
                <p className="text-zinc-500 text-xs">Invitar y administrar miembros</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        {esSuperAdmin && (
          <Link href="/admin">
            <Card className="bg-zinc-900 border-yellow-500/30 hover:border-yellow-400/60 transition-colors cursor-pointer">
              <CardContent className="p-3 flex items-center gap-3">
                <Shield size={16} className="text-yellow-400" />
                <div>
                  <p className="text-zinc-200 text-sm font-medium">Admin SaaS</p>
                  <p className="text-zinc-500 text-xs">Panel super-admin</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-zinc-500 text-xs uppercase tracking-wider w-32 shrink-0 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-zinc-200 truncate">{value}</span>
    </div>
  )
}
