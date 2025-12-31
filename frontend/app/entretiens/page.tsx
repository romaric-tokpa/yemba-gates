'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  getInterviews, 
  createInterview, 
  addInterviewFeedback,
  InterviewResponse,
  InterviewCreate,
  InterviewFeedback
} from '@/lib/api'
import { getUserRole } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'

export default function EntretiensPage() {
  const [interviews, setInterviews] = useState<InterviewResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null)
  const [selectedInterview, setSelectedInterview] = useState<InterviewResponse | null>(null)
  const { success, error: showError } = useToastContext()

  // Formulaire planification
  const [formData, setFormData] = useState<Partial<InterviewCreate>>({
    interview_type: 'rh',
    scheduled_at: '',
    location: '',
    preparation_notes: ''
  })

  // Formulaire feedback
  const [feedbackData, setFeedbackData] = useState<Partial<InterviewFeedback>>({
    feedback: '',
    decision: 'en_attente',
    score: undefined
  })

  useEffect(() => {
    loadInterviews()
  }, [])

  const loadInterviews = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getInterviews()
      setInterviews(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.application_id || !formData.scheduled_at) {
      showError('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setIsLoading(true)
      await createInterview(formData as InterviewCreate)
      setShowModal(false)
      setFormData({ interview_type: 'rh', scheduled_at: '', location: '', preparation_notes: '' })
      await loadInterviews()
      success('Entretien planifié avec succès !')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la planification'
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackData.feedback || !selectedInterview) {
      showError('Veuillez remplir le feedback')
      return
    }

    try {
      setIsLoading(true)
      await addInterviewFeedback(selectedInterview.id, feedbackData as InterviewFeedback)
      setShowFeedbackModal(null)
      setSelectedInterview(null)
      setFeedbackData({ feedback: '', decision: 'en_attente', score: undefined })
      await loadInterviews()
      success('Feedback ajouté avec succès !')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'ajout du feedback'
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (interview: InterviewResponse) => {
    if (interview.feedback) {
      if (interview.decision === 'positif') {
        return <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Feedback positif</span>
      } else if (interview.decision === 'négatif') {
        return <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Feedback négatif</span>
      }
      return <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">En attente</span>
    }
    return <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">À venir</span>
  }

  const upcomingInterviews = interviews.filter(i => new Date(i.scheduled_at) >= new Date() && !i.feedback)
  const pastInterviews = interviews.filter(i => new Date(i.scheduled_at) < new Date() || i.feedback)

  return (
    <ProtectedRoute allowedRoles={['recruteur', 'manager', 'administrateur']}>
      <div className="p-4 lg:p-8">
        <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Entretiens</h1>
            <p className="text-gray-600 mt-2 text-sm lg:text-base">Planifiez et suivez vos entretiens</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm lg:text-base"
          >
            + Planifier un entretien
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-gray-900">
                {interviews.filter(i => {
                  const date = new Date(i.scheduled_at)
                  const today = new Date()
                  return date.toDateString() === today.toDateString()
                }).length}
              </p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Aujourd&apos;hui</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-gray-900">
                {interviews.filter(i => {
                  const date = new Date(i.scheduled_at)
                  const weekStart = new Date()
                  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
                  return date >= weekStart
                }).length}
              </p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Cette semaine</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-gray-900">
                {pastInterviews.filter(i => !i.feedback).length}
              </p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">En attente feedback</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{upcomingInterviews.length}</p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">À planifier</p>
            </div>
          </div>
        </div>

        {/* Liste des entretiens */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Calendrier des entretiens</h2>
          </div>
          <div className="p-4 lg:p-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Chargement...</div>
            ) : interviews.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Aucun entretien planifié</div>
            ) : (
              <div className="space-y-4">
                {interviews.map((interview) => (
                  <div 
                    key={interview.id} 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-700">
                          {interview.candidate_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{interview.candidate_name}</p>
                        <p className="text-sm text-gray-600">
                          {interview.interview_type === 'rh' ? 'Entretien RH' : 
                           interview.interview_type === 'technique' ? 'Entretien technique' : 
                           'Entretien client'} - {interview.job_title}
                        </p>
                        {interview.interviewer_name && (
                          <p className="text-xs text-gray-500">Interviewer: {interview.interviewer_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(interview.scheduled_at).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(interview.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {interview.location && (
                          <p className="text-xs text-gray-500">{interview.location}</p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        {getStatusBadge(interview)}
                        {!interview.feedback && new Date(interview.scheduled_at) < new Date() && (
                          <button 
                            onClick={() => {
                              setSelectedInterview(interview)
                              setShowFeedbackModal(interview.id)
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border border-blue-600 rounded hover:bg-blue-50"
                          >
                            Ajouter feedback
                          </button>
                        )}
                        {interview.feedback && (
                          <button 
                            onClick={() => {
                              setSelectedInterview(interview)
                              setShowFeedbackModal(interview.id)
                            }}
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Voir feedback
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal planification */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Planifier un entretien</h2>
              <form onSubmit={handleCreateInterview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Candidature (application_id) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.application_id || ''}
                    onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="UUID de la candidature"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d&apos;entretien *
                  </label>
                  <select
                    required
                    value={formData.interview_type}
                    onChange={(e) => setFormData({ ...formData, interview_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rh">Entretien RH</option>
                    <option value="technique">Entretien technique</option>
                    <option value="client">Entretien client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date et heure *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lieu / Lien visioconférence
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Lieu ou lien Zoom/Teams"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes de préparation
                  </label>
                  <textarea
                    value={formData.preparation_notes || ''}
                    onChange={(e) => setFormData({ ...formData, preparation_notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notes pour préparer l'entretien"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Planification...' : 'Planifier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal feedback */}
        {showFeedbackModal && selectedInterview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Feedback entretien</h2>
              <p className="text-sm text-gray-600 mb-4">
                {selectedInterview.candidate_name} - {selectedInterview.job_title}
              </p>
              <form onSubmit={handleAddFeedback} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback * (obligatoire)
                  </label>
                  <textarea
                    required
                    value={feedbackData.feedback || ''}
                    onChange={(e) => setFeedbackData({ ...feedbackData, feedback: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Détails de l'entretien, points forts, points à améliorer..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Décision *
                  </label>
                  <select
                    required
                    value={feedbackData.decision}
                    onChange={(e) => setFeedbackData({ ...feedbackData, decision: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="positif">Positif</option>
                    <option value="négatif">Négatif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score (sur 10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={feedbackData.score || ''}
                    onChange={(e) => setFeedbackData({ ...feedbackData, score: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0-10"
                  />
                </div>
                {selectedInterview.feedback && (
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-1">Feedback actuel:</p>
                    <p className="text-sm text-gray-600">{selectedInterview.feedback}</p>
                    {selectedInterview.score && (
                      <p className="text-sm text-gray-600 mt-1">Score: {selectedInterview.score}/10</p>
                    )}
                  </div>
                )}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Enregistrement...' : 'Enregistrer feedback'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeedbackModal(null)
                      setSelectedInterview(null)
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
