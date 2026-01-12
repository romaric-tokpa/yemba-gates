'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { login } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { ArrowLeft, Shield, ArrowRight } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  recruteur: 'Recruteur',
  manager: 'Manager',
  client: 'Client',
  administrateur: 'Administrateur',
}

function LoginPageContent() {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Éléments décoratifs en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-100">
          {/* Bouton retour */}
          <button
            onClick={() => router.push('/auth/choice')}
            className="flex items-center text-gray-600 hover:text-emerald-600 mb-6 transition-colors duration-200 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-sm font-medium">Retour au choix du profil</span>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-3 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Connexion
            </h2>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              <span>{ROLE_LABELS[selectedRole] || selectedRole}</span>
            </div>
          </div>

          {/* Formulaire */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg flex items-start gap-3 animate-fade-in">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Erreur de connexion</p>
                  <p className="text-sm mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Champ Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="votre.email@exemple.com"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Bouton de connexion */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Besoin d'aide ? Contactez votre administrateur système
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}

