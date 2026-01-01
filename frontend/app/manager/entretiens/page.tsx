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
  InterviewResponse,
  InterviewCreate,
  InterviewUpdate,
  InterviewFeedback,
  ApplicationResponse,
  CandidateResponse,
  UserResponse,
  JobResponse
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
  Phone
} from 'lucide-react'

type ViewMode = 'calendar' | 'list'
type CalendarView = 'month' | 'week' | 'day'

export default function ManagerInterviewsPage() {
  const router = useRouter()
  const { success, error: showError } = useToastContext()
  
  const [interviews, setInterviews] = useState<InterviewResponse[]>([])
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [candidates, setCandidates] = useState<CandidateResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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
  const [participantSearchQuery, setParticipantSearchQuery] = useState<string>('')
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
  }, [currentUserId])
  
  // S'assurer que selectedInterviewerId est défini quand le modal s'ouvre
  useEffect(() => {
    if (showModal && currentUserId && !selectedInterviewerId) {
      setSelectedInterviewerId(currentUserId)
    }
  }, [showModal, currentUserId, selectedInterviewerId])

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
      
      const [interviewsData, usersData] = await Promise.all([
        getInterviews().catch((err) => {
          console.warn('Erreur lors du chargement des entretiens:', err)
          return [] // Si l'API n'est pas accessible, retourner un tableau vide
        }),
        getUsers().catch(() => []) // Si l'API n'est pas accessible, retourner un tableau vide
      ])
      
      setInterviews(Array.isArray(interviewsData) ? interviewsData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
      
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
    
    // Validation des champs obligatoires
    if (!selectedApplicationId) {
      if (selectedCandidate) {
        showError('Veuillez sélectionner une candidature dans la liste ci-dessous. Si le candidat n\'a pas de candidature, créez-en une d\'abord.')
      } else {
        showError('Veuillez d\'abord rechercher et sélectionner un candidat, puis sélectionner une candidature.')
      }
      console.error('❌ [VALIDATION] Candidature manquante:', {
        selectedCandidate: selectedCandidate?.first_name + ' ' + selectedCandidate?.last_name,
        candidateApplicationsCount: candidateApplications.length,
        selectedApplicationId
      })
      return
    }
    if (!formData.scheduled_at) {
      showError('Veuillez sélectionner une date et heure de début')
      return
    }
    if (!formData.scheduled_end_at) {
      showError('Veuillez sélectionner une date et heure de fin')
      return
    }
    
    // Utiliser currentUserId comme fallback si selectedInterviewerId n'est pas défini
    const interviewerId = selectedInterviewerId || currentUserId
    if (!interviewerId) {
      showError('Veuillez sélectionner un interviewer principal')
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
          if (email.trim()) {
            participantList.push(email.trim())
          }
        })
      }
      
      // Préparer les données avec les participants dans preparation_notes
      const interviewData: InterviewCreate = {
        application_id: selectedApplicationId,
        interview_type: formData.interview_type as any,
        scheduled_at: formData.scheduled_at,
        scheduled_end_at: formData.scheduled_end_at || undefined,
        location: formData.location,
        interviewer_id: interviewerId || undefined,
        preparation_notes: formData.preparation_notes 
          ? `${formData.preparation_notes}\n\nParticipants: ${participantList.length > 0 ? participantList.join(', ') : 'Aucun'}`
          : participantList.length > 0
            ? `Participants: ${participantList.join(', ')}`
            : undefined
      }
      
      await createInterview(interviewData)
      success('Entretien planifié avec succès')
      setShowModal(false)
      resetForm()
      loadData()
    } catch (err) {
      console.error('Erreur lors de la création:', err)
      showError('Erreur lors de la planification de l\'entretien')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInterview || !formData.scheduled_at) {
      showError('Veuillez remplir tous les champs obligatoires')
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
          if (email.trim()) {
            participantList.push(email.trim())
          }
        })
      }
      
      const updateData: InterviewUpdate = {
        interview_type: formData.interview_type as any,
        scheduled_at: formData.scheduled_at,
        scheduled_end_at: formData.scheduled_end_at || undefined,
        location: formData.location,
        interviewer_id: selectedInterviewerId || undefined,
        preparation_notes: formData.preparation_notes 
          ? `${formData.preparation_notes}\n\nParticipants: ${participantList.length > 0 ? participantList.join(', ') : 'Aucun'}`
          : participantList.length > 0
            ? `Participants: ${participantList.join(', ')}`
            : undefined
      }
      
      await updateInterview(selectedInterview.id, updateData)
      success('Entretien modifié avec succès')
      setShowEditModal(false)
      setSelectedInterview(null)
      resetForm()
      loadData()
    } catch (err) {
      console.error('Erreur lors de la modification:', err)
      showError('Erreur lors de la modification de l\'entretien')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) {
      return
    }

    try {
      setIsLoading(true)
      await deleteInterview(interviewId)
      success('Entretien supprimé avec succès')
      loadData()
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
      showError('Erreur lors de la suppression de l\'entretien')
    } finally {
      setIsLoading(false)
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
          if (email.trim()) {
            participantList.push(email.trim())
          }
        })
      }
      
      // Créer l'application d'abord
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
        scheduled_end_at: formData.scheduled_end_at || undefined,
        location: formData.location,
        interviewer_id: selectedInterviewerId || undefined,
        preparation_notes: formData.preparation_notes 
          ? `${formData.preparation_notes}\n\nParticipants: ${participantList.length > 0 ? participantList.join(', ') : 'Aucun'}`
          : participantList.length > 0
            ? `Participants: ${participantList.join(', ')}`
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

  const toggleParticipant = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants?.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...(prev.participants || []), userId]
    }))
  }

  const addParticipantEmail = (email: string) => {
    if (!email.trim() || !email.includes('@')) {
      showError('Veuillez entrer une adresse email valide')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      participantEmails: prev.participantEmails?.includes(email.trim())
        ? prev.participantEmails
        : [...(prev.participantEmails || []), email.trim()]
    }))
    setParticipantSearchQuery('')
  }

  const removeParticipantEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      participantEmails: prev.participantEmails?.filter(e => e !== email) || []
    }))
  }

  // Filtrer les utilisateurs pour la recherche de participants
  const filteredUsersForParticipants = useMemo(() => {
    if (!participantSearchQuery.trim()) {
      return users.filter(u => u.role === 'recruteur' || u.role === 'manager' || u.role === 'client')
    }
    
    const searchLower = participantSearchQuery.toLowerCase()
    return users.filter(u => 
      (u.role === 'recruteur' || u.role === 'manager' || u.role === 'client') &&
      (u.first_name.toLowerCase().includes(searchLower) ||
       u.last_name.toLowerCase().includes(searchLower) ||
       u.email.toLowerCase().includes(searchLower))
    )
  }, [participantSearchQuery, users])

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
    // S'assurer que selectedInterviewerId est défini avant d'ouvrir le modal
    if (currentUserId && !selectedInterviewerId) {
      setSelectedInterviewerId(currentUserId)
    }
    setShowModal(true)
  }

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planification des Entretiens</h1>
          <p className="text-gray-600 mt-2">Planifiez et gérez vos entretiens avec les candidats</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Calendrier
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Liste
            </button>
          </div>
          <button
            onClick={() => {
              resetForm()
              // S'assurer que selectedInterviewerId est défini avant d'ouvrir le modal
              if (currentUserId && !selectedInterviewerId) {
                setSelectedInterviewerId(currentUserId)
              }
              setShowModal(true)
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Planifier un entretien
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">
                {interviews.filter(i => {
                  const date = new Date(i.scheduled_at)
                  const today = new Date()
                  return date.toDateString() === today.toDateString()
                }).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cette semaine</p>
              <p className="text-2xl font-bold text-gray-900">
                {interviews.filter(i => {
                  const date = new Date(i.scheduled_at)
                  const weekStart = new Date()
                  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
                  return date >= weekStart
                }).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente feedback</p>
              <p className="text-2xl font-bold text-gray-900">
                {interviews.filter(i => !i.feedback && new Date(i.scheduled_at) < new Date()).length}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{interviews.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Contenu selon la vue */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 capitalize">{monthName}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-2">
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
                    className={`aspect-square border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-md ${
                      isToday
                        ? 'border-indigo-500 bg-indigo-50'
                        : isPast
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayInterviews.slice(0, 3).map(interview => (
                        <div
                          key={interview.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedInterview(interview)
                            if (!interview.feedback && new Date(interview.scheduled_at) < new Date()) {
                              setShowFeedbackModal(interview.id)
                            }
                          }}
                          className={`text-xs p-1 rounded truncate border ${getInterviewTypeColor(interview.interview_type)} cursor-pointer`}
                          title={`${getInterviewTypeLabel(interview.interview_type)} - ${interview.candidate_name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(interview)
                          }}
                        >
                          {interview.candidate_name.split(' ')[0]}
                        </div>
                      ))}
                      {dayInterviews.length > 3 && (
                        <div className="text-xs text-gray-500">
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
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {interviews.length} entretien{interviews.length > 1 ? 's' : ''}
            </h2>
          </div>
          <div className="p-6">
            {interviews.length > 0 ? (
              <div className="space-y-4">
                {interviews
                  .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                  .map((interview) => (
                    <div
                      key={interview.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getInterviewTypeColor(interview.interview_type)}`}>
                              {getInterviewTypeLabel(interview.interview_type)}
                            </span>
                            {getDecisionBadge(interview.decision || 'en_attente')}
                          </div>
                          <h3 className="font-medium text-gray-900 mb-1">
                            {interview.candidate_name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{interview.job_title}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDateTime(interview.scheduled_at)}
                            </span>
                            {interview.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {interview.location}
                              </span>
                            )}
                            {interview.interviewer_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {interview.interviewer_name}
                              </span>
                            )}
                          </div>
                          {interview.feedback && (
                            <p className="text-sm text-gray-600 mt-2">{interview.feedback}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(interview)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteInterview(interview.id)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            <X className="w-4 h-4" />
                            Supprimer
                          </button>
                          {!interview.feedback && new Date(interview.scheduled_at) < new Date() && (
                            <button
                              onClick={() => {
                                setSelectedInterview(interview)
                                setShowFeedbackModal(interview.id)
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Ajouter feedback
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Aucun entretien planifié</p>
                <button
                  onClick={() => {
                    resetForm()
                    // S'assurer que selectedInterviewerId est défini avant d'ouvrir le modal
                    if (currentUserId && !selectedInterviewerId) {
                      setSelectedInterviewerId(currentUserId)
                    }
                    setShowModal(true)
                  }}
                  className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Planifier votre premier entretien
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de planification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Planifier un entretien</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateInterview} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Recherche de candidature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Candidat / Candidature *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={applicationSearchQuery}
                    onChange={(e) => setApplicationSearchQuery(e.target.value)}
                    placeholder="Rechercher un candidat par nom, prénom ou email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                          await loadCandidateApplications(candidate.id)
                        }}
                        className="w-full text-left p-3 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
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
                  <div className="mt-2">
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-3">
                      <p className="text-sm text-indigo-900 font-medium mb-1">
                        Candidat sélectionné : {selectedCandidate.first_name} {selectedCandidate.last_name}
                      </p>
                      {selectedCandidate.profile_title && (
                        <p className="text-xs text-indigo-700">{selectedCandidate.profile_title}</p>
                      )}
                    </div>
                    
                    {candidateApplications.length > 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sélectionner une candidature *
                          {!selectedApplicationId && (
                            <span className="ml-2 text-xs text-red-600 font-normal">
                              (Veuillez sélectionner une candidature ci-dessous)
                            </span>
                          )}
                        </label>
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {candidateApplications.map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => {
                                setSelectedApplicationId(app.id)
                                console.log('✅ [SELECT] Candidature sélectionnée:', app.id, app.job_title)
                              }}
                              className={`w-full text-left p-3 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                selectedApplicationId === app.id ? 'bg-indigo-100 border-l-4 border-indigo-600' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">{app.job_title}</div>
                                {selectedApplicationId === app.id && (
                                  <CheckCircle className="w-4 h-4 text-indigo-600 ml-auto" />
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Statut: {app.status} • {app.is_in_shortlist ? 'En shortlist' : 'Non shortlist'}
                              </div>
                            </button>
                          ))}
                        </div>
                        {selectedApplicationId && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Candidature sélectionnée
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Sélectionner un besoin</option>
                          {jobs
                            .filter(job => job.status === 'validé' || job.status === 'en_cours')
                            .map((job) => (
                              <option key={job.id} value={job.id}>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interviewer principal *
                </label>
                <select
                  required
                  value={selectedInterviewerId}
                  onChange={(e) => setSelectedInterviewerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun utilisateur disponible</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.participants?.includes(user.id) || false}
                            onChange={() => toggleParticipant(user.id)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
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
                  )}
                </div>
                {formData.participants && formData.participants.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.participants.map((userId) => {
                      const user = users.find(u => u.id === userId)
                      return user ? (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                        >
                          {user.first_name} {user.last_name}
                          <button
                            type="button"
                            onClick={() => toggleParticipant(userId)}
                            className="hover:text-indigo-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Planification...' : 'Planifier l\'entretien'}
                </button>
              </div>
            </form>
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
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-4">
                <p className="text-sm text-indigo-900">
                  <span className="font-medium">Candidat :</span> {selectedInterview.candidate_name}
                </p>
                <p className="text-sm text-indigo-900">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interviewer principal *
                </label>
                <select
                  required
                  value={selectedInterviewerId}
                  onChange={(e) => setSelectedInterviewerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  Participants (Recruteurs, Managers, Clients)
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  {participantSearchQuery && participantSearchQuery.includes('@') && !formData.participantEmails?.includes(participantSearchQuery.trim()) && (
                    <button
                      type="button"
                      onClick={() => addParticipantEmail(participantSearchQuery)}
                      className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
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
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
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
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                          >
                            {user.first_name} {user.last_name} ({user.role})
                            <button
                              type="button"
                              onClick={() => toggleParticipant(userId)}
                              className="hover:text-indigo-900"
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
                        {selectedApplicationId && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Candidature sélectionnée
                            </p>
                          </div>
                        )}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Modification...' : 'Enregistrer les modifications'}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
