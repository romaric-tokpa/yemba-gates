import { authenticatedFetch } from './auth'

// Détection automatique de l'URL de l'API
function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000'
    }
    
    if (protocol === 'https:' || hostname.includes('cloudflare') || hostname.includes('tunnel') || hostname.includes('loca.lt') || hostname.includes('trycloudflare.com')) {
      const tunnelBackendUrl = sessionStorage.getItem('TUNNEL_BACKEND_URL')
      if (tunnelBackendUrl) {
        return tunnelBackendUrl
      }
      return `${protocol}//${hostname.replace(':3000', ':8000').replace(':3001', ':8000')}`
    }
    
    return `http://${hostname}:8000`
  }
  
  return 'http://localhost:8000'
}

const API_URL = getApiUrl()

// ===== TYPES DE BASE =====

export interface JobCreate {
  title: string
  department?: string | null
  manager_demandeur?: string | null
  entreprise?: string | null
  contract_type?: string | null
  motif_recrutement?: string | null
  urgency?: string | null
  date_prise_poste?: string | null
  missions_principales?: string | null
  missions_secondaires?: string | null
  kpi_poste?: string | null
  niveau_formation?: string | null
  experience_requise?: number | null
  competences_techniques_obligatoires?: string[] | null
  competences_techniques_souhaitees?: string[] | null
  competences_comportementales?: string[] | null
  langues_requises?: string | null
  certifications_requises?: string | null
  localisation?: string | null
  mobilite_deplacements?: string | null
  teletravail?: string | null
  contraintes_horaires?: string | null
  criteres_eliminatoires?: string | null
  salaire_minimum?: number | null
  salaire_maximum?: number | null
  avantages?: string[] | null
  evolution_poste?: string | null
  budget?: number | null
  job_description_file_path?: string | null
}

export interface JobResponse {
  id: string
  title: string
  department: string | null
  contract_type: string | null
  budget: number | null
  urgency: string | null
  status: string
  created_by: string
  validated_by: string | null
  validated_at: string | null
  created_at: string
  updated_at: string
  // Champs pour le comparatif
  competences_techniques_obligatoires?: string[] | null
  competences_techniques_souhaitees?: string[] | null
  experience_requise?: number | null
  niveau_formation?: string | null
  langues_requises?: string | null
  [key: string]: any
}

export interface CandidateResponse {
  id: string | null
  first_name: string
  last_name: string
  profile_title: string | null
  years_of_experience: number | null
  email: string | null
  phone: string | null
  cv_file_path: string | null
  profile_picture_url: string | null
  photo_url: string | null
  tags: string[] | null
  skills: string[] | string | null
  source: string | null
  status: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  motivation_letter_file_path?: string | null
}

export interface CandidateUpdate {
  first_name?: string
  last_name?: string
  profile_title?: string
  years_of_experience?: number
  email?: string
  phone?: string
  source?: string
  notes?: string
  tags?: string[]
  skills?: string[]
}

export interface ApplicationResponse {
  id: string
  candidate_id: string
  job_id: string
  status: string
  created_at: string
  [key: string]: any
}

export interface InterviewResponse {
  id: string
  application_id: string
  interview_type: string
  scheduled_at: string
  scheduled_end_at?: string | null
  location?: string | null
  interviewer_id?: string | null
  interviewer_name?: string | null
  preparation_notes?: string | null
  feedback?: string | null
  feedback_provided_at?: string | null
  decision?: string | null
  score?: number | null
  status?: string
  rescheduled_at?: string | null
  rescheduling_reason?: string | null
  cancellation_reason?: string | null
  cancelled_at?: string | null
  completed_at?: string | null
  created_by: string
  created_by_name: string
  candidate_name: string
  job_title: string
  created_at: string
  updated_at: string
}

export interface InterviewCreate {
  application_id: string
  interview_type: 'rh' | 'technique' | 'client' | 'prequalification' | 'qualification' | 'autre'
  scheduled_at: string
  scheduled_end_at?: string
  location?: string
  interviewer_id?: string
  preparation_notes?: string
}

