'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Calendar,
  Building2,
  Workflow,
  BarChart3,
  LogOut,
  Bell,
  Menu,
  X,
  CheckCircle,
  Settings,
  Shield,
  FileText,
  Lock,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/routes'
import { useAuth } from '@/context/AuthContext'

const getMenuItems = (userRole: string | null) => {
  // Déterminer le préfixe du dashboard selon le rôle
  const getDashboardPrefix = (role: string | null): string => {
    switch (role) {
      case 'recruteur':
        return '/dashboard/recruiter'
      case 'manager':
        return '/dashboard/manager'
      case 'client':
        return '/dashboard/client'
      case 'administrateur':
        return '/dashboard/admin'
      default:
        return ''
    }
  }

  const prefix = getDashboardPrefix(userRole)

  const baseItems = [
    {
      title: 'Dashboard',
      href: prefix || ROUTES.HOME,
      icon: LayoutDashboard,
      roles: ['recruteur', 'recruiter', 'manager', 'client', 'administrateur', 'admin'],
    },
    {
      title: 'Besoins',
      href: userRole === 'recruiter' || userRole === 'recruteur' 
        ? ROUTES.RECRUITER.JOBS.LIST 
        : userRole === 'manager' 
        ? ROUTES.MANAGER.JOBS.LIST 
        : `${prefix}/jobs`,
      icon: Briefcase,
      roles: ['recruteur', 'recruiter', 'administrateur', 'admin'],
    },
    {
      title: 'Candidats',
      href: userRole === 'recruiter' || userRole === 'recruteur'
        ? ROUTES.RECRUITER.CANDIDATES.LIST
        : userRole === 'manager'
        ? ROUTES.MANAGER.CANDIDATES.LIST
        : `${prefix}/candidats`,
      icon: Users,
      roles: ['recruteur', 'recruiter', 'manager', 'administrateur', 'admin'],
    },
    {
      title: 'Pipeline',
      href: userRole === 'recruiter' || userRole === 'recruteur'
        ? ROUTES.RECRUITER.PIPELINE
        : userRole === 'manager'
        ? ROUTES.MANAGER.PIPELINE
        : `${prefix}/pipeline`,
      icon: Workflow,
      roles: ['recruteur', 'recruiter', 'manager', 'administrateur', 'admin'],
    },
    {
      title: 'Shortlist',
      href: ROUTES.CLIENT.SHORTLIST,
      icon: Users,
      roles: ['client', 'administrateur', 'admin'],
    },
    {
      title: 'Approbations',
      href: ROUTES.MANAGER.APPROBATIONS,
      icon: CheckCircle,
      roles: ['manager', 'administrateur', 'admin'],
    },
    {
      title: 'KPI',
      href: ROUTES.MANAGER.KPI,
      icon: BarChart3,
      roles: ['manager', 'administrateur', 'admin'],
    },
    {
      title: 'Entretiens',
      href: userRole === 'recruiter' || userRole === 'recruteur'
        ? ROUTES.RECRUITER.INTERVIEWS
        : userRole === 'manager'
        ? ROUTES.MANAGER.INTERVIEWS
        : `${prefix}/entretiens`,
      icon: Calendar,
      roles: ['recruteur', 'recruiter', 'manager', 'administrateur', 'admin'],
    },
    {
      title: 'Équipes',
      href: ROUTES.MANAGER.TEAMS,
      icon: Users,
      roles: ['manager', 'administrateur', 'admin'],
    },
    {
      title: 'Notifications',
      href: ROUTES.COMMON.NOTIFICATIONS,
      icon: Bell,
      roles: ['recruteur', 'recruiter', 'manager', 'client', 'administrateur', 'admin'],
    },
    {
      title: 'Utilisateurs',
      href: ROUTES.ADMIN.USERS,
      icon: Users,
      roles: ['administrateur', 'admin'],
    },
    {
      title: 'Paramétrage',
      href: ROUTES.ADMIN.SETTINGS,
      icon: Settings,
      roles: ['administrateur', 'admin'],
    },
    {
      title: 'Logs de sécurité',
      href: ROUTES.ADMIN.LOGS,
      icon: Shield,
      roles: ['administrateur', 'admin'],
    },
  ]

  if (!userRole) return []
  
  // Filtrer les items selon le rôle de l'utilisateur
  return baseItems.filter(item => {
    // Normaliser les rôles pour la comparaison
    const normalizedRole = userRole.toLowerCase()
    const normalizedItemRoles = item.roles.map(r => r.toLowerCase())
    return normalizedItemRoles.includes(normalizedRole)
  })
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, role, hasAnyRole, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const menuItems = getMenuItems(role)

  const handleLogout = () => {
    logout()
  }

  const getUserDisplayName = () => {
    if (user) {
      return `${user.first_name} ${user.last_name}`
    }
    return 'Utilisateur'
  }

  const getUserInitials = () => {
    if (user) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return 'U'
  }

  const getRoleLabel = () => {
    const roleLabels: Record<string, string> = {
      'administrateur': 'Administrateur',
      'manager': 'Manager',
      'recruteur': 'Recruteur',
      'recruiter': 'Recruteur',
      'client': 'Client',
    }
    return roleLabels[role || ''] || role || 'Utilisateur'
  }

  return (
    <>
      {/* Menu burger pour mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Overlay pour mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard/manager" className="flex items-center space-x-3 group">
          <div className="bg-gradient-to-br from-primary to-primary-600 rounded-lg p-2 shadow-sm group-hover:shadow-md transition-shadow">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1F2A44] group-hover:text-primary transition-colors">
              Yemma-Gates
            </h1>
            <p className="text-xs text-gray-500">Recrutement</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className={cn(
                "w-5 h-5",
                isActive ? "text-primary" : "text-gray-500 group-hover:text-primary"
              )} />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-200 bg-gray-50">
        {user && (
          <div className="p-2">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-gray-700 hover:bg-white transition-colors"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-xs font-semibold text-white">
                  {getUserInitials()}
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium text-[#1F2A44] truncate">{getUserDisplayName()}</p>
                <p className="text-[10px] text-gray-500 truncate">{getRoleLabel()}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isUserMenuOpen && (
              <div className="mt-1 px-2 pb-2 space-y-0.5">
                <Link
                  href="/profile/change-password"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-700 hover:bg-white transition-colors"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setIsUserMenuOpen(false)
                  }}
                >
                  <Lock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Changer le mot de passe</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-700 hover:bg-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-gray-500" />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
    </>
  )
}

