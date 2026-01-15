'use client'

import { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import NotificationCenter from '@/components/NotificationCenter'
import { useAuth } from '@/context/AuthContext'

interface DashboardLayoutProps {
  children: ReactNode
  allowedRoles?: string[]
}

export default function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, role, user, hasAnyRole } = useAuth()

  // Vérification des rôles si spécifiés
  if (!isLoading && allowedRoles && allowedRoles.length > 0) {
    if (!isAuthenticated || !role || !hasAnyRole(allowedRoles)) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold text-[#1F2A44] mb-2">Accès non autorisé</h2>
            <p className="text-gray-600 mb-4">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
            <a
              href="/dashboard/manager"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Retour au dashboard
            </a>
          </div>
        </div>
      )
    }
  }

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }

  return (
    <div className="flex h-screen bg-[#F5F7FA] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header avec notifications et profil */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm lg:hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-end">
              <NotificationCenter />
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto pt-0 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
