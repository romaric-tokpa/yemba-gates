'use client'

import Link from 'next/link'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

export default function Logo({ className = '', showText = true, size = 'md', href = '/auth/choice' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  const logoIcon = (
    <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
      {/* Carte de profil avec dégradé */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-500 via-teal-400 to-orange-500 p-[2px] shadow-md">
        <div className="w-full h-full bg-white rounded-lg flex items-center justify-center p-1.5">
          {/* Icône personne stylisée à gauche */}
          <div className="absolute left-1.5 top-1/2 transform -translate-y-1/2">
            {/* Tête */}
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-teal-500 to-orange-500 mb-0.5"></div>
            {/* Corps */}
            <div className="w-2.5 h-2 bg-gradient-to-br from-teal-500 to-orange-500 rounded-sm"></div>
          </div>
          {/* Lignes de texte à droite */}
          <div className="absolute right-1.5 top-1/2 transform -translate-y-1/2 space-y-0.5">
            <div className="h-0.5 bg-gradient-to-r from-teal-500 to-orange-500 rounded w-3"></div>
            <div className="h-0.5 bg-gradient-to-r from-teal-500 to-orange-500 rounded w-2"></div>
            <div className="h-0.5 bg-gradient-to-r from-teal-500 to-orange-500 rounded w-2.5"></div>
          </div>
        </div>
      </div>
      
      {/* Loupe avec dégradé qui chevauche */}
      <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7">
        <div className="w-full h-full rounded-full bg-white relative">
          {/* Bordure avec dégradé */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-orange-500 p-[1.5px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              {/* Icône personne dans la loupe */}
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            </div>
          </div>
          {/* Manche de la loupe */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-orange-500 transform rotate-45 rounded-sm"></div>
        </div>
      </div>
    </div>
  )

  const logoText = showText ? (
    <div className={`font-semibold ${textSizeClasses[size]} whitespace-nowrap`}>
      <span className="text-gray-800">Yemma-</span>
      <span className="text-orange-500">Gates</span>
    </div>
  ) : null

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoIcon}
      {logoText}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    )
  }

  return content
}

