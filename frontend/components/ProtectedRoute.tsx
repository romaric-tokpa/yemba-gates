'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  allowedPermissions?: string[]
  redirectTo?: string
  requireAuth?: boolean
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  allowedPermissions,
  redirectTo,
  requireAuth = true,
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { 
    isAuthenticated, 
    isLoading, 
    role, 
    permissions, 
    hasRole, 
    hasAnyRole, 
    hasPermission 
  } = useAuth()
  
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuthorization = async () => {
      // Si l'authentification n'est pas requise, autoriser directement
      if (!requireAuth) {
        setIsAuthorized(true)
        setChecking(false)
        return
      }

      // Attendre que l'authentification soit vérifiée
      if (isLoading) {
        return
      }

      // Si non authentifié, rediriger vers login
      if (!isAuthenticated) {
        const loginPath = redirectTo || '/auth/login'
        router.push(`${loginPath}?redirect=${encodeURIComponent(pathname)}`)
        setChecking(false)
        return
      }

      // Vérifier les rôles si spécifiés
      if (allowedRoles && allowedRoles.length > 0) {
        if (!role || !hasAnyRole(allowedRoles)) {
          // Rediriger vers le dashboard approprié selon le rôle
          const dashboardPath = role === 'administrateur' || role === 'manager' 
            ? '/dashboard/manager'
            : role === 'recruteur' || role === 'recruiter'
            ? '/dashboard/recruiter'
            : role === 'client'
            ? '/dashboard/client'
            : '/auth/choice'
          
          router.push(dashboardPath)
          setChecking(false)
          return
        }
      }

      // Vérifier les permissions si spécifiées
      if (allowedPermissions && allowedPermissions.length > 0) {
        const hasAllPermissions = allowedPermissions.every(perm => hasPermission(perm))
        if (!hasAllPermissions) {
          // Rediriger vers le dashboard avec message d'erreur
          const dashboardPath = role === 'administrateur' || role === 'manager' 
            ? '/dashboard/manager'
            : role === 'recruteur' || role === 'recruiter'
            ? '/dashboard/recruiter'
            : role === 'client'
            ? '/dashboard/client'
            : '/auth/choice'
          
          router.push(dashboardPath)
          setChecking(false)
          return
        }
      }

      // Autoriser l'accès
      setIsAuthorized(true)
      setChecking(false)
    }

    checkAuthorization()
  }, [
    isAuthenticated,
    isLoading,
    role,
    permissions,
    allowedRoles,
    allowedPermissions,
    requireAuth,
    redirectTo,
    pathname,
    router,
    hasAnyRole,
    hasPermission,
  ])

  // Afficher un loader pendant la vérification
  if (checking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F7FA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    )
  }

  // Si non autorisé, ne rien afficher (la redirection est déjà en cours)
  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