export interface InterviewUpdate {
  interview_type?: string
  scheduled_at?: string
  scheduled_end_at?: string
  location?: string
  interviewer_id?: string
  preparation_notes?: string
}

export interface InterviewStatusUpdate {
  status: 'réalisé' | 'reporté' | 'annulé' | 'planifié'
  rescheduled_at?: string
  rescheduling_reason?: string
  cancellation_reason?: string
}

export interface InterviewFeedback {
  feedback: string
  decision: 'positif' | 'négatif' | 'en_attente'
  score?: number
}

// ===== FONCTIONS CANDIDATES =====

export async function getCandidate(candidateId: string): Promise<CandidateResponse> {
  const response = await authenticatedFetch(`${API_URL}/candidates/${candidateId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du candidat')
  }

  return response.json()
}

export async function getCandidates(params?: {
  tag_filter?: string
  source_filter?: string
  status_filter?: string
}): Promise<CandidateResponse[]> {
  const queryParams = new URLSearchParams()
  if (params?.tag_filter) queryParams.append('tag_filter', params.tag_filter)
  if (params?.source_filter) queryParams.append('source_filter', params.source_filter)
  if (params?.status_filter) queryParams.append('status_filter', params.status_filter)

  const queryString = queryParams.toString()
  const url = queryString ? `${API_URL}/candidates/?${queryString}` : `${API_URL}/candidates/`

  const response = await authenticatedFetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 401) {
      const { removeToken } = await import('./auth')
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/choice'
      }
      return []
    }
    if (response.status === 422) {
      return []
    }
    const errorData = await response.json().catch(() => ({ detail: `Erreur HTTP ${response.status}` }))
    throw new Error(errorData.detail || `Erreur HTTP ${response.status}`)
  }

  return response.json()
}

export async function updateCandidateStatus(
  candidateId: string,
  newStatus: string
): Promise<CandidateResponse> {
  try {
    const response = await authenticatedFetch(`${API_URL}/candidates/${candidateId}/status?new_status=${encodeURIComponent(newStatus)}`, {
      method: 'PATCH',
    })

    if (!response.ok) {
      if (response.status === 401) {
        const { removeToken } = await import('./auth')
        removeToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/choice'
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }

      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour du statut' }))
      const errorMessage = error.detail || 'Erreur lors de la mise à jour du statut'
      
      const customError = new Error(errorMessage)
      if (response.status === 400 && errorMessage.includes('feedback')) {
        ;(customError as any).isFeedbackError = true
      }
      throw customError
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré.')
    }
    throw error
  }
}

export async function updateCandidate(
  candidateId: string,
  data: CandidateUpdate
): Promise<CandidateResponse> {
  const response = await authenticatedFetch(`${API_URL}/candidates/${candidateId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour')
  }

  return response.json()
}

// ===== FONCTIONS JOBS =====

export async function getJobs(): Promise<JobResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/jobs/`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des besoins')
  }

  return response.json()
}

export async function createJob(jobData: JobCreate): Promise<JobResponse> {
  const response = await authenticatedFetch(`${API_URL}/jobs/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData),
  })

  if (!response.ok) {
    if (response.status === 401) {
      const { removeToken } = await import('./auth')
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/choice'
      }
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création du besoin' }))
    throw new Error(error.detail || 'Erreur lors de la création du besoin')
  }

  return response.json()
}

export async function parseJobDescription(jobDescriptionFile: File): Promise<JobCreate> {
  const formData = new FormData()
  formData.append('file', jobDescriptionFile)

  const response = await authenticatedFetch(`${API_URL}/jobs/parse-job-description`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    if (response.status === 401) {
      const { removeToken } = await import('./auth')
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/choice'
      }
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'analyse de la fiche de poste' }))
    throw new Error(error.detail || 'Erreur lors de l\'analyse de la fiche de poste')
  }

  return response.json()
}

