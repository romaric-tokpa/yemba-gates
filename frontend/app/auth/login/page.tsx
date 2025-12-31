'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { login } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { ArrowLeft } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  recruteur: 'Recruteur',
  manager: 'Manager',
  client: 'Client',
  administrateur: 'Administrateur',
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error: showError } = useToastContext()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    // IMPORTANT: Ne rediriger QUE si on est sûr que l'utilisateur est vraiment connecté
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const userInfo = typeof window !== 'undefined' ? localStorage.getItem('user_info') : null
    
    // Vérifier que le token existe ET que les infos utilisateur sont complètes
    if (token && userInfo) {
      try {
        const user = JSON.parse(userInfo)
        const userRole = user.user_role?.toLowerCase()
        
        // Ne rediriger QUE si le rôle est valide et que le token semble valide
        // Vérifier que le token a au moins 3 parties (JWT standard)
        const tokenParts = token.split('.')
        if (tokenParts.length === 3 && userRole) {
          let dashboardPath = '/auth/choice'
          if (userRole === 'admin' || userRole === 'administrateur') {
            dashboardPath = '/admin'
          } else if (userRole === 'manager') {
            dashboardPath = '/manager'
          } else if (userRole === 'recruteur' || userRole === 'recruiter') {
            dashboardPath = '/recruiter'
          } else if (userRole === 'client') {
            dashboardPath = '/client'
          }
          
          // Utiliser router.push au lieu de window.location.href
          // Le middleware gérera la redirection si nécessaire
          router.push(dashboardPath)
          return
        }
      } catch (e) {
        // Erreur de parsing, continuer avec le flux normal
        // Ne pas rediriger en cas d'erreur pour éviter les boucles
      }
    }
    
    // Récupérer le rôle depuis l'URL ou localStorage
    const roleFromUrl = searchParams.get('role')
    const roleFromStorage = typeof window !== 'undefined' ? localStorage.getItem('selected_role') : null
    const role = roleFromUrl || roleFromStorage
    
    if (role) {
      setSelectedRole(role)
    } else {
      // Si aucun rôle n'est sélectionné, rediriger vers le choix
      // Mais seulement si on n'a pas de token valide
      if (!token) {
        router.push('/auth/choice')
      }
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const loginResponse = await login(email, password)
      
      // IMPORTANT: Vérifier que le token et le rôle sont bien stockés AVANT la redirection
      // La fonction login() stocke déjà le token et user_info dans localStorage
      // Vérifions que c'est bien fait
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const userInfo = typeof window !== 'undefined' ? localStorage.getItem('user_info') : null
      
      if (!token || !userInfo) {
        throw new Error('Erreur lors de la sauvegarde des informations de connexion')
      }
      
      // Vérifier que le rôle de l'utilisateur correspond au rôle sélectionné
      const userRole = loginResponse.user_role.toLowerCase()
      const expectedRole = selectedRole?.toLowerCase()
      
      // Normaliser les rôles pour la comparaison
      const normalizedUserRole = userRole === 'administrateur' ? 'admin' : userRole
      const normalizedExpectedRole = expectedRole === 'administrateur' ? 'admin' : expectedRole
      
      if (expectedRole && normalizedUserRole !== normalizedExpectedRole) {
        // Le rôle ne correspond pas, empêcher la connexion
        // Nettoyer le token et les infos utilisateur
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_info')
        }
        const errorMessage = `Vous êtes connecté en tant que ${ROLE_LABELS[userRole] || userRole}, mais vous avez sélectionné ${ROLE_LABELS[expectedRole] || expectedRole}. Veuillez vous connecter avec le bon profil.`
        setError(errorMessage)
        showError(errorMessage)
        setIsLoading(false)
        return
      }
      
      // Connexion réussie, déterminer le chemin du dashboard selon le rôle
      let dashboardPath = '/auth/choice'
      if (normalizedUserRole === 'admin' || normalizedUserRole === 'administrateur') {
        dashboardPath = '/admin'
      } else if (normalizedUserRole === 'manager') {
        dashboardPath = '/manager'
      } else if (normalizedUserRole === 'recruteur' || normalizedUserRole === 'recruiter') {
        dashboardPath = '/recruiter'
      } else if (normalizedUserRole === 'client') {
        dashboardPath = '/client'
      }
      
      // Afficher le message de succès
      success(`Connexion réussie en tant que ${ROLE_LABELS[userRole] || userRole}`)
      
      // IMPORTANT: Utiliser router.push uniquement
      // Le middleware gérera la redirection si nécessaire
      // Ne pas utiliser window.location.href pour éviter les conflits avec le middleware
      router.push(dashboardPath)
    } catch (err) {
      // En cas d'erreur, nettoyer le token et les infos utilisateur
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_info')
      }
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getDashboardPath = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'recruteur':
        return '/recruiter'
      case 'manager':
        return '/manager'
      case 'client':
        return '/client'
      case 'administrateur':
      case 'admin':
        return '/admin'
      default:
        return '/auth/choice'
    }
  }

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <button
            onClick={() => router.push('/auth/choice')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au choix du profil
          </button>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connexion
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {ROLE_LABELS[selectedRole] || selectedRole}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Adresse email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

