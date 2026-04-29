'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  AlertTriangle,
  CalendarDays,
  PackageCheck,
  FileSearch,
  Settings,
  ChevronLeft,
  ChevronRight,
  Feather,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/crm/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/crm/clientes', label: 'Clientes', icon: Users },
  { href: '/crm/tramites', label: 'Trámites', icon: FileText },
  { href: '/crm/indice', label: 'Índice Notarial', icon: BookOpen },
  { href: '/crm/uif', label: 'UIF', icon: AlertTriangle },
  { href: '/crm/cumplimiento', label: 'Cumplimiento', icon: ShieldAlert },
  { href: '/crm/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/crm/entregas', label: 'Entregas', icon: PackageCheck },
  { href: '/crm/informes', label: 'Informes Reg.', icon: FileSearch },
]

interface SidebarProps {
  className?: string
}

export function CRMSidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex flex-col bg-[#111111] border-r border-zinc-800 transition-all duration-300 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-zinc-800 shrink-0">
        <Feather className="text-lime-400 shrink-0" size={20} />
        {!collapsed && (
          <span className="ml-2 font-semibold text-white tracking-tight truncate">
            Mojarra Digital
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto crm-scroll">
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-lime-400/10 text-lime-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom links */}
      <div className="border-t border-zinc-800 px-2 py-3 space-y-0.5 shrink-0">
        <Link
          href="/crm/configuracion"
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors',
            pathname.startsWith('/crm/configuracion') && 'bg-lime-400/10 text-lime-400'
          )}
        >
          <Settings size={16} className="shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </Link>

        {/* Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 px-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight size={16} className="shrink-0" />
          ) : (
            <>
              <ChevronLeft size={16} className="shrink-0" />
              <span className="text-xs">Colapsar</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