export async function getPendingValidationJobs(): Promise<JobResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/jobs/pending-validation`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Managers.')
    }
    throw new Error('Erreur lors de la récupération des besoins en attente')
  }

  return response.json()
}

// ===== FONCTIONS APPLICATIONS =====

export async function getCandidateApplications(candidateId: string): Promise<ApplicationResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/applications/candidate/${candidateId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des applications du candidat')
  }

  return response.json()
}

export interface ApplicationCreate {
  candidate_id: string
  job_id: string
  status: string
}

export async function createApplication(applicationData: ApplicationCreate): Promise<ApplicationResponse> {
  const response = await authenticatedFetch(`${API_URL}/applications/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(applicationData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création de l\'application' }))
    throw new Error(error.detail || 'Erreur lors de la création de l\'application')
  }

  return response.json()
}

// ===== FONCTIONS INTERVIEWS =====

export async function getInterviews(params?: {
  application_id?: string
  candidate_id?: string
  interview_type?: string
}): Promise<InterviewResponse[]> {
  const queryParams = new URLSearchParams()
  if (params?.application_id) queryParams.append('application_id', params.application_id)
  if (params?.candidate_id) queryParams.append('candidate_id', params.candidate_id)
  if (params?.interview_type) queryParams.append('interview_type', params.interview_type)

  const queryString = queryParams.toString()
  const url = queryString 
    ? `${API_URL}/interviews/?${queryString}`
    : `${API_URL}/interviews/`

  const response = await authenticatedFetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des entretiens')
  }

  return response.json()
}

export async function createInterview(data: InterviewCreate): Promise<InterviewResponse> {
  const response = await authenticatedFetch(`${API_URL}/interviews/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Erreur lors de la planification' }))
    throw new Error(errorData.detail || errorData.message || 'Erreur lors de la planification')
  }

  return response.json()
}

export async function addInterviewFeedback(
  interviewId: string,
  feedback: InterviewFeedback
): Promise<InterviewResponse> {
  const response = await authenticatedFetch(`${API_URL}/interviews/${interviewId}/feedback`, {
    method: 'PATCH',
    body: JSON.stringify(feedback),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'ajout du feedback' }))
    throw new Error(error.detail || 'Erreur lors de l\'ajout du feedback')
  }

  return response.json()
}

export async function updateInterview(
  interviewId: string,
  data: InterviewUpdate
): Promise<InterviewResponse> {
  const response = await authenticatedFetch(`${API_URL}/interviews/${interviewId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la modification' }))
    throw new Error(error.detail || 'Erreur lors de la modification')
  }

  return response.json()
}

export async function deleteInterview(interviewId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/interviews/${interviewId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression' }))
    throw new Error(error.detail || 'Erreur lors de la suppression')
  }
}

export async function updateInterviewStatus(
  interviewId: string,
  statusData: InterviewStatusUpdate
): Promise<InterviewResponse> {
  const response = await authenticatedFetch(`${API_URL}/interviews/${interviewId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statusData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour du statut' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour du statut')
  }

  return response.json()
}

// ===== TYPES KPI =====

export interface VolumeProductivityKPIs {
  total_candidates_sourced: number
  total_cvs_processed: number
  closed_vs_open_recruitments: number | null
  total_interviews_conducted: number
}

export interface QualitySelectionKPIs {
  qualified_candidates_rate: number | null
  rejection_rate_per_stage: number | null
  shortlist_acceptance_rate: number | null
  average_candidate_score: number | null
  no_show_rate: number | null
  turnover_rate_post_onboarding: number | null
}

export interface TimeProcessKPIs {
  time_to_hire: number | null
  time_to_fill: number | null
  average_cycle_per_stage: number | null
  average_feedback_delay: number | null
  percentage_jobs_on_time: number | null
}

export interface EngagementSatisfactionKPIs {
  offer_acceptance_rate: number | null
  offer_rejection_rate: number | null
  candidate_response_rate: number | null
}

export interface RecruiterPerformanceKPIs {
  jobs_managed: number
  success_rate: number | null
  average_time_per_stage: number | null
  feedbacks_on_time_rate: number | null
}

export interface SourceChannelKPIs {
  performance_per_source: number | null
  conversion_rate_per_source: number | null
  average_sourcing_time: number | null
}

export interface OnboardingKPIs {
  onboarding_success_rate: number | null
  average_onboarding_delay: number | null
  post_integration_issues_count: number
}

export interface ManagerKPIs {
  time_process: TimeProcessKPIs
  quality_selection: QualitySelectionKPIs
  volume_productivity: VolumeProductivityKPIs
  cost_budget: {
    average_recruitment_cost: number | null
    cost_per_source: number | null
    budget_spent_vs_planned: number | null
  }
  engagement_satisfaction: EngagementSatisfactionKPIs
  recruiter_performance: RecruiterPerformanceKPIs
  source_channel: SourceChannelKPIs
  onboarding: OnboardingKPIs
}

export interface KPISummary {
  total_candidates: number
  total_jobs: number
  active_jobs: number
  candidates_in_shortlist: number
  candidates_hired: number
  average_time_to_hire: number
}

export interface RecruiterPerformance {
  recruiter_id: string
  recruiter_name: string
  total_candidates: number
  total_jobs: number
  candidates_in_shortlist: number
  candidates_hired: number
}

export interface RecruiterKPIs {
  volume_productivity: VolumeProductivityKPIs
  quality_selection: QualitySelectionKPIs
  time_process: TimeProcessKPIs
  engagement_conversion: EngagementSatisfactionKPIs
  source_channel: SourceChannelKPIs
  onboarding: OnboardingKPIs
  recruiter_performance: RecruiterPerformanceKPIs
}

// ===== FONCTIONS KPI =====

export async function getKPISummary(): Promise<KPISummary> {
  const response = await authenticatedFetch(`${API_URL}/kpi/summary`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Managers.')
    }
    throw new Error('Erreur lors de la récupération du résumé KPI')
  }

  return response.json()
}

export async function getManagerKPIs(params?: {
  start_date?: string
  end_date?: string
  recruiter_id?: string
  job_id?: string
  source?: string
}): Promise<ManagerKPIs> {
  const queryParams = new URLSearchParams()
  if (params?.start_date) queryParams.append('start_date', params.start_date)
  if (params?.end_date) queryParams.append('end_date', params.end_date)
  if (params?.recruiter_id) queryParams.append('recruiter_id', params.recruiter_id)
  if (params?.job_id) queryParams.append('job_id', params.job_id)
  if (params?.source) queryParams.append('source', params.source)

  const response = await authenticatedFetch(`${API_URL}/kpi/manager?${queryParams.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 422) {
      console.warn('Erreur lors de la récupération des KPI:', response.status)
      return null as any
    }
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Managers.')
    }
    throw new Error('Erreur lors de la récupération des KPI')
  }

  return response.json()
}

