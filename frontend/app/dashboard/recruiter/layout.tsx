'use client'

import Sidebar from '@/components/Sidebar'
import NotificationCenter from '@/components/NotificationCenter'
import { getUserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Vérifier que l'utilisateur est bien un recruteur
    const userRole = getUserRole()
    if (userRole !== 'recruteur' && userRole !== 'administrateur') {
      router.push('/auth/choice')
    }
  }, [router])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0 pt-16 lg:pt-0 relative">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-end">
          <NotificationCenter />
        </header>
        {children}
      </main>
    </div>
  )
}

