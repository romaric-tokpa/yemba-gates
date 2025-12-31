'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  CheckCircle,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  Briefcase,
  GitBranch,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUserInfo, logout } from '@/lib/auth'
import { useEffect, useState } from 'react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/manager',
    icon: LayoutDashboard,
  },
  {
    title: 'Mes Postes',
    href: '/manager/besoins',
    icon: Briefcase,
  },
  {
    title: 'Pipeline Kanban',
    href: '/manager/pipeline',
    icon: GitBranch,
  },
  {
    title: 'Mes Candidats',
    href: '/manager/candidats',
    icon: Users,
  },
  {
    title: 'Entretiens',
    href: '/manager/entretiens',
    icon: Calendar,
  },
  {
    title: 'Approbations Besoins',
    href: '/manager/approbations',
    icon: CheckCircle,
  },
  {
    title: 'Dashboard KPI',
    href: '/manager/kpi',
    icon: BarChart3,
  },
]

export default function ManagerSidebar() {
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<{ user_name: string; user_role: string } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const info = getUserInfo()
    setUserInfo(info)
  }, [])

  const handleLogout = () => {
    logout()
  }

  return (
    <>
      {/* Menu burger pour mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-600 rounded-lg shadow-lg border border-indigo-700"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
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
        w-64 bg-indigo-600 border-r border-indigo-700 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-indigo-700">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-700 rounded-lg p-2">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Manager</h1>
              <p className="text-xs text-indigo-200">Espace Manager</p>
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
                    ? "bg-indigo-700 text-white font-medium"
                    : "text-indigo-100 hover:bg-indigo-700 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  isActive ? "text-white" : "text-indigo-200"
                )} />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-indigo-700">
          {userInfo && (
            <>
              <div className="flex items-center space-x-3 px-4 py-3 mb-2">
                <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {userInfo.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{userInfo.user_name}</p>
                  <p className="text-xs text-indigo-200 capitalize">{userInfo.user_role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-indigo-100 hover:bg-indigo-700 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5 text-indigo-200" />
                <span>Déconnexion</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

