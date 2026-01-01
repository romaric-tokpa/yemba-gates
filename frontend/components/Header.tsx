'use client'

import Logo from './Logo'

interface HeaderProps {
  className?: string
}

export default function Header({ className = '' }: HeaderProps) {
  return (
    <header className={`w-full bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            {/* Espace pour d'éventuels éléments du header (menu, notifications, etc.) */}
          </div>
        </div>
      </div>
    </header>
  )
}

