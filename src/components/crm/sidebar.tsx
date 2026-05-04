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
  Crown,
  ClipboardList,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/crm/dashboard', label: 'Panel de control', icon: LayoutDashboard },
  { href: '/crm/clientes', label: 'Clientes', icon: Users },
  { href: '/crm/tramites', label: 'Operaciones', icon: FileText },
  { href: '/crm/gestion-registral', label: 'Gestión Registral', icon: ClipboardList },
  { href: '/crm/indice', label: 'Índice Notarial', icon: BookOpen },
  { href: '/crm/uif', label: 'UIF', icon: AlertTriangle },
  { href: '/crm/cumplimiento', label: 'Cumplimiento', icon: ShieldAlert },
  { href: '/crm/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/crm/entregas', label: 'Entregas', icon: PackageCheck },
  { href: '/crm/informes', label: 'Informes Reg.', icon: FileSearch },
]

interface SidebarProps {
  className?: string
  esSuperAdmin?: boolean
  /** Si true, el drawer mobile está abierto (solo afecta < md) */
  mobileOpen?: boolean
  /** Callback para cerrar el drawer en mobile */
  onMobileClose?: () => void
}

export function CRMSidebar({
  className,
  esSuperAdmin = false,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  // Collapsed solo aplica en desktop (>= md). En mobile siempre se ve completo
  // cuando el drawer está abierto.
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        // Base
        'flex flex-col bg-[#111111] border-r border-zinc-800 transition-transform duration-300 h-screen z-50',
        // Mobile (< md): drawer fijo a la izquierda. Slide in/out con transform.
        'fixed inset-y-0 left-0 w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop (>= md): siempre visible, sticky, ancho según collapsed
        'md:sticky md:top-0 md:translate-x-0 md:transition-[width]',
        collapsed ? 'md:w-16' : 'md:w-60',
        className
      )}
    >
      {/* Logo + botón cerrar (solo mobile) */}
      <div className="flex items-center h-14 px-4 border-b border-zinc-800 shrink-0">
        <Feather className="text-lime-400 shrink-0" size={20} />
        <span
          className={cn(
            'ml-2 font-semibold text-white tracking-tight truncate',
            // Desktop colapsado: ocultar el texto
            collapsed && 'md:hidden'
          )}
        >
          Mojarra Digital
        </span>
        {/* Botón cerrar — solo visible en mobile */}
        <button
          type="button"
          onClick={onMobileClose}
          className="md:hidden ml-auto text-zinc-400 hover:text-white p-1 -mr-1"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
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
                  <span className={cn('truncate', collapsed && 'md:hidden')}>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom links */}
      <div className="border-t border-zinc-800 px-2 py-3 space-y-0.5 shrink-0">
        {esSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
              'text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300'
            )}
            title="Panel de Super Admin"
          >
            <Crown size={16} className="shrink-0" />
            <span className={cn(collapsed && 'md:hidden')}>Admin (SaaS)</span>
          </Link>
        )}

        <Link
          href="/crm/configuracion"
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors',
            pathname.startsWith('/crm/configuracion') && 'bg-lime-400/10 text-lime-400'
          )}
        >
          <Settings size={16} className="shrink-0" />
          <span className={cn(collapsed && 'md:hidden')}>Configuración</span>
        </Link>

        {/* Toggle ancho del sidebar — solo en desktop */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex w-full justify-center px-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menú' : 'Achicar menú'}
        >
          {collapsed
            ? <ChevronRight size={16} className="shrink-0" />
            : <ChevronLeft size={16} className="shrink-0" />}
        </Button>
      </div>
    </aside>
  )
}
