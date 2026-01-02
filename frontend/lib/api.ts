import { authenticatedFetch } from './auth'

// Détection automatique de l'URL de l'API en fonction de l'URL actuelle
function getApiUrl(): string {
  // Si une variable d'environnement est définie, l'utiliser
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Sinon, détecter automatiquement depuis l'URL actuelle
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    const port = window.location.port || '3000'
    
    // Si on est sur localhost ou 127.0.0.1, utiliser localhost:8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000'
    }
    
    // Si on est sur un tunnel (cloudflare, localtunnel, etc.), utiliser le même hostname avec le port 8000
    // ou détecter si c'est HTTPS (tunnel) et adapter
    if (protocol === 'https:' || hostname.includes('cloudflare') || hostname.includes('tunnel') || hostname.includes('loca.lt') || hostname.includes('trycloudflare.com')) {
      // Pour les tunnels, on peut utiliser le même hostname mais avec le port backend
      // ou stocker l'URL du tunnel backend dans sessionStorage
      const tunnelBackendUrl = sessionStorage.getItem('TUNNEL_BACKEND_URL')
      if (tunnelBackendUrl) {
        return tunnelBackendUrl
      }
      // Pour les autres tunnels, utiliser le même hostname
      return `${protocol}//${hostname.replace(':3000', ':8000').replace(':3001', ':8000')}`
    }
    
    // Sinon, utiliser la même IP avec le port 8000
    return `http://${hostname}:8000`
  }
  
  // Par défaut pour le SSR
  return 'http://localhost:8000'
}

const API_URL = getApiUrl()

export interface JobCreate {
  // INFORMATIONS GÉNÉRALES
  title: string
  department?: string
  manager_demandeur?: string
  entreprise?: string
  contract_type?: string
  motif_recrutement?: string
  urgency?: 'faible' | 'moyenne' | 'haute' | 'critique' | 'normale'
  date_prise_poste?: string  // Format ISO date string (YYYY-MM-DD)
  
  // MISSIONS ET RESPONSABILITÉS
  missions_principales?: string
  missions_secondaires?: string
  kpi_poste?: string
  
  // PROFIL RECHERCHÉ
  niveau_formation?: string
  experience_requise?: number
  competences_techniques_obligatoires?: string[]
  competences_techniques_souhaitees?: string[]
  competences_comportementales?: string[]
  langues_requises?: string
  certifications_requises?: string
  
  // CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
  localisation?: string
  mobilite_deplacements?: string
  teletravail?: string
  contraintes_horaires?: string
  criteres_eliminatoires?: string
  
  // RÉMUNÉRATION ET CONDITIONS
  salaire_minimum?: number  // En F CFA
  salaire_maximum?: number  // En F CFA
  avantages?: string[]
  evolution_poste?: string
  
  // Champs existants conservés pour compatibilité
  budget?: number
  job_description_file_path?: string
}

export interface JobResponseWithCreator extends JobResponse {
  created_by_name?: string | null
  created_by_role?: string | null
  created_by_email?: string | null
}

export interface JobResponse {
  id: string | null
  // INFORMATIONS GÉNÉRALES
  title: string
  department: string | null
  manager_demandeur: string | null
  entreprise: string | null
  contract_type: string | null
  motif_recrutement: string | null
  urgency: 'faible' | 'moyenne' | 'haute' | 'critique' | 'normale' | null
  date_prise_poste: string | null  // Format ISO date string (YYYY-MM-DD)
  
  // MISSIONS ET RESPONSABILITÉS
  missions_principales: string | null
  missions_secondaires: string | null
  kpi_poste: string | null
  
  // PROFIL RECHERCHÉ
  niveau_formation: string | null
  experience_requise: number | null
  competences_techniques_obligatoires: string[] | null
  competences_techniques_souhaitees: string[] | null
  competences_comportementales: string[] | null
  langues_requises: string | null
  certifications_requises: string | null
  
  // CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
  localisation: string | null
  mobilite_deplacements: string | null
  teletravail: string | null
  contraintes_horaires: string | null
  criteres_eliminatoires: string | null
  
  // RÉMUNÉRATION ET CONDITIONS
  salaire_minimum: number | null  // En F CFA
  salaire_maximum: number | null  // En F CFA
  avantages: string[] | null
  evolution_poste: string | null
  
