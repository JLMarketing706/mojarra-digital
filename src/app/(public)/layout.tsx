'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Feather, Menu, X, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = [
    { href: '#producto', label: 'Producto' },
    { href: '#funciones', label: 'Funciones' },
    { href: '#precios', label: 'Precios' },
    { href: '#testimonios', label: 'Clientes' },
  ]

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-zinc-800/80'
        : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center">
            <Feather size={16} className="text-black" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-white text-sm tracking-tight">Mojarra Digital</span>
            <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Software notarial</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          {links.map(({ href, label }) => (
            <a key={href} href={href}
              className="text-zinc-400 hover:text-white transition-colors duration-200 font-medium">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/solicitar-demo">
            <Button size="sm" className="bg-lime-400 text-black hover:bg-lime-300 font-semibold px-5">
              Solicitar demo
            </Button>
          </Link>
        </div>

        <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setOpen(v => !v)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0a0a0a] border-t border-zinc-800 px-6 py-4 space-y-3">
          {links.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setOpen(false)}
              className="block text-zinc-300 hover:text-white py-1 font-medium">
              {label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300">Iniciar sesión</Button>
            </Link>
            <Link href="/solicitar-demo" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full bg-lime-400 text-black font-semibold">Solicitar demo</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {children}

      <footer id="contacto" className="border-t border-zinc-800 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center">
                  <Feather size={16} className="text-black" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-white text-sm">Mojarra Digital</span>
                  <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Software notarial</span>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                El sistema de gestión integral diseñado para escribanías argentinas.
                Modernizá tu estudio, ahorrá horas de trabajo y mejorá la experiencia
                de tus clientes.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><a href="#funciones" className="hover:text-white transition-colors">Funciones</a></li>
                <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#testimonios" className="hover:text-white transition-colors">Clientes</a></li>
                <li><Link href="/solicitar-demo" className="hover:text-white transition-colors">Solicitar demo</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Contacto</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-lime-400 shrink-0" />
                  <span>hola@mojarradigital.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-lime-400 shrink-0" />
                  <span>+54 9 11 5863-7931</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
            <p>© {new Date().getFullYear()} Mojarra Digital. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-zinc-400">Términos</a>
              <a href="#" className="hover:text-zinc-400">Privacidad</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
