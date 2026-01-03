'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Upload, FileText, Tag, Mail, Phone, Calendar, User, Briefcase, 
  Edit, X, Plus, Save, Eye, Clock, MapPin, MessageSquare, Star, CheckCircle2, 
  XCircle, AlertCircle, Users, Building2, Award, FileCheck
} from 'lucide-react'
import { 
  getCandidate, CandidateResponse, updateCandidateStatus, updateCandidate, CandidateUpdate,
  getJobs, JobResponse, createApplication, getCandidateApplications, ApplicationResponse,
  getInterviews, InterviewResponse, createInterview, InterviewCreate, addInterviewFeedback,
  InterviewFeedback, updateInterview, deleteInterview
} from '@/lib/api'
import { authenticatedFetch, getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function RecruiterCandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<CandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { success, error: showError } = useToastContext()

  // États pour les besoins
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)

  // États pour les entretiens
  const [interviews, setInterviews] = useState<InterviewResponse[]>([])
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(false)
  const [showInterviewForm, setShowInterviewForm] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState<InterviewResponse | null>(null)
  const [isSubmittingInterview, setIsSubmittingInterview] = useState(false)

  // Formulaire d'entretien
  const [interviewForm, setInterviewForm] = useState<{
    application_id: string
    interview_type: 'rh' | 'technique' | 'client' | 'prequalification' | 'qualification' | 'autre'
    scheduled_at: string
    scheduled_end_at: string
    location: string
    preparation_notes: string
    feedback: string
    decision: 'positif' | 'négatif' | 'en_attente'
    score: number | null
  }>({
    application_id: '',
    interview_type: 'rh',
    scheduled_at: '',
    scheduled_end_at: '',
    location: '',
    preparation_notes: '',
    feedback: '',
    decision: 'en_attente',
    score: null,
  })

  // Formulaire d'édition candidat
  const [formData, setFormData] = useState<CandidateUpdate>({
    first_name: '',
    last_name: '',
    profile_title: '',
    years_of_experience: undefined,
    email: '',
    phone: '',
    source: '',
    notes: '',
    tags: [],
    skills: [],
  })

  const [newTag, setNewTag] = useState('')
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    if (candidateId) {
      loadCandidate()
      loadJobs()
      loadApplications()
      loadInterviews()
    }
  }, [candidateId, router])

  useEffect(() => {
    if (candidate && !isEditing) {
      setFormData({
        first_name: candidate.first_name || '',
        last_name: candidate.last_name || '',
        profile_title: candidate.profile_title || '',
        years_of_experience: candidate.years_of_experience ?? undefined,
        email: candidate.email || '',
        phone: candidate.phone || '',
        source: candidate.source || '',
        notes: candidate.notes || '',
        tags: candidate.tags || [],
        skills: Array.isArray(candidate.skills) ? candidate.skills : (typeof candidate.skills === 'string' ? candidate.skills.split(',').map(s => s.trim()) : []),
      })
    }
  }, [candidate, isEditing])

  const loadCandidate = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const candidateData = await getCandidate(candidateId)
      setCandidate(candidateData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const loadJobs = async () => {
    try {
      const jobsData = await getJobs()
      setJobs(Array.isArray(jobsData) ? jobsData : [])
    } catch (error) {
      console.error('Erreur lors du chargement des jobs:', error)
    }
  }

  const loadApplications = async () => {
    try {
      const applicationsData = await getCandidateApplications(candidateId)
      setApplications(Array.isArray(applicationsData) ? applicationsData : [])
    } catch (error) {
      console.error('Erreur lors du chargement des applications:', error)
    }
  }

  const loadInterviews = async () => {
    try {
      setIsLoadingInterviews(true)
      const interviewsData = await getInterviews({ candidate_id: candidateId })
      setInterviews(interviewsData)
    } catch (error) {
      console.error('Erreur lors du chargement des entretiens:', error)
      setInterviews([])
    } finally {
      setIsLoadingInterviews(false)
    }
  }

  const handleSave = async () => {
    if (!candidate) return

    try {
      setIsSaving(true)
      const updatedCandidate = await updateCandidate(candidateId, formData)
      setCandidate(updatedCandidate)
      setIsEditing(false)
      success('Profil candidat mis à jour avec succès !')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      showError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (candidate) {
      setFormData({
        first_name: candidate.first_name || '',
        last_name: candidate.last_name || '',
        profile_title: candidate.profile_title || '',
        years_of_experience: candidate.years_of_experience ?? undefined,
        email: candidate.email || '',
        phone: candidate.phone || '',
        source: candidate.source || '',
        notes: candidate.notes || '',
        tags: candidate.tags || [],
        skills: Array.isArray(candidate.skills) ? candidate.skills : (typeof candidate.skills === 'string' ? candidate.skills.split(',').map(s => s.trim()) : []),
      })
    }
    setIsEditing(false)
    setNewTag('')
    setNewSkill('')
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()],
      })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || [],
    })
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills?.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), newSkill.trim()],
      })
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills?.filter(skill => skill !== skillToRemove) || [],
    })
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!candidate) return

    try {
      await updateCandidateStatus(candidateId, newStatus)
      await loadCandidate()
      const statusLabels: Record<string, string> = {
        sourcé: 'Sourcé',
        qualifié: 'Qualifié',
        entretien_rh: 'Entretien RH',
        entretien_client: 'Entretien Client',
        shortlist: 'Shortlist',
        offre: 'Offre',
        rejeté: 'Rejeté',
        embauché: 'Embauché',
      }
      const statusLabel = statusLabels[newStatus] || newStatus
      success(`Statut mis à jour : "${statusLabel}"`)
    } catch (err) {
      if (err instanceof Error && (err as any).isFeedbackError) {
        showError('Feedback manquant : Veuillez saisir un feedback avant de changer le statut')
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
        showError(errorMessage)
      }
    }
  }

  const handleAssignToJob = async () => {
    if (!selectedJobId || !candidate) return
    
    try {
      setIsAssigning(true)
      await createApplication({
        candidate_id: candidate.id!,
        job_id: selectedJobId,
        status: 'sourcé'
      })
      await loadApplications()
      setSelectedJobId('')
      success('Candidat attribué au besoin avec succès')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'attribution'
      showError(errorMessage)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleOpenInterviewForm = (applicationId: string, interview?: InterviewResponse) => {
    if (interview) {
      setSelectedInterview(interview)
      setInterviewForm({
        application_id: interview.application_id,
        interview_type: interview.interview_type as any,
        scheduled_at: interview.scheduled_at ? new Date(interview.scheduled_at).toISOString().slice(0, 16) : '',
        scheduled_end_at: interview.scheduled_end_at ? new Date(interview.scheduled_end_at).toISOString().slice(0, 16) : '',
        location: interview.location || '',
        preparation_notes: interview.preparation_notes || '',
        feedback: interview.feedback || '',
        decision: (interview.decision as any) || 'en_attente',
        score: interview.score || null,
      })
    } else {
      setSelectedInterview(null)
      setInterviewForm({
        application_id: applicationId,
        interview_type: 'rh',
        scheduled_at: '',
        scheduled_end_at: '',
        location: '',
        preparation_notes: '',
        feedback: '',
        decision: 'en_attente',
        score: null,
      })
    }
    setShowInterviewForm(true)
  }

  const handleCloseInterviewForm = () => {
    setShowInterviewForm(false)
    setSelectedInterview(null)
    setInterviewForm({
      application_id: '',
      interview_type: 'rh',
      scheduled_at: '',
      scheduled_end_at: '',
      location: '',
      preparation_notes: '',
      feedback: '',
      decision: 'en_attente',
      score: null,
    })
  }

  const handleSubmitInterview = async () => {
    if (!interviewForm.application_id || !interviewForm.scheduled_at) {
      showError('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setIsSubmittingInterview(true)

      if (selectedInterview) {
        // Mettre à jour l'entretien existant
        if (interviewForm.feedback) {
          await addInterviewFeedback(selectedInterview.id, {
            feedback: interviewForm.feedback,
            decision: interviewForm.decision,
            score: interviewForm.score || undefined,
          })
        }
        await updateInterview(selectedInterview.id, {
          interview_type: interviewForm.interview_type,
          scheduled_at: interviewForm.scheduled_at,
          scheduled_end_at: interviewForm.scheduled_end_at || undefined,
          location: interviewForm.location || undefined,
          preparation_notes: interviewForm.preparation_notes || undefined,
        })
        success('Entretien mis à jour avec succès')
      } else {
        // Créer un nouvel entretien
        const interviewData: InterviewCreate = {
          application_id: interviewForm.application_id,
          interview_type: interviewForm.interview_type,
          scheduled_at: interviewForm.scheduled_at,
          scheduled_end_at: interviewForm.scheduled_end_at || undefined,
          location: interviewForm.location || undefined,
          preparation_notes: interviewForm.preparation_notes || undefined,
        }
        const newInterview = await createInterview(interviewData)
        
        // Si un feedback est fourni, l'ajouter immédiatement
        if (interviewForm.feedback) {
          await addInterviewFeedback(newInterview.id, {
            feedback: interviewForm.feedback,
            decision: interviewForm.decision,
            score: interviewForm.score || undefined,
          })
        }
        success('Entretien créé avec succès')
      }

      await loadInterviews()
      handleCloseInterviewForm()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      showError(errorMessage)
    } finally {
      setIsSubmittingInterview(false)
    }
  }

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) return

    try {
      await deleteInterview(interviewId)
      await loadInterviews()
      success('Entretien supprimé avec succès')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      showError(errorMessage)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      sourcé: 'bg-gray-100 text-gray-800',
      qualifié: 'bg-blue-100 text-blue-800',
      entretien_rh: 'bg-yellow-100 text-yellow-800',
      entretien_client: 'bg-orange-100 text-orange-800',
      shortlist: 'bg-purple-100 text-purple-800',
      offre: 'bg-green-100 text-green-800',
      rejeté: 'bg-red-100 text-red-800',
      embauché: 'bg-emerald-100 text-emerald-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getInterviewTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rh: 'Entretien RH',
      technique: 'Entretien Technique',
      client: 'Entretien Client',
      prequalification: 'Préqualification',
      qualification: 'Qualification',
      autre: 'Autre',
    }
    return labels[type] || type
  }

  const getDecisionBadge = (decision?: string | null) => {
    if (!decision) return null
    const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      positif: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2, label: 'Positif' },
      négatif: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Négatif' },
      en_attente: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'En attente' },
    }
    const decisionConfig = config[decision] || config.en_attente
    const Icon = decisionConfig.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${decisionConfig.bg} ${decisionConfig.text}`}>
        <Icon className="w-3 h-3" />
        {decisionConfig.label}
      </span>
    )
  }

  // Grouper les entretiens par application
  const interviewsByApplication = useMemo(() => {
    interface InterviewGroup {
      application: ApplicationResponse
      interviews: InterviewResponse[]
    }
    const grouped: Record<string, InterviewGroup> = {}
    applications.forEach(app => {
      const appInterviews = interviews.filter(i => i.application_id === app.id)
      if (appInterviews.length > 0 || true) { // Toujours afficher même sans entretien
        grouped[app.id] = { application: app, interviews: appInterviews }
      }
    })
    return grouped
  }, [applications, interviews])

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Candidat non trouvé'}
        </div>
        <Link href="/recruiter/candidates" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Retour à la liste
        </Link>
      </div>
    )
  }

  const statusOptions = [
    'sourcé',
    'qualifié',
    'entretien_rh',
    'entretien_client',
    'shortlist',
    'offre',
    'rejeté',
    'embauché'
  ]

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="mb-6 lg:mb-8">
        <Link 
          href="/recruiter/candidates" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux candidats
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Profil Candidat
            </h1>
            <p className="text-gray-600 mt-1">Gestion complète du profil et des entretiens</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier le profil
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Profil */}
        <div className="lg:col-span-1 space-y-6">
          {/* Carte profil */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-center mb-4">
              {candidate.profile_picture_url || candidate.photo_url ? (
                <img
                  src={`${API_URL}${candidate.profile_picture_url || candidate.photo_url}`}
                  alt={`${candidate.first_name} ${candidate.last_name}`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                  <User className="w-16 h-16 text-white" />
                </div>
              )}
            </div>

            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full text-center px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                      placeholder="Prénom"
                    />
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full text-center px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nom"
                    />
                  </>
                ) : (
                  <>
                    {candidate.first_name} {candidate.last_name}
                  </>
                )}
              </h2>
              {!isEditing && candidate.profile_title && (
                <p className="text-sm text-gray-600 mt-1">
                  {candidate.profile_title}
                </p>
              )}
              {!isEditing && candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {candidate.years_of_experience} ans d&apos;expérience
                </p>
              )}
            </div>

            <div className="flex justify-center mb-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeColor(candidate.status)}`}>
                {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1).replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </>
              ) : (
                <>
                  {candidate.email && (
                    <a
                      href={`mailto:${candidate.email}`}
                      className="flex items-center text-sm text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="truncate">{candidate.email}</span>
                    </a>
                  )}
                  {candidate.phone && (
                    <a
                      href={`tel:${candidate.phone}`}
                      className="flex items-center text-sm text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{candidate.phone}</span>
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Statistiques</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Besoins attribués</span>
                <span className="text-lg font-bold text-gray-900">{applications.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Entretiens</span>
                <span className="text-lg font-bold text-gray-900">{interviews.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Entretiens avec feedback</span>
                <span className="text-lg font-bold text-gray-900">
                  {interviews.filter(i => i.feedback).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite - Contenu principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations détaillées */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2" />
              Informations détaillées
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.email || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  Téléphone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.phone || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre du profil</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.profile_title || ''}
                    onChange={(e) => setFormData({ ...formData, profile_title: e.target.value })}
                    placeholder="ex: Développeur Fullstack, Designer UX..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.profile_title || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Années d&apos;expérience</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.years_of_experience || ''}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined 
                      ? `${candidate.years_of_experience} ans` 
                      : '-'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="LinkedIn, APEC, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.source || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Date de création
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(candidate.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Tags et Compétences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tags */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Tags & Mots-clés
              </h2>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {formData.tags && formData.tags.length > 0 ? (
                      formData.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Aucun tag associé</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Ajouter un tag"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {candidate.tags && candidate.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {candidate.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucun tag associé</p>
                  )}
                </>
              )}
            </div>

            {/* Compétences */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Compétences
              </h2>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {formData.skills && formData.skills.length > 0 ? (
                      formData.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                        >
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Aucune compétence renseignée</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                      placeholder="Ajouter une compétence"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {typeof candidate.skills === 'string' ? (
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.split(',').map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  ) : Array.isArray(candidate.skills) && candidate.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucune compétence renseignée</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Attribution à un besoin */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2" />
              Attribution à un besoin
            </h2>
            
            {applications.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Besoins attribués</h3>
                <div className="space-y-2">
                  {applications.map((app) => {
                    const job = jobs.find(j => j.id === app.job_id)
                    return (
                      <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {job ? job.title : 'Besoin inconnu'}
                            {job?.department && (
                              <span className="text-gray-500 ml-2">- {job.department}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Statut: {app.status}
                          </p>
                        </div>
                        {job && (
                          <Link
                            href={`/recruiter/jobs/${job.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Voir le besoin
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attribuer à un nouveau besoin
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Sélectionner un besoin --</option>
                  {jobs
                    .filter(job => !applications.some(app => app.job_id === job.id))
                    .map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                        {job.department && ` - ${job.department}`}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAssignToJob}
                  disabled={!selectedJobId || isAssigning}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAssigning ? 'Attribution...' : 'Attribuer'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Le candidat sera attribué au besoin sélectionné avec le statut "Sourcé"
              </p>
            </div>
          </div>

          {/* Comptes rendus d'entretien */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Comptes rendus d&apos;entretien
              </h2>
              {applications.length > 0 && (
                <button
                  onClick={() => {
                    if (applications.length === 1) {
                      handleOpenInterviewForm(applications[0].id)
                    } else {
                      // Si plusieurs applications, on pourrait ouvrir un modal pour choisir
                      handleOpenInterviewForm(applications[0].id)
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nouvel entretien
                </button>
              )}
            </div>

            {isLoadingInterviews ? (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm">Chargement des entretiens...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  Aucun besoin attribué. Attribuez d&apos;abord le candidat à un besoin pour créer des entretiens.
                </p>
              </div>
            ) : Object.keys(interviewsByApplication).length === 0 && interviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  Aucun entretien enregistré pour ce candidat.
                </p>
                <button
                  onClick={() => handleOpenInterviewForm(applications[0].id)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Créer le premier entretien
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {applications.map((app) => {
                  const job = jobs.find(j => j.id === app.job_id)
                  const appInterviews = interviews.filter(i => i.application_id === app.id)
                  
                  return (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {job ? job.title : 'Besoin inconnu'}
                            {job?.department && (
                              <span className="text-gray-500 font-normal ml-2">- {job.department}</span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {appInterviews.length} entretien{appInterviews.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenInterviewForm(app.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter
                        </button>
                      </div>

                      {appInterviews.length > 0 ? (
                        <div className="space-y-4">
                          {appInterviews.map((interview) => (
                            <div key={interview.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                      {getInterviewTypeLabel(interview.interview_type)}
                                    </span>
                                    {getDecisionBadge(interview.decision)}
                                    {interview.score !== null && interview.score !== undefined && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-medium">{interview.score}/10</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-400" />
                                      <span>
                                        {new Date(interview.scheduled_at).toLocaleDateString('fr-FR', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    {interview.location && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span>{interview.location}</span>
                                      </div>
                                    )}
                                    {interview.interviewer_name && (
                                      <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span>{interview.interviewer_name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenInterviewForm(app.id, interview)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Modifier"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInterview(interview.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Supprimer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {interview.preparation_notes && (
                                <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Notes de préparation</p>
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{interview.preparation_notes}</p>
                                </div>
                              )}

                              {interview.feedback ? (
                                <div className="p-3 bg-white rounded border border-gray-200">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Compte rendu</p>
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{interview.feedback}</p>
                                  {interview.feedback_provided_at && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      Rédigé le {new Date(interview.feedback_provided_at).toLocaleDateString('fr-FR')}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                  <p className="text-sm text-yellow-800">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    Aucun compte rendu renseigné
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-gray-500">
                          Aucun entretien pour ce besoin
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes internes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes internes</h2>
            {isEditing ? (
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes internes sur le candidat..."
              />
            ) : (
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {candidate.notes || 'Aucune note'}
              </p>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Documents
            </h2>
            
            <div className="space-y-4">
              {candidate.cv_file_path ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">CV</p>
                      <p className="text-xs text-gray-500">Document disponible</p>
                    </div>
                  </div>
                  <a
                    href={`${API_URL}/candidates/${candidateId}/cv`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Voir le CV
                  </a>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">Aucun CV uploadé</p>
                </div>
              )}
            </div>
          </div>

          {/* Statut */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statut actuel</h2>
            <select
              value={candidate.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Boutons d'action en mode édition */}
          {isEditing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de création/édition d'entretien */}
      {showInterviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedInterview ? 'Modifier l\'entretien' : 'Nouvel entretien'}
              </h2>
              <button
                onClick={handleCloseInterviewForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Besoin concerné *
                  </label>
                  <select
                    value={interviewForm.application_id}
                    onChange={(e) => setInterviewForm({ ...interviewForm, application_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!!selectedInterview}
                  >
                    <option value="">-- Sélectionner un besoin --</option>
                    {applications.map((app) => {
                      const job = jobs.find(j => j.id === app.job_id)
                      return (
                        <option key={app.id} value={app.id}>
                          {job ? job.title : 'Besoin inconnu'}
                          {job?.department && ` - ${job.department}`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d&apos;entretien *
                  </label>
                  <select
                    value={interviewForm.interview_type}
                    onChange={(e) => setInterviewForm({ ...interviewForm, interview_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rh">Entretien RH</option>
                    <option value="technique">Entretien Technique</option>
                    <option value="client">Entretien Client</option>
                    <option value="prequalification">Préqualification</option>
                    <option value="qualification">Qualification</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date et heure *
                  </label>
                  <input
                    type="datetime-local"
                    value={interviewForm.scheduled_at}
                    onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date et heure de fin
                  </label>
                  <input
                    type="datetime-local"
                    value={interviewForm.scheduled_end_at}
                    onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_end_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lieu ou lien visioconférence
                  </label>
                  <input
                    type="text"
                    value={interviewForm.location}
                    onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                    placeholder="Bureau 205 ou https://meet.google.com/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes de préparation
                </label>
                <textarea
                  value={interviewForm.preparation_notes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, preparation_notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Points à aborder, questions à poser..."
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Compte rendu d&apos;entretien
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback *
                    </label>
                    <textarea
                      value={interviewForm.feedback}
                      onChange={(e) => setInterviewForm({ ...interviewForm, feedback: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Décrivez le déroulement de l'entretien, les points forts et faibles du candidat, votre impression générale..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Décision *
                      </label>
                      <select
                        value={interviewForm.decision}
                        onChange={(e) => setInterviewForm({ ...interviewForm, decision: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="en_attente">En attente</option>
                        <option value="positif">Positif</option>
                        <option value="négatif">Négatif</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Score (sur 10)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={interviewForm.score || ''}
                        onChange={(e) => setInterviewForm({ ...interviewForm, score: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseInterviewForm}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitInterview}
                  disabled={isSubmittingInterview || !interviewForm.application_id || !interviewForm.scheduled_at || !interviewForm.feedback}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingInterview ? 'Enregistrement...' : selectedInterview ? 'Mettre à jour' : 'Créer l\'entretien'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
