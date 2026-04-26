'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useCallback, useTransition } from 'react'

export function IndiceSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    startTransition(() => {
      if (val) {
        router.push(`${pathname}?q=${encodeURIComponent(val)}`)
      } else {
        router.push(pathname)
      }
    })
  }, [router, pathname])

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
      <Input
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder="Buscar por número, tipo de acto, partes, inmueble..."
        className="pl-9 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400"
      />
    </div>
  )
}
