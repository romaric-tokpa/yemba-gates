import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes protégées qui nécessitent une authentification
const PROTECTED_ROUTES = [
  '/admin',
  '/admin-secure', // Route admin sécurisée avec authentification renforcée
  '/manager',
  '/recruiter',
  '/client',
]

// Routes admin sécurisées nécessitant une vérification supplémentaire
const ADMIN_SECURE_ROUTES = [
  '/admin-secure',
]

// Routes publiques (accessibles sans authentification)
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/login', // Legacy - redirige vers /auth/login
]

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Autoriser TOUTES les requêtes vers l'API, fichiers statiques et _next
  if (
    pathname.startsWith('/_next') || 
    pathname.includes('.') || 
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/uploads')
  ) {
    return NextResponse.next()
  }

  // Redirection legacy : /login -> /auth/login
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Autoriser l'accès à la page de login admin sécurisée sans authentification
  if (pathname === '/admin-secure/login' || pathname.startsWith('/admin-secure/login')) {
    return NextResponse.next()
  }

  // Vérifier si la route est protégée
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAdminSecureRoute = ADMIN_SECURE_ROUTES.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute && !token) {
    // Pour les routes admin sécurisées (sauf le login), rediriger vers la page de login admin sécurisée
    if (isAdminSecureRoute) {
      console.log(`[Middleware] Route admin sécurisée: ${pathname}, Token absent - Redirection vers /admin-secure/login`)
      return NextResponse.redirect(new URL('/admin-secure/login', request.url))
    }
    // Pour les autres routes protégées, rediriger vers le choix de profil
    console.log(`[Middleware] Route protégée: ${pathname}, Token absent - Redirection vers /auth/choice`)
    return NextResponse.redirect(new URL('/auth/choice', request.url))
  }

  // Log pour debug (peut être retiré en production)
  if (isProtectedRoute && token) {
    console.log(`[Middleware] Route protégée: ${pathname}, Token présent: ${!!token}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
