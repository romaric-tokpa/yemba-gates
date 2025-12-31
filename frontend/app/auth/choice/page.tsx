'use client'

import Link from 'next/link'
import { Building2, Users, BarChart3, Shield, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RoleChoicePage() {
  const router = useRouter()

  useEffect(() => {
    // Vérifier si un utilisateur a déjà un token et un rôle
    // IMPORTANT: Ne rediriger QUE si on est sûr que l'utilisateur est vraiment connecté
    // et que le token est valide (pas juste présent dans localStorage)
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
          
          // Utiliser router.push au lieu de window.location.href pour éviter les rafraîchissements
          // Le middleware gérera la redirection si nécessaire
          router.push(dashboardPath)
        }
      } catch (e) {
        // Erreur de parsing, continuer avec le flux normal
        // Ne pas rediriger en cas d'erreur pour éviter les boucles
        console.error('Erreur lors de la vérification de l\'utilisateur:', e)
      }
    }
    // Si pas de token ou infos invalides, laisser l'utilisateur choisir son rôle
    // Ne pas faire de redirection automatique
  }, [router])

  const handleLinkClick = (role: string) => {
    // Enregistrer le choix du rôle dans localStorage avant la navigation
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_role', role)
    }
    // Le Link de Next.js gérera la navigation automatiquement
  }

  const roles = [
    {
      id: 'recruteur',
      title: 'Je suis un Recruteur',
      description: 'Gérez les besoins, candidats, entretiens et le pipeline de recrutement',
      icon: Users,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      id: 'manager',
      title: 'Je suis un Manager',
      description: 'Suivez les KPI, validez les besoins et pilotez le recrutement',
      icon: BarChart3,
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      id: 'client',
      title: 'Je suis un Client',
      description: 'Consultez les shortlists et validez les candidats',
      icon: Building2,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      id: 'administrateur',
      title: 'Je suis un Administrateur',
      description: 'Gérez les utilisateurs, paramètres et logs de sécurité',
      icon: Shield,
      color: 'bg-red-600 hover:bg-red-700',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Application de Recrutement
          </h1>
          <p className="text-xl text-gray-600">
            Sélectionnez votre profil pour accéder à votre espace
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon
            // URL correcte : /auth/login car le dossier est app/auth/login/
            const loginUrl = `/auth/login?role=${encodeURIComponent(role.id)}`
            return (
              <Link
                key={role.id}
                href={loginUrl}
                onClick={() => handleLinkClick(role.id)}
                className={`${role.color} text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex flex-col items-start text-left group cursor-pointer block no-underline`}
              >
                <div className="mb-4">
                  <div className="bg-white/20 rounded-lg p-3 inline-block mb-4">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{role.title}</h2>
                  <p className="text-white/90 text-sm">{role.description}</p>
                </div>
                <div className="mt-auto flex items-center text-sm font-medium group-hover:translate-x-2 transition-transform">
                  Accéder
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

