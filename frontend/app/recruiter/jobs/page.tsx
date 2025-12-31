'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getJobs, JobResponse } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { Plus, History, Eye, Clock } from 'lucide-react'

export default function RecruiterJobsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    // Vérifier l'authentification avant de charger les données
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    // Vérifier si on doit afficher le formulaire de création
    const action = searchParams.get('action')
    if (action === 'new') {
      setShowCreateForm(true)
    }

    loadJobs()
  }, [router, searchParams])

  const loadJobs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getJobs()
      setJobs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Erreur lors du chargement des besoins:', err)
      setError('Impossible de charger les besoins. Vérifiez votre connexion.')
      setJobs([])
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
      <span className={`px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null
    const urgencyConfig: Record<string, { bg: string; text: string; label: string }> = {
      'faible': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Faible' },
      'moyenne': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moyenne' },
      'haute': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Haute' },
      'critique': { bg: 'bg-red-100', text: 'text-red-800', label: 'Critique' },
    }
    const config = urgencyConfig[urgency] || { bg: 'bg-gray-100', text: 'text-gray-800', label: urgency }
    return (
      <span className={`px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Chargement des besoins...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Postes</h1>
          <p className="text-gray-600 mt-2">Gestion des besoins de recrutement</p>
        </div>
        <Link
          href="/recruiter/jobs/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Créer un besoin
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow border border-blue-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Créer un nouveau besoin</h2>
          <p className="text-gray-600 mb-4">
            Le formulaire de création sera disponible ici. Pour l'instant, vous pouvez utiliser la page principale des besoins.
          </p>
          <Link
            href="/besoins/nouveau"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Accéder au formulaire de création
          </Link>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Liste des besoins</h2>
        </div>
        <div className="p-6">
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{job.title}</h3>
                        {getStatusBadge(job.status)}
                        {getUrgencyBadge(job.urgency)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {job.department && (
                          <span className="flex items-center gap-1">
                            <span>{job.department}</span>
                          </span>
                        )}
                        {job.contract_type && (
                          <span>{job.contract_type}</span>
                        )}
                        {job.budget && (
                          <span>{job.budget.toLocaleString('fr-FR')} €</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(job.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/recruiter/jobs/${job.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <Link
                        href={`/recruiter/jobs/${job.id}/history`}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir l'historique"
                      >
                        <History className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Aucun besoin trouvé</p>
              <Link
                href="/recruiter/jobs/new"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium"
              >
                Créer votre premier besoin
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