export async function getRecruitersPerformance(): Promise<RecruiterPerformance[]> {
  const response = await authenticatedFetch(`${API_URL}/kpi/recruiters`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Managers.')
    }
    throw new Error('Erreur lors de la récupération des performances')
  }

  return response.json()
}

export async function getRecruiterKPIs(params?: {
  start_date?: string
  end_date?: string
  job_id?: string
  source?: string
}): Promise<RecruiterKPIs> {
  const queryParams = new URLSearchParams()
  if (params?.start_date) queryParams.append('start_date', params.start_date)
  if (params?.end_date) queryParams.append('end_date', params.end_date)
  if (params?.job_id) queryParams.append('job_id', params.job_id)
  if (params?.source) queryParams.append('source', params.source)

  const queryString = queryParams.toString()
  const url = queryString 
    ? `${API_URL}/kpi/recruiter?${queryString}`
    : `${API_URL}/kpi/recruiter`

  const response = await authenticatedFetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 422) {
      console.warn('Erreur lors de la récupération des KPI recruteur:', response.status)
      return null as any
    }
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Recruteurs.')
    }
    throw new Error('Erreur lors de la récupération des KPI recruteur')
  }

  return response.json()
}

// ===== FONCTIONS CANDIDATES ADDITIONNELLES =====

