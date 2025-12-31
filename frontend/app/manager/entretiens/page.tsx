'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  getInterviews, 
  createInterview, 
  addInterviewFeedback,
  InterviewResponse,
  InterviewCreate,
  InterviewFeedback
} from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { Plus, X, Calendar, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function ManagerEntretiensPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error: showError } = useToastContext()
  const [interviews, setInterviews] = useState<InterviewResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null)
  const [selectedInterview, setSelectedInterview] = useState<InterviewResponse | null>(null)

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
    // Vérifier l'authentification avant de charger les données
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    // Vérifier si on doit afficher le formulaire de création
    const action = searchParams.get('action')
    if (action === 'new') {
      setShowModal(true)
    }

    loadInterviews()
  }, [router, searchParams])

  const loadInterviews = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getInterviews()
      setInterviews(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Erreur lors du chargement des entretiens:', err)
      setError('Impossible de charger les entretiens. Vérifiez votre connexion.')
      setInterviews([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.application_id) {
      showError('Veuillez sélectionner une candidature')
      return
    }

    try {
      setIsLoading(true)
      await createInterview(formData as InterviewCreate)
      success('Entretien planifié avec succès')
      setShowModal(false)
      setFormData({
        interview_type: 'rh',
        scheduled_at: '',
        location: '',
        preparation_notes: ''
      })
      loadInterviews()
    } catch (err) {
      console.error('Erreur lors de la création:', err)
      showError('Erreur lors de la planification de l\'entretien')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackData.feedback) {
      showError('Le feedback est obligatoire')
      return
    }

    if (!showFeedbackModal) return

    try {
      setIsLoading(true)
      await addInterviewFeedback(showFeedbackModal, feedbackData as InterviewFeedback)
      success('Feedback enregistré avec succès')
      setShowFeedbackModal(null)
      setSelectedInterview(null)
      setFeedbackData({
        feedback: '',
        decision: 'en_attente',
        score: undefined
      })
      loadInterviews()
    } catch (err) {
      console.error('Erreur lors de l\'ajout du feedback:', err)
      showError('Erreur lors de l\'enregistrement du feedback')
    } finally {
      setIsLoading(false)
    }
  }

  const getInterviewTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'rh': 'Entretien RH',
      'technique': 'Entretien Technique',
      'client': 'Entretien Client'
    }
    return labels[type] || type
  }

  const getDecisionBadge = (decision: string) => {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
      'en_attente': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      'positif': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'négatif': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    }
    const conf = config[decision] || config['en_attente']
    const Icon = conf.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${conf.bg} ${conf.text} rounded-full`}>
        <Icon className="w-3 h-3" />
        {decision}
      </span>
    )
  }

  if (isLoading && interviews.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Chargement des entretiens...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entretiens</h1>
          <p className="text-gray-600 mt-2">Planification et suivi des entretiens</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Planifier un entretien
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Liste des entretiens */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {interviews.length} entretien{interviews.length > 1 ? 's' : ''}
          </h2>
        </div>
        <div className="p-6">
          {interviews.length > 0 ? (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {getInterviewTypeLabel(interview.interview_type)}
                        </h3>
                        {getDecisionBadge(interview.decision || 'en_attente')}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(interview.scheduled_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {interview.location && (
                          <span>{interview.location}</span>
                        )}
                      </div>
                      {interview.feedback && (
                        <p className="text-sm text-gray-600 mt-2">{interview.feedback}</p>
                      )}
                    </div>
                    {!interview.feedback && (
                      <button
                        onClick={() => {
                          setSelectedInterview(interview)
                          setShowFeedbackModal(interview.id || '')
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Ajouter feedback
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Aucun entretien planifié</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Planifier votre premier entretien
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de planification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Planifier un entretien</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateInterview} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'entretien *
                </label>
                <select
                  required
                  value={formData.interview_type}
                  onChange={(e) => setFormData({ ...formData, interview_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="rh">Entretien RH</option>
                  <option value="technique">Entretien Technique</option>
                  <option value="client">Entretien Client</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lieu
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes de préparation
                </label>
                <textarea
                  value={formData.preparation_notes}
                  onChange={(e) => setFormData({ ...formData, preparation_notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Planification...' : 'Planifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de feedback */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Ajouter un feedback</h2>
              <button
                onClick={() => {
                  setShowFeedbackModal(null)
                  setSelectedInterview(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddFeedback} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback * (obligatoire pour passer à l'étape suivante)
                </label>
                <textarea
                  required
                  value={feedbackData.feedback}
                  onChange={(e) => setFeedbackData({ ...feedbackData, feedback: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Décrivez votre évaluation du candidat..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Décision
                </label>
                <select
                  value={feedbackData.decision}
                  onChange={(e) => setFeedbackData({ ...feedbackData, decision: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedbackModal(null)
                    setSelectedInterview(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

