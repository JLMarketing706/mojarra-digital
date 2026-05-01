import { Feather, ShieldCheck } from 'lucide-react'

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0'

export function CRMFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-10 border-t border-zinc-800/80 bg-[#0a0a0a]">
      <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-lime-400 flex items-center justify-center">
            <Feather size={11} className="text-black" />
          </div>
          <span className="text-zinc-400">Mojarra Digital</span>
          <span className="text-zinc-600">·</span>
          <span>© {year}</span>
          <span className="text-zinc-700">v{APP_VERSION}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-lime-400" />
            UIF Res. 242/2023, 56/2024 y 78/2025
          </span>
          <a
            href="mailto:hola@mojarradigital.com"
            className="hover:text-zinc-300 transition-colors hidden sm:inline"
          >
            hola@mojarradigital.com
          </a>
        </div>
      </div>
    </footer>
  )
}
