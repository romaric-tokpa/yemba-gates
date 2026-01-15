'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getToken, 
  removeToken, 
  setToken, 
  getUserInfo, 
  setUserInfo as setStoredUserInfo,
  getCurrentUser,
  LoginResponse,
  UserInfo
} from '@/lib/auth'

interface AuthContextType {
  user: UserInfo | null
  role: string | null
  permissions: string[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (response: LoginResponse) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mapping des rôles vers les permissions
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'administrateur': [
    'dashboard.view',
    'dashboard.manager',
    'users.manage',
    'jobs.create',
    'jobs.edit',
    'jobs.delete',
    'jobs.view_all',
    'candidates.view_all',
    'candidates.edit',
    'kpi.view_all',
    'settings.manage',
  ],
  'manager': [
    'dashboard.view',
    'dashboard.manager',
    'jobs.create',
    'jobs.edit',
    'jobs.view_all',
    'candidates.view_all',
    'candidates.edit',
    'kpi.view_all',
    'teams.manage',
    'approvals.manage',
  ],
  'recruteur': [
    'dashboard.view',
    'dashboard.recruiter',
    'jobs.view_assigned',
    'candidates.view_assigned',
    'candidates.create',
    'candidates.edit',
    'interviews.create',
    'interviews.edit',
    'kpi.view_personal',
  ],
  'client': [
    'dashboard.view',
    'dashboard.client',
    'jobs.view_assigned',
    'candidates.view_assigned',
    'interviews.view',
    'shortlist.view',
  ],
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Initialiser l'authentification au chargement
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      const token = getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      // Vérifier les infos utilisateur stockées
      const storedUserInfo = getUserInfo()
      if (storedUserInfo) {
        setRole(storedUserInfo.user_role)
        setPermissions(ROLE_PERMISSIONS[storedUserInfo.user_role] || [])
        
        // Essayer de récupérer les infos complètes depuis l'API
        try {
          const userInfo = await getCurrentUser()
          setUser(userInfo)
        } catch (error) {
          console.warn('Impossible de récupérer les infos utilisateur depuis l\'API', error)
          // Utiliser les infos stockées en fallback
          setUser({
            id: storedUserInfo.user_id,
            email: storedUserInfo.user_email,
            first_name: storedUserInfo.user_name.split(' ')[0] || '',
            last_name: storedUserInfo.user_name.split(' ').slice(1).join(' ') || '',
            role: storedUserInfo.user_role,
            phone: null,
            department: null,
            is_active: true,
          })
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'authentification', error)
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = useCallback(async (response: LoginResponse) => {
    // Sauvegarder le token et les infos
    setToken(response.access_token)
    setStoredUserInfo(response)
    
    // Mettre à jour l'état
    setRole(response.user_role)
    setPermissions(ROLE_PERMISSIONS[response.user_role] || [])
    
    // Récupérer les infos complètes de l'utilisateur
    try {
      const userInfo = await getCurrentUser()
      setUser(userInfo)
    } catch (error) {
      console.warn('Impossible de récupérer les infos complètes', error)
      // Utiliser les infos de base du login
      setUser({
        id: response.user_id,
        email: response.user_email,
        first_name: response.user_name.split(' ')[0] || '',
        last_name: response.user_name.split(' ').slice(1).join(' ') || '',
        role: response.user_role,
        phone: null,
        department: null,
        is_active: true,
      })
    }
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setUser(null)
    setRole(null)
    setPermissions([])
    router.push('/auth/login')
  }, [router])

  const refreshUser = useCallback(async () => {
    try {
      const userInfo = await getCurrentUser()
      setUser(userInfo)
      if (userInfo.role && userInfo.role !== role) {
        setRole(userInfo.role)
        setPermissions(ROLE_PERMISSIONS[userInfo.role] || [])
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement de l\'utilisateur', error)
      if (error instanceof Error && error.message === 'Session expirée') {
        logout()
      }
    }
  }, [role, logout])

  const hasRole = useCallback((checkRole: string) => {
    return role === checkRole
  }, [role])

  const hasAnyRole = useCallback((checkRoles: string[]) => {
    return role ? checkRoles.includes(role) : false
  }, [role])

  const hasPermission = useCallback((permission: string) => {
    return permissions.includes(permission)
  }, [permissions])

  const value: AuthContextType = {
    user,
    role,
    permissions,
    isAuthenticated: !!user && !!getToken(),
    isLoading,
    login,
    logout,
    refreshUser,
    hasRole,
    hasAnyRole,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}
