'use client'

import { useState, useEffect } from 'react'
import { getClientShortlists, type ShortlistItem } from '@/lib/api'
import { Users, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import Link from 'next/link'

export default function ClientDashboard() {
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadShortlists()
  }, [])

  const loadShortlists = async () => {
    try {
      setIsLoading(true)
      const data = await getClientShortlists()
      setShortlists(data)
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const pendingCount = shortlists.filter(s => s.client_validated === null).length
  const validatedCount = shortlists.filter(s => s.client_validated === true).length
  const rejectedCount = shortlists.filter(s => s.client_validated === false).length
  const pendingCandidates = shortlists.filter(s => s.client_validated === null)

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Client</h1>
        <p className="text-gray-600 mt-2">Liste des candidats en attente de votre validation</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
            <Clock className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Validés</p>
              <p className="text-2xl font-bold text-gray-900">{validatedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejetés</p>
              <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
            </div>
            <XCircle className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Action rapide */}
      <div className="mb-8">
        <Link
          href="/client/shortlist"
          className="bg-emerald-600 text-white rounded-lg p-6 hover:bg-emerald-700 transition-colors inline-flex items-center"
        >
          <Users className="w-6 h-6 mr-3" />
          <div>
            <h3 className="font-semibold">Voir les shortlists</h3>
            <p className="text-sm text-emerald-100 mt-1">{shortlists.length} candidat(s) en shortlist</p>
          </div>
        </Link>
      </div>

      {/* Candidats en attente */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Candidats en attente de validation</h2>
        </div>
        <div className="p-6">
          {pendingCandidates.length > 0 ? (
            <div className="space-y-4">
              {pendingCandidates.map((item) => (
                <div
                  key={item.application_id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.candidate_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.job_title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.job_department || 'Non spécifié'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        En attente
                      </span>
                      <Link
                        href="/client/shortlist"
                        className="flex items-center text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun candidat en attente de validation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