  // Champs existants
  budget: number | null
  status: 'brouillon' | 'validé' | 'en_cours' | 'clôturé' | 'en_attente' | 'en_attente_validation'
  job_description_file_path: string | null
  created_by: string
  validated_by: string | null
  validated_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export async function createJob(jobData: JobCreate): Promise<JobResponse> {
  try {
    const response = await authenticatedFetch(`${API_URL}/jobs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création du besoin' }))
      throw new Error(error.detail || 'Erreur lors de la création du besoin')
    }

    return response.json()
  } catch (error) {
    // Gérer les erreurs de réseau
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('Erreur de connexion au backend. Vérifiez que le serveur est démarré.')
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:8000')
    }
    // Répercuter les autres erreurs
    throw error
  }
}

export async function getJobs(): Promise<JobResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/jobs/`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des besoins')
  }

  return response.json()
}

export async function parseJobDescription(jobDescriptionFile: File): Promise<JobCreate> {
  const formData = new FormData()
  formData.append('job_description_file', jobDescriptionFile)

  const response = await authenticatedFetch(`${API_URL}/jobs/parse-job-description`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors du parsing de la fiche de poste' }))
    throw new Error(error.detail || 'Erreur lors du parsing de la fiche de poste')
  }

  return response.json()
}

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
  // INFORMATIONS GÉNÉRALES
  title?: string
  department?: string
  manager_demandeur?: string
  entreprise?: string
  contract_type?: string
  motif_recrutement?: string
  urgency?: 'faible' | 'moyenne' | 'haute' | 'critique' | 'normale'
  date_prise_poste?: string // Format YYYY-MM-DD

  // MISSIONS ET RESPONSABILITÉS
  missions_principales?: string
  missions_secondaires?: string
  kpi_poste?: string

  // PROFIL RECHERCHÉ
  niveau_formation?: string
  experience_requise?: number
  competences_techniques_obligatoires?: string[]
  competences_techniques_souhaitees?: string[]
  competences_comportementales?: string[]
  langues_requises?: string
  certifications_requises?: string

  // CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
  localisation?: string
  mobilite_deplacements?: string
  teletravail?: string
  contraintes_horaires?: string
  criteres_eliminatoires?: string

  // RÉMUNÉRATION ET CONDITIONS
  salaire_minimum?: number
  salaire_maximum?: number
  avantages?: string[]
  evolution_poste?: string

  // Champs existants conservés pour compatibilité
  budget?: number
  job_description_file_path?: string
  status?: 'brouillon' | 'validé' | 'en_cours' | 'clôturé' | 'en_attente' | 'en_attente_validation'
}

export async function updateJob(jobId: string, jobData: JobUpdate): Promise<JobResponse> {
  try {
    const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour du besoin' }))
      throw new Error(error.detail || 'Erreur lors de la mise à jour du besoin')
    }

    return response.json()
  } catch (error) {
    // Gérer les erreurs de réseau
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('Erreur de connexion au backend. Vérifiez que le serveur est démarré.')
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:8000')
    }
    // Répercuter les autres erreurs
    throw error
  }
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
  const response = await authenticatedFetch(`${API_URL}/jobs/${jobId}/history`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de l\'historique')
  }

  return response.json()
}

export async function getPendingValidationJobs(): Promise<JobResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/jobs/pending-validation`, {
    method: 'GET',
  })

  if (!response.ok) {
    // Si erreur 401 (non authentifié) ou 422 (validation), retourner une liste vide
    if (response.status === 401 || response.status === 422) {
      console.warn('Erreur lors de la récupération des besoins en attente:', response.status)
      return []
    }
    throw new Error('Erreur lors de la récupération des besoins en attente')
  }

  return response.json()
}

export async function getClientJobRequests(): Promise<JobResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/jobs/client-requests`, {
    method: 'GET',
  })

  if (!response.ok) {
    // Si erreur 401 (non authentifié) ou 422 (validation), retourner une liste vide
    if (response.status === 401 || response.status === 422) {
      console.warn('Erreur lors de la récupération des besoins clients:', response.status)
      return []
    }
    throw new Error('Erreur lors de la récupération des besoins clients')
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
    body: JSON.stringify(validation),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la validation' }))
    throw new Error(error.detail || 'Erreur lors de la validation')
  }

  return response.json()
}

