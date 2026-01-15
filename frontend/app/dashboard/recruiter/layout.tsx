'use client'

import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={['recruteur', 'recruiter', 'administrateur']}>
      <DashboardLayout allowedRoles={['recruteur', 'recruiter', 'administrateur']}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

