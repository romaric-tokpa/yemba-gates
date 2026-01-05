'use client'

import Link from 'next/link'
import { Building2, Users, BarChart3, Shield, ArrowRight, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react'
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
      title: 'Recruteur',
      subtitle: 'Je suis un Recruteur',
      description: 'Gérez les besoins, candidats, entretiens et le pipeline de recrutement',
      icon: Users,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      hoverGradient: 'from-blue-600 via-blue-700 to-indigo-700',
      features: ['Gestion des candidats', 'Pipeline Kanban', 'Planification d\'entretiens'],
      iconBg: 'bg-blue-500/20',
    },
    {
      id: 'manager',
      title: 'Manager',
      subtitle: 'Je suis un Manager',
      description: 'Suivez les KPI, validez les besoins et pilotez le recrutement',
      icon: BarChart3,
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
      hoverGradient: 'from-purple-600 via-purple-700 to-pink-700',
      features: ['Dashboard KPI', 'Validation des besoins', 'Pilotage équipe'],
      iconBg: 'bg-purple-500/20',
    },
    {
      id: 'client',
      title: 'Client',
      subtitle: 'Je suis un Client',
      description: 'Consultez les shortlists et validez les candidats',
      icon: Building2,
      gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
      hoverGradient: 'from-emerald-600 via-emerald-700 to-teal-700',
      features: ['Shortlists', 'Validation candidats', 'Suivi des besoins'],
      iconBg: 'bg-emerald-500/20',
    },
    {
      id: 'administrateur',
      title: 'Administrateur',
      subtitle: 'Je suis un Administrateur',
      description: 'Gérez les utilisateurs, paramètres et logs de sécurité',
      icon: Shield,
      gradient: 'from-red-500 via-red-600 to-orange-600',
      hoverGradient: 'from-red-600 via-red-700 to-orange-700',
      features: ['Gestion utilisateurs', 'Paramètres système', 'Logs sécurité'],
      iconBg: 'bg-red-500/20',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Éléments décoratifs en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl w-full relative z-10">
        {/* Bouton de retour */}
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors duration-200 group"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
            <span>Retour à la page d'accueil</span>
          </Link>
        </div>

        {/* Header amélioré */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-3 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
            Plateforme de Recrutement
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
            Sélectionnez votre profil pour accéder à votre espace
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accès sécurisé et personnalisé</span>
          </div>
        </div>

        {/* Grille des rôles améliorée */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {roles.map((role, index) => {
            const Icon = role.icon
            const loginUrl = `/auth/login?role=${encodeURIComponent(role.id)}`
            return (
              <Link
                key={role.id}
                href={loginUrl}
                onClick={() => handleLinkClick(role.id)}
                className="group relative block"
              >
                <div className={`
                  relative h-full bg-white rounded-xl p-5 shadow-md hover:shadow-xl 
                  transition-all duration-300 transform hover:-translate-y-1 
                  border border-gray-200 hover:border-transparent overflow-hidden
                `}>
                  {/* Gradient de fond au hover */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 
                    group-hover:opacity-100 transition-opacity duration-300
                  `}></div>
                  
                  {/* Contenu */}
                  <div className="relative z-10">
                    {/* Icône et badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`
                        ${role.iconBg} group-hover:bg-white/20 rounded-lg p-2.5 
                        transition-colors duration-300
                      `}>
                        <Icon className={`w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-300`} />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <ArrowRight className="w-5 h-5 text-white transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Titre et sous-titre */}
                    <div className="mb-3">
                      <h2 className="text-lg font-bold text-gray-900 group-hover:text-white transition-colors duration-300 mb-0.5">
                        {role.title}
                      </h2>
                      <p className="text-xs text-gray-500 group-hover:text-white/80 transition-colors duration-300">
                        {role.subtitle}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 group-hover:text-white/90 mb-4 transition-colors duration-300 leading-snug">
                      {role.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-1.5">
                      {role.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                          <span className="text-xs text-white/90">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA au hover */}
                    <div className="mt-4 pt-4 border-t border-gray-200 group-hover:border-white/20 transition-colors duration-300">
                      <div className="flex items-center text-xs font-semibold text-gray-700 group-hover:text-white transition-colors duration-300">
                        <span>Accéder</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* Effet de brillance au hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Footer informatif */}
        <div className="mt-8 text-center">
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
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