export async function getPendingApprovalJobs(): Promise<JobResponseWithCreator[]> {
  try {
    const response = await authenticatedFetch(`${API_URL}/jobs/pending-approval`, {
      method: 'GET',
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 422) {
        console.warn('Erreur lors de la récupération des besoins en attente d\'approbation:', response.status)
        return []
      }
      throw new Error(`Erreur HTTP ${response.status} lors de la récupération des besoins en attente d'approbation`)
    }

    return response.json()
  } catch (error) {
    // Gérer les erreurs réseau (serveur non accessible, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ [API] Erreur réseau: Le serveur backend n\'est peut-être pas démarré ou inaccessible')
      console.error('💡 Vérifiez que le serveur backend est démarré sur http://localhost:8000')
      return []
    }
    // Relancer les autres erreurs
    throw error
  }
}

// ===== APPLICATIONS API =====

export interface ApplicationCreate {
  candidate_id: string
  job_id: string
  status?: string
}

export interface ApplicationResponse {
  id: string
  candidate_id: string
  candidate_name: string
  candidate_email?: string
  candidate_profile_title?: string
  candidate_years_of_experience?: number
  candidate_photo_url?: string
  job_id: string
  job_title: string
  status: string
  is_in_shortlist: boolean
  created_by: string
  created_by_name: string
  client_validated?: boolean | null
  client_feedback?: string | null
  client_validated_at?: string | null
  created_at: string
  updated_at: string
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

export async function getCandidateApplications(candidateId: string): Promise<ApplicationResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/applications/candidate/${candidateId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des applications du candidat')
  }

  return response.json()
}

export async function toggleShortlist(applicationId: string, isInShortlist: boolean): Promise<ApplicationResponse> {
  const response = await authenticatedFetch(`${API_URL}/applications/${applicationId}/shortlist?is_in_shortlist=${isInShortlist}`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour de la shortlist' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour de la shortlist')
  }

  return response.json()
}

export async function deleteApplication(applicationId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/applications/${applicationId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression de l\'application' }))
    throw new Error(error.detail || 'Erreur lors de la suppression de l\'application')
  }
}

// ===== CANDIDATES API =====

export interface CandidateParseResponse extends CandidateCreate {
  profile_picture_base64?: string // Photo de profil extraite en base64 (format data URI)
}

export async function parseCv(cvFile: File): Promise<CandidateParseResponse> {
  const formData = new FormData()
  formData.append('cv_file', cvFile)

  try {
    const response = await authenticatedFetch(`${API_URL}/candidates/parse-cv`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('⚠️ [AUTH] Token expiré ou invalide, redirection vers login')
        const { removeToken } = await import('@/lib/auth')
        removeToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/choice'
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'analyse du CV' }))
      throw new Error(error.detail || 'Erreur lors de l\'analyse du CV')
    }

    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Erreur de connexion au backend. Vérifiez que le serveur est démarré.')
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré.')
    }
    throw error
  }
}

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
  skills: string[] | string | null  // Peut être un array ou une string séparée par des virgules
  source: string | null
  status: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
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
  // Gérer les compétences (peut être un tableau ou une string)
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
      // Si erreur 401 (token expiré), rediriger vers login
      if (response.status === 401) {
        console.warn('⚠️ [AUTH] Token expiré ou invalide, redirection vers login')
        const { removeToken } = await import('@/lib/auth')
        removeToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/choice'
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }
      // Pour les erreurs 500, essayer de récupérer le message d'erreur détaillé
      if (response.status === 500) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur serveur lors de la création du candidat' }))
        console.error('Erreur serveur lors de la création du candidat:', errorData)
        throw new Error(errorData.detail || 'Erreur serveur lors de la création du candidat')
      }
      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création du candidat' }))
      throw new Error(error.detail || 'Erreur lors de la création du candidat')
    }

    return response.json()
  } catch (error) {
    // Gérer les erreurs de réseau (CORS, connexion refusée, etc.)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Erreur de connexion au backend. Vérifiez que le serveur est démarré et que CORS est configuré.')
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré.')
    }
    throw error
  }
}

