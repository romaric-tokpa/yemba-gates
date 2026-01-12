'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Upload, FileText, Tag, Mail, Phone, Calendar, User, Briefcase, 
  Edit, X, Plus, Save, Eye, Clock, MapPin, MessageSquare, Star, CheckCircle2, 
  XCircle, AlertCircle, Users, Building2, Award, FileCheck, BarChart3, TrendingUp, TrendingDown, Sparkles, Loader2, Download
} from 'lucide-react'
import { 
  getCandidate, CandidateResponse, updateCandidateStatus, updateCandidate, CandidateUpdate,
  getJobs, JobResponse, createApplication, getCandidateApplications, ApplicationResponse,
  getInterviews, InterviewResponse, createInterview, InterviewCreate, addInterviewFeedback,
  InterviewFeedback, updateInterview, deleteInterview, compareCandidateWithJob, getSavedComparison, JobCandidateComparisonResponse
} from '@/lib/api'
import { authenticatedFetch, getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { getCandidatePhotoUrl } from '@/lib/imageUtils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ManagerCandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<CandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string; type: string; filePath?: string } | null>(null)
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
  
  // États pour les onglets et le comparatif
  const [activeTab, setActiveTab] = useState<'profil' | 'postes' | 'entretiens'>('profil')
  const [selectedJobForComparison, setSelectedJobForComparison] = useState<JobResponse | null>(null)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  
  // États pour l'analyse IA
  const [aiAnalysis, setAiAnalysis] = useState<JobCandidateComparisonResponse | null>(null)
  const [isLoadingAiAnalysis, setIsLoadingAiAnalysis] = useState(false)
  // États pour les analyses IA par job (pour l'affichage dans la liste des postes)
  const [jobAnalyses, setJobAnalyses] = useState<Record<string, JobCandidateComparisonResponse>>({})
  const [loadingJobAnalyses, setLoadingJobAnalyses] = useState<Record<string, boolean>>({})
  
  // États pour l'édition des entretiens dans la fiche
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null)
  const [editingInterviewData, setEditingInterviewData] = useState<{
    feedback: string
    decision: 'positif' | 'négatif' | 'en_attente'
    score: number | null
    prequalification_competences_techniques: string
    prequalification_experience: string
    prequalification_motivation: string
    prequalification_salaire: string
    prequalification_disponibilite: string
    prequalification_remarques: string
    qualification_competences_techniques: string
    qualification_competences_comportementales: string
    qualification_culture_entreprise: string
    qualification_potentiel: string
    qualification_remarques: string
  } | null>(null)
  const [isSavingInterviewEdit, setIsSavingInterviewEdit] = useState(false)

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
    // Champs pour préqualification
    prequalification_competences_techniques: string
    prequalification_experience: string
    prequalification_motivation: string
    prequalification_salaire: string
    prequalification_disponibilite: string
    prequalification_remarques: string
    // Champs pour qualification
    qualification_competences_techniques: string
    qualification_competences_comportementales: string
    qualification_culture_entreprise: string
    qualification_potentiel: string
    qualification_remarques: string
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
    // Préqualification
    prequalification_competences_techniques: '',
    prequalification_experience: '',
    prequalification_motivation: '',
    prequalification_salaire: '',
    prequalification_disponibilite: '',
    prequalification_remarques: '',
    // Qualification
    qualification_competences_techniques: '',
    qualification_competences_comportementales: '',
    qualification_culture_entreprise: '',
    qualification_potentiel: '',
    qualification_remarques: '',
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

  // Fonction pour obtenir le type de fichier
  const getFileType = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || ''
    if (['pdf'].includes(extension)) return 'pdf'
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image'
    if (['doc', 'docx'].includes(extension)) return 'word'
    return 'other'
  }

  // Fonction pour obtenir le nom du fichier
  const getFileName = (filePath: string): string => {
    return filePath.split('/').pop() || 'document'
  }

  // Fonction pour normaliser le chemin du fichier (s'assurer qu'il commence par /)
  const normalizeFilePath = (filePath: string | null | undefined): string => {
    if (!filePath) return ''
    // Supprimer les espaces et normaliser
    const cleaned = filePath.trim()
    // S'assurer que le chemin commence par /
    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
  }

  // Fonction pour télécharger un fichier
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const token = getToken()
      const headers: HeadersInit = {}
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const normalizedPath = normalizeFilePath(filePath)
      const response = await fetch(`${API_URL}${normalizedPath}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du téléchargement'
      showError(errorMessage)
    }
  }

  // Fonction pour ouvrir la prévisualisation
  const handlePreview = async (filePath: string, name: string) => {
    try {
      const fileType = getFileType(filePath)
      
      // Télécharger le fichier avec authentification
      const token = getToken()
      const headers: HeadersInit = {}
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const normalizedPath = normalizeFilePath(filePath)
      const response = await fetch(`${API_URL}${normalizedPath}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du fichier')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      setPreviewDocument({
        url: blobUrl,
        name: name,
        type: fileType,
        filePath: filePath
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la prévisualisation'
      showError(errorMessage)
    }
  }

  // Fonction pour fermer la prévisualisation
  const closePreview = () => {
    // Nettoyer l'URL blob pour libérer la mémoire
    if (previewDocument?.url && previewDocument.url.startsWith('blob:')) {
      window.URL.revokeObjectURL(previewDocument.url)
    }
    setPreviewDocument(null)
  }

  // Nettoyer les URLs blob lors du démontage
  useEffect(() => {
    return () => {
      if (previewDocument?.url && previewDocument.url.startsWith('blob:')) {
        window.URL.revokeObjectURL(previewDocument.url)
      }
    }
  }, [previewDocument])

  // Charger les analyses IA pour tous les postes du candidat
  const loadJobAnalyses = async () => {
    if (!candidate || !candidate.cv_file_path || applications.length === 0) return
    
    const newAnalyses: Record<string, JobCandidateComparisonResponse> = {}
    const newLoading: Record<string, boolean> = {}
    
    // Charger les analyses pour chaque application
    for (const app of applications) {
      const jobId = app.job_id
      if (!jobId) continue
      
      newLoading[jobId] = true
      setLoadingJobAnalyses(prev => ({ ...prev, [jobId]: true }))
      
      try {
        const savedAnalysis = await getSavedComparison(candidate.id!, jobId)
        if (savedAnalysis) {
          newAnalyses[jobId] = savedAnalysis
        }
      } catch (err) {
        // Pas d'analyse sauvegardée, ce n'est pas une erreur
        console.log(`Aucune analyse IA sauvegardée pour le job ${jobId}`)
      } finally {
        newLoading[jobId] = false
        setLoadingJobAnalyses(prev => ({ ...prev, [jobId]: false }))
      }
    }
    
    setJobAnalyses(newAnalyses)
  }

  // Charger les analyses IA quand les applications sont chargées
  useEffect(() => {
    if (applications.length > 0 && candidate && candidate.cv_file_path) {
      loadJobAnalyses()
    }
  }, [applications.length, candidate?.id, candidate?.cv_file_path])

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

  const handleAiAnalysis = async (forceNew: boolean = false) => {
    if (!candidate || !selectedJobForComparison) return
    
    try {
      setIsLoadingAiAnalysis(true)
      
      // Essayer d'abord de charger l'analyse sauvegardée si on ne force pas une nouvelle analyse
      if (!forceNew) {
        try {
          const savedAnalysis = await getSavedComparison(candidate.id!, selectedJobForComparison.id)
          if (savedAnalysis) {
            setAiAnalysis(savedAnalysis)
            setIsLoadingAiAnalysis(false)
            success('Analyse IA chargée depuis la sauvegarde')
            return
          }
        } catch (err) {
          // Si l'analyse sauvegardée n'existe pas, continuer pour créer une nouvelle
          console.log('Aucune analyse sauvegardée trouvée, création d\'une nouvelle analyse...')
        }
      }
      
      // Créer une nouvelle analyse (qui sera automatiquement sauvegardée par le backend)
      const analysis = await compareCandidateWithJob(candidate.id!, selectedJobForComparison.id)
      setAiAnalysis(analysis)
      success(forceNew ? 'Analyse IA régénérée et sauvegardée avec succès !' : 'Analyse IA effectuée et sauvegardée avec succès !')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'analyse IA'
      showError(errorMessage)
    } finally {
      setIsLoadingAiAnalysis(false)
    }
  }

  // Charger l'analyse sauvegardée ou créer une nouvelle quand le modal s'ouvre
  useEffect(() => {
    if (showComparisonModal && selectedJobForComparison && candidate && candidate.cv_file_path && !aiAnalysis && !isLoadingAiAnalysis) {
      // Réinitialiser l'analyse quand on change de job
      setAiAnalysis(null)
      handleAiAnalysis(false) // false = essayer de charger l'analyse sauvegardée d'abord
    }
  }, [showComparisonModal, selectedJobForComparison?.id, candidate?.id])
  
  // Réinitialiser l'analyse quand on ferme le modal
  useEffect(() => {
    if (!showComparisonModal) {
      setAiAnalysis(null)
    }
  }, [showComparisonModal])

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

  const handleOpenInterviewForm = (applicationId: string, interview?: InterviewResponse, interviewType?: 'rh' | 'technique' | 'client' | 'prequalification' | 'qualification' | 'autre') => {
    if (interview) {
      setSelectedInterview(interview)
      // Parser le feedback pour extraire les champs structurés si disponibles
      const feedbackData = interview.feedback || ''
      const parsedData = parseFeedbackData(feedbackData, interview.interview_type as any)
      
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
        ...parsedData,
      })
    } else {
      setSelectedInterview(null)
      setInterviewForm({
        application_id: applicationId,
        interview_type: interviewType || 'rh',
        scheduled_at: '',
        scheduled_end_at: '',
        location: '',
        preparation_notes: '',
        feedback: '',
        decision: 'en_attente',
        score: null,
        // Préqualification
        prequalification_competences_techniques: '',
        prequalification_experience: '',
        prequalification_motivation: '',
        prequalification_salaire: '',
        prequalification_disponibilite: '',
        prequalification_remarques: '',
        // Qualification
        qualification_competences_techniques: '',
        qualification_competences_comportementales: '',
        qualification_culture_entreprise: '',
        qualification_potentiel: '',
        qualification_remarques: '',
      })
    }
    setShowInterviewForm(true)
  }

  // Fonction pour parser les données de feedback structurées
  const parseFeedbackData = (feedback: string, interviewType: string) => {
    const defaultData = {
      prequalification_competences_techniques: '',
      prequalification_experience: '',
      prequalification_motivation: '',
      prequalification_salaire: '',
      prequalification_disponibilite: '',
      prequalification_remarques: '',
      qualification_competences_techniques: '',
      qualification_competences_comportementales: '',
      qualification_culture_entreprise: '',
      qualification_potentiel: '',
      qualification_remarques: '',
    }

    // Si le feedback contient des marqueurs JSON, on essaie de le parser
    try {
      if (feedback.includes('{') && feedback.includes('}')) {
        const jsonMatch = feedback.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return { ...defaultData, ...parsed }
        }
      }
    } catch (e) {
      // Si le parsing échoue, on garde les valeurs par défaut
    }

    return defaultData
  }

  // Fonction pour formater les données de feedback selon le type d'entretien
  const formatFeedbackData = (formData: typeof interviewForm) => {
    if (formData.interview_type === 'prequalification') {
      return JSON.stringify({
        competences_techniques: formData.prequalification_competences_techniques,
        experience: formData.prequalification_experience,
        motivation: formData.prequalification_motivation,
        salaire: formData.prequalification_salaire,
        disponibilite: formData.prequalification_disponibilite,
        remarques: formData.prequalification_remarques,
      })
    } else if (formData.interview_type === 'qualification') {
      return JSON.stringify({
        competences_techniques: formData.qualification_competences_techniques,
        competences_comportementales: formData.qualification_competences_comportementales,
        culture_entreprise: formData.qualification_culture_entreprise,
        potentiel: formData.qualification_potentiel,
        remarques: formData.qualification_remarques,
      })
    }
    return formData.feedback
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
      // Préqualification
      prequalification_competences_techniques: '',
      prequalification_experience: '',
      prequalification_motivation: '',
      prequalification_salaire: '',
      prequalification_disponibilite: '',
      prequalification_remarques: '',
      // Qualification
      qualification_competences_techniques: '',
      qualification_competences_comportementales: '',
      qualification_culture_entreprise: '',
      qualification_potentiel: '',
      qualification_remarques: '',
    })
  }

  const handleSubmitInterview = async () => {
    if (!interviewForm.application_id || !interviewForm.scheduled_at) {
      showError('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setIsSubmittingInterview(true)

      // Formater le feedback selon le type d'entretien
      const formattedFeedback = formatFeedbackData(interviewForm)

      if (selectedInterview) {
        // Mettre à jour l'entretien existant
        if (formattedFeedback) {
          await addInterviewFeedback(selectedInterview.id, {
            feedback: formattedFeedback,
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
        const formattedFeedback = formatFeedbackData(interviewForm)
        if (formattedFeedback) {
          await addInterviewFeedback(newInterview.id, {
            feedback: formattedFeedback,
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
        <Link href="/manager/candidats" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header avec fond coloré */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <Link 
            href="/manager/candidats" 
            className="inline-flex items-center text-emerald-100 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Retour aux candidats</span>
          </Link>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Photo/Avatar */}
            <div className="relative">
              {(() => {
                const photoUrl = getCandidatePhotoUrl(candidate, API_URL)
                if (photoUrl) {
                  return (
                    <img
                      src={photoUrl}
                      alt={`${candidate.first_name} ${candidate.last_name}`}
                      className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl object-cover border-4 border-white shadow-2xl"
                      onError={(e) => {
                        // Si l'image ne se charge pas, afficher l'avatar par défaut
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const fallback = document.createElement('div')
                          fallback.className = 'w-32 h-32 lg:w-40 lg:h-40 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white shadow-2xl'
                          fallback.innerHTML = `<svg class="w-16 h-16 lg:w-20 lg:h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                  )
                }
                return (
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white shadow-2xl">
                    <User className="w-16 h-16 lg:w-20 lg:h-20 text-white" />
                  </div>
                )
              })()}
              <div className="absolute -bottom-2 -right-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                  candidate.status === 'embauché' ? 'bg-green-500 text-white' :
                  candidate.status === 'rejeté' ? 'bg-red-500 text-white' :
                  candidate.status === 'offre' ? 'bg-yellow-500 text-white' :
                  candidate.status === 'shortlist' ? 'bg-blue-500 text-white' :
                  'bg-white text-emerald-600'
                }`}>
                  {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1).replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Informations principales */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                    {isEditing ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white"
                          placeholder="Prénom"
                        />
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white"
                          placeholder="Nom"
                        />
                      </div>
                    ) : (
                      <>
                        {candidate.first_name} {candidate.last_name}
                      </>
                    )}
                  </h1>
                  {!isEditing && candidate.profile_title && (
                    <p className="text-lg text-emerald-100 mb-2">{candidate.profile_title}</p>
                  )}
                  {!isEditing && candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
                    <p className="text-sm text-emerald-200">
                      {candidate.years_of_experience} ans d&apos;expérience
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <Edit className="w-5 h-5" />
                    Modifier
                  </button>
                )}
              </div>

              {/* Contact rapide */}
              {!isEditing && (
                <div className="flex flex-wrap gap-4 mt-6">
                  {candidate.email && (
                    <a
                      href={`mailto:${candidate.email}`}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{candidate.email}</span>
                    </a>
                  )}
                  {candidate.phone && (
                    <a
                      href={`tel:${candidate.phone}`}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{candidate.phone}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 -mt-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Besoins attribués</p>
                <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total entretiens</p>
                <p className="text-3xl font-bold text-gray-900">{interviews.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avec feedback</p>
                <p className="text-3xl font-bold text-gray-900">
                  {interviews.filter(i => i.feedback).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FileCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-8">
        {/* Système d'onglets moderne */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profil')}
                className={`flex-1 px-6 py-5 text-sm font-semibold transition-all relative ${
                  activeTab === 'profil'
                    ? 'text-indigo-600 bg-white'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <User className={`w-5 h-5 ${activeTab === 'profil' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span>Profil</span>
                </div>
                {activeTab === 'profil' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('postes')}
                className={`flex-1 px-6 py-5 text-sm font-semibold transition-all relative ${
                  activeTab === 'postes'
                    ? 'text-indigo-600 bg-white'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Briefcase className={`w-5 h-5 ${activeTab === 'postes' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span>Postes</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'postes' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {applications.length}
                  </span>
                </div>
                {activeTab === 'postes' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('entretiens')}
                className={`flex-1 px-6 py-5 text-sm font-semibold transition-all relative ${
                  activeTab === 'entretiens'
                    ? 'text-indigo-600 bg-white'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className={`w-5 h-5 ${activeTab === 'entretiens' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span>Entretiens</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'entretiens' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {interviews.length}
                  </span>
                </div>
                {activeTab === 'entretiens' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                )}
              </button>
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6 lg:p-8">
            {/* Onglet Profil */}
            {activeTab === 'profil' && (
              <div className="space-y-6">
                {/* Informations détaillées */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <User className="w-6 h-6 mr-3 text-indigo-600" />
                    Informations personnelles
                  </h2>
            
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-indigo-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Prénom</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{candidate.first_name}</p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-indigo-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Nom</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{candidate.last_name}</p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-indigo-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{candidate.email || '-'}</p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-indigo-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        Téléphone
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{candidate.phone || '-'}</p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

              {(candidate.creator_first_name || candidate.creator_last_name) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Créé par
                  </label>
                  <p className="text-sm text-gray-900">
                    {candidate.creator_first_name || ''} {candidate.creator_last_name || ''}
                    {candidate.creator_email && (
                      <span className="text-gray-500 ml-2">({candidate.creator_email})</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

                {/* Tags et Compétences */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Tags */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-indigo-600" />
                      Tags & Mots-clés
                    </h2>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {formData.tags && formData.tags.length > 0 ? (
                      formData.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-indigo-600 hover:text-indigo-800"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
                          className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
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
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-indigo-600" />
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                            href={`/manager/jobs/${job.id}`}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAssigning ? 'Attribution...' : 'Attribuer'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Le candidat sera attribué au besoin sélectionné avec le statut "Sourcé"
              </p>
            </div>
          </div>

          {/* Notes internes */}
          {activeTab === 'profil' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes internes</h2>
              {isEditing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Notes internes sur le candidat..."
                />
              ) : (
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {candidate.notes || 'Aucune note'}
                </p>
              )}
            </div>
          )}

          {/* Documents */}
          {activeTab === 'profil' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documents
              </h2>
              
              <div className="space-y-4">
                {candidate.cv_file_path ? (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">CV</p>
                        <p className="text-xs text-gray-500">Document disponible</p>
                      </div>
                    </div>
                    <button
                      onClick={() => candidate.cv_file_path && handlePreview(candidate.cv_file_path, 'CV')}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Voir le CV
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">Aucun CV uploadé</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statut */}
          {activeTab === 'profil' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Statut actuel</h2>
              <select
                value={candidate.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Boutons d'action en mode édition */}
          {activeTab === 'profil' && isEditing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
              )}

              {/* Onglet Postes */}
              {activeTab === 'postes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Briefcase className="w-5 h-5 mr-2" />
                      Postes sur lesquels le candidat est positionné
                    </h2>
                    <span className="text-sm text-gray-500">
                      {applications.length} poste{applications.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {applications.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">Aucun poste attribué à ce candidat</p>
                      <button
                        onClick={() => setActiveTab('profil')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Attribuer un poste
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {applications.map((app) => {
                        const job = jobs.find(j => j.id === app.job_id)
                        if (!job) return null
                        
                        const appInterviews = interviews.filter(i => i.application_id === app.id)
                        const jobAnalysis = jobAnalyses[app.job_id]
                        const isLoadingAnalysis = loadingJobAnalyses[app.job_id]
                        
                        // Utiliser l'analyse IA si disponible
                        const overallScore = jobAnalysis?.overall_score
                        const hasAiAnalysis = !!jobAnalysis

                        return (
                          <div
                            key={app.id}
                            className={`bg-gradient-to-br rounded-xl border-2 shadow-lg hover:shadow-xl transition-all overflow-hidden ${
                              hasAiAnalysis 
                                ? overallScore && overallScore >= 80 
                                  ? 'from-green-50 to-white border-green-200 hover:border-green-300'
                                  : overallScore && overallScore >= 50
                                  ? 'from-yellow-50 to-white border-yellow-200 hover:border-yellow-300'
                                  : overallScore
                                  ? 'from-red-50 to-white border-red-200 hover:border-red-300'
                                  : 'from-white to-gray-50 border-gray-200 hover:border-indigo-300'
                                : 'from-white to-gray-50 border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-gray-900">
                                      {job.title}
                                    </h3>
                                    {hasAiAnalysis && (
                                      <span title="Analyse IA disponible">
                                        <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" aria-label="Analyse IA disponible" />
                                      </span>
                                    )}
                                  </div>
                                  {job.department && (
                                    <p className="text-sm text-gray-600">{job.department}</p>
                                  )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  app.status === 'embauché' ? 'bg-green-100 text-green-800' :
                                  app.status === 'offre' ? 'bg-blue-100 text-blue-800' :
                                  app.status === 'shortlist' ? 'bg-purple-100 text-purple-800' :
                                  app.status === 'rejeté' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {app.status}
                                </span>
                              </div>

                              {/* Score de correspondance IA */}
                              {isLoadingAnalysis ? (
                                <div className="mb-4 flex items-center justify-center py-4">
                                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                  <span className="ml-2 text-sm text-gray-600">Chargement de l'analyse IA...</span>
                                </div>
                              ) : hasAiAnalysis && jobAnalysis && overallScore !== undefined ? (
                                <div className="mb-4 space-y-3">
                                  {/* Score global IA */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-600" />
                                        <span className="text-sm font-medium text-gray-700">Score IA global</span>
                                      </div>
                                      <span className={`text-2xl font-bold ${
                                        overallScore >= 80 ? 'text-green-600' :
                                        overallScore >= 50 ? 'text-yellow-600' :
                                        'text-red-600'
                                      }`}>
                                        {overallScore}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                      <div
                                        className={`h-3 rounded-full transition-all ${
                                          overallScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                          overallScore >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                          'bg-gradient-to-r from-red-500 to-red-600'
                                        }`}
                                        style={{ width: `${overallScore}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Scores par catégorie */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/60 rounded-lg p-2 border border-gray-200">
                                      <div className="text-xs text-gray-500 mb-1">Compétences</div>
                                      <div className="text-sm font-bold text-gray-900">
                                        {jobAnalysis.technical_score}%
                                      </div>
                                    </div>
                                    <div className="bg-white/60 rounded-lg p-2 border border-gray-200">
                                      <div className="text-xs text-gray-500 mb-1">Expérience</div>
                                      <div className="text-sm font-bold text-gray-900">
                                        {jobAnalysis.experience_score}%
                                      </div>
                                    </div>
                                  </div>

                                  {/* Points forts (premiers 2) */}
                                  {jobAnalysis.strengths && jobAnalysis.strengths.length > 0 && (
                                    <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                                      <div className="text-xs font-semibold text-green-900 mb-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Points forts
                                      </div>
                                      <ul className="text-xs text-green-800 space-y-0.5">
                                        {jobAnalysis.strengths.slice(0, 2).map((strength, idx) => (
                                          <li key={idx} className="flex items-start gap-1">
                                            <span className="text-green-600 mt-0.5">•</span>
                                            <span className="line-clamp-1">{strength}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Analyse IA non disponible</span>
                                    {candidate?.cv_file_path && (
                                      <button
                                        onClick={async () => {
                                          if (!candidate || !candidate.cv_file_path) {
                                            showError('Le candidat doit avoir un CV pour l\'analyse IA')
                                            return
                                          }
                                          try {
                                            setLoadingJobAnalyses(prev => ({ ...prev, [app.job_id]: true }))
                                            const analysis = await compareCandidateWithJob(candidate.id!, app.job_id)
                                            setJobAnalyses(prev => ({ ...prev, [app.job_id]: analysis }))
                                            success('Analyse IA générée avec succès !')
                                          } catch (err) {
                                            showError(err instanceof Error ? err.message : 'Erreur lors de la génération de l\'analyse IA')
                                          } finally {
                                            setLoadingJobAnalyses(prev => ({ ...prev, [app.job_id]: false }))
                                          }
                                        }}
                                        disabled={!candidate?.cv_file_path || isLoadingAnalysis}
                                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                      >
                                        <Sparkles className="w-3 h-3" />
                                        Générer
                                      </button>
                                    )}
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="h-2.5 rounded-full bg-gray-400" style={{ width: '0%' }} />
                                  </div>
                                </div>
                              )}

                              {/* Statistiques rapides */}
                              <div className="grid grid-cols-3 gap-3 mb-4">
                                {hasAiAnalysis && jobAnalysis ? (
                                  <>
                                    <div className="text-center p-2 bg-white/60 rounded-lg border border-gray-200">
                                      <div className="text-xs text-gray-500">Compétences</div>
                                      <div className="text-sm font-bold text-gray-900">
                                        {jobAnalysis.technical_score}%
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-white/60 rounded-lg border border-gray-200">
                                      <div className="text-xs text-gray-500">Entretiens</div>
                                      <div className="text-sm font-bold text-gray-900">
                                        {appInterviews.length}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-white/60 rounded-lg border border-gray-200">
                                      <div className="text-xs text-gray-500">Expérience</div>
                                      <div className="text-sm font-bold text-gray-900">
                                        {jobAnalysis.experience_score}%
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-center p-2 bg-white/60 rounded-lg border border-gray-200">
                                      <div className="text-xs text-gray-500">Entretiens</div>
                                      <div className="text-sm font-bold text-gray-900">
                                        {appInterviews.length}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-white/60 rounded-lg border border-gray-200">
                                      <div className="text-xs text-gray-500">Statut</div>
                                      <div className="text-xs font-bold text-gray-900 capitalize">
                                        {app.status}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-white/60 rounded-lg border border-gray-200">
                                      <div className="text-xs text-gray-500">Date</div>
                                      <div className="text-xs font-bold text-gray-900">
                                        {new Date(app.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedJobForComparison(job)
                                    setShowComparisonModal(true)
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                  {hasAiAnalysis ? 'Voir l\'analyse IA' : 'Voir le comparatif'}
                                </button>
                                <Link
                                  href={`/manager/jobs/${job.id}`}
                                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Onglet Entretiens */}
              {activeTab === 'entretiens' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Comptes rendus d&apos;entretien
                    </h2>
                    {applications.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleOpenInterviewForm(applications[0].id, undefined, 'prequalification')}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Préqualification
                        </button>
                        <button
                          onClick={() => handleOpenInterviewForm(applications[0].id, undefined, 'qualification')}
                          className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Qualification
                        </button>
                        <button
                          onClick={() => handleOpenInterviewForm(applications[0].id, undefined, 'rh')}
                          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          RH
                        </button>
                        <button
                          onClick={() => handleOpenInterviewForm(applications[0].id, undefined, 'technique')}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Technique
                        </button>
                        <button
                          onClick={() => handleOpenInterviewForm(applications[0].id, undefined, 'client')}
                          className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Client
                        </button>
                        <button
                          onClick={() => handleOpenInterviewForm(applications[0].id)}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Autre
                        </button>
                      </div>
                    )}
                  </div>

                  {isLoadingInterviews ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
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
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => handleOpenInterviewForm(app.id, undefined, 'prequalification')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Ajouter une préqualification"
                                >
                                  <Plus className="w-3 h-3" />
                                  Préqualif.
                                </button>
                                <button
                                  onClick={() => handleOpenInterviewForm(app.id, undefined, 'qualification')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                                  title="Ajouter une qualification"
                                >
                                  <Plus className="w-3 h-3" />
                                  Qualif.
                                </button>
                                <button
                                  onClick={() => handleOpenInterviewForm(app.id, undefined, 'rh')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                  title="Ajouter un entretien RH"
                                >
                                  <Plus className="w-3 h-3" />
                                  RH
                                </button>
                                <button
                                  onClick={() => handleOpenInterviewForm(app.id, undefined, 'technique')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                  title="Ajouter un entretien technique"
                                >
                                  <Plus className="w-3 h-3" />
                                  Technique
                                </button>
                                <button
                                  onClick={() => handleOpenInterviewForm(app.id, undefined, 'client')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                                  title="Ajouter un entretien client"
                                >
                                  <Plus className="w-3 h-3" />
                                  Client
                                </button>
                                <button
                                  onClick={() => handleOpenInterviewForm(app.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                  title="Ajouter un autre type d'entretien"
                                >
                                  <Plus className="w-4 h-4" />
                                  Autre
                                </button>
                              </div>
                            </div>

                            {appInterviews.length > 0 ? (
                              <div className="space-y-6">
                                {/* Grouper les entretiens par type */}
                                {(() => {
                                  const interviewsByType = appInterviews.reduce((acc, interview) => {
                                    const type = interview.interview_type || 'autre'
                                    if (!acc[type]) {
                                      acc[type] = []
                                    }
                                    acc[type].push(interview)
                                    return acc
                                  }, {} as Record<string, InterviewResponse[]>)

                                  return Object.entries(interviewsByType).map(([type, typeInterviews]) => (
                                    <div key={type} className="space-y-3">
                                      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                            type === 'prequalification' ? 'bg-blue-100 text-blue-800' :
                                            type === 'qualification' ? 'bg-purple-100 text-purple-800' :
                                            type === 'rh' ? 'bg-indigo-100 text-indigo-800' :
                                            type === 'technique' ? 'bg-green-100 text-green-800' :
                                            type === 'client' ? 'bg-orange-100 text-orange-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {getInterviewTypeLabel(type)}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {typeInterviews.length} entretien{typeInterviews.length > 1 ? 's' : ''}
                                          </span>
                                        </h4>
                                        <button
                                          onClick={() => handleOpenInterviewForm(app.id, undefined, type as any)}
                                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                          title={`Ajouter un autre entretien ${getInterviewTypeLabel(type)}`}
                                        >
                                          <Plus className="w-3 h-3" />
                                          Ajouter
                                        </button>
                                      </div>
                                      <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                                        {typeInterviews.map((interview) => (
                                          <div key={interview.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
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
                                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
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

                                    {/* Compte rendu modifiable */}
                                    {editingInterviewId === interview.id ? (
                                      <div className="space-y-4 p-4 bg-white rounded-lg border-2 border-indigo-300">
                                        {/* Formulaire pour préqualification */}
                                        {interview.interview_type === 'prequalification' && (
                                          <>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Compétences techniques *
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.prequalification_competences_techniques || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  prequalification_competences_techniques: e.target.value
                                                })}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Évaluez les compétences techniques..."
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Expérience *
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.prequalification_experience || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  prequalification_experience: e.target.value
                                                })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Évaluez l'expérience..."
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Motivation *
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.prequalification_motivation || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  prequalification_motivation: e.target.value
                                                })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Quelle est la motivation du candidat ?"
                                              />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                  Prétentions salariales
                                                </label>
                                                <input
                                                  type="text"
                                                  value={editingInterviewData?.prequalification_salaire || ''}
                                                  onChange={(e) => setEditingInterviewData({
                                                    ...editingInterviewData!,
                                                    prequalification_salaire: e.target.value
                                                  })}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                  placeholder="Montant attendu"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                  Disponibilité
                                                </label>
                                                <input
                                                  type="text"
                                                  value={editingInterviewData?.prequalification_disponibilite || ''}
                                                  onChange={(e) => setEditingInterviewData({
                                                    ...editingInterviewData!,
                                                    prequalification_disponibilite: e.target.value
                                                  })}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                  placeholder="Date de disponibilité"
                                                />
                                              </div>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Remarques complémentaires
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.prequalification_remarques || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  prequalification_remarques: e.target.value
                                                })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Remarques supplémentaires..."
                                              />
                                            </div>
                                          </>
                                        )}

                                        {/* Formulaire pour qualification */}
                                        {interview.interview_type === 'qualification' && (
                                          <>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Compétences techniques approfondies *
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.qualification_competences_techniques || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  qualification_competences_techniques: e.target.value
                                                })}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Évaluation détaillée des compétences techniques..."
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Compétences comportementales (Soft Skills) *
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.qualification_competences_comportementales || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  qualification_competences_comportementales: e.target.value
                                                })}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Évaluation des compétences comportementales..."
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Adéquation culture d&apos;entreprise *
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.qualification_culture_entreprise || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  qualification_culture_entreprise: e.target.value
                                                })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Le candidat correspond-il à la culture de l'entreprise ?"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Potentiel et évolution *
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.qualification_potentiel || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  qualification_potentiel: e.target.value
                                                })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Quel est le potentiel du candidat ?"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Remarques complémentaires
                                              </label>
                                              <textarea
                                                value={editingInterviewData?.qualification_remarques || ''}
                                                onChange={(e) => setEditingInterviewData({
                                                  ...editingInterviewData!,
                                                  qualification_remarques: e.target.value
                                                })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                placeholder="Remarques supplémentaires..."
                                              />
                                            </div>
                                          </>
                                        )}

                                        {/* Formulaire générique pour les autres types */}
                                        {interview.interview_type !== 'prequalification' && interview.interview_type !== 'qualification' && (
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Feedback *
                                            </label>
                                            <textarea
                                              value={editingInterviewData?.feedback || ''}
                                              onChange={(e) => setEditingInterviewData({
                                                ...editingInterviewData!,
                                                feedback: e.target.value
                                              })}
                                              rows={6}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                              placeholder="Décrivez le déroulement de l'entretien..."
                                            />
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Décision *
                                            </label>
                                            <select
                                              value={editingInterviewData?.decision || 'en_attente'}
                                              onChange={(e) => setEditingInterviewData({
                                                ...editingInterviewData!,
                                                decision: e.target.value as any
                                              })}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                                              value={editingInterviewData?.score || ''}
                                              onChange={(e) => setEditingInterviewData({
                                                ...editingInterviewData!,
                                                score: e.target.value ? parseInt(e.target.value) : null
                                              })}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                              placeholder="0-10"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-3">
                                          <button
                                            onClick={() => {
                                              setEditingInterviewId(null)
                                              setEditingInterviewData(null)
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                                          >
                                            Annuler
                                          </button>
                                          <button
                                            onClick={async () => {
                                              if (!editingInterviewData) return
                                              
                                              try {
                                                setIsSavingInterviewEdit(true)
                                                
                                                // Formater le feedback selon le type
                                                let formattedFeedback = ''
                                                if (interview.interview_type === 'prequalification') {
                                                  formattedFeedback = JSON.stringify({
                                                    competences_techniques: editingInterviewData.prequalification_competences_techniques,
                                                    experience: editingInterviewData.prequalification_experience,
                                                    motivation: editingInterviewData.prequalification_motivation,
                                                    salaire: editingInterviewData.prequalification_salaire,
                                                    disponibilite: editingInterviewData.prequalification_disponibilite,
                                                    remarques: editingInterviewData.prequalification_remarques,
                                                  })
                                                } else if (interview.interview_type === 'qualification') {
                                                  formattedFeedback = JSON.stringify({
                                                    competences_techniques: editingInterviewData.qualification_competences_techniques,
                                                    competences_comportementales: editingInterviewData.qualification_competences_comportementales,
                                                    culture_entreprise: editingInterviewData.qualification_culture_entreprise,
                                                    potentiel: editingInterviewData.qualification_potentiel,
                                                    remarques: editingInterviewData.qualification_remarques,
                                                  })
                                                } else {
                                                  formattedFeedback = editingInterviewData.feedback
                                                }
                                                
                                                await addInterviewFeedback(interview.id, {
                                                  feedback: formattedFeedback,
                                                  decision: editingInterviewData.decision,
                                                  score: editingInterviewData.score || undefined,
                                                })
                                                
                                                await loadInterviews()
                                                setEditingInterviewId(null)
                                                setEditingInterviewData(null)
                                                success('Compte rendu mis à jour avec succès')
                                              } catch (err) {
                                                const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
                                                showError(errorMessage)
                                              } finally {
                                                setIsSavingInterviewEdit(false)
                                              }
                                            }}
                                            disabled={!!(isSavingInterviewEdit || 
                                              (interview.interview_type === 'prequalification' && 
                                                (!editingInterviewData?.prequalification_competences_techniques || 
                                                 !editingInterviewData?.prequalification_experience || 
                                                 !editingInterviewData?.prequalification_motivation)) ||
                                              (interview.interview_type === 'qualification' && 
                                                (!editingInterviewData?.qualification_competences_techniques || 
                                                 !editingInterviewData?.qualification_competences_comportementales || 
                                                 !editingInterviewData?.qualification_culture_entreprise || 
                                                 !editingInterviewData?.qualification_potentiel)) ||
                                              (interview.interview_type !== 'prequalification' && 
                                               interview.interview_type !== 'qualification' && 
                                               !editingInterviewData?.feedback))}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                                          >
                                            {isSavingInterviewEdit ? (
                                              <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Enregistrement...
                                              </>
                                            ) : (
                                              <>
                                                <Save className="w-4 h-4" />
                                                Enregistrer
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {(() => {
                                          // Parser le feedback si c'est du JSON
                                          let feedbackContent: any = null
                                          try {
                                            if (interview.feedback && interview.feedback.includes('{')) {
                                              const jsonMatch = interview.feedback.match(/\{[\s\S]*\}/)
                                              if (jsonMatch) {
                                                feedbackContent = JSON.parse(jsonMatch[0])
                                              }
                                            }
                                          } catch (e) {
                                            // Si le parsing échoue, on garde le feedback tel quel
                                          }

                                          // Afficher selon le type d'entretien
                                          if (interview.interview_type === 'prequalification') {
                                            return (
                                              <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                                                <div className="flex items-center justify-between mb-2">
                                                  <p className="text-xs font-semibold text-gray-700 uppercase">Compte rendu - Préqualification</p>
                                                  <button
                                                    onClick={() => {
                                                      setEditingInterviewId(interview.id)
                                                      setEditingInterviewData({
                                                        feedback: interview.feedback || '',
                                                        decision: (interview.decision as any) || 'en_attente',
                                                        score: interview.score || null,
                                                        prequalification_competences_techniques: feedbackContent?.competences_techniques || '',
                                                        prequalification_experience: feedbackContent?.experience || '',
                                                        prequalification_motivation: feedbackContent?.motivation || '',
                                                        prequalification_salaire: feedbackContent?.salaire || '',
                                                        prequalification_disponibilite: feedbackContent?.disponibilite || '',
                                                        prequalification_remarques: feedbackContent?.remarques || '',
                                                        qualification_competences_techniques: '',
                                                        qualification_competences_comportementales: '',
                                                        qualification_culture_entreprise: '',
                                                        qualification_potentiel: '',
                                                        qualification_remarques: '',
                                                      })
                                                    }}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                                                  >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    Modifier
                                                  </button>
                                                </div>
                                                {feedbackContent ? (
                                                  <>
                                                {feedbackContent.competences_techniques && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Compétences techniques</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.competences_techniques}</p>
                                                  </div>
                                                )}
                                                {feedbackContent.experience && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Expérience</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.experience}</p>
                                                  </div>
                                                )}
                                                {feedbackContent.motivation && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Motivation</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.motivation}</p>
                                                  </div>
                                                )}
                                                {(feedbackContent.salaire || feedbackContent.disponibilite) && (
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {feedbackContent.salaire && (
                                                      <div>
                                                        <p className="text-xs font-medium text-gray-600 mb-1">Prétentions salariales</p>
                                                        <p className="text-sm text-gray-900">{feedbackContent.salaire}</p>
                                                      </div>
                                                    )}
                                                    {feedbackContent.disponibilite && (
                                                      <div>
                                                        <p className="text-xs font-medium text-gray-600 mb-1">Disponibilité</p>
                                                        <p className="text-sm text-gray-900">{feedbackContent.disponibilite}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                                {feedbackContent.remarques && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Remarques</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.remarques}</p>
                                                  </div>
                                                )}
                                                {interview.feedback_provided_at && (
                                                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                                                    Rédigé le {new Date(interview.feedback_provided_at).toLocaleDateString('fr-FR', {
                                                      day: 'numeric',
                                                      month: 'long',
                                                      year: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                    })}
                                                  </p>
                                                )}
                                                  </>
                                                ) : (
                                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                                    <p className="text-sm text-yellow-800">
                                                      <AlertCircle className="w-4 h-4 inline mr-1" />
                                                      Aucun compte rendu renseigné. Cliquez sur "Modifier" pour ajouter un compte rendu.
                                                    </p>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          } else if (interview.interview_type === 'qualification') {
                                            return (
                                              <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                                                <div className="flex items-center justify-between mb-2">
                                                  <p className="text-xs font-semibold text-gray-700 uppercase">Compte rendu - Qualification</p>
                                                  <button
                                                    onClick={() => {
                                                      setEditingInterviewId(interview.id)
                                                      setEditingInterviewData({
                                                        feedback: interview.feedback || '',
                                                        decision: (interview.decision as any) || 'en_attente',
                                                        score: interview.score || null,
                                                        prequalification_competences_techniques: '',
                                                        prequalification_experience: '',
                                                        prequalification_motivation: '',
                                                        prequalification_salaire: '',
                                                        prequalification_disponibilite: '',
                                                        prequalification_remarques: '',
                                                        qualification_competences_techniques: feedbackContent?.competences_techniques || '',
                                                        qualification_competences_comportementales: feedbackContent?.competences_comportementales || '',
                                                        qualification_culture_entreprise: feedbackContent?.culture_entreprise || '',
                                                        qualification_potentiel: feedbackContent?.potentiel || '',
                                                        qualification_remarques: feedbackContent?.remarques || '',
                                                      })
                                                    }}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                                                  >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    Modifier
                                                  </button>
                                                </div>
                                                {feedbackContent ? (
                                                  <>
                                                {feedbackContent.competences_techniques && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Compétences techniques approfondies</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.competences_techniques}</p>
                                                  </div>
                                                )}
                                                {feedbackContent.competences_comportementales && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Compétences comportementales</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.competences_comportementales}</p>
                                                  </div>
                                                )}
                                                {feedbackContent.culture_entreprise && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Adéquation culture d&apos;entreprise</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.culture_entreprise}</p>
                                                  </div>
                                                )}
                                                {feedbackContent.potentiel && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Potentiel et évolution</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.potentiel}</p>
                                                  </div>
                                                )}
                                                {feedbackContent.remarques && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-600 mb-1">Remarques</p>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{feedbackContent.remarques}</p>
                                                  </div>
                                                )}
                                                {interview.feedback_provided_at && (
                                                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                                                    Rédigé le {new Date(interview.feedback_provided_at).toLocaleDateString('fr-FR', {
                                                      day: 'numeric',
                                                      month: 'long',
                                                      year: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                    })}
                                                  </p>
                                                )}
                                                  </>
                                                ) : (
                                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                                    <p className="text-sm text-yellow-800">
                                                      <AlertCircle className="w-4 h-4 inline mr-1" />
                                                      Aucun compte rendu renseigné. Cliquez sur "Modifier" pour ajouter un compte rendu.
                                                    </p>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          } else {
                                            return (
                                              <div className="p-3 bg-white rounded border border-gray-200">
                                                <div className="flex items-center justify-between mb-2">
                                                  <p className="text-xs font-medium text-gray-700">Compte rendu</p>
                                                  <button
                                                    onClick={() => {
                                                      setEditingInterviewId(interview.id)
                                                      setEditingInterviewData({
                                                        feedback: interview.feedback || '',
                                                        decision: (interview.decision as any) || 'en_attente',
                                                        score: interview.score || null,
                                                        prequalification_competences_techniques: '',
                                                        prequalification_experience: '',
                                                        prequalification_motivation: '',
                                                        prequalification_salaire: '',
                                                        prequalification_disponibilite: '',
                                                        prequalification_remarques: '',
                                                        qualification_competences_techniques: '',
                                                        qualification_competences_comportementales: '',
                                                        qualification_culture_entreprise: '',
                                                        qualification_potentiel: '',
                                                        qualification_remarques: '',
                                                      })
                                                    }}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                                                  >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    Modifier
                                                  </button>
                                                </div>
                                                {interview.feedback ? (
                                                  <>
                                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{interview.feedback}</p>
                                                    {interview.feedback_provided_at && (
                                                      <p className="text-xs text-gray-500 mt-2">
                                                        Rédigé le {new Date(interview.feedback_provided_at).toLocaleDateString('fr-FR', {
                                                          day: 'numeric',
                                                          month: 'long',
                                                          year: 'numeric',
                                                          hour: '2-digit',
                                                          minute: '2-digit'
                                                        })}
                                                      </p>
                                                    )}
                                                  </>
                                                ) : (
                                                  <p className="text-sm text-yellow-800">
                                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                                    Aucun compte rendu renseigné
                                                  </p>
                                                )}
                                              </div>
                                            )
                                          }
                                        })()}
                                      </div>
                                    )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                })()}
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
              )}
          </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Points à aborder, questions à poser..."
                />
              </div>

              {/* Comparatif Besoin vs Candidat */}
              {interviewForm.application_id && candidate && (() => {
                const selectedApp = applications.find(app => app.id === interviewForm.application_id)
                const selectedJob = selectedApp ? jobs.find(j => j.id === selectedApp.job_id) : null
                
                if (!selectedJob) return null
                
                const candidateSkills = Array.isArray(candidate.skills) 
                  ? candidate.skills 
                  : (typeof candidate.skills === 'string' ? candidate.skills.split(',').map(s => s.trim().toLowerCase()) : [])
                
                const jobRequiredSkills = Array.isArray(selectedJob.competences_techniques_obligatoires)
                  ? selectedJob.competences_techniques_obligatoires.map(s => s.toLowerCase())
                  : []
                const jobPreferredSkills = Array.isArray(selectedJob.competences_techniques_souhaitees)
                  ? selectedJob.competences_techniques_souhaitees.map(s => s.toLowerCase())
                  : []
                
                const matchingRequiredSkills = jobRequiredSkills.filter(skill => 
                  candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
                )
                const matchingPreferredSkills = jobPreferredSkills.filter(skill => 
                  candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
                )
                
                const experienceMatch = selectedJob.experience_requise 
                  ? (candidate.years_of_experience || 0) >= selectedJob.experience_requise
                  : null
                
                return (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Briefcase className="w-5 h-5 mr-2" />
                      Comparatif Besoin vs Candidat
                    </h3>
                    
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <Briefcase className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-indigo-900 mb-1">{selectedJob.title}</p>
                          {selectedJob.department && (
                            <p className="text-sm text-indigo-700">{selectedJob.department}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Compétences techniques obligatoires */}
                      {jobRequiredSkills.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Compétences techniques obligatoires
                            </h4>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              matchingRequiredSkills.length === jobRequiredSkills.length
                                ? 'bg-green-100 text-green-800'
                                : matchingRequiredSkills.length > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {matchingRequiredSkills.length}/{jobRequiredSkills.length} correspondances
                            </span>
                          </div>
                          <div className="space-y-2">
                            {jobRequiredSkills.map((skill, idx) => {
                              const matches = candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
                              return (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className={matches ? 'text-gray-900' : 'text-gray-500'}>
                                    {skill}
                                  </span>
                                  {matches ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Compétences techniques souhaitées */}
                      {jobPreferredSkills.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Compétences techniques souhaitées
                            </h4>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              matchingPreferredSkills.length > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {matchingPreferredSkills.length}/{jobPreferredSkills.length} correspondances
                            </span>
                          </div>
                          <div className="space-y-2">
                            {jobPreferredSkills.map((skill, idx) => {
                              const matches = candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
                              return (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className={matches ? 'text-gray-900' : 'text-gray-500'}>
                                    {skill}
                                  </span>
                                  {matches ? (
                                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Expérience */}
                      {selectedJob.experience_requise !== null && selectedJob.experience_requise !== undefined && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Expérience requise
                          </h4>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">
                                Requis: <span className="font-medium">{selectedJob.experience_requise} ans</span>
                              </p>
                              <p className="text-sm text-gray-600">
                                Candidat: <span className="font-medium">{candidate.years_of_experience || 0} ans</span>
                              </p>
                            </div>
                            {experienceMatch !== null && (
                              <div className={`flex items-center gap-2 px-3 py-1 rounded ${
                                experienceMatch ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {experienceMatch ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-medium">Correspond</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">Insuffisant</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Formation */}
                      {selectedJob.niveau_formation && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Niveau de formation
                          </h4>
                          <p className="text-sm text-gray-600">
                            Requis: <span className="font-medium">{selectedJob.niveau_formation}</span>
                          </p>
                        </div>
                      )}

                      {/* Langues */}
                      {selectedJob.langues_requises && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Langues requises
                          </h4>
                          <p className="text-sm text-gray-600">{selectedJob.langues_requises}</p>
                        </div>
                      )}

                      {/* Compétences du candidat */}
                      {candidateSkills.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Compétences du candidat
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {candidateSkills.map((skill, idx) => (
                              <span key={idx} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Décrivez le déroulement de l'entretien, les points forts et faibles du candidat, votre impression générale. Vous pouvez vous référer au comparatif ci-dessus pour structurer votre feedback..."
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  disabled={
                    isSubmittingInterview || 
                    !interviewForm.application_id || 
                    !interviewForm.scheduled_at ||
                    // Pour la mise à jour, on exige le feedback selon le type
                    !!(selectedInterview && (
                      (interviewForm.interview_type === 'prequalification' && 
                        (!interviewForm.prequalification_competences_techniques || 
                         !interviewForm.prequalification_experience || 
                         !interviewForm.prequalification_motivation)) ||
                      (interviewForm.interview_type === 'qualification' && 
                        (!interviewForm.qualification_competences_techniques || 
                         !interviewForm.qualification_competences_comportementales || 
                         !interviewForm.qualification_culture_entreprise || 
                         !interviewForm.qualification_potentiel)) ||
                      (interviewForm.interview_type !== 'prequalification' && 
                       interviewForm.interview_type !== 'qualification' && 
                       !interviewForm.feedback)
                    ))
                  }
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingInterview ? 'Enregistrement...' : selectedInterview ? 'Mettre à jour' : 'Créer l\'entretien'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de comparatif Besoin vs Candidat */}
      {showComparisonModal && selectedJobForComparison && candidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-2 sm:my-4 md:my-8 max-h-[95vh] flex flex-col">
            {/* Header fixe */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-t-xl flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span className="truncate">Comparatif Besoin vs Candidat</span>
                </h2>
                <p className="text-indigo-100 text-xs sm:text-sm line-clamp-2">
                  Analyse détaillée de la correspondance entre le poste et le profil par IA
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAiAnalysis(false)}
                  disabled={isLoadingAiAnalysis || !candidate.cv_file_path}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!candidate.cv_file_path ? 'Le candidat doit avoir un CV pour l\'analyse IA' : 'Analyser avec l\'IA'}
                >
                  {isLoadingAiAnalysis ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                      <span className="hidden sm:inline">Analyse...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Analyse IA</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowComparisonModal(false)
                    setSelectedJobForComparison(null)
                    setAiAnalysis(null)
                  }}
                  className="text-white hover:text-gray-200 transition-colors p-1.5 sm:p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
            
            {/* Contenu scrollable */}
            <div className="overflow-y-auto flex-1 px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              {/* En-tête du poste */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-5 md:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-indigo-600 rounded-lg p-2 sm:p-3 flex-shrink-0">
                    <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 break-words">{selectedJobForComparison.title}</h3>
                    {selectedJobForComparison.department && (
                      <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-2 flex items-center gap-1">
                        <Building2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="break-words">{selectedJobForComparison.department}</span>
                      </p>
                    )}
                    {selectedJobForComparison.contract_type && (
                      <p className="text-xs sm:text-sm text-gray-600">
                        Type de contrat: {selectedJobForComparison.contract_type}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Analyse IA uniquement */}
              {isLoadingAiAnalysis ? (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    <span className="ml-3 text-purple-700 font-medium">Analyse IA en cours...</span>
                  </div>
                </div>
              ) : aiAnalysis ? (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                      <h3 className="text-xl font-bold text-gray-900">Analyse IA approfondie</h3>
                      <div className={`ml-auto text-3xl font-bold ${
                        aiAnalysis.overall_score >= 80 ? 'text-green-600' :
                        aiAnalysis.overall_score >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {aiAnalysis.overall_score}%
                      </div>
                    </div>

                    {/* Évaluation globale */}
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <h4 className="font-semibold text-gray-900 mb-2">Évaluation globale</h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {aiAnalysis.overall_assessment}
                      </p>
                    </div>

                    {/* Analyses détaillées */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4 text-purple-600" />
                          Compétences techniques
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">Score: {aiAnalysis.technical_score}%</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {aiAnalysis.technical_skills_analysis}
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-purple-600" />
                          Expérience
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">Score: {aiAnalysis.experience_score}%</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {aiAnalysis.experience_analysis}
                        </p>
                      </div>

                      {aiAnalysis.soft_skills_analysis && (
                        <div className="bg-white rounded-lg p-4 border border-purple-100">
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            Compétences comportementales
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">Score: {aiAnalysis.soft_skills_score || 'N/A'}%</p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                            {aiAnalysis.soft_skills_analysis}
                          </p>
                        </div>
                      )}

                      {aiAnalysis.education_analysis && (
                        <div className="bg-white rounded-lg p-4 border border-purple-100">
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-purple-600" />
                            Formation
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">Score: {aiAnalysis.education_score || 'N/A'}%</p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                            {aiAnalysis.education_analysis}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Points forts et faibles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Points forts
                        </h4>
                        <ul className="space-y-2">
                          {aiAnalysis.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                          <XCircle className="w-5 h-5" />
                          Points à améliorer
                        </h4>
                        <ul className="space-y-2">
                          {aiAnalysis.weaknesses.map((weakness, idx) => (
                            <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                              <span className="text-red-600 mt-1">•</span>
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Compétences */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2 text-sm">Correspondances</h4>
                        <div className="flex flex-wrap gap-1">
                          {aiAnalysis.matching_skills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <h4 className="font-semibold text-yellow-900 mb-2 text-sm">Manquantes</h4>
                        <div className="flex flex-wrap gap-1">
                          {aiAnalysis.missing_skills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-2 text-sm">Complémentaires</h4>
                        <div className="flex flex-wrap gap-1">
                          {aiAnalysis.complementary_skills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recommandations */}
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Recommandations
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-indigo-800 flex items-start gap-2">
                            <span className="text-indigo-600 mt-1">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <p className="text-purple-700 font-medium mb-4">Cliquez sur "Analyse IA" pour lancer l'analyse approfondie</p>
                    <button
                      onClick={() => handleAiAnalysis(false)}
                      disabled={isLoadingAiAnalysis || !candidate.cv_file_path}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-5 h-5" />
                      Lancer l'analyse IA
                    </button>
                  </div>
                </div>
              )}

            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setShowComparisonModal(false)
                  setSelectedJobForComparison(null)
                  setAiAnalysis(null)
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de prévisualisation */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={closePreview}>
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* En-tête du modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                {previewDocument.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      // Si c'est déjà un blob URL, on peut le télécharger directement
                      if (previewDocument.url.startsWith('blob:')) {
                        const link = document.createElement('a')
                        link.href = previewDocument.url
                        link.download = previewDocument.name
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      } else {
                        // Sinon, télécharger via l'API
                        if (previewDocument.filePath) {
                          await handleDownload(previewDocument.filePath, previewDocument.name)
                        }
                      }
                    } catch (err) {
                      showError('Erreur lors du téléchargement')
                    }
                  }}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  title="Télécharger"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={closePreview}
                  className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenu de la prévisualisation */}
            <div className="flex-1 overflow-auto p-4">
              {previewDocument.type === 'pdf' && (
                <iframe
                  src={previewDocument.url}
                  className="w-full h-full min-h-[600px] border border-gray-200 rounded-lg"
                  title={previewDocument.name}
                />
              )}
              {previewDocument.type === 'image' && (
                <div className="flex items-center justify-center">
                  <img
                    src={previewDocument.url}
                    alt={previewDocument.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>
              )}
              {(previewDocument.type === 'word' || previewDocument.type === 'other') && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <FileText className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    La prévisualisation n'est pas disponible pour ce type de fichier.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        // Télécharger le fichier
                        if (previewDocument.url.startsWith('blob:')) {
                          const link = document.createElement('a')
                          link.href = previewDocument.url
                          link.download = previewDocument.name
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        } else {
                          if (previewDocument.filePath) {
                            await handleDownload(previewDocument.filePath, previewDocument.name)
                          }
                        }
                      } catch (err) {
                        showError('Erreur lors du téléchargement')
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le fichier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