export interface CandidateCreate {
  first_name: string
  last_name: string
  profile_title?: string
  years_of_experience?: number
  email?: string
  phone?: string
  tags?: string[]
  skills?: string[]
  profile_picture_url?: string
  source?: string
  notes?: string
  cv_file?: File
}

export async function createCandidate(
  candidateData: CandidateCreate
): Promise<CandidateResponse> {
  const formData = new FormData()
  
  formData.append('first_name', candidateData.first_name)
  formData.append('last_name', candidateData.last_name)
  
  if (candidateData.profile_title) formData.append('profile_title', candidateData.profile_title)
  if (candidateData.years_of_experience !== undefined && candidateData.years_of_experience !== null) {
    formData.append('years_of_experience', candidateData.years_of_experience.toString())
  }
  if (candidateData.email) formData.append('email', candidateData.email)
  if (candidateData.phone) formData.append('phone', candidateData.phone)
  if (candidateData.tags && candidateData.tags.length > 0) {
    formData.append('tags', candidateData.tags.join(','))
  }
  if (candidateData.skills) {
    if (Array.isArray(candidateData.skills) && candidateData.skills.length > 0) {
      formData.append('skills', candidateData.skills.join(','))
    } else if (typeof candidateData.skills === 'string' && candidateData.skills.trim()) {
      formData.append('skills', candidateData.skills)
    }
  }
  if (candidateData.profile_picture_url) {
    formData.append('profile_picture_url', candidateData.profile_picture_url)
  }
  if (candidateData.source) formData.append('source', candidateData.source)
  if (candidateData.notes) formData.append('notes', candidateData.notes)
  if (candidateData.cv_file) formData.append('cv_file', candidateData.cv_file)

  try {
    const response = await authenticatedFetch(`${API_URL}/candidates/`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        const { removeToken } = await import('./auth')
        removeToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/choice'
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }
      if (response.status === 500) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur serveur lors de la création du candidat' }))
        throw new Error(errorData.detail || 'Erreur serveur lors de la création du candidat')
      }
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création du candidat' }))
      throw new Error(error.detail || 'Erreur lors de la création du candidat')
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré.')
    }
    throw error
  }
}

export async function uploadCandidatePhoto(photoFile: File): Promise<{ photo_url: string; filename: string }> {
  const formData = new FormData()
  formData.append('photo', photoFile)

  const response = await authenticatedFetch(`${API_URL}/candidates/upload-photo`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'upload de la photo' }))
    throw new Error(error.detail || 'Erreur lors de l\'upload de la photo')
  }

  return response.json()
}

export interface CandidateParseResponse {
  candidate: CandidateResponse
  extracted_data: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    skills?: string[]
    experience?: number
  }
}

export async function parseCv(cvFile: File): Promise<CandidateParseResponse> {
  const formData = new FormData()
  formData.append('cv_file', cvFile)

  const response = await authenticatedFetch(`${API_URL}/candidates/parse-cv`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'analyse du CV' }))
    throw new Error(error.detail || 'Erreur lors de l\'analyse du CV')
  }

  return response.json()
}

// ===== FONCTIONS JOBS ADDITIONNELLES =====

export async function getJob(jobId: string): Promise<JobResponse> {
  const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération du besoin')
  }

  return response.json()
}

export interface JobUpdate {
  title?: string
  department?: string
  contract_type?: string
  budget?: number
  urgency?: string
  status?: string
  [key: string]: any
}

export async function updateJob(jobId: string, data: JobUpdate): Promise<JobResponse> {
  const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour')
  }

  return response.json()
}

export interface JobValidation {
  validated: boolean
  feedback?: string
}

export async function validateJob(jobId: string, validation: JobValidation): Promise<JobResponse> {
  const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validation),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la validation' }))
    throw new Error(error.detail || 'Erreur lors de la validation')
  }

  return response.json()
}