export async function getCandidates(params?: {
  tag_filter?: string
  source_filter?: string
  status_filter?: string
}): Promise<CandidateResponse[]> {
  // Construire les paramètres de requête
  const queryParams = new URLSearchParams()
  if (params?.tag_filter) queryParams.append('tag_filter', params.tag_filter)
  if (params?.source_filter) queryParams.append('source_filter', params.source_filter)
  if (params?.status_filter) queryParams.append('status_filter', params.status_filter)

  const queryString = queryParams.toString()
  const url = queryString ? `${API_URL}/candidates/?${queryString}` : `${API_URL}/candidates/`

  // Faire la requête vers le backend
  const response = await authenticatedFetch(url, {
    method: 'GET',
  })

  // Traiter la réponse normalement
  if (!response.ok) {
    // Si erreur 401 (token expiré ou invalide), rediriger vers login
    if (response.status === 401) {
      console.warn('⚠️ [AUTH] Token expiré ou invalide, redirection vers login')
      // Supprimer le token expiré
      const { removeToken } = await import('@/lib/auth')
      removeToken()
      // Rediriger vers la page de login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/choice'
      }
      return []
    }
    // Si erreur 422 (validation), retourner une liste vide
    if (response.status === 422) {
      console.warn('⚠️ [AUTH] Erreur de validation:', response.status)
      return []
    }
    // Pour les autres erreurs, lancer une exception
    const errorData = await response.json().catch(() => ({ detail: `Erreur HTTP ${response.status}` }))
    throw new Error(errorData.detail || `Erreur HTTP ${response.status}`)
  }

  // Retourner la réponse JSON directement sans vérification de schéma
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
      // Si erreur 401 (token expiré), rediriger vers login
      if (response.status === 401) {
        console.warn('⚠️ [AUTH] Token expiré ou invalide, redirection vers login')
        const { removeToken } = await import('@/lib/auth')
        removeToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/choice'
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }

      const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour du statut' }))
      const errorMessage = error.detail || 'Erreur lors de la mise à jour du statut'
      
      // Créer une erreur personnalisée pour pouvoir distinguer les erreurs de feedback
      const customError = new Error(errorMessage)
      if (response.status === 400 && errorMessage.includes('feedback')) {
        // Marquer cette erreur comme une erreur de feedback manquant
        ;(customError as any).isFeedbackError = true
      }
      throw customError
    }

    return response.json()
  } catch (error) {
    // Gérer les erreurs réseau (Failed to fetch)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Erreur de connexion au backend. Vérifiez que le serveur est démarré.')
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:8000')
    }
    // Répercuter les autres erreurs
    throw error
  }
}

// ===== KPI API =====

export interface KPISummary {
  total_candidates: number
  total_jobs: number
  active_jobs: number
  candidates_in_shortlist: number
  candidates_hired: number
}

export interface RecruiterPerformance {
  recruiter_id: string
  recruiter_name: string
  total_candidates: number
  total_jobs: number
  candidates_in_shortlist: number
  candidates_hired: number
}

export async function getKPISummary(): Promise<KPISummary> {
  const response = await authenticatedFetch(`${API_URL}/kpi/summary`, {
    method: 'GET',
  })

  if (!response.ok) {
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

// ===== KPI MANAGER API =====

export interface TimeProcessKPIs {
  time_to_hire: number | null
  time_to_fill: number | null
  average_cycle_per_stage: number | null
  average_feedback_delay: number | null
  percentage_jobs_on_time: number | null
}

export interface QualitySelectionKPIs {
  qualified_candidates_rate: number | null
  rejection_rate_per_stage: number | null
  shortlist_acceptance_rate: number | null
  average_candidate_score: number | null
  no_show_rate: number | null
  turnover_rate_post_onboarding: number | null
}

export interface VolumeProductivityKPIs {
  total_candidates_sourced: number
  total_cvs_processed: number
  closed_vs_open_recruitments: number | null
  total_interviews_conducted: number
}

export interface CostBudgetKPIs {
  average_recruitment_cost: number | null
  cost_per_source: number | null
  budget_spent_vs_planned: number | null
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
  cost_budget: CostBudgetKPIs
  engagement_satisfaction: EngagementSatisfactionKPIs
  recruiter_performance: RecruiterPerformanceKPIs
  source_channel: SourceChannelKPIs
  onboarding: OnboardingKPIs
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
    // Si erreur 401 (non authentifié) ou 422 (validation), retourner null
    if (response.status === 401 || response.status === 422) {
      console.warn('Erreur lors de la récupération des KPI:', response.status)
      return null as any // Retourner null pour permettre au composant de gérer l'absence de données
    }
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux Managers.')
    }
    throw new Error('Erreur lors de la récupération des KPI')
  }

  return response.json()
}

// ===== SHORTLISTS API (Client) =====

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
    // Gérer les erreurs réseau
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ [API] Erreur réseau: Le serveur backend n\'est peut-être pas démarré ou inaccessible')
      console.error('💡 Vérifiez que le serveur backend est démarré sur http://localhost:8000')
      throw new Error('Erreur de connexion au serveur. Vérifiez que le serveur backend est démarré.')
    }
    // Relancer les autres erreurs
    throw error
  }
}

