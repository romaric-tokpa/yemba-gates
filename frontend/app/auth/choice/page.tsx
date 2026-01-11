'use client'

import Link from 'next/link'
import { Building2, Users, BarChart3, ArrowRight, Briefcase, ArrowLeft } from 'lucide-react'
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
      color: 'teal',
    },
    {
      id: 'client',
      title: 'Client',
      description: 'Consultez les shortlists et validez les candidats',
      icon: Building2,
      color: 'emerald',
    },
  ]

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Fond avec dégradé subtil */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-4xl w-full relative z-10">
        {/* Header compact */}
        <div className="text-center mb-10">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
            <span>Retour</span>
          </Link>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-2 rounded-lg shadow-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              Yemma-Gates
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            Sélectionnez votre profil
          </h1>
          <p className="text-sm text-gray-600">
            Accédez à votre espace personnalisé
          </p>
        </div>

        {/* Grille compacte des rôles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {roles.map((role) => {
            const Icon = role.icon
            const loginUrl = `/auth/login?role=${encodeURIComponent(role.id)}`
            const isEmerald = role.color === 'emerald'
            
            return (
              <Link
                key={role.id}
                href={loginUrl}
                onClick={() => handleLinkClick(role.id)}
                className="group relative"
              >
                <div className={`
                  bg-white rounded-xl p-5 border-2 border-gray-100 
                  hover:border-emerald-300 hover:shadow-lg
                  transition-all duration-300 transform hover:-translate-y-1
                  ${isEmerald ? 'hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50' : 'hover:bg-gradient-to-br hover:from-teal-50 hover:to-emerald-50'}
                `}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`
                      ${isEmerald ? 'bg-emerald-100 group-hover:bg-emerald-600' : 'bg-teal-100 group-hover:bg-teal-600'}
                      rounded-lg p-2.5 transition-colors duration-300
                    `}>
                      <Icon className={`w-5 h-5 ${isEmerald ? 'text-emerald-600' : 'text-teal-600'} group-hover:text-white transition-colors duration-300`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transform group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-1.5 group-hover:text-emerald-700 transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {role.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Footer minimaliste */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Besoin d'aide ? <Link href="/" className="text-emerald-600 hover:text-emerald-700 transition-colors">Contactez-nous</Link>
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
      `}</style>
    </div>
  )
}

