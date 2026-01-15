'use client'

import { useAuth } from '@/context/AuthContext'
import NotificationCenter from './NotificationCenter'
import { LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from './Logo'

interface HeaderProps {
  className?: string
  title?: string
}

export default function Header({ className = '', title }: HeaderProps) {
  const { user, role, logout } = useAuth()
  const router = useRouter()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  const handleLogout = () => {
    logout()
  }

  const getUserInitials = () => {
    if (user) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = () => {
    if (user) {
      return `${user.first_name} ${user.last_name}`
    }
    return 'Utilisateur'
  }

  const getRoleLabel = (role: string | null) => {
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
    <header className={`w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center gap-4">
            {title ? (
              <h1 className="text-xl font-bold text-[#1F2A44]">{title}</h1>
            ) : (
              <Logo size="md" />
            )}
          </div>

          {/* Right side - Notifications and User Menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  aria-label="Menu utilisateur"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
                    <span className="text-sm font-semibold text-white">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-[#1F2A44] group-hover:text-primary transition-colors">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {getRoleLabel(role)}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-[#1F2A44]">{getUserDisplayName()}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        {getRoleLabel(role)}
                      </span>
                    </div>
                    
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          router.push('/profile/change-password')
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Mon profil</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          router.push('/profile/change-password')
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span>Paramètres</span>
                      </button>
                    </div>

                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