export async function getRecruiterNotifications(): Promise<ShortlistItem[]> {
  const response = await authenticatedFetch(`${API_URL}/shortlists/notifications`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Accès refusé. Réservé aux recruteurs.')
    }
    throw new Error('Erreur lors de la récupération des notifications')
  }

  return response.json()
}

// ===== HISTORY API =====

export interface ApplicationHistoryItem {
  id: string
  application_id: string
  changed_by: string
  changed_by_name: string
  old_status: string | null
  new_status: string | null
  notes: string | null
  created_at: string
}

export async function getApplicationHistory(applicationId: string): Promise<ApplicationHistoryItem[]> {
  const response = await authenticatedFetch(`${API_URL}/history/applications/${applicationId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de l\'historique')
  }

  return response.json()
}

export async function getCandidate(candidateId: string): Promise<CandidateResponse> {
  const response = await authenticatedFetch(`${API_URL}/candidates/${candidateId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    // Si erreur 401 (token expiré), rediriger vers login
    if (response.status === 401) {
      console.warn('⚠️ [AUTH] Token expiré ou invalide, redirection vers login')
      const { removeToken } = await import('@/lib/auth')
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/choice'
      }
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    
    // Récupérer le message d'erreur détaillé
    const errorData = await response.json().catch(() => ({ detail: `Erreur HTTP ${response.status}` }))
    const errorMessage = errorData.detail || errorData.message || `Erreur lors de la récupération du candidat (${response.status})`
    throw new Error(errorMessage)
  }

  return response.json()
}

export interface CandidateUpdate {
  first_name?: string
  last_name?: string
  profile_title?: string
  years_of_experience?: number
  email?: string
  phone?: string
  tags?: string[]
  skills?: string[]
  source?: string
  status?: string
  notes?: string
}

export async function updateCandidate(
  candidateId: string,
  candidateData: CandidateUpdate
): Promise<CandidateResponse> {
  const response = await authenticatedFetch(`${API_URL}/candidates/${candidateId}`, {
    method: 'PATCH',
    body: JSON.stringify(candidateData),
  })

  if (!response.ok) {
    // Si erreur 401 (token expiré), rediriger vers login
    if (response.status === 401) {
      console.warn('⚠️ [AUTH] Token expiré ou invalide, redirection vers login')
      const { removeToken } = await import('@/lib/auth')
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/choice'
      }
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour du candidat' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour du candidat')
  }

  return response.json()
}

// ===== NOTIFICATIONS API =====

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

export async function getNotifications(unreadOnly: boolean = false): Promise<NotificationResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/notifications/?unread_only=${unreadOnly}`, {
    method: 'GET',
  })

  if (!response.ok) {
    // Si l'utilisateur n'est pas authentifié ou erreur de validation, retourner une liste vide
    if (response.status === 401 || response.status === 422) {
      return []
    }
    throw new Error('Erreur lors de la récupération des notifications')
  }

  return response.json()
}

export async function getUnreadCount(): Promise<{ unread_count: number }> {
  const response = await authenticatedFetch(`${API_URL}/notifications/unread/count`, {
    method: 'GET',
  })

  if (!response.ok) {
    // Si l'utilisateur n'est pas authentifié ou erreur de validation, retourner 0
    if (response.status === 401 || response.status === 422) {
      return { unread_count: 0 }
    }
    // Pour les autres erreurs, retourner 0 au lieu de lever une erreur pour éviter les crashes
    console.warn('Erreur lors de la récupération du compteur:', response.status)
    return { unread_count: 0 }
  }

  return response.json()
}

export async function markAsRead(notificationId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })

  if (!response.ok) {
    throw new Error('Erreur lors du marquage comme lu')
  }
}

export async function markAllAsRead(): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/notifications/read-all`, {
    method: 'PATCH',
  })

  if (!response.ok) {
    throw new Error('Erreur lors du marquage de toutes comme lues')
  }
}

// ===== INTERVIEWS API =====

export interface InterviewCreate {
  application_id: string
  interview_type: 'rh' | 'technique' | 'client' | 'prequalification' | 'qualification' | 'autre'
  scheduled_at: string
  scheduled_end_at?: string
  location?: string
  interviewer_id?: string
  preparation_notes?: string
  participants?: string[] // IDs des participants (utilisateurs)
}

