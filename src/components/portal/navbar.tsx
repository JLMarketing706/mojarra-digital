'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Feather, Bell, User, LogOut, LayoutDashboard, FileText } from 'lucide-react'
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

const navLinks = [
  { href: '/portal/dashboard', label: 'Mis operaciones', icon: LayoutDashboard },
  { href: '/portal/tramites', label: 'Documentos', icon: FileText },
]

interface PortalNavbarProps {
  profile: Profile | null
  userId: string
}

export function PortalNavbar({ profile, userId }: PortalNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { sinLeer } = useRealtimeNotificaciones(userId)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const iniciales = profile
    ? `${profile.nombre[0]}${profile.apellido[0]}`.toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-4">
        {/* Logo */}
        <Link href="/portal/dashboard" className="flex items-center gap-2">
          <Feather className="text-lime-500" size={18} />
          <span className="font-semibold text-sm tracking-tight">Mojarra Digital</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'text-lime-500 bg-lime-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <Link href="/portal/notificaciones">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={18} />
              {sinLeer > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-lime-500 rounded-full" />
              )}
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-muted text-xs">{iniciales}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {profile && (
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile.nombre}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/portal/perfil">
                  <User size={14} className="mr-2" />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                <LogOut size={14} className="mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
