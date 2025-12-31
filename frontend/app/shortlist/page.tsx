'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  getClientShortlists, 
  validateCandidate, 
  getCandidate,
  getApplicationHistory,
  ShortlistItem, 
  ShortlistValidation,
  CandidateResponse,
  ApplicationHistoryItem
} from '@/lib/api'
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  MessageSquare, 
  Clock,
  User,
  Mail,
  Phone,
  Tag,
  History,
  Eye,
  Send
} from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'

export default function ShortlistPage() {
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<{
    item: ShortlistItem
    candidate: CandidateResponse | null
    history: ApplicationHistoryItem[]
  } | null>(null)
  const [showCandidateModal, setShowCandidateModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [validationData, setValidationData] = useState<ShortlistValidation>({
    validated: true,
    feedback: ''
  })
  const { success, error: showError } = useToastContext()

  useEffect(() => {
    loadShortlists()
  }, [])

  const loadShortlists = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getClientShortlists()
      setShortlists(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des shortlists')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCandidate = async (item: ShortlistItem) => {
    try {
      setIsLoading(true)
      const [candidate, history] = await Promise.all([
        getCandidate(item.candidate_id).catch(() => null),
        getApplicationHistory(item.application_id).catch(() => [])
      ])
      
      setSelectedCandidate({
        item,
        candidate,
        history
      })
      setValidationData({
        validated: true,
        feedback: item.client_feedback || ''
      })
      setShowCandidateModal(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement'
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidate = async (validated: boolean) => {
    if (!selectedCandidate) return

    try {
      setIsLoading(true)
      await validateCandidate(selectedCandidate.item.application_id, {
        validated,
        feedback: validationData.feedback || undefined
      })
      
      setShowCandidateModal(false)
      setSelectedCandidate(null)
      await loadShortlists()
      if (validated) {
        success('Candidat validé pour offre ! Le recruteur a été notifié.')
      } else {
        success('Candidat rejeté. Le recruteur a été notifié.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la validation'
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (item: ShortlistItem) => {
    if (item.client_validated === null) {
      return (
        <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          En attente de votre décision
        </span>
      )
    } else if (item.client_validated) {
      return (
        <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          ✓ Validé pour offre
        </span>
      )
    } else {
      return (
        <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          ✗ Rejeté
        </span>
      )
    }
  }

  const pendingCount = shortlists.filter(s => s.client_validated === null).length
  const validatedCount = shortlists.filter(s => s.client_validated === true).length
  const rejectedCount = shortlists.filter(s => s.client_validated === false).length

  return (
    <ProtectedRoute allowedRoles={['client', 'administrateur']}>
      <div className="p-4 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Shortlists</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-2">
            Candidats envoyés par le recruteur - Validez ou rejetez pour prendre la décision finale (US12, US13)
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
                <p className="text-2xl lg:text-3xl font-bold text-orange-600 mt-2">{pendingCount}</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Validés</p>
                <p className="text-2xl lg:text-3xl font-bold text-green-600 mt-2">{validatedCount}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Rejetés</p>
                <p className="text-2xl lg:text-3xl font-bold text-red-600 mt-2">{rejectedCount}</p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <XCircle className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Liste des candidats */}
        {isLoading && shortlists.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Chargement des shortlists...</div>
        ) : shortlists.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg mb-2">Aucune shortlist disponible</p>
            <p className="text-gray-400 text-sm">Les candidats vous seront présentés ici une fois en shortlist</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shortlists.map((item) => (
              <div
                key={item.application_id}
                className="bg-white rounded-lg shadow border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Informations principales */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg lg:text-xl font-semibold text-gray-900">
                            {item.candidate_name}
                          </h3>
                          {getStatusBadge(item)}
                        </div>
                        <p className="text-sm lg:text-base text-gray-700 mb-2">
                          <span className="font-medium">Poste:</span> {item.job_title}
                          {item.job_department && (
                            <span className="text-gray-500"> - {item.job_department}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Informations de contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {item.candidate_email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {item.candidate_email}
                        </div>
                      )}
                      {item.candidate_phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {item.candidate_phone}
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {item.candidate_tags && item.candidate_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.candidate_tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Feedback client existant */}
                    {item.client_feedback && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-medium text-blue-900 mb-1">Votre commentaire:</p>
                        <p className="text-sm text-blue-800">{item.client_feedback}</p>
                        {item.client_validated_at && (
                          <p className="text-xs text-blue-600 mt-1">
                            Le {new Date(item.client_validated_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions rapides */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                    {item.client_validated === null ? (
                      <>
                        <button
                          onClick={() => handleOpenCandidate(item)}
                          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Voir fiche complète
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCandidate({ item, candidate: null, history: [] })
                            setValidationData({ validated: true, feedback: '' })
                            setShowCandidateModal(true)
                          }}
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Valider pour offre
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCandidate({ item, candidate: null, history: [] })
                            setValidationData({ validated: false, feedback: '' })
                            setShowCandidateModal(true)
                          }}
                          className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Refuser
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleOpenCandidate(item)}
                          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Voir fiche
                        </button>
                        <button
                          onClick={() => {
                            handleOpenCandidate(item)
                            setShowHistoryModal(true)
                          }}
                          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                        >
                          <History className="w-4 h-4 mr-2" />
                          Historique
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Fiche Candidat Simplifiée */}
        {showCandidateModal && selectedCandidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
                  Fiche Candidat - {selectedCandidate.item.candidate_name}
                </h2>
                <button
                  onClick={() => {
                    setShowCandidateModal(false)
                    setSelectedCandidate(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Informations candidat */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Informations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Poste:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedCandidate.item.job_title}</span>
                    </div>
                    {selectedCandidate.item.candidate_email && (
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 text-gray-900">{selectedCandidate.item.candidate_email}</span>
                      </div>
                    )}
                    {selectedCandidate.item.candidate_phone && (
                      <div>
                        <span className="text-gray-600">Téléphone:</span>
                        <span className="ml-2 text-gray-900">{selectedCandidate.item.candidate_phone}</span>
                      </div>
                    )}
                    {selectedCandidate.candidate?.source && (
                      <div>
                        <span className="text-gray-600">Source:</span>
                        <span className="ml-2 text-gray-900">{selectedCandidate.candidate.source}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CV */}
                {selectedCandidate.item.candidate_cv_path && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-600" />
                      CV
                    </h3>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/${selectedCandidate.item.candidate_id}/cv`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Télécharger le CV
                    </a>
                  </div>
                )}

                {/* Notes du recruteur */}
                {selectedCandidate.candidate?.notes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                      Notes du recruteur
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedCandidate.candidate.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedCandidate.item.candidate_tags && selectedCandidate.item.candidate_tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-purple-600" />
                      Compétences & Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.item.candidate_tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulaire de décision (si pas encore décidé) */}
                {selectedCandidate.item.client_validated === null && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Votre décision (US12, US13)</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Commentaire pour le recruteur {selectedCandidate.item.client_validated === false && '(recommandé)'}
                        </label>
                        <textarea
                          value={validationData.feedback || ''}
                          onChange={(e) => setValidationData({ ...validationData, feedback: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ajoutez un commentaire pour expliquer votre décision au recruteur..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ce commentaire sera visible par le recruteur et le manager
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleValidate(true)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          {isLoading ? 'Validation...' : 'Valider pour offre'}
                        </button>
                        <button
                          onClick={() => handleValidate(false)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          {isLoading ? 'Rejet...' : 'Refuser'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Décision déjà prise */}
                {selectedCandidate.item.client_validated !== null && (
                  <div className="border-t border-gray-200 pt-6">
                    <div className={`p-4 rounded-lg ${
                      selectedCandidate.item.client_validated 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center mb-2">
                        {selectedCandidate.item.client_validated ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mr-2" />
                        )}
                        <span className={`font-semibold ${
                          selectedCandidate.item.client_validated ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {selectedCandidate.item.client_validated 
                            ? 'Candidat validé pour offre' 
                            : 'Candidat rejeté'}
                        </span>
                      </div>
                      {selectedCandidate.item.client_feedback && (
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="font-medium">Votre commentaire:</span> {selectedCandidate.item.client_feedback}
                        </p>
                      )}
                      {selectedCandidate.item.client_validated_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Décision prise le {new Date(selectedCandidate.item.client_validated_at).toLocaleDateString('fr-FR', {
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
                )}

                {/* Bouton historique */}
                {selectedCandidate.history.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => setShowHistoryModal(true)}
                      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Voir l&apos;historique des échanges ({selectedCandidate.history.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Historique */}
        {showHistoryModal && selectedCandidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <History className="w-5 h-5 mr-2" />
                  Historique des échanges
                </h2>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {selectedCandidate.history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Aucun historique disponible</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCandidate.history.map((entry) => (
                    <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {entry.changed_by_name}
                            </span>
                            <span className="text-xs text-gray-500">a changé le statut</span>
                          </div>
                          {entry.old_status && entry.new_status && (
                            <div className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">De:</span> {entry.old_status} 
                              <span className="mx-2">→</span>
                              <span className="font-medium">À:</span> {entry.new_status}
                            </div>
                          )}
                          {entry.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                              <span className="font-medium">Note:</span> {entry.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 ml-4">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(entry.created_at).toLocaleDateString('fr-FR', {
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
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
