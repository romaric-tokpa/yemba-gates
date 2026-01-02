'use client'

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
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUserInfo, logout, hasAnyRole } from '@/lib/auth'
import { useEffect, useState } from 'react'

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
  
  return baseItems.filter(item => hasAnyRole(item.roles))
}

export default function Sidebar() {
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<{ user_name: string; user_role: string } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const info = getUserInfo()
    setUserInfo(info)
  }, [])

  const menuItems = getMenuItems(userInfo?.user_role || null)

  const handleLogout = () => {
    logout()
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
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 rounded-lg p-2">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Recrutement</h1>
            <p className="text-xs text-gray-500">Gestion RH</p>
          </div>
        </div>
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
                isActive ? "text-blue-700" : "text-gray-500"
              )} />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        {userInfo && (
          <>
            <div className="flex items-center space-x-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {userInfo.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{userInfo.user_name}</p>
                <p className="text-xs text-gray-500 capitalize">{userInfo.user_role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
              <span>Déconnexion</span>
            </button>
          </>
        )}
      </div>
    </aside>
    </>
  )
}

