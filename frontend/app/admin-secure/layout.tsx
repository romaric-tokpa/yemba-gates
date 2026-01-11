'use client'

import AdminSidebar from '@/components/sidebars/AdminSidebar'
import NotificationCenter from '@/components/NotificationCenter'
import { getUserRole, isAuthenticated } from '@/lib/auth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminSecureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Ne pas vérifier l'authentification sur la page de login
    if (pathname === '/admin-secure/login' || pathname?.startsWith('/admin-secure/login')) {
      setIsAuthorized(true)
      setIsLoading(false)
      return
    }

    const checkAuth = () => {
      // Vérifier l'authentification
      if (!isAuthenticated()) {
        router.push('/admin-secure/login')
        return
      }

      // Vérifier que l'utilisateur est bien un administrateur
      const userRole = getUserRole()
      if (userRole !== 'administrateur' && userRole !== 'admin') {
        router.push('/auth/choice')
        return
      }

      setIsAuthorized(true)
      setIsLoading(false)
    }

    checkAuth()
  }, [router, pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Vérification des autorisations...</p>
        </div>
      </div>
    )
  }

  // Ne pas afficher le layout admin sur la page de login
  if (pathname === '/admin-secure/login' || pathname?.startsWith('/admin-secure/login')) {
    return <>{children}</>
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0 pt-14 sm:pt-16 lg:pt-0 relative min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b-2 border-red-200 px-3 sm:px-4 lg:px-8 py-2 sm:py-3 lg:py-4 flex items-center justify-between sm:justify-end">
          <div className="lg:hidden flex-1"></div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Mode Sécurisé</span>
            </div>
            <NotificationCenter />
          </div>
        </header>
        <div className="p-3 sm:p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
