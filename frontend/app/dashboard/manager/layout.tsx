'use client'

import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={['manager', 'administrateur']}>
      <DashboardLayout allowedRoles={['manager', 'administrateur']}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

