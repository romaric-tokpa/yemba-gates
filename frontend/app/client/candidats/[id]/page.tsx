'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, FileText, Tag, Mail, Phone, Calendar, User, Eye, Briefcase, 
  Award, MapPin, Download, X, MessageSquare, Star, CheckCircle2, XCircle, 
  Clock, AlertCircle, FileCheck, BarChart3, Sparkles, Loader2, Building2, Users
} from 'lucide-react'
import { 
  getCandidate, CandidateResponse, getCandidateApplications, ApplicationResponse,
  getInterviews, InterviewResponse, getJobs, JobResponse, getSavedComparison, JobCandidateComparisonResponse
} from '@/lib/api'
import { authenticatedFetch, getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { normalizeImageUrl } from '@/lib/imageUtils'
import { getApiUrl } from '@/lib/api'

const API_URL = getApiUrl()

export default function ClientCandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<CandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string; type: string } | null>(null)
  
  // États pour les besoins et entretiens
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [interviews, setInterviews] = useState<InterviewResponse[]>([])
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(false)
  
  // États pour les onglets
  const [activeTab, setActiveTab] = useState<'profil' | 'postes' | 'entretiens'>('profil')
  const [selectedJobForComparison, setSelectedJobForComparison] = useState<JobResponse | null>(null)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  
  // États pour l'analyse IA (lecture seule pour le client)
  const [aiAnalysis, setAiAnalysis] = useState<JobCandidateComparisonResponse | null>(null)
  const [isLoadingAiAnalysis, setIsLoadingAiAnalysis] = useState(false)
  // États pour les analyses IA par job (pour l'affichage dans la liste des postes)
  const [jobAnalyses, setJobAnalyses] = useState<Record<string, JobCandidateComparisonResponse>>({})
  const [loadingJobAnalyses, setLoadingJobAnalyses] = useState<Record<string, boolean>>({})

  const { error: showError } = useToastContext()

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    if (candidateId) {
      loadCandidate()
      loadApplications()
      loadJobs()
    }
  }, [candidateId, router])

  useEffect(() => {
    if (applications.length > 0) {
      loadInterviews()
    }
  }, [applications])

  // Charger l'analyse IA sauvegardée quand le modal s'ouvre
  useEffect(() => {
    if (showComparisonModal && selectedJobForComparison && candidate && candidate.cv_file_path) {
      loadSavedAnalysis()
    }
  }, [showComparisonModal, selectedJobForComparison?.id, candidate?.id])

  // Réinitialiser l'analyse quand on ferme le modal
  useEffect(() => {
    if (!showComparisonModal) {
      setAiAnalysis(null)
    }
  }, [showComparisonModal])

  // Nettoyer les URLs blob lors du démontage
  useEffect(() => {
    return () => {
      if (previewDocument?.url && previewDocument.url.startsWith('blob:')) {
        window.URL.revokeObjectURL(previewDocument.url)
      }
    }
  }, [previewDocument])

  const loadSavedAnalysis = async () => {
    if (!candidate || !selectedJobForComparison || !candidate.id) return
    
    try {
      setIsLoadingAiAnalysis(true)
      const savedAnalysis = await getSavedComparison(candidate.id, selectedJobForComparison.id)
      if (savedAnalysis) {
        setAiAnalysis(savedAnalysis)
      }
    } catch (err) {
      // Si l'analyse sauvegardée n'existe pas, on laisse aiAnalysis à null
      console.log('Aucune analyse sauvegardée trouvée')
    } finally {
      setIsLoadingAiAnalysis(false)
    }
  }

  // Charger les analyses IA pour tous les postes
  const loadJobAnalyses = async () => {
    if (!candidate || !candidate.id || applications.length === 0) return

    const newAnalyses: Record<string, JobCandidateComparisonResponse> = {}

    for (const app of applications) {
      setLoadingJobAnalyses(prev => ({ ...prev, [app.job_id]: true }))
      
      try {
        const analysis = await getSavedComparison(candidate.id!, app.job_id)
        if (analysis) {
          newAnalyses[app.job_id] = analysis
        }
      } catch (err) {
        // Si l'analyse n'existe pas, on continue
        console.log(`Aucune analyse trouvée pour le job ${app.job_id}`)
      } finally {
        setLoadingJobAnalyses(prev => ({ ...prev, [app.job_id]: false }))
      }
    }
    
    setJobAnalyses(newAnalyses)
  }

  // Charger les analyses IA quand les applications sont chargées
  useEffect(() => {
    if (applications.length > 0 && candidate && candidate.id) {
      loadJobAnalyses()
    }
  }, [applications.length, candidate?.id])

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

  const loadApplications = async () => {
    try {
      const applicationsData = await getCandidateApplications(candidateId)
      setApplications(Array.isArray(applicationsData) ? applicationsData : [])
    } catch (error) {
      console.error('Erreur lors du chargement des applications:', error)
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
        type: fileType
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
        <Link href="/client/shortlist" className="mt-4 inline-block text-emerald-600 hover:text-emerald-800">
          ← Retour aux shortlists
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header avec fond coloré */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <Link 
            href="/client/shortlist" 
            className="inline-flex items-center text-emerald-100 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Retour aux shortlists</span>
          </Link>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Photo/Avatar */}
            <div className="relative">
              {(() => {
                const photoUrl = normalizeImageUrl(API_URL, candidate.profile_picture_url || candidate.photo_url)
                if (photoUrl) {
                  return (
                    <img
                      src={photoUrl}
                      alt={`${candidate.first_name} ${candidate.last_name}`}
                      className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl object-cover border-4 border-white shadow-2xl"
                      onError={(e) => {
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
                    {candidate.first_name} {candidate.last_name}
                  </h1>
                  {candidate.profile_title && (
                    <p className="text-lg text-emerald-100 mb-2">{candidate.profile_title}</p>
                  )}
                  {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
                    <p className="text-sm text-emerald-200">
                      {candidate.years_of_experience} ans d&apos;expérience
                    </p>
                  )}
                </div>
              </div>

              {/* Contact rapide */}
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
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-emerald-600" />
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
                    ? 'text-emerald-600 bg-white'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <User className={`w-5 h-5 ${activeTab === 'profil' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>Profil</span>
                </div>
                {activeTab === 'profil' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('postes')}
                className={`flex-1 px-6 py-5 text-sm font-semibold transition-all relative ${
                  activeTab === 'postes'
                    ? 'text-emerald-600 bg-white'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Briefcase className={`w-5 h-5 ${activeTab === 'postes' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>Postes</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === 'postes' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {applications.length}
                  </span>
                </div>
                {activeTab === 'postes' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('entretiens')}
                className={`flex-1 px-6 py-5 text-sm font-semibold transition-all relative ${
                  activeTab === 'entretiens'
                    ? 'text-emerald-600 bg-white'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className={`w-5 h-5 ${activeTab === 'entretiens' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>Entretiens</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === 'entretiens' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {interviews.length}
                  </span>
                </div>
                {activeTab === 'entretiens' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
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
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <User className="w-6 h-6 mr-3 text-emerald-600" />
                    Informations personnelles
                  </h2>
            
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Prénom</label>
                      <p className="text-sm font-medium text-gray-900">{candidate.first_name}</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Nom</label>
                      <p className="text-sm font-medium text-gray-900">{candidate.last_name}</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </label>
                      <p className="text-sm font-medium text-gray-900">{candidate.email || '-'}</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        Téléphone
                      </label>
                      <p className="text-sm font-medium text-gray-900">{candidate.phone || '-'}</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Titre du profil</label>
                      <p className="text-sm font-medium text-gray-900">{candidate.profile_title || '-'}</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Années d&apos;expérience</label>
                      <p className="text-sm font-medium text-gray-900">
                        {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined 
                          ? `${candidate.years_of_experience} ans` 
                          : '-'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Source</label>
                      <p className="text-sm font-medium text-gray-900">{candidate.source || '-'}</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-emerald-100">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Date de création
                      </label>
                      <p className="text-sm font-medium text-gray-900">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Tags */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-emerald-600" />
                      Tags & Mots-clés
                    </h2>
              
                    {candidate.tags && candidate.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {candidate.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Aucun tag associé</p>
                    )}
                  </div>

                  {/* Compétences */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-emerald-600" />
                      Compétences
                    </h2>
              
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
                  </div>
                </div>

                {/* Notes internes */}
                {candidate.notes && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes internes</h2>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {candidate.notes}
                    </p>
                  </div>
                )}

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
                          <FileText className="w-8 h-8 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">CV</p>
                            <p className="text-xs text-gray-500">Document disponible</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreview(candidate.cv_file_path!, 'CV')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Prévisualiser
                          </button>
                          <button
                            onClick={() => handleDownload(candidate.cv_file_path!, getFileName(candidate.cv_file_path!))}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Télécharger
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm">Aucun CV uploadé</p>
                      </div>
                    )}

                    {candidate.motivation_letter_file_path && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Lettre de motivation</p>
                            <p className="text-xs text-gray-500">Document disponible</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreview(candidate.motivation_letter_file_path!, 'Lettre de motivation')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Prévisualiser
                          </button>
                          <button
                            onClick={() => handleDownload(candidate.motivation_letter_file_path!, getFileName(candidate.motivation_letter_file_path!))}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Télécharger
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                                : 'from-white to-gray-50 border-gray-200 hover:border-emerald-300'
                              : 'from-white to-gray-50 border-gray-200 hover:border-emerald-300'
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
                                    <div className="relative group">
                                      <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                        Analyse IA disponible
                                      </div>
                                    </div>
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
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
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

                                {/* Points à améliorer (premiers 2) */}
                                {jobAnalysis.weaknesses && jobAnalysis.weaknesses.length > 0 && (
                                  <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                                    <div className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />
                                      Points à améliorer
                                    </div>
                                    <ul className="text-xs text-red-800 space-y-0.5">
                                      {jobAnalysis.weaknesses.slice(0, 2).map((weakness, idx) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-red-600 mt-0.5">•</span>
                                          <span className="line-clamp-1">{weakness}</span>
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
                                    <div className="text-xs font-bold text-gray-900">
                                      {app.status}
                                    </div>
                                  </div>
                                  <div className="text-center p-2 bg-white/60 rounded-lg border border-gray-200">
                                    <div className="text-xs text-gray-500">-</div>
                                    <div className="text-sm font-bold text-gray-400">-</div>
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
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                              >
                                <BarChart3 className="w-4 h-4" />
                                {hasAiAnalysis ? 'Voir le comparatif complet' : 'Voir le comparatif'}
                              </button>
                              <Link
                                href={`/client/jobs/${job.id}`}
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
                </div>

                {isLoadingInterviews ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    <p className="mt-2 text-sm">Chargement des entretiens...</p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-4">
                      Aucun besoin attribué.
                    </p>
                  </div>
                ) : Object.keys(interviewsByApplication).length === 0 && interviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-4">
                      Aucun entretien enregistré pour ce candidat.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {applications.map((app) => {
                      const job = jobs.find(j => j.id === app.job_id)
                      const appInterviews = interviews.filter(i => i.application_id === app.id)
                      
                      return (
                        <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="mb-4">
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
                                    </div>
                                    <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                                      {typeInterviews.map((interview) => (
                                        <div key={interview.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                          <div className="mb-3">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
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

                                          {interview.preparation_notes && (
                                            <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                                              <p className="text-xs font-medium text-gray-700 mb-1">Notes de préparation</p>
                                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{interview.preparation_notes}</p>
                                            </div>
                                          )}

                                          {/* Compte rendu en lecture seule */}
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
                                                  <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Compte rendu - Préqualification</p>
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
                                                        Aucun compte rendu renseigné
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            } else if (interview.interview_type === 'qualification') {
                                              return (
                                                <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                                                  <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Compte rendu - Qualification</p>
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
                                                        Aucun compte rendu renseigné
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            } else {
                                              return (
                                                <div className="p-3 bg-white rounded border border-gray-200">
                                                  <p className="text-xs font-medium text-gray-700 mb-2">Compte rendu</p>
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

      {/* Modal de comparatif Besoin vs Candidat (lecture seule pour le client) */}
      {showComparisonModal && selectedJobForComparison && candidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-2 sm:my-4 md:my-8 max-h-[95vh] flex flex-col">
            {/* Header fixe */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-t-xl flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span className="truncate">Comparatif Besoin vs Candidat</span>
                </h2>
                <p className="text-emerald-100 text-xs sm:text-sm line-clamp-2">
                  Analyse détaillée de la correspondance entre le poste et le profil par IA
                </p>
              </div>
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
            
            {/* Contenu scrollable */}
            <div className="overflow-y-auto flex-1 px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              {/* En-tête du poste */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4 sm:p-5 md:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-emerald-600 rounded-lg p-2 sm:p-3 flex-shrink-0">
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

              {/* Analyse IA (lecture seule) */}
              {isLoadingAiAnalysis ? (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    <span className="ml-3 text-purple-700 font-medium">Chargement de l'analyse IA...</span>
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
                    <p className="text-purple-700 font-medium">
                      Aucune analyse IA disponible pour ce comparatif. L'analyse sera générée par le recruteur ou le manager.
                    </p>
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
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
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
                <FileText className="w-5 h-5 mr-2 text-emerald-600" />
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
                        const filePath = candidate?.cv_file_path || candidate?.motivation_letter_file_path
                        if (filePath) {
                          await handleDownload(filePath, previewDocument.name)
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
                          const filePath = candidate?.cv_file_path || candidate?.motivation_letter_file_path
                          if (filePath) {
                            await handleDownload(filePath, previewDocument.name)
                          }
                        }
                      } catch (err) {
                        showError('Erreur lors du téléchargement')
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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
