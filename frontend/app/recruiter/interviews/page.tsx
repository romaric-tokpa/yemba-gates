'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getInterviews, 
  createInterview, 
  addInterviewFeedback,
  updateInterview,
  deleteInterview,
  getJobApplications,
  getCandidates,
  getUsers,
  getCandidateApplications,
  getJobs,
  createApplication,
  getClientInterviewRequests,
  scheduleClientInterview,
  InterviewResponse,
  InterviewCreate,
  InterviewUpdate,
  InterviewFeedback,
  ApplicationResponse,
  CandidateResponse,
  UserResponse,
  JobResponse,
  ClientInterviewRequestResponse
} from '@/lib/api'
import { getToken, isAuthenticated, getCurrentUser } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { formatDateTime } from '@/lib/utils'
import { 
  Plus, 
  X, 
  Calendar, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  User,
  Search,
  Briefcase,
  Mail,
  Phone,
  Edit,
  Trash2
} from 'lucide-react'

type ViewMode = 'calendar' | 'list'
type CalendarView = 'month' | 'week' | 'day'

export default function RecruiterInterviewsPage() {
  console.log('🚀 [DEBUG] RecruiterInterviewsPage rendu')
  const router = useRouter()
  const { success, error: showError } = useToastContext()
  
  const [interviews, setInterviews] = useState<InterviewResponse[]>([])
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [candidates, setCandidates] = useState<CandidateResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [clientInterviewRequests, setClientInterviewRequests] = useState<ClientInterviewRequestResponse[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal pour programmer un entretien client
  const [showScheduleClientInterviewModal, setShowScheduleClientInterviewModal] = useState(false)
  const [selectedClientRequest, setSelectedClientRequest] = useState<ClientInterviewRequestResponse | null>(null)
  const [selectedAvailabilitySlot, setSelectedAvailabilitySlot] = useState<{ date: string; start_time: string; end_time: string } | null>(null)
  
  // Vues
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Modals
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null)
  const [selectedInterview, setSelectedInterview] = useState<InterviewResponse | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [participantSearchQuery, setParticipantSearchQuery] = useState<string>('')
  
  // Formulaire planification
  const [formData, setFormData] = useState<Partial<InterviewCreate & { participants: string[], participantEmails: string[] }>>({
    interview_type: 'prequalification',
    scheduled_at: '',
    scheduled_end_at: '',
    location: '',
    preparation_notes: '',
    participants: [],
    participantEmails: []
  })
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('')
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string>('')
  const [applicationSearchQuery, setApplicationSearchQuery] = useState<string>('')
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResponse | null>(null)
  const [candidateApplications, setCandidateApplications] = useState<ApplicationResponse[]>([])
  
  // Formulaire feedback
  const [feedbackData, setFeedbackData] = useState<Partial<InterviewFeedback>>({
    feedback: '',
    decision: 'en_attente',
    score: undefined
  })

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }
    loadData()
  }, [router])

  // Synchroniser selectedInterviewerId avec currentUserId si vide
  useEffect(() => {
    if (currentUserId && !selectedInterviewerId) {
      setSelectedInterviewerId(currentUserId)
      console.log('✅ Interviewer principal synchronisé avec currentUserId:', currentUserId)
    }
  }, [currentUserId, selectedInterviewerId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Récupérer l'utilisateur connecté
      try {
        const currentUser = await getCurrentUser()
        setCurrentUserId(currentUser.id)
        // Définir automatiquement l'utilisateur connecté comme interviewer principal
        setSelectedInterviewerId(currentUser.id)
      } catch (err) {
        console.warn('Erreur lors de la récupération de l\'utilisateur connecté:', err)
      }
      
      const [interviewsData, usersData, clientRequestsData] = await Promise.all([
        getInterviews().catch((err) => {
          console.warn('Erreur lors du chargement des entretiens:', err)
          return [] // Si l'API n'est pas accessible, retourner un tableau vide
        }),
        getUsers().catch(() => []), // Si l'API n'est pas accessible, retourner un tableau vide
        getClientInterviewRequests('pending').catch(() => []) // Charger les demandes en attente
      ])
      
      setInterviews(Array.isArray(interviewsData) ? interviewsData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setClientInterviewRequests(Array.isArray(clientRequestsData) ? clientRequestsData : [])
      
      // Charger les applications et candidats pour le formulaire
      try {
        const [candidatesData, jobsData] = await Promise.all([
          getCandidates({}),
          getJobs().catch(() => [])
        ])
        setCandidates(Array.isArray(candidatesData) ? candidatesData : [])
        setJobs(Array.isArray(jobsData) ? jobsData : [])
      } catch (err) {
        console.warn('Erreur lors du chargement des candidats:', err)
      }
    } catch (err) {
      console.error('Erreur lors du chargement:', err)
      setError('Impossible de charger les données')
    } finally {
      setIsLoading(false)
    }
  }

  const loadApplicationsForJob = async (jobId: string) => {
    try {
      const apps = await getJobApplications(jobId)
      setApplications(apps)
    } catch (err) {
      console.error('Erreur lors du chargement des applications:', err)
    }
  }

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🚀 [DEBUG] handleCreateInterview appelé')
    console.log('🔍 [DEBUG] État du formulaire:', {
      selectedApplicationId,
      scheduled_at: formData.scheduled_at,
      scheduled_end_at: formData.scheduled_end_at,
      selectedInterviewerId,
      currentUserId,
      interview_type: formData.interview_type,
      isLoading
    })
    
    // Validation des champs obligatoires
    if (!selectedApplicationId) {
      console.error('❌ [VALIDATION] Candidature manquante')
      console.error('❌ [VALIDATION] État actuel:', {
        selectedCandidate: selectedCandidate?.first_name + ' ' + selectedCandidate?.last_name,
        candidateApplicationsCount: candidateApplications.length,
        selectedApplicationId
      })
      showError('Veuillez sélectionner une candidature. Si le candidat a des candidatures, cliquez sur l\'une d\'elles dans la liste ci-dessous.')
      return
    }
    if (!formData.scheduled_at) {
      console.error('❌ [VALIDATION] Date de début manquante')
      alert('Veuillez sélectionner une date et heure de début')
      showError('Veuillez sélectionner une date et heure de début')
      return
    }
    if (!formData.scheduled_end_at) {
      console.error('❌ [VALIDATION] Date de fin manquante')
      alert('Veuillez sélectionner une date et heure de fin')
      showError('Veuillez sélectionner une date et heure de fin')
      return
    }
    if (!selectedInterviewerId && !currentUserId) {
      console.error('❌ [VALIDATION] Interviewer manquant')
      alert('Veuillez sélectionner un interviewer principal')
      showError('Veuillez sélectionner un interviewer principal')
      return
    }
    if (!formData.interview_type) {
      console.error('❌ [VALIDATION] Type d\'entretien manquant')
      alert('Veuillez sélectionner un type d\'entretien')
      showError('Veuillez sélectionner un type d\'entretien')
      return
    }

    try {
      setIsLoading(true)
      console.log('✅ [DEBUG] Tous les champs sont valides, création de l\'entretien...')
      
      // Préparer les participants (IDs + emails)
      const participantList: string[] = []
      if (formData.participants && formData.participants.length > 0) {
        formData.participants.forEach(id => {
          const user = users.find(u => u.id === id)
          if (user) {
            participantList.push(`${user.first_name} ${user.last_name} (${user.email})`)
          }
        })
      }
      if (formData.participantEmails && formData.participantEmails.length > 0) {
        formData.participantEmails.forEach(email => {
          participantList.push(email)
        })
      }

      // Convertir les dates en format ISO si nécessaire
      let scheduledAtISO = formData.scheduled_at
      let scheduledEndAtISO = formData.scheduled_end_at || undefined
      
      // Si les dates sont au format datetime-local (YYYY-MM-DDTHH:mm), les convertir en ISO
      if (scheduledAtISO && !scheduledAtISO.includes('T')) {
        scheduledAtISO = new Date(scheduledAtISO).toISOString()
      } else if (scheduledAtISO && scheduledAtISO.length === 16) {
        // Format datetime-local: YYYY-MM-DDTHH:mm -> convertir en ISO
        scheduledAtISO = new Date(scheduledAtISO).toISOString()
      }
      
      if (scheduledEndAtISO) {
        if (!scheduledEndAtISO.includes('T')) {
          scheduledEndAtISO = new Date(scheduledEndAtISO).toISOString()
        } else if (scheduledEndAtISO.length === 16) {
          scheduledEndAtISO = new Date(scheduledEndAtISO).toISOString()
        }
      }

      // Vérifier que application_id est bien un string UUID
      const applicationId = typeof selectedApplicationId === 'string' 
        ? selectedApplicationId 
        : String(selectedApplicationId)
      
      // Vérifier que interviewer_id est bien un string UUID
      const interviewerId = (selectedInterviewerId || currentUserId)
        ? (typeof (selectedInterviewerId || currentUserId) === 'string'
            ? (selectedInterviewerId || currentUserId)
            : String(selectedInterviewerId || currentUserId))
        : undefined

      // Préparer les données avec les participants dans preparation_notes
      const interviewData: InterviewCreate = {
        application_id: applicationId,
        interview_type: formData.interview_type as any,
        scheduled_at: scheduledAtISO,
        scheduled_end_at: scheduledEndAtISO,
        location: formData.location || undefined,
        interviewer_id: interviewerId || undefined,
        preparation_notes: formData.preparation_notes 
          ? `${formData.preparation_notes}\n\nParticipants: ${participantList.length > 0 ? participantList.join(', ') : 'Aucun'}`
          : participantList.length > 0
            ? `Participants: ${participantList.join(', ')}`
            : undefined
      }
      
      console.log('📤 [DEBUG] Tentative d\'envoi des données:', JSON.stringify(interviewData, null, 2))
      console.log('📤 [DEBUG] Types des données:', {
        application_id: typeof interviewData.application_id,
        scheduled_at: typeof interviewData.scheduled_at,
        scheduled_end_at: typeof interviewData.scheduled_end_at,
        interviewer_id: typeof interviewData.interviewer_id,
        interview_type: typeof interviewData.interview_type
      })
      
      const result = await createInterview(interviewData)
      console.log('✅ [DEBUG] Entretien créé avec succès:', result)
      alert('✅ Entretien planifié avec succès!')
      success('Entretien planifié avec succès')
      setShowModal(false)
      resetForm()
      loadData()
    } catch (err: any) {
      console.error('❌ [DEBUG] Erreur lors de la création:', err)
      console.error('❌ [DEBUG] Détails de l\'erreur:', {
        message: err?.message,
        stack: err?.stack,
        response: err?.response,
        data: err?.data
      })
      const errorMessage = err?.message || err?.response?.data?.detail || 'Erreur lors de la planification de l\'entretien'
      alert(`❌ Erreur: ${errorMessage}`)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
      console.log('🏁 [DEBUG] handleCreateInterview terminé')
    }
  }

  const resetForm = () => {
    setFormData({
      interview_type: 'prequalification',
      scheduled_at: '',
      scheduled_end_at: '',
      location: '',
      preparation_notes: '',
      participants: [],
      participantEmails: []
    })
    setSelectedApplicationId('')
    // Réinitialiser l'interviewer à l'utilisateur connecté
    if (currentUserId) {
      setSelectedInterviewerId(currentUserId)
    }
    setApplicationSearchQuery('')
    setParticipantSearchQuery('')
    setSelectedDate(null)
    setSelectedCandidate(null)
    setSelectedJobId('')
    setCandidateApplications([])
  }

  const openEditModal = (interview: InterviewResponse) => {
    setSelectedInterview(interview)
    setSelectedApplicationId(interview.application_id)
    setSelectedInterviewerId(interview.interviewer_id || '')
    
    // Extraire les participants des notes si présents
    const participants: string[] = []
    const participantEmails: string[] = []
    if (interview.preparation_notes) {
      const participantsMatch = interview.preparation_notes.match(/Participants:\s*(.+)/)
      if (participantsMatch) {
        const participantsStr = participantsMatch[1]
        participantsStr.split(',').forEach(p => {
          const trimmed = p.trim()
          // Vérifier si c'est un email ou un utilisateur
          if (trimmed.includes('@')) {
            participantEmails.push(trimmed)
          } else {
            // Chercher l'utilisateur par nom
            const user = users.find(u => 
              trimmed.includes(u.first_name) && trimmed.includes(u.last_name)
            )
            if (user) {
              participants.push(user.id)
            }
          }
        })
      }
    }
    
    setFormData({
      interview_type: interview.interview_type as any,
      scheduled_at: interview.scheduled_at ? new Date(interview.scheduled_at).toISOString().slice(0, 16) : '',
      scheduled_end_at: interview.scheduled_end_at ? new Date(interview.scheduled_end_at).toISOString().slice(0, 16) : '',
      location: interview.location || '',
      preparation_notes: interview.preparation_notes?.replace(/Participants:.*/, '').trim() || '',
      participants,
      participantEmails
    })
    setShowEditModal(true)
  }

  const loadCandidateApplications = async (candidateId: string) => {
    try {
      const apps = await getCandidateApplications(candidateId)
      setCandidateApplications(apps)
      // Si le candidat n'a qu'une seule candidature, la sélectionner automatiquement
      if (apps.length === 1) {
        setSelectedApplicationId(apps[0].id)
        console.log('✅ [AUTO-SELECT] Candidature unique sélectionnée automatiquement:', apps[0].id)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des applications:', err)
      setCandidateApplications([])
    }
  }

  const handleCreateApplicationAndInterview = async () => {
    if (!selectedCandidate || !selectedJobId || !formData.scheduled_at) {
      showError('Veuillez sélectionner un candidat, un besoin et une date')
      return
    }

    try {
      setIsLoading(true)
      
      // Créer l'application d'abord
      if (!selectedCandidate.id) {
        showError('Erreur: Candidat invalide')
        return
      }
      const newApplication = await createApplication({
        candidate_id: selectedCandidate.id,
        job_id: selectedJobId,
        status: 'sourcé'
      })
      
      // Ensuite créer l'entretien
      const interviewData: InterviewCreate = {
        application_id: newApplication.id,
        interview_type: formData.interview_type as any,
        scheduled_at: formData.scheduled_at,
        location: formData.location,
        interviewer_id: selectedInterviewerId || undefined,
        preparation_notes: formData.preparation_notes 
          ? `${formData.preparation_notes}\n\nParticipants: ${formData.participants?.map(id => {
              const user = users.find(u => u.id === id)
              return user ? `${user.first_name} ${user.last_name}` : id
            }).join(', ') || 'Aucun'}`
          : formData.participants && formData.participants.length > 0
            ? `Participants: ${formData.participants.map(id => {
                const user = users.find(u => u.id === id)
                return user ? `${user.first_name} ${user.last_name}` : id
              }).join(', ')}`
            : undefined
      }
      
      await createInterview(interviewData)
      success('Candidature créée et entretien planifié avec succès')
      setShowModal(false)
      resetForm()
      loadData()
    } catch (err) {
      console.error('Erreur lors de la création:', err)
      showError('Erreur lors de la création de la candidature et de la planification de l\'entretien')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackData.feedback || !showFeedbackModal) {
      showError('Le feedback est obligatoire')
      return
    }

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
      loadData()
    } catch (err) {
      console.error('Erreur lors de l\'ajout du feedback:', err)
      showError('Erreur lors de l\'enregistrement du feedback')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInterview) return

    // Validation des champs obligatoires
    if (!formData.scheduled_at) {
      showError('Veuillez sélectionner une date et heure de début')
      return
    }
    if (!formData.scheduled_end_at) {
      showError('Veuillez sélectionner une date et heure de fin')
      return
    }
    if (!selectedInterviewerId && !currentUserId) {
      showError('Veuillez sélectionner un interviewer principal')
      return
    }
    if (!formData.interview_type) {
      showError('Veuillez sélectionner un type d\'entretien')
      return
    }

    try {
      setIsLoading(true)
      
      // Préparer les participants (IDs + emails)
      const participantList: string[] = []
      if (formData.participants && formData.participants.length > 0) {
        formData.participants.forEach(id => {
          const user = users.find(u => u.id === id)
          if (user) {
            participantList.push(`${user.first_name} ${user.last_name} (${user.email})`)
          }
        })
      }
      if (formData.participantEmails && formData.participantEmails.length > 0) {
        formData.participantEmails.forEach(email => {
          participantList.push(email)
        })
      }

      // Préparer les données de mise à jour
      const updateData: InterviewUpdate = {
        interview_type: formData.interview_type as any,
        scheduled_at: formData.scheduled_at,
        scheduled_end_at: formData.scheduled_end_at || undefined,
        location: formData.location,
        interviewer_id: selectedInterviewerId || currentUserId || undefined,
        preparation_notes: formData.preparation_notes 
          ? `${formData.preparation_notes}\n\nParticipants: ${participantList.length > 0 ? participantList.join(', ') : 'Aucun'}`
          : participantList.length > 0
            ? `Participants: ${participantList.join(', ')}`
            : undefined
      }
      
      console.log('📤 Mise à jour de l\'entretien:', updateData)
      await updateInterview(selectedInterview.id, updateData)
      console.log('✅ Entretien mis à jour avec succès')
      success('Entretien modifié avec succès')
      setShowEditModal(false)
      setSelectedInterview(null)
      resetForm()
      loadData()
    } catch (err: any) {
      console.error('❌ Erreur lors de la modification:', err)
      const errorMessage = err?.message || 'Erreur lors de la modification de l\'entretien'
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteInterview = async () => {
    if (!selectedInterview) return

    try {
      setIsLoading(true)
      console.log('🗑️ Suppression de l\'entretien:', selectedInterview.id)
      await deleteInterview(selectedInterview.id)
      console.log('✅ Entretien supprimé avec succès')
      success('Entretien supprimé avec succès')
      setShowDeleteModal(false)
      setSelectedInterview(null)
      loadData()
    } catch (err: any) {
      console.error('❌ Erreur lors de la suppression:', err)
      const errorMessage = err?.message || 'Erreur lors de la suppression de l\'entretien'
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const openDeleteConfirmationModal = (interview: InterviewResponse) => {
    setSelectedInterview(interview)
    setShowDeleteModal(true)
  }

  const handleScheduleClientInterview = async () => {
    if (!selectedClientRequest || !selectedAvailabilitySlot) {
      showError('Veuillez sélectionner un créneau de disponibilité')
      return
    }

    try {
      setIsLoading(true)
      
      // Créer la date/heure de début et fin
      const scheduledAt = new Date(`${selectedAvailabilitySlot.date}T${selectedAvailabilitySlot.start_time}`)
      const scheduledEndAt = new Date(`${selectedAvailabilitySlot.date}T${selectedAvailabilitySlot.end_time}`)
      
      // Créer l'entretien
      const interviewData: InterviewCreate = {
        application_id: selectedClientRequest.application_id,
        interview_type: 'client',
        scheduled_at: scheduledAt.toISOString(),
        scheduled_end_at: scheduledEndAt.toISOString(),
        location: formData.location || undefined,
        interviewer_id: selectedInterviewerId || currentUserId || undefined,
        preparation_notes: formData.preparation_notes || undefined
      }
      
      const newInterview = await createInterview(interviewData)
      
      // Lier la demande à l'entretien créé
      await scheduleClientInterview(selectedClientRequest.id, newInterview.id)
      
      success('Entretien client programmé avec succès')
      setShowScheduleClientInterviewModal(false)
      setSelectedClientRequest(null)
      setSelectedAvailabilitySlot(null)
      resetForm()
      loadData()
    } catch (err: any) {
      console.error('Erreur lors de la programmation:', err)
      showError(err?.message || 'Erreur lors de la programmation de l\'entretien')
    } finally {
      setIsLoading(false)
    }
  }

  const getInterviewTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'rh': 'Entretien RH',
      'technique': 'Entretien Technique',
      'client': 'Entretien Client',
      'prequalification': 'Préqualification',
      'qualification': 'Qualification',
      'autre': 'Autre'
    }
    return labels[type] || type
  }

  const getInterviewTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'rh': 'bg-blue-100 text-blue-800 border-blue-300',
      'technique': 'bg-purple-100 text-purple-800 border-purple-300',
      'client': 'bg-green-100 text-green-800 border-green-300',
      'prequalification': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'qualification': 'bg-orange-100 text-orange-800 border-orange-300',
      'autre': 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300'
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

  // Calendrier
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days: (Date | null)[] = []
    
    // Ajouter les jours vides du mois précédent
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Ajouter les jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const getInterviewsForDate = (date: Date) => {
    return interviews.filter(interview => {
      const interviewDate = new Date(interview.scheduled_at)
      return interviewDate.toDateString() === date.toDateString()
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const dateTime = new Date(date)
    dateTime.setHours(10, 0, 0, 0) // Définir à 10h par défaut
    setFormData(prev => ({
      ...prev,
      scheduled_at: dateTime.toISOString().slice(0, 16)
    }))
    setShowModal(true)
  }

  const toggleParticipant = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants?.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...(prev.participants || []), userId]
    }))
  }

  const addParticipantEmail = (email: string) => {
    const trimmedEmail = email.trim()
    if (trimmedEmail && trimmedEmail.includes('@') && !formData.participantEmails?.includes(trimmedEmail)) {
      setFormData(prev => ({
        ...prev,
        participantEmails: [...(prev.participantEmails || []), trimmedEmail]
      }))
      setParticipantSearchQuery('')
    }
  }

  const removeParticipantEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      participantEmails: prev.participantEmails?.filter(e => e !== email) || []
    }))
  }

  // Filtrer les utilisateurs pour les participants
  const filteredUsersForParticipants = useMemo(() => {
    if (!participantSearchQuery.trim()) {
      return []
    }
    
    const searchLower = participantSearchQuery.toLowerCase()
    return users.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
      return fullName.includes(searchLower) ||
             user.first_name?.toLowerCase().includes(searchLower) ||
             user.last_name?.toLowerCase().includes(searchLower) ||
             user.email?.toLowerCase().includes(searchLower) ||
             user.role?.toLowerCase().includes(searchLower)
    }).slice(0, 10) // Limiter à 10 résultats
  }, [participantSearchQuery, users])

  // Filtrer les applications disponibles
  const availableApplications = useMemo(() => {
    if (!applicationSearchQuery.trim()) {
      return []
    }
    
    const searchLower = applicationSearchQuery.toLowerCase()
    return candidates
      .filter(candidate => {
        const fullName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase()
        return fullName.includes(searchLower) ||
               candidate.first_name?.toLowerCase().includes(searchLower) ||
               candidate.last_name?.toLowerCase().includes(searchLower) ||
               candidate.email?.toLowerCase().includes(searchLower)
      })
      .slice(0, 10) // Limiter à 10 résultats
  }, [applicationSearchQuery, candidates])

  if (isLoading && interviews.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Chargement des entretiens...</div>
      </div>
    )
  }

  const days = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">Planification des Entretiens</h1>
                <p className="text-blue-100 text-lg">Planifiez et gérez vos entretiens avec les candidats</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 p-1">
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'calendar'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Calendrier
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Liste
                  </button>
                </div>
                <button
                  onClick={() => {
                    resetForm()
                    if (currentUserId && !selectedInterviewerId) {
                      setSelectedInterviewerId(currentUserId)
                    }
                    setShowModal(true)
                  }}
                  className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Planifier un entretien
                </button>
              </div>
            </div>
          </div>
        </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠️ {error}
        </div>
      )}

        {/* Statistiques modernes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Aujourd'hui</p>
            <p className="text-3xl font-bold text-gray-900">
              {interviews.filter(i => {
                const date = new Date(i.scheduled_at)
                const today = new Date()
                return date.toDateString() === today.toDateString()
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Cette semaine</p>
            <p className="text-3xl font-bold text-gray-900">
              {interviews.filter(i => {
                const date = new Date(i.scheduled_at)
                const weekStart = new Date()
                weekStart.setDate(weekStart.getDate() - weekStart.getDay())
                return date >= weekStart
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl group-hover:bg-yellow-200 transition-colors">
                <MessageSquare className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">En attente feedback</p>
            <p className="text-3xl font-bold text-gray-900">
              {interviews.filter(i => !i.feedback && new Date(i.scheduled_at) < new Date()).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
            <p className="text-3xl font-bold text-gray-900">{interviews.length}</p>
          </div>
        </div>

        {/* Section Demandes d'entretien client */}
        {clientInterviewRequests.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl shadow-xl border border-orange-200 overflow-hidden">
            <div className="p-6 border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Demandes d'entretien client</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {clientInterviewRequests.length} demande{clientInterviewRequests.length > 1 ? 's' : ''} en attente de programmation
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {clientInterviewRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl border-2 border-orange-200 p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{request.candidate_name}</h3>
                          <span className="px-3 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                            En attente
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                          <Briefcase className="w-4 h-4" />
                          <span>{request.job_title}</span>
                          <span className="text-gray-400">•</span>
                          <span>Client: {request.client_name}</span>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Disponibilités proposées par le client :</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {request.availability_slots.map((slot, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                  selectedClientRequest?.id === request.id && 
                                  selectedAvailabilitySlot?.date === slot.date &&
                                  selectedAvailabilitySlot?.start_time === slot.start_time
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50'
                                }`}
                                onClick={() => {
                                  setSelectedClientRequest(request)
                                  setSelectedAvailabilitySlot(slot)
                                  setShowScheduleClientInterviewModal(true)
                                }}
                              >
                                <div className="font-medium text-sm text-gray-900">
                                  {new Date(slot.date).toLocaleDateString('fr-FR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                  })}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {slot.start_time} - {slot.end_time}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {request.notes && (
                          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-xs font-medium text-gray-700 mb-1">Notes du client</p>
                            <p className="text-sm text-gray-600">{request.notes}</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedClientRequest(request)
                          setSelectedAvailabilitySlot(request.availability_slots[0])
                          setShowScheduleClientInterviewModal(true)
                        }}
                        className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                      >
                        Programmer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contenu selon la vue */}
        {viewMode === 'calendar' ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 capitalize">{monthName}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* En-têtes des jours */}
              <div className="grid grid-cols-7 gap-3 mb-4">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-700 py-3 bg-gray-50 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Grille du calendrier */}
              <div className="grid grid-cols-7 gap-3">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square"></div>
                  }
                  
                  const dayInterviews = getInterviewsForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isPast = day < new Date() && !isToday
                  
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={`aspect-square border-2 rounded-xl p-3 cursor-pointer transition-all hover:shadow-lg ${
                        isToday
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md'
                          : isPast
                          ? 'border-gray-200 bg-gray-50 opacity-75'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className={`text-lg font-bold mb-2 ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1.5">
                        {dayInterviews.slice(0, 3).map(interview => (
                          <div
                            key={interview.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(interview)
                            }}
                            className={`text-xs px-2 py-1 rounded-lg truncate border ${getInterviewTypeColor(interview.interview_type)} cursor-pointer hover:scale-105 transition-transform font-medium`}
                            title={`${getInterviewTypeLabel(interview.interview_type)} - ${interview.candidate_name}`}
                          >
                            {interview.candidate_name.split(' ')[0]}
                          </div>
                        ))}
                        {dayInterviews.length > 3 && (
                          <div className="text-xs text-gray-500 font-medium">
                            +{dayInterviews.length - 3} autre{dayInterviews.length - 3 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {interviews.length} entretien{interviews.length > 1 ? 's' : ''} planifié{interviews.length > 1 ? 's' : ''}
              </h2>
            </div>
            <div className="p-6">
              {interviews.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {interviews
                    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                    .map((interview) => (
                      <div
                        key={interview.id}
                        className="group p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-xl transition-all bg-white"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${getInterviewTypeColor(interview.interview_type)}`}>
                              {getInterviewTypeLabel(interview.interview_type)}
                            </span>
                            {getDecisionBadge(interview.decision || 'en_attente')}
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {interview.candidate_name}
                        </h3>
                        <p className="text-sm font-medium text-gray-600 mb-4">{interview.job_title}</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{formatDateTime(interview.scheduled_at)}</span>
                          </div>
                          {interview.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              <span>{interview.location}</span>
                            </div>
                          )}
                          {interview.interviewer_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4 text-blue-600" />
                              <span>{interview.interviewer_name}</span>
                            </div>
                          )}
                        </div>
                        {interview.feedback && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{interview.feedback}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => openEditModal(interview)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                          >
                            <Edit className="w-4 h-4" />
                            Modifier
                          </button>
                          <button
                            onClick={() => openDeleteConfirmationModal(interview)}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {!interview.feedback && new Date(interview.scheduled_at) < new Date() && (
                            <button
                              onClick={() => {
                                setSelectedInterview(interview)
                                setShowFeedbackModal(interview.id)
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Feedback
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                    <Calendar className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">Aucun entretien planifié</p>
                  <p className="text-gray-600 mb-6">Commencez par planifier votre premier entretien</p>
                  <button
                    onClick={() => {
                      resetForm()
                      if (currentUserId && !selectedInterviewerId) {
                        setSelectedInterviewerId(currentUserId)
                      }
                      setShowModal(true)
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Planifier votre premier entretien
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de planification */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false)
              resetForm()
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Planifier un entretien</h2>
                    <p className="text-blue-100 text-sm mt-1">Remplissez les informations ci-dessous</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form 
              id="interview-form"
              onSubmit={(e) => {
                console.log('📝 [DEBUG] ========== FORMULAIRE onSubmit DÉCLENCHÉ ==========')
                e.preventDefault() // Toujours empêcher le comportement par défaut
                e.stopPropagation() // Empêcher la propagation
                console.log('📝 [DEBUG] Appel de handleCreateInterview')
                handleCreateInterview(e)
              }} 
              className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto"
              noValidate
            >
              {/* Section 1: Candidat et Candidature */}
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <label className="text-base font-semibold text-gray-900">
                    Candidat / Candidature
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={applicationSearchQuery}
                    onChange={(e) => setApplicationSearchQuery(e.target.value)}
                    placeholder="Rechercher un candidat par nom, prénom ou email..."
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                {applicationSearchQuery && availableApplications.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {availableApplications.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={async () => {
                          setSelectedCandidate(candidate)
                          setApplicationSearchQuery(`${candidate.first_name} ${candidate.last_name}`)
                          setSelectedApplicationId('')
                          // Charger les applications pour ce candidat
                          if (candidate.id) {
                            await loadCandidateApplications(candidate.id)
                          }
                        }}
                        className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {candidate.first_name} {candidate.last_name}
                        </div>
                        {candidate.profile_title && (
                          <div className="text-sm text-gray-600">{candidate.profile_title}</div>
                        )}
                        {candidate.email && (
                          <div className="text-xs text-gray-500">{candidate.email}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {selectedCandidate && (
                  <div className="mt-4">
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <p className="text-sm font-semibold text-blue-900">
                          Candidat sélectionné : {selectedCandidate.first_name} {selectedCandidate.last_name}
                        </p>
                      </div>
                      {selectedCandidate.profile_title && (
                        <p className="text-sm text-blue-700 ml-7">{selectedCandidate.profile_title}</p>
                      )}
                    </div>
                    
                    {candidateApplications.length > 0 ? (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Sélectionner une candidature
                          <span className="text-red-500 ml-1">*</span>
                          {!selectedApplicationId && (
                            <span className="ml-2 text-xs text-red-600 font-normal">
                              (Veuillez sélectionner une candidature ci-dessous)
                            </span>
                          )}
                        </label>
                        <div className="border-2 border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {candidateApplications.map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => {
                                setSelectedApplicationId(app.id)
                                console.log('✅ [SELECT] Candidature sélectionnée:', app.id, app.job_title)
                              }}
                              className={`w-full text-left p-4 hover:bg-blue-50 transition-all border-b border-gray-100 last:border-b-0 ${
                                selectedApplicationId === app.id 
                                  ? 'bg-blue-100 border-l-4 border-blue-600 shadow-sm' 
                                  : 'hover:border-l-2 hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Briefcase className={`w-4 h-4 ${selectedApplicationId === app.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                <div className="font-semibold text-gray-900">{app.job_title}</div>
                                {selectedApplicationId === app.id && (
                                  <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-2 ml-6">
                                Statut: <span className="font-medium">{app.status}</span> • {app.is_in_shortlist ? '✓ En shortlist' : 'Non shortlist'}
                              </div>
                            </button>
                          ))}
                        </div>
                        {selectedApplicationId && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700">
                              ✓ Candidature sélectionnée
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          Ce candidat n'a pas encore de candidature. Créez-en une :
                        </p>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sélectionner un besoin *
                        </label>
                        <select
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Sélectionner un besoin</option>
                          {jobs
                            .filter(job => job.status === 'validé' || job.status === 'en_cours')
                            .map((job) => (
                              <option key={job.id} value={job.id || ''}>
                                {job.title} - {job.department || 'Sans département'}
                              </option>
                            ))}
                        </select>
                        {selectedJobId && (
                          <button
                            type="button"
                            onClick={handleCreateApplicationAndInterview}
                            disabled={isLoading}
                            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Créer la candidature et planifier l'entretien
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Type et Horaires */}
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <label className="text-base font-semibold text-gray-900">Type et Horaires</label>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type d'entretien
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.interview_type}
                    onChange={(e) => setFormData({ ...formData, interview_type: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                  >
                    <option value="prequalification">📋 Préqualification</option>
                    <option value="qualification">✅ Qualification</option>
                    <option value="rh">👔 Entretien RH</option>
                    <option value="technique">💻 Entretien Technique</option>
                    <option value="client">🤝 Entretien Client</option>
                    <option value="autre">📝 Autre</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Heure de début
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.scheduled_at}
                      onChange={(e) => {
                        setFormData({ ...formData, scheduled_at: e.target.value })
                        // Si pas d'heure de fin, définir automatiquement 1h après
                        if (!formData.scheduled_end_at && e.target.value) {
                          const startDate = new Date(e.target.value)
                          startDate.setHours(startDate.getHours() + 1)
                          setFormData(prev => ({
                            ...prev,
                            scheduled_at: e.target.value,
                            scheduled_end_at: startDate.toISOString().slice(0, 16)
                          }))
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Heure de fin
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.scheduled_end_at || ''}
                      onChange={(e) => setFormData({ ...formData, scheduled_end_at: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Interviewer et Participants */}
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-600" />
                  <label className="text-base font-semibold text-gray-900">Interviewer et Participants</label>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Interviewer principal
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    required
                    value={selectedInterviewerId || currentUserId || ''}
                    onChange={(e) => {
                      setSelectedInterviewerId(e.target.value)
                      console.log('🔍 Interviewer sélectionné:', e.target.value)
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Sélectionner un interviewer</option>
                    {currentUserId && users.find(u => u.id === currentUserId) && (
                      <option value={currentUserId}>
                        {users.find(u => u.id === currentUserId)?.first_name} {users.find(u => u.id === currentUserId)?.last_name} ({users.find(u => u.id === currentUserId)?.role}) - Vous
                      </option>
                    )}
                    {users
                      .filter(u => u.id !== currentUserId)
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.role})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <span className="text-blue-600">ℹ️</span>
                    Par défaut, vous êtes sélectionné comme interviewer principal. Vous pouvez changer si nécessaire.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Participants additionnels
                  </label>
                  
                  {/* Recherche de participants */}
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={participantSearchQuery}
                        onChange={(e) => setParticipantSearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && participantSearchQuery.includes('@')) {
                            e.preventDefault()
                            addParticipantEmail(participantSearchQuery)
                          }
                        }}
                        placeholder="Rechercher par nom, prénom, email ou entrer un email..."
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                    {participantSearchQuery && participantSearchQuery.includes('@') && !formData.participantEmails?.includes(participantSearchQuery.trim()) && (
                      <button
                        type="button"
                        onClick={() => addParticipantEmail(participantSearchQuery)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter l'email "{participantSearchQuery}"
                      </button>
                    )}
                  </div>

                {/* Liste des utilisateurs filtrés */}
                {filteredUsersForParticipants.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto mb-3">
                    <div className="space-y-2">
                      {filteredUsersForParticipants.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.participants?.includes(user.id) || false}
                            onChange={() => toggleParticipant(user.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{user.email} • {user.role}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants sélectionnés */}
                {(formData.participants && formData.participants.length > 0) || (formData.participantEmails && formData.participantEmails.length > 0) ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-2">Participants sélectionnés :</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.participants?.map((userId) => {
                        const user = users.find(u => u.id === userId)
                        return user ? (
                          <span
                            key={userId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {user.first_name} {user.last_name} ({user.role})
                            <button
                              type="button"
                              onClick={() => toggleParticipant(userId)}
                              className="hover:text-blue-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null
                      })}
                      {formData.participantEmails?.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeParticipantEmail(email)}
                            className="hover:text-green-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Aucun participant sélectionné</p>
                )}
                </div>
              </div>

              {/* Section 4: Lieu et Notes */}
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <label className="text-base font-semibold text-gray-900">Lieu et Notes</label>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lieu / Lien visioconférence
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Lieu physique ou lien Zoom/Teams"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes de préparation
                  </label>
                  <textarea
                    value={formData.preparation_notes || ''}
                    onChange={(e) => setFormData({ ...formData, preparation_notes: e.target.value })}
                    rows={4}
                    placeholder="Notes pour préparer l'entretien..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
                  />
                </div>
              </div>

              {/* Footer avec boutons */}
              <div className="flex justify-between items-center pt-6 border-t-2 border-gray-200 -mx-6 px-6 pb-6 mt-6">
                <div className="text-sm text-gray-600">
                  <span className="text-red-500">*</span> Champs obligatoires
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="interview-form"
                    disabled={isLoading}
                    style={{ zIndex: 9999, position: 'relative', pointerEvents: 'auto' }}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 flex items-center gap-2"
                    title={
                      !selectedApplicationId ? 'Sélectionnez une candidature' :
                      !formData.scheduled_at ? 'Sélectionnez une date et heure de début' :
                      !formData.scheduled_end_at ? 'Sélectionnez une date et heure de fin' :
                      !(selectedInterviewerId || currentUserId) ? 'Sélectionnez un interviewer principal' :
                      !formData.interview_type ? 'Sélectionnez un type d\'entretien' :
                      'Planifier l\'entretien'
                    }
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Planification...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Planifier l'entretien
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Supprimer l'entretien</h2>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Candidat :</span> {selectedInterview.candidate_name}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Poste :</span> {selectedInterview.job_title}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Date :</span> {formatDateTime(selectedInterview.scheduled_at)}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedInterview(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteInterview}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification */}
      {showEditModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Modifier l'entretien</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedInterview(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateInterview} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Candidat :</span> {selectedInterview.candidate_name}
                </p>
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Poste :</span> {selectedInterview.job_title}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'entretien *
                </label>
                <select
                  required
                  value={formData.interview_type}
                  onChange={(e) => setFormData({ ...formData, interview_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="prequalification">Préqualification</option>
                  <option value="qualification">Qualification</option>
                  <option value="rh">Entretien RH</option>
                  <option value="technique">Entretien Technique</option>
                  <option value="client">Entretien Client</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de début *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure de fin *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduled_end_at || ''}
                    onChange={(e) => setFormData({ ...formData, scheduled_end_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interviewer principal *
                </label>
                <select
                  required
                  value={selectedInterviewerId || currentUserId || ''}
                  onChange={(e) => {
                    setSelectedInterviewerId(e.target.value)
                    console.log('🔍 Interviewer sélectionné (modification):', e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un interviewer</option>
                  {currentUserId && users.find(u => u.id === currentUserId) && (
                    <option value={currentUserId}>
                      {users.find(u => u.id === currentUserId)?.first_name} {users.find(u => u.id === currentUserId)?.last_name} ({users.find(u => u.id === currentUserId)?.role}) - Vous
                    </option>
                  )}
                  {users
                    .filter(u => u.id !== currentUserId)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.role})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Par défaut, vous êtes sélectionné comme interviewer principal. Vous pouvez changer si nécessaire.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participants additionnels
                </label>
                
                {/* Recherche de participants */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={participantSearchQuery}
                      onChange={(e) => setParticipantSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && participantSearchQuery.includes('@')) {
                          e.preventDefault()
                          addParticipantEmail(participantSearchQuery)
                        }
                      }}
                      placeholder="Rechercher par nom, prénom, email ou entrer un email..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  {participantSearchQuery && participantSearchQuery.includes('@') && !formData.participantEmails?.includes(participantSearchQuery.trim()) && (
                    <button
                      type="button"
                      onClick={() => addParticipantEmail(participantSearchQuery)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Ajouter l'email "{participantSearchQuery}"
                    </button>
                  )}
                </div>

                {/* Liste des utilisateurs filtrés */}
                {filteredUsersForParticipants.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto mb-3">
                    <div className="space-y-2">
                      {filteredUsersForParticipants.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.participants?.includes(user.id) || false}
                            onChange={() => toggleParticipant(user.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{user.email} • {user.role}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants sélectionnés */}
                {(formData.participants && formData.participants.length > 0) || (formData.participantEmails && formData.participantEmails.length > 0) ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-2">Participants sélectionnés :</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.participants?.map((userId) => {
                        const user = users.find(u => u.id === userId)
                        return user ? (
                          <span
                            key={userId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {user.first_name} {user.last_name} ({user.role})
                            <button
                              type="button"
                              onClick={() => toggleParticipant(userId)}
                              className="hover:text-blue-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null
                      })}
                      {formData.participantEmails?.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeParticipantEmail(email)}
                            className="hover:text-green-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Aucun participant sélectionné</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lieu / Lien visioconférence
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Lieu physique ou lien Zoom/Teams"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes de préparation
                </label>
                <textarea
                  value={formData.preparation_notes || ''}
                  onChange={(e) => setFormData({ ...formData, preparation_notes: e.target.value })}
                  rows={4}
                  placeholder="Notes pour préparer l'entretien..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedInterview(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    isLoading || 
                    !formData.scheduled_at || 
                    !formData.scheduled_end_at || 
                    !(selectedInterviewerId || currentUserId) ||
                    !formData.interview_type
                  }
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 flex items-center gap-2"
                  title={
                    !formData.scheduled_at ? 'Sélectionnez une date et heure de début' :
                    !formData.scheduled_end_at ? 'Sélectionnez une date et heure de fin' :
                    !(selectedInterviewerId || currentUserId) ? 'Sélectionnez un interviewer principal' :
                    !formData.interview_type ? 'Sélectionnez un type d\'entretien' :
                    'Enregistrer les modifications'
                  }
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Modification...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Enregistrer les modifications
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de feedback */}
      {showFeedbackModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">{selectedInterview.candidate_name}</span> - {selectedInterview.job_title}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback * (obligatoire)
                </label>
                <textarea
                  required
                  value={feedbackData.feedback || ''}
                  onChange={(e) => setFeedbackData({ ...feedbackData, feedback: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Décrivez votre évaluation du candidat..."
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de programmation d'entretien client */}
      {showScheduleClientInterviewModal && selectedClientRequest && selectedAvailabilitySlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Programmer un entretien client</h3>
                <button
                  onClick={() => {
                    setShowScheduleClientInterviewModal(false)
                    setSelectedClientRequest(null)
                    setSelectedAvailabilitySlot(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Candidat</p>
                <p className="text-lg text-blue-800">{selectedClientRequest.candidate_name}</p>
                <p className="text-sm text-blue-700 mt-1">{selectedClientRequest.job_title}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900 mb-2">Créneau sélectionné</p>
                <p className="text-lg text-green-800">
                  {new Date(selectedAvailabilitySlot.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {selectedAvailabilitySlot.start_time} - {selectedAvailabilitySlot.end_time}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interviewer principal *
                </label>
                <select
                  value={selectedInterviewerId || currentUserId || ''}
                  onChange={(e) => setSelectedInterviewerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionner un interviewer</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu / Lien visioconférence
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Lieu physique ou lien Zoom/Teams"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes de préparation
                </label>
                <textarea
                  value={formData.preparation_notes || ''}
                  onChange={(e) => setFormData({ ...formData, preparation_notes: e.target.value })}
                  rows={4}
                  placeholder="Notes pour préparer l'entretien..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {selectedClientRequest.notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-700 mb-1">Notes du client</p>
                  <p className="text-sm text-gray-600">{selectedClientRequest.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowScheduleClientInterviewModal(false)
                  setSelectedClientRequest(null)
                  setSelectedAvailabilitySlot(null)
                }}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleScheduleClientInterview}
                disabled={isLoading || !(selectedInterviewerId || currentUserId)}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? 'Programmation...' : 'Programmer l\'entretien'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
