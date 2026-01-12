'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUserInfo, logout } from '@/lib/auth'
import { useEffect, useState } from 'react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Gestion Utilisateurs',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Logs Système',
    href: '/admin/logs',
    icon: Shield,
  },
  {
    title: 'Paramètres Globaux',
    href: '/admin/settings',
    icon: Settings,
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<{ user_name: string; user_role: string } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

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
        className="lg:hidden fixed top-3 left-3 sm:top-4 sm:left-4 z-50 p-2.5 bg-secondary rounded-lg shadow-lg border border-secondary-600 touch-target"
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
        w-64 bg-gradient-to-b from-secondary to-secondary-600 border-r border-secondary-700/50 flex flex-col
        transform transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-secondary-700/30">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Administrateur</h1>
              <p className="text-xs text-secondary-100/80">Espace Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-white/20 text-white font-medium shadow-lg backdrop-blur-sm"
                    : "text-secondary-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive ? "text-white scale-110" : "text-secondary-200 group-hover:scale-110"
                )} />
                <span className="flex-1">{item.title}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-secondary-700/30 bg-secondary-700/10">
          {userInfo && (
            <div className="p-2">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 border border-white/20">
                  <span className="text-xs font-bold text-white">
                    {userInfo.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-white truncate">{userInfo.user_name}</p>
                  <p className="text-[10px] text-secondary-100/80 capitalize truncate">{userInfo.user_role}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-secondary-100/70 transition-transform flex-shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isUserMenuOpen && (
                <div className="mt-1 px-2 pb-2 space-y-0.5">
                  <Link
                    href="/profile/change-password"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-secondary-100 bg-white/5 hover:bg-white/15 transition-colors"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsUserMenuOpen(false)
                    }}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Changer le mot de passe</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-secondary-100 bg-white/5 hover:bg-white/15 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
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