export async function getClientJobRequests(): Promise<JobResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/jobs/client-requests`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Managers.')
    }
    if (response.status === 401) {
      return []
    }
    throw new Error('Erreur lors de la récupération des besoins clients')
  }

  return response.json()
}

export interface JobResponseWithCreator extends JobResponse {
  created_by_name?: string | null
  created_by_email?: string | null
  created_by_role?: string | null
}

export async function getPendingApprovalJobs(): Promise<JobResponseWithCreator[]> {
  const response = await authenticatedFetch(`${API_URL}/jobs/pending-approval`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Managers.')
    }
    if (response.status === 401) {
      return []
    }
    throw new Error('Erreur lors de la récupération des besoins en attente d\'approbation')
  }

  return response.json()
}

export async function updateJobStatus(jobId: string, newStatus: string): Promise<JobResponse> {
  const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}/status?new_status=${encodeURIComponent(newStatus)}`, {
    method: 'PATCH',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour du statut' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour du statut')
  }

  return response.json()
}

export async function archiveJob(jobId: string): Promise<JobResponse> {
  const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}/archive`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'archivage' }))
    throw new Error(error.detail || 'Erreur lors de l\'archivage')
  }

  return response.json()
}

export async function markJobAsWon(jobId: string): Promise<JobResponse> {
  const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}/mark-won`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors du marquage comme gagné' }))
    throw new Error(error.detail || 'Erreur lors du marquage comme gagné')
  }

  return response.json()
}

export async function deleteJob(jobId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression' }))
    throw new Error(error.detail || 'Erreur lors de la suppression')
  }
}

export interface DeletedJobItem {
  job_id: string
  title: string | null
  deleted_by: string
  deleted_by_name: string
  deleted_at: string
  last_status: string | null
  department: string | null
  created_at: string | null
}

export async function getDeletedJobs(): Promise<DeletedJobItem[]> {
  const response = await authenticatedFetch(`${API_URL}/history/deleted-jobs`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 401) {
      return []
    }
    throw new Error('Erreur lors de la récupération des besoins supprimés')
  }

  return response.json()
}

export interface JobHistoryItem {
  id: string
  job_id: string
  modified_by: string
  modified_by_name: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
}

export async function getJobHistory(jobId: string): Promise<JobHistoryItem[]> {
  const response = await authenticatedFetch(`${API_URL}/history/jobs/${jobId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 404) {
      // Si le job n'existe pas, retourner un tableau vide plutôt que de lever une erreur
      return []
    }
    if (response.status === 401) {
      const { removeToken } = await import('./auth')
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/choice'
      }
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la récupération de l\'historique' }))
    throw new Error(error.detail || 'Erreur lors de la récupération de l\'historique')
  }

  return response.json()
}

export async function getJobApplications(jobId: string): Promise<ApplicationResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/applications/job/${jobId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des applications')
  }

  return response.json()
}

export async function getJobShortlist(jobId: string): Promise<ApplicationResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/applications/job/${jobId}/shortlist`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de la shortlist')
  }

  return response.json()
}

export async function toggleShortlist(applicationId: string): Promise<ApplicationResponse> {
  const response = await authenticatedFetch(`${API_URL}/applications/${applicationId}/toggle-shortlist`, {
    method: 'PATCH',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour')
  }

  return response.json()
}

export async function deleteApplication(applicationId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/applications/${applicationId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression' }))
    throw new Error(error.detail || 'Erreur lors de la suppression')
  }
}

// ===== FONCTIONS SHORTLISTS =====

export interface ShortlistItem {
  application_id: string
  candidate_id: string
  candidate_name: string
  candidate_email: string | null
  candidate_phone: string | null
  candidate_tags: string[] | null
  candidate_cv_path: string | null
  job_id: string
  job_title: string
  job_department: string | null
  client_feedback: string | null
  client_validated: boolean | null
  client_validated_at: string | null
  has_new_feedback: boolean
  created_at: string
}

export interface ShortlistValidation {
  validated: boolean
  feedback?: string
}

export async function getClientShortlists(): Promise<ShortlistItem[]> {
  const response = await authenticatedFetch(`${API_URL}/shortlists/`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux clients.')
    }
    throw new Error('Erreur lors de la récupération des shortlists')
  }

  return response.json()
}

