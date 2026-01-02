'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUserInfo, logout } from '@/lib/auth'
import { useEffect, useState } from 'react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/client',
    icon: LayoutDashboard,
  },
  {
    title: 'Mes Shortlists',
    href: '/client/shortlist',
    icon: Users,
  },
  {
    title: 'Historique Décisions',
    href: '/client/history',
    icon: History,
  },
]

export default function ClientSidebar() {
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
        className="lg:hidden fixed top-3 left-3 sm:top-4 sm:left-4 z-50 p-2.5 bg-emerald-600 rounded-lg shadow-lg border border-emerald-700 touch-target"
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
        w-64 bg-gradient-to-b from-emerald-600 to-emerald-700 border-r border-emerald-800/50 flex flex-col
        transform transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-emerald-800/30">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Client</h1>
              <p className="text-xs text-emerald-200/80">Espace Client</p>
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
                    : "text-emerald-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive ? "text-white scale-110" : "text-emerald-200 group-hover:scale-110"
                )} />
                <span className="flex-1">{item.title}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-emerald-800/30 bg-emerald-800/20">
          {userInfo && (
            <>
              <div className="flex items-center space-x-3 px-4 py-3 mb-3 bg-white/5 rounded-xl backdrop-blur-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                  <span className="text-sm font-bold text-white">
                    {userInfo.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{userInfo.user_name}</p>
                  <p className="text-xs text-emerald-200/80 capitalize truncate">{userInfo.user_role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-emerald-100 bg-white/10 hover:bg-white/20 hover:text-white transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20 shadow-md hover:shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Déconnexion</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