export interface InterviewUpdate {
  interview_type?: 'rh' | 'technique' | 'client' | 'prequalification' | 'qualification' | 'autre'
  scheduled_at?: string
  scheduled_end_at?: string
  location?: string
  interviewer_id?: string
  preparation_notes?: string
  participants?: string[]
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
  created_by: string
  created_by_name: string
  candidate_name: string
  job_title: string
  created_at: string
  updated_at: string
}

export interface InterviewFeedback {
  feedback: string
  decision: 'positif' | 'négatif' | 'en_attente'
  score?: number
}

export async function createInterview(data: InterviewCreate): Promise<InterviewResponse> {
  console.log('📡 API createInterview - Données envoyées:', data)
  const response = await authenticatedFetch(`${API_URL}/interviews/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Erreur lors de la planification' }))
    console.error('❌ Erreur API createInterview:', errorData)
    throw new Error(errorData.detail || errorData.message || 'Erreur lors de la planification')
  }

  const result = await response.json()
  console.log('✅ API createInterview - Réponse:', result)
  return result
}

export async function getInterviews(params?: {
  application_id?: string
  interview_type?: string
}): Promise<InterviewResponse[]> {
  const queryParams = new URLSearchParams()
  if (params?.application_id) queryParams.append('application_id', params.application_id)
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

// ===== OFFERS API =====

export interface OfferResponse {
  application_id: string
  candidate_id: string
  candidate_name: string
  candidate_email?: string | null
  job_id: string
  job_title: string
  job_department?: string | null
  offer_sent_at?: string | null
  offer_accepted?: boolean | null
  offer_accepted_at?: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface OfferSend {
  application_id: string
  notes?: string
}

export interface OfferDecision {
  accepted: boolean
  notes?: string
}

export async function sendOffer(data: OfferSend): Promise<OfferResponse> {
  const response = await authenticatedFetch(`${API_URL}/offers/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'envoi de l\'offre' }))
    throw new Error(error.detail || 'Erreur lors de l\'envoi de l\'offre')
  }

  return response.json()
}

