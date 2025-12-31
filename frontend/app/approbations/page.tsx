'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  getPendingValidationJobs, 
  validateJob, 
  JobResponse, 
  JobValidation 
} from '@/lib/api'
import { CheckCircle, XCircle, Eye, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ApprobationsPage() {
  const [pendingJobs, setPendingJobs] = useState<JobResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobResponse | null>(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationData, setValidationData] = useState<JobValidation>({
    validated: true,
    feedback: ''
  })

  useEffect(() => {
    loadPendingJobs()
  }, [])

  const loadPendingJobs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getPendingValidationJobs()
      setPendingJobs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidate = async (validated: boolean) => {
    if (!selectedJob) return

    try {
      setIsLoading(true)
      await validateJob(selectedJob.id!, {
        validated,
        feedback: validationData.feedback || undefined
      })
      setShowValidationModal(false)
      setSelectedJob(null)
      setValidationData({ validated: true, feedback: '' })
      await loadPendingJobs()
      alert(validated ? 'Besoin validé avec succès!' : 'Besoin rejeté')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la validation')
    } finally {
      setIsLoading(false)
    }
  }

  const openValidationModal = (job: JobResponse, validated: boolean) => {
    setSelectedJob(job)
    setValidationData({ validated, feedback: '' })
    setShowValidationModal(true)
  }

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null
    const urgencyConfig: Record<string, { bg: string; text: string; label: string }> = {
      'faible': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Faible' },
      'moyenne': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moyenne' },
      'haute': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Haute' },
      'critique': { bg: 'bg-red-100', text: 'text-red-800', label: 'Critique' },
    }
    const config = urgencyConfig[urgency.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800', label: urgency }
    return (
      <span className={`px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['manager', 'administrateur']}>
      <div className="p-4 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Approbation des besoins</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-2">
            Validez ou rejetez les besoins de recrutement soumis (US02)
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2">{pendingJobs.length}</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Urgents</p>
                <p className="text-2xl lg:text-3xl font-bold text-red-600 mt-2">
                  {pendingJobs.filter(j => j.urgency === 'haute' || j.urgency === 'critique').length}
                </p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Avec budget</p>
                <p className="text-2xl lg:text-3xl font-bold text-green-600 mt-2">
                  {pendingJobs.filter(j => j.budget && j.budget > 0).length}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Liste des besoins en attente */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Besoins en attente de validation</h2>
            <button
              onClick={loadPendingJobs}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Actualiser
            </button>
          </div>

          {isLoading && pendingJobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : pendingJobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Aucun besoin en attente de validation</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingJobs.map((job) => (
                <div key={job.id} className="p-4 lg:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            {job.department && (
                              <span>Département: {job.department}</span>
                            )}
                            {job.contract_type && (
                              <span>Type: {job.contract_type}</span>
                            )}
                            {job.budget && (
                              <span>Budget: {job.budget.toLocaleString('fr-FR')} €</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getUrgencyBadge(job.urgency)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Créé le {new Date(job.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/besoins/${job.id}`}
                        className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails
                      </Link>
                      <button
                        onClick={() => openValidationModal(job, true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Valider
                      </button>
                      <button
                        onClick={() => openValidationModal(job, false)}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de validation/rejet */}
        {showValidationModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">
                {validationData.validated ? 'Valider le besoin' : 'Rejeter le besoin'}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                <strong>{selectedJob.title}</strong>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire {validationData.validated ? '(optionnel)' : '(recommandé)'}
                  </label>
                  <textarea
                    value={validationData.feedback || ''}
                    onChange={(e) => setValidationData({ ...validationData, feedback: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      validationData.validated 
                        ? 'Commentaire pour le recruteur (optionnel)'
                        : 'Raison du rejet (recommandé)'
                    }
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => handleValidate(validationData.validated)}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 ${
                      validationData.validated
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isLoading 
                      ? 'Traitement...' 
                      : validationData.validated 
                        ? 'Confirmer la validation' 
                        : 'Confirmer le rejet'
                    }
                  </button>
                  <button
                    onClick={() => {
                      setShowValidationModal(false)
                      setSelectedJob(null)
                      setValidationData({ validated: true, feedback: '' })
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

