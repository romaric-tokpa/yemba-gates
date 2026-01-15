'use client'

import Link from 'next/link'
import { Building2, Users, BarChart3, ArrowRight, ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RoleChoicePage() {
  const router = useRouter()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const userInfo = typeof window !== 'undefined' ? localStorage.getItem('user_info') : null
    
    if (token && userInfo) {
      try {
        const user = JSON.parse(userInfo)
        const userRole = user.user_role?.toLowerCase()
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
          router.push(dashboardPath)
        }
      } catch (e) {
        console.error('Erreur lors de la vérification de l\'utilisateur:', e)
      }
    }
  }, [router])

  const handleLinkClick = (role: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_role', role)
    }
  }

  const roles = [
    {
      id: 'recruteur',
      title: 'Recruteur',
      description: 'Gérez les besoins, candidats et entretiens',
      icon: Users,
      color: 'emerald',
    },
    {
      id: 'manager',
      title: 'Manager',
      description: 'Suivez les KPI et pilotez le recrutement',
      icon: BarChart3,
      color: 'orange',
    },
    {
      id: 'client',
      title: 'Client',
      description: 'Consultez les shortlists et validez les candidats',
      icon: Building2,
      color: 'teal',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50/30 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float animation-delay-4000"></div>
      </div>

      <div className="max-w-5xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            <span>Retour à l'accueil</span>
          </Link>
          
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <span className="text-2xl lg:text-3xl font-bold">
              <span className="text-emerald-600">Yemma</span>
              <span className="text-orange-500">-Gates</span>
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-emerald-600 mb-4">
            Sélectionnez votre profil
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Accédez à votre espace personnalisé selon votre rôle
          </p>
        </div>

        {/* Grille des rôles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => {
            const Icon = role.icon
            const loginUrl = `/auth/login?role=${encodeURIComponent(role.id)}`
            
            const colorClasses = {
              emerald: {
                bg: 'bg-emerald-500',
                hoverBg: 'hover:bg-emerald-600',
                bgLight: 'bg-emerald-100',
                text: 'text-emerald-600',
                hoverText: 'group-hover:text-emerald-600',
                border: 'hover:border-emerald-500',
                bgHover: 'hover:bg-emerald-50'
              },
              orange: {
                bg: 'bg-orange-500',
                hoverBg: 'hover:bg-orange-600',
                bgLight: 'bg-orange-100',
                text: 'text-orange-600',
                hoverText: 'group-hover:text-orange-600',
                border: 'hover:border-orange-500',
                bgHover: 'hover:bg-orange-50'
              },
              teal: {
                bg: 'bg-teal-500',
                hoverBg: 'hover:bg-teal-600',
                bgLight: 'bg-teal-100',
                text: 'text-teal-600',
                hoverText: 'group-hover:text-teal-600',
                border: 'hover:border-teal-500',
                bgHover: 'hover:bg-teal-50'
              }
            }
            
            const colors = colorClasses[role.color as keyof typeof colorClasses] || colorClasses.emerald
            
            return (
              <Link
                key={role.id}
                href={loginUrl}
                onClick={() => handleLinkClick(role.id)}
                className="group relative"
              >
                <div className={`
                  bg-white rounded-xl p-6 border-2 border-gray-200 
                  ${colors.border} ${colors.bgHover}
                  hover:shadow-xl
                  transition-all duration-500 transform hover:-translate-y-2
                `}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`
                      ${colors.bgLight} ${colors.hoverBg}
                      rounded-lg p-3 transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-6
                    `}>
                      <Icon className={`w-6 h-6 ${colors.text} group-hover:text-white transition-colors duration-300`} />
                    </div>
                    <ArrowRight className={`w-5 h-5 text-gray-400 ${colors.hoverText} transform group-hover:translate-x-1 transition-all duration-300`} />
                  </div>
                  
                  <h3 className={`text-xl font-bold text-gray-900 mb-2 ${colors.hoverText} transition-colors duration-300`}>
                    {role.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {role.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Besoin d'aide ? <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">Contactez-nous</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob-float {
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
        .animate-blob-float {
          animation: blob-float 8s ease-in-out infinite;
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