export async function getOffers(params?: {
  status?: string
  job_id?: string
}): Promise<OfferResponse[]> {
  const queryParams = new URLSearchParams()
  if (params?.status) queryParams.append('status_filter', params.status)
  if (params?.job_id) queryParams.append('job_id', params.job_id)

  const response = await authenticatedFetch(`${API_URL}/offers/?${queryParams.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des offres')
  }

  return response.json()
}

export async function acceptOffer(applicationId: string, decision: OfferDecision): Promise<OfferResponse> {
  const response = await authenticatedFetch(`${API_URL}/offers/${applicationId}/accept`, {
    method: 'PATCH',
    body: JSON.stringify(decision),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'acceptation' }))
    throw new Error(error.detail || 'Erreur lors de l\'acceptation')
  }

  return response.json()
}

export async function rejectOffer(applicationId: string, decision: OfferDecision): Promise<OfferResponse> {
  const response = await authenticatedFetch(`${API_URL}/offers/${applicationId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(decision),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors du refus' }))
    throw new Error(error.detail || 'Erreur lors du refus')
  }

  return response.json()
}

// ===== ONBOARDING API =====

export interface OnboardingChecklist {
  application_id: string
  candidate_name: string
  job_title: string
  contract_signed: boolean
  contract_signed_at?: string | null
  equipment_ready: boolean
  equipment_ready_at?: string | null
  training_scheduled: boolean
  training_scheduled_at?: string | null
  access_granted: boolean
  access_granted_at?: string | null
  welcome_meeting_scheduled: boolean
  welcome_meeting_scheduled_at?: string | null
  onboarding_completed: boolean
  onboarding_completed_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingChecklistUpdate {
  contract_signed?: boolean
  equipment_ready?: boolean
  training_scheduled?: boolean
  access_granted?: boolean
  welcome_meeting_scheduled?: boolean
  notes?: string
}

export async function getOnboardingChecklist(applicationId: string): Promise<OnboardingChecklist> {
  const response = await authenticatedFetch(`${API_URL}/onboarding/${applicationId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération de la checklist')
  }

  return response.json()
}

export async function updateOnboardingChecklist(
  applicationId: string,
  data: OnboardingChecklistUpdate
): Promise<OnboardingChecklist> {
  const response = await authenticatedFetch(`${API_URL}/onboarding/${applicationId}/checklist`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour')
  }

  return response.json()
}

export async function completeOnboarding(applicationId: string): Promise<OnboardingChecklist> {
  const response = await authenticatedFetch(`${API_URL}/onboarding/${applicationId}/complete`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la finalisation' }))
    throw new Error(error.detail || 'Erreur lors de la finalisation')
  }

  return response.json()
}

export async function getOnboardingList(): Promise<OnboardingChecklist[]> {
  const response = await authenticatedFetch(`${API_URL}/onboarding/`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des onboarding')
  }

  return response.json()
}

// ===== ADMIN API =====

// Gestion des Utilisateurs
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

export interface UserCreate {
  email: string
  password: string
  first_name: string
  last_name: string
  role: string
  phone?: string
  department?: string
}

export interface UserUpdate {
  email?: string
  first_name?: string
  last_name?: string
  role?: string
  phone?: string
  department?: string
  is_active?: boolean
  password?: string
}

export async function getUsers(): Promise<UserResponse[]> {
  // Utiliser l'endpoint /auth/users qui est accessible aux recruteurs et managers
  const response = await authenticatedFetch(`${API_URL}/auth/users`, {
    method: 'GET',
  })

  if (!response.ok) {
    // Si l'endpoint /auth/users échoue, essayer /admin/users en fallback (pour les admins)
    if (response.status === 403) {
      const adminResponse = await authenticatedFetch(`${API_URL}/admin/users`, {
        method: 'GET',
      })
      if (adminResponse.ok) {
        return adminResponse.json()
      }
    }
    throw new Error('Erreur lors de la récupération des utilisateurs')
  }

  return response.json()
}

export async function createUser(userData: UserCreate): Promise<UserResponse> {
  const response = await authenticatedFetch(`${API_URL}/admin/users`, {
    method: 'POST',
    body: JSON.stringify(userData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création' }))
    throw new Error(error.detail || 'Erreur lors de la création')
  }

  return response.json()
}

export async function updateUser(userId: string, userData: UserUpdate): Promise<UserResponse> {
  const response = await authenticatedFetch(`${API_URL}/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour')
  }

  return response.json()
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression' }))
    throw new Error(error.detail || 'Erreur lors de la suppression')
  }
}

// Paramétrage
export interface SettingResponse {
  id: string
  key: string
  value: string
  category: string
  description: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface SettingCreate {
  key: string
  value: string
  category: string
  description?: string
}

export interface SettingUpdate {
  value?: string
  description?: string
}

export async function getSettings(category?: string): Promise<SettingResponse[]> {
  const url = category 
    ? `${API_URL}/admin/settings?category=${encodeURIComponent(category)}`
    : `${API_URL}/admin/settings`
  
  const response = await authenticatedFetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des paramètres')
  }

  return response.json()
}

export async function createSetting(settingData: SettingCreate): Promise<SettingResponse> {
  const response = await authenticatedFetch(`${API_URL}/admin/settings`, {
    method: 'POST',
    body: JSON.stringify(settingData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création' }))
    throw new Error(error.detail || 'Erreur lors de la création')
  }

  return response.json()
}

export async function updateSetting(settingKey: string, settingData: SettingUpdate): Promise<SettingResponse> {
  const response = await authenticatedFetch(`${API_URL}/admin/settings/${encodeURIComponent(settingKey)}`, {
    method: 'PATCH',
    body: JSON.stringify(settingData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour')
  }

  return response.json()
}

export async function deleteSetting(settingKey: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/admin/settings/${encodeURIComponent(settingKey)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression' }))
    throw new Error(error.detail || 'Erreur lors de la suppression')
  }
}

// Logs de sécurité
export interface SecurityLogResponse {
  id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  action: string
  ip_address: string | null
  user_agent: string | null
  success: boolean
  details: string | null
  created_at: string
}

export async function getSecurityLogs(params?: {
  user_id?: string
  action?: string
  skip?: number
  limit?: number
}): Promise<SecurityLogResponse[]> {
  const queryParams = new URLSearchParams()
  if (params?.user_id) queryParams.append('user_id', params.user_id)
  if (params?.action) queryParams.append('action', params.action)
  if (params?.skip) queryParams.append('skip', params.skip.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())

  const response = await authenticatedFetch(`${API_URL}/admin/security-logs?${queryParams.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des logs')
  }

  return response.json()
}

// ===== TEAMS API =====

export interface TeamMemberResponse {
  id: string
  user_id: string
  team_id: string
  role?: string | null
  joined_at: string
  user_first_name: string
  user_last_name: string
  user_email: string
  user_role: string
}

export interface TeamResponse {
  id: string
  name: string
  description?: string | null
  department?: string | null
  manager_id?: string | null
  manager_name?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  members?: TeamMemberResponse[]
  members_count: number
}

export interface TeamCreate {
  name: string
  description?: string
  department?: string
  manager_id?: string
  member_ids?: string[]
}

export interface TeamUpdate {
  name?: string
  description?: string
  department?: string
  manager_id?: string
  is_active?: boolean
}

export async function getTeams(): Promise<TeamResponse[]> {
  const response = await authenticatedFetch(`${API_URL}/teams/`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la récupération des équipes' }))
    throw new Error(error.detail || 'Erreur lors de la récupération des équipes')
  }

  return response.json()
}

export async function getTeam(teamId: string): Promise<TeamResponse> {
  const response = await authenticatedFetch(`${API_URL}/teams/${teamId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la récupération de l\'équipe' }))
    throw new Error(error.detail || 'Erreur lors de la récupération de l\'équipe')
  }

  return response.json()
}

export async function createTeam(teamData: TeamCreate): Promise<TeamResponse> {
  const response = await authenticatedFetch(`${API_URL}/teams/`, {
    method: 'POST',
    body: JSON.stringify(teamData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création de l\'équipe' }))
    throw new Error(error.detail || 'Erreur lors de la création de l\'équipe')
  }

  return response.json()
}

export async function updateTeam(teamId: string, teamData: TeamUpdate): Promise<TeamResponse> {
  const response = await authenticatedFetch(`${API_URL}/teams/${teamId}`, {
    method: 'PUT',
    body: JSON.stringify(teamData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour de l\'équipe' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour de l\'équipe')
  }

  return response.json()
}

export async function deleteTeam(teamId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/teams/${teamId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression de l\'équipe' }))
    throw new Error(error.detail || 'Erreur lors de la suppression de l\'équipe')
  }
}