export async function validateCandidate(
  applicationId: string,
  validation: ShortlistValidation
): Promise<ShortlistItem> {
  try {
    const response = await authenticatedFetch(`${API_URL}/shortlists/${applicationId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validation),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la validation' }))
      throw new Error(error.detail || `Erreur HTTP ${response.status} lors de la validation`)
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Erreur de connexion au serveur. Vérifiez que le serveur backend est démarré sur http://localhost:8000')
    }
    throw error
  }
}

// ===== FONCTIONS USERS =====

export interface UserResponse {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone: string | null
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCreateResponse {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone?: string | null
  department?: string | null
  is_active: boolean
  created_at: string
  generated_password?: string | null
}

export async function getUsers(): Promise<UserResponse[]> {
  // Essayer d'abord l'endpoint admin, puis l'endpoint auth (accessible aux recruteurs, managers et administrateurs)
  let response = await authenticatedFetch(`${API_URL}/admin/users`, {
    method: 'GET',
  })

  // Si accès refusé (403) ou non trouvé (404), essayer l'endpoint auth
  if (response.status === 403 || response.status === 404) {
    console.log('🔄 [GET_USERS] Tentative avec /auth/users')
    response = await authenticatedFetch(`${API_URL}/auth/users`, {
      method: 'GET',
    })
  }

  if (!response.ok) {
    if (response.status === 403) {
      // Ne pas lever d'erreur, retourner un tableau vide pour permettre à l'application de continuer
      console.warn('⚠️ [GET_USERS] Accès refusé à tous les endpoints. Retour d\'un tableau vide.')
      return []
    }
    if (response.status === 404) {
      console.warn('⚠️ [GET_USERS] Endpoint non trouvé. Retour d\'un tableau vide.')
      return []
    }
    const errorText = await response.text().catch(() => 'Erreur inconnue')
    console.error('❌ [GET_USERS] Erreur:', response.status, errorText)
    // Retourner un tableau vide plutôt que de lever une erreur
    return []
  }

  const users = await response.json()
  console.log('✅ [GET_USERS] Utilisateurs récupérés:', Array.isArray(users) ? users.length : 0)
  // Normaliser la réponse pour correspondre à UserResponse
  const normalizedUsers = Array.isArray(users) ? users.map((user: any) => ({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    phone: user.phone || null,
    department: user.department || null,
    is_active: user.is_active !== undefined ? user.is_active : true,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  })) : []
  
  return normalizedUsers
}

export async function getUsersByManager(): Promise<UserCreateResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/users/by-manager`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Managers.')
    }
    throw new Error('Erreur lors de la récupération des utilisateurs')
  }

  return response.json()
}

// ===== FONCTIONS NOTIFICATIONS =====

export interface NotificationResponse {
  id: string
  title: string
  message: string
  notification_type: string
  is_read: boolean
  related_job_id: string | null
  related_application_id: string | null
  created_at: string
  read_at: string | null
}

export async function getNotifications(unread_only: boolean = false): Promise<NotificationResponse[]> {
  const queryParams = new URLSearchParams()
  if (unread_only) {
    queryParams.append('unread_only', 'true')
  }

  const queryString = queryParams.toString()
  const url = queryString 
    ? `${API_URL}/notifications/?${queryString}`
    : `${API_URL}/notifications/`

  const response = await authenticatedFetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des notifications')
  }

  return response.json()
}

export async function getUnreadCount(): Promise<number> {
  const response = await authenticatedFetch(`${API_URL}/notifications/unread/count`, {
    method: 'GET',
  })

  if (!response.ok) {
    // En cas d'erreur, retourner 0 pour ne pas bloquer l'interface
    return 0
  }

  const data = await response.json()
  return data.unread_count || 0
}

export async function markAsRead(notificationId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors du marquage comme lu' }))
    throw new Error(error.detail || 'Erreur lors du marquage comme lu')
  }
}

export async function markAllAsRead(): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/notifications/read-all`, {
    method: 'PATCH',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors du marquage de toutes les notifications' }))
    throw new Error(error.detail || 'Erreur lors du marquage de toutes les notifications')
  }
}
