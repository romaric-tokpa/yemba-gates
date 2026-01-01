'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerBesoinsPage() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers la nouvelle page /manager/jobs
    router.replace('/manager/jobs')
  }, [router])

  // Afficher un message de chargement pendant la redirection
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="text-center py-12 text-gray-500">Redirection en cours...</div>
    </div>
  )
}
