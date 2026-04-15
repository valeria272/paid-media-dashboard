// ═══ Middleware de routing ═══
// Cuando CLIENT_MODE=mascenter (solo en el segundo proyecto Vercel),
// bloquea el dashboard interno y expone únicamente la vista del cliente.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const clientMode = process.env.CLIENT_MODE
  const { pathname } = request.nextUrl

  if (clientMode === 'mascenter') {
    // Rutas permitidas: página cliente + sus APIs
    const allowed =
      pathname.startsWith('/social/mas-center/cliente') ||
      pathname.startsWith('/api/social/mas-center') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon')

    if (allowed) return NextResponse.next()

    // Todo lo demás → redirige a la vista cliente
    return NextResponse.redirect(new URL('/social/mas-center/cliente', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
