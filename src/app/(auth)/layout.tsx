import Link from 'next/link'
import { Feather } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Feather className="text-lime-400" size={20} />
        <span className="font-semibold text-white tracking-tight">Mojarra Digital</span>
      </Link>
      {children}
    </div>
  )
}
