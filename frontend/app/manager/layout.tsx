'use client'

import ManagerSidebar from '@/components/sidebars/ManagerSidebar'
import NotificationCenter from '@/components/NotificationCenter'
import { getUserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Vérifier que l'utilisateur est bien un manager
    const userRole = getUserRole()
    if (userRole !== 'manager' && userRole !== 'administrateur' && userRole !== 'admin') {
      router.push('/auth/choice')
    }
  }, [router])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ManagerSidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0 pt-14 sm:pt-16 lg:pt-0 relative min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-8 py-2 sm:py-3 lg:py-4 flex items-center justify-between sm:justify-end">
          <div className="lg:hidden flex-1"></div>
          <NotificationCenter />
        </header>
        <div className="p-3 sm:p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

