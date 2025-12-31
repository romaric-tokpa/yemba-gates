'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getRecruiterNotifications, ShortlistItem } from '@/lib/api'
import Link from 'next/link'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ShortlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getRecruiterNotifications()
      setNotifications(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (item: ShortlistItem) => {
    if (item.client_validated === true) {
      return (
        <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          ✓ Validé par le client
        </span>
      )
    } else if (item.client_validated === false) {
      return (
        <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          ✗ Rejeté par le client
        </span>
      )
    }
    return null
  }

  return (
    <ProtectedRoute allowedRoles={['recruteur', 'manager', 'administrateur']}>
      <div className="p-4 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-2">Feedback des clients sur vos candidatures</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading && notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Chargement des notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune notification pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {notifications.map((item) => (
              <div
                key={item.application_id}
                className="bg-white rounded-lg shadow border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {item.candidate_name}
                      </h3>
                      {getStatusBadge(item)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Poste:</span> {item.job_title}
                      {item.job_department && ` - ${item.job_department}`}
                    </p>
                    {item.client_validated_at && (
                      <p className="text-sm text-gray-500">
                        Décision prise le {new Date(item.client_validated_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {item.client_feedback && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Commentaire du client:</p>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.client_feedback}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link
                    href={`/candidats`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Voir le candidat →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

