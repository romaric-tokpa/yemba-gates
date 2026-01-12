'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, History, Clock, User } from 'lucide-react'
import { getJob, getJobHistory, JobResponse, JobHistoryItem } from '@/lib/api'

function BesoinDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = params.id as string
  const activeTab = searchParams.get('tab') || 'details'

  const [job, setJob] = useState<JobResponse | null>(null)
  const [history, setHistory] = useState<JobHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (jobId) {
      loadData()
    }
  }, [jobId, activeTab])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const jobData = await getJob(jobId)
      setJob(jobData)

      if (activeTab === 'history') {
        const historyData = await getJobHistory(jobId)
        setHistory(historyData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'brouillon': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Brouillon' },
      'validé': { bg: 'bg-green-100', text: 'text-green-800', label: 'Validé' },
      'en_cours': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En cours' },
      'clôturé': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Clôturé' },
    }
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    return (
      <span className={`px-3 py-1 text-sm font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Besoin non trouvé'}
        </div>
        <Link href="/besoins" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Retour à la liste
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <Link 
          href="/besoins" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux besoins
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-sm lg:text-base text-gray-600 mt-2">
              Créé le {new Date(job.created_at).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
          {getStatusBadge(job.status)}
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => router.push(`/besoins/${jobId}`)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Détails
          </button>
          <button
            onClick={() => router.push(`/besoins/${jobId}?tab=history`)}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4 mr-2" />
            Historique ({history.length})
          </button>
        </nav>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'details' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Informations du besoin</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Intitulé du poste</label>
              <p className="text-sm text-gray-900">{job.title}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Département / Client</label>
              <p className="text-sm text-gray-900">{job.department || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de contrat</label>
              <p className="text-sm text-gray-900">{job.contract_type || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget</label>
              <p className="text-sm text-gray-900">
                {job.budget ? `${job.budget.toLocaleString('fr-FR')} €` : '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgence</label>
              <p className="text-sm text-gray-900 capitalize">{job.urgency || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              {getStatusBadge(job.status)}
            </div>

            {job.validated_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Validé le</label>
                <p className="text-sm text-gray-900">
                  {new Date(job.validated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dernière mise à jour</label>
              <p className="text-sm text-gray-900">
                {new Date(job.updated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Historique des modifications (US03)
            </h2>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Chargement de l'historique...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Aucune modification enregistrée</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {item.modified_by_name}
                          </span>
                          <span className="text-xs text-gray-500">a modifié</span>
                        </div>
                        {item.field_name && (
                          <div className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">Champ:</span> {item.field_name}
                          </div>
                        )}
                        {item.old_value && (
                          <div className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Ancienne valeur:</span> {item.old_value}
                          </div>
                        )}
                        {item.new_value && (
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">Nouvelle valeur:</span> {item.new_value}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 ml-4">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(item.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BesoinDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    }>
      <BesoinDetailPageContent />
    </Suspense>
  )
}

