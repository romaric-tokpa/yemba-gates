'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, User, CheckCircle, XCircle, Clock, Eye, FileText, Mail, Phone, Tag, ExternalLink, MessageSquare, Calendar } from 'lucide-react'
import { getClientShortlists, validateCandidate, type ShortlistItem, type ShortlistValidation } from '@/lib/api'
import { useToastContext } from '@/components/ToastProvider'
import { formatDateTime } from '@/lib/utils'

export default function ClientShortlistPage() {
  const router = useRouter()
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [validationModal, setValidationModal] = useState<{ open: boolean; item: ShortlistItem | null }>({ open: false, item: null })
  const [validationFeedback, setValidationFeedback] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const { success, error: showError } = useToastContext()

  useEffect(() => {
    loadShortlists()
  }, [])

  const loadShortlists = async () => {
    try {
      setIsLoading(true)
      const data = await getClientShortlists()
      setShortlists(data)
    } catch (error) {
      console.error('Erreur lors du chargement des shortlists:', error)
      showError('Erreur lors du chargement des shortlists')
    } finally {
      setIsLoading(false)
    }
  }

  // Grouper les shortlists par besoin (job)
  const shortlistsByJob = shortlists.reduce((acc, item) => {
    if (!acc[item.job_id]) {
      acc[item.job_id] = {
        job_id: item.job_id,
        job_title: item.job_title,
        job_department: item.job_department,
        candidates: []
      }
    }
    acc[item.job_id].candidates.push(item)
    return acc
  }, {} as Record<string, { job_id: string; job_title: string; job_department: string | null; candidates: ShortlistItem[] }>)

  const jobs = Object.values(shortlistsByJob)

  const handleOpenValidationModal = (item: ShortlistItem) => {
    setValidationModal({ open: true, item })
    setValidationFeedback(item.client_feedback || '')
  }

  const handleCloseValidationModal = () => {
    setValidationModal({ open: false, item: null })
    setValidationFeedback('')
  }

  const handleValidate = async (validated: boolean) => {
    if (!validationModal.item) return

    try {
      setIsValidating(true)
      const validation: ShortlistValidation = {
        validated,
        feedback: validationFeedback.trim() || undefined
      }
      
      await validateCandidate(validationModal.item.application_id, validation)
      success(validated ? 'Candidat validé avec succès' : 'Candidat refusé')
      handleCloseValidationModal()
      await loadShortlists()
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showError('Erreur de connexion au serveur. Vérifiez que le serveur backend est démarré.')
      } else {
        showError(error instanceof Error ? error.message : 'Erreur lors de la validation')
      }
    } finally {
      setIsValidating(false)
    }
  }

  const getValidationBadge = (item: ShortlistItem) => {
    if (item.client_validated === null) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          En attente
        </span>
      )
    }
    if (item.client_validated === true) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Validé
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center">
        <XCircle className="w-3 h-3 mr-1" />
        Refusé
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <Link
          href="/client"
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-4"
        >
          ← Retour au dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Shortlists</h1>
        <p className="text-gray-600 mt-2">Candidats proposés pour vos besoins de recrutement</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total candidats</p>
              <p className="text-2xl font-bold text-gray-900">{shortlists.length}</p>
            </div>
            <User className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-gray-900">
                {shortlists.filter(s => s.client_validated === null).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Validés</p>
              <p className="text-2xl font-bold text-gray-900">
                {shortlists.filter(s => s.client_validated === true).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Liste des shortlists groupées par besoin */}
      {jobs.length > 0 ? (
        <div className="space-y-6">
          {jobs.map((job) => (
            <div key={job.job_id} className="bg-white rounded-lg shadow">
              {/* En-tête du besoin */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{job.job_title}</h2>
                        {job.job_department && (
                          <p className="text-sm text-gray-600 mt-1">{job.job_department}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-sm font-medium bg-emerald-100 text-emerald-800 rounded-full">
                      {job.candidates.length} candidat{job.candidates.length > 1 ? 's' : ''}
                    </span>
                    <Link
                      href={`/client/jobs/${job.job_id}`}
                      className="flex items-center text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir le besoin
                    </Link>
                  </div>
                </div>
              </div>

              {/* Liste des candidats */}
              <div className="p-6">
                <div className="space-y-4">
                  {job.candidates.map((candidate) => (
                    <div
                      key={candidate.application_id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{candidate.candidate_name}</h3>
                            {getValidationBadge(candidate)}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-3">
                            {candidate.candidate_email && (
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                {candidate.candidate_email}
                              </div>
                            )}
                            {candidate.candidate_phone && (
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-1" />
                                {candidate.candidate_phone}
                              </div>
                            )}
                          </div>

                          {candidate.candidate_tags && candidate.candidate_tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {candidate.candidate_tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {candidate.client_feedback && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start">
                                <MessageSquare className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-blue-900 mb-1">Votre commentaire</p>
                                  <p className="text-sm text-blue-800">{candidate.client_feedback}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Dates */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex flex-col gap-1 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Ajouté le {formatDateTime(candidate.created_at)}</span>
                              </div>
                              {candidate.client_validated_at && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Validé/Refusé le {formatDateTime(candidate.client_validated_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {candidate.candidate_cv_path && (
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.candidate_cv_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center px-3 py-2 text-sm text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              CV
                            </a>
                          )}
                          <button
                            onClick={() => router.push(`/client/candidats/${candidate.candidate_id}`)}
                            className="flex items-center px-3 py-2 text-sm text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Fiche
                          </button>
                          {candidate.client_validated === null && (
                            <button
                              onClick={() => handleOpenValidationModal(candidate)}
                              className="flex items-center px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Valider/Refuser
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">Aucune shortlist disponible</p>
          <p className="text-gray-400 text-sm">Les recruteurs vous enverront des candidats pour vos besoins</p>
        </div>
      )}

      {/* Modal de validation */}
      {validationModal.open && validationModal.item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Valider ou refuser le candidat
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{validationModal.item.candidate_name}</strong> - {validationModal.item.job_title}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                value={validationFeedback}
                onChange={(e) => setValidationFeedback(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ajoutez un commentaire sur votre décision..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCloseValidationModal}
                disabled={isValidating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleValidate(false)}
                disabled={isValidating}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Refuser
              </button>
              <button
                onClick={() => handleValidate(true)}
                disabled={isValidating}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {isValidating ? 'Validation...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