export async function addTeamMember(teamId: string, userId: string, role: string = 'membre'): Promise<TeamResponse> {
  const response = await authenticatedFetch(`${API_URL}/teams/${teamId}/members?user_id=${userId}&role=${role}`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de l\'ajout du membre' }))
    throw new Error(error.detail || 'Erreur lors de l\'ajout du membre')
  }

  return response.json()
}

export async function removeTeamMember(teamId: string, userId: string): Promise<TeamResponse> {
  const response = await authenticatedFetch(`${API_URL}/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors du retrait du membre' }))
    throw new Error(error.detail || 'Erreur lors du retrait du membre')
  }

  return response.json()
}

// ===== GESTION DES UTILISATEURS PAR LE MANAGER =====

export interface UserCreateByManager {
  email: string
  first_name: string
  last_name: string
  role: 'recruteur' | 'client'
  phone?: string
  department?: string
  generate_password?: boolean
  password?: string
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

export async function createUserByManager(userData: UserCreateByManager): Promise<UserCreateResponse> {
  const response = await authenticatedFetch(`${API_URL}/teams/users`, {
    method: 'POST',
    body: JSON.stringify(userData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la création de l\'utilisateur' }))
    throw new Error(error.detail || 'Erreur lors de la création de l\'utilisateur')
  }

  return response.json()
}

export async function getUsersByManager(role?: 'recruteur' | 'client'): Promise<UserCreateResponse[]> {
  const url = role ? `${API_URL}/teams/users?role=${role}` : `${API_URL}/teams/users`
  const response = await authenticatedFetch(url)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la récupération des utilisateurs' }))
    throw new Error(error.detail || 'Erreur lors de la récupération des utilisateurs')
  }

  return response.json()
}

export async function getUserByManager(userId: string): Promise<UserCreateResponse> {
  const response = await authenticatedFetch(`${API_URL}/teams/users/${userId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la récupération de l\'utilisateur' }))
    throw new Error(error.detail || 'Erreur lors de la récupération de l\'utilisateur')
  }

  return response.json()
}

export async function updateUserByManager(userId: string, userData: UserCreateByManager): Promise<UserCreateResponse> {
  const response = await authenticatedFetch(`${API_URL}/teams/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la mise à jour de l\'utilisateur' }))
    throw new Error(error.detail || 'Erreur lors de la mise à jour de l\'utilisateur')
  }

  return response.json()
}

export async function deleteUserByManager(userId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/teams/users/${userId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur lors de la suppression de l\'utilisateur' }))
    throw new Error(error.detail || 'Erreur lors de la suppression de l\'utilisateur')
  }
}
