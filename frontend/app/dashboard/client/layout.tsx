'use client'

import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={['client', 'administrateur']}>
      <DashboardLayout allowedRoles={['client', 'administrateur']}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

