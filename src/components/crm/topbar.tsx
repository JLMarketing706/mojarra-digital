'use client'

import Link from 'next/link'
import { Bell, LogOut, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import { useRealtimeNotificaciones } from '@/hooks/use-realtime-notificaciones'

interface TopbarProps {
  profile: Profile | null
  userId: string
  /** Toggle del drawer mobile (solo visible < md) */
  onMobileMenuToggle?: () => void
}

export function CRMTopbar({ profile, userId, onMobileMenuToggle }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const { sinLeer } = useRealtimeNotificaciones(userId)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const iniciales = profile
    ? `${profile.nombre[0]}${profile.apellido[0]}`.toUpperCase()
    : '?'

  return (
    <header className="h-14 border-b border-zinc-800 bg-[#111111] flex items-center px-3 sm:px-6 gap-2 sm:gap-3 shrink-0">
      {/* Hamburger — solo mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-zinc-400 hover:text-white -ml-1"
        onClick={onMobileMenuToggle}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </Button>

      <div className="flex-1" />

      {/* Campana de notificaciones */}
      <Link href="/crm/notificaciones">
        <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white">
          <Bell size={18} />
          {sinLeer > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-lime-400 rounded-full" />
          )}
        </Button>
      </Link>

      {/* Avatar + menú */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-zinc-700 text-zinc-200 text-xs">
                {iniciales}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-700">
          {profile && (
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-zinc-100">
                {profile.nombre} {profile.apellido}
              </p>
              <p className="text-xs text-zinc-500 capitalize">{profile.rol}</p>
            </div>
          )}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem asChild className="text-zinc-300 hover:text-white focus:bg-zinc-800">
            <Link href="/crm/perfil">
              <User size={14} className="mr-2" />
              Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 focus:bg-zinc-800 cursor-pointer"
          >
            <LogOut size={14} className="mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
