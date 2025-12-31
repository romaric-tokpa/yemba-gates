import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Log pour debug (peut être retiré en production)
  if (pathname.startsWith('/admin') || pathname.startsWith('/manager') || pathname.startsWith('/recruiter') || pathname.startsWith('/client')) {
    console.log(`[Middleware] Route protégée: ${pathname}, Token présent: ${!!token}`)
  }

  // Autoriser TOUTES les requêtes vers l'API et les fichiers statiques
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Rediriger vers login si accès à une page protégée sans token
  const roles = ['/admin', '/manager', '/recruiter', '/client']
  if (roles.some(role => pathname.startsWith(role)) && !token) {
    return NextResponse.redirect(new URL('/auth/choice', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
