import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const ROLES_STAFF = ['secretaria', 'protocolista', 'escribano']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Rutas del CRM: solo staff
  if (pathname.startsWith('/crm')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar rol del usuario en la tabla profiles
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!profile || !ROLES_STAFF.includes(profile.rol)) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    }
  }

  // Rutas del portal: solo clientes autenticados
  if (pathname.startsWith('/portal')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Si ya está logueado, redirigir desde login/registro al destino correcto
  if ((pathname === '/login' || pathname === '/registro') && user) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile && ROLES_STAFF.includes(profile.rol)) {
      return NextResponse.redirect(new URL('/crm/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/portal/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
