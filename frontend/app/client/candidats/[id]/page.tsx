'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, FileText, Tag, Mail, Phone, Calendar, User, Eye, Briefcase, 
  Award, MapPin, Download, X, MessageSquare, Star, CheckCircle2, XCircle, 
  Clock, AlertCircle
} from 'lucide-react'
import { 
  getCandidate, CandidateResponse, getCandidateApplications, ApplicationResponse,
  getInterviews, InterviewResponse, getJobs, JobResponse
} from '@/lib/api'
import { authenticatedFetch, getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'

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

  // Fonction pour télécharger un fichier
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const token = getToken()
      const headers: HeadersInit = {}
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_URL}${filePath}`, {
        method: 'GET',
        headers,
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
  const handlePreview = (filePath: string, name: string) => {
    const fileType = getFileType(filePath)
    setPreviewDocument({
      url: `${API_URL}${filePath}`,
      name: name,
      type: fileType
    })
  }

  // Fonction pour fermer la prévisualisation
  const closePreview = () => {
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
    <div className="p-4 lg:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="mb-6 lg:mb-8">
        <Link
          href="/client/shortlist"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux shortlists
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Profil Candidat
          </h1>
          <p className="text-gray-600 mt-1">Consultation du profil et des entretiens</p>
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
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center border-4 border-white shadow-lg">
                  <User className="w-16 h-16 text-white" />
                </div>
              )}
            </div>

            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {candidate.first_name} {candidate.last_name}
              </h2>
              {candidate.profile_title && (
                <p className="text-sm text-gray-600 mt-1">
                  {candidate.profile_title}
                </p>
              )}
              {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
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
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="flex items-center text-sm text-gray-700 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{candidate.email}</span>
                </a>
              )}
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  className="flex items-center text-sm text-gray-700 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{candidate.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Statistiques</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Besoins</span>
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

          {/* Informations rapides */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Informations</h3>
            <div className="space-y-3">
              {candidate.source && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Source</p>
                  <p className="text-sm font-medium text-gray-900">{candidate.source}</p>
                </div>
              )}
              {candidate.created_at && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ajouté le</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(candidate.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
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
                <p className="text-sm text-gray-900">{candidate.first_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                <p className="text-sm text-gray-900">{candidate.last_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </label>
                <p className="text-sm text-gray-900">{candidate.email || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  Téléphone
                </label>
                <p className="text-sm text-gray-900">{candidate.phone || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre du profil</label>
                <p className="text-sm text-gray-900">{candidate.profile_title || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Années d&apos;expérience</label>
                <p className="text-sm text-gray-900">
                  {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined 
                    ? `${candidate.years_of_experience} ans` 
                    : '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <p className="text-sm text-gray-900">{candidate.source || '-'}</p>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2" />
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

          {/* Besoins attribués */}
          {applications.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                Besoins attribués
              </h2>
              
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
                          href={`/client/jobs/${job.id}`}
                          className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
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

          {/* Comptes rendus d'entretien */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Comptes rendus d&apos;entretien
            </h2>

            {isLoadingInterviews ? (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                <p className="mt-2 text-sm">Chargement des entretiens...</p>
              </div>
            ) : interviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">
                  Aucun entretien enregistré pour ce candidat.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {applications.map((app) => {
                  const job = jobs.find(j => j.id === app.job_id)
                  const appInterviews = interviews.filter(i => i.application_id === app.id)
                  
                  if (appInterviews.length === 0) return null
                  
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

                      <div className="space-y-4">
                        {appInterviews.map((interview) => (
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
                    </div>
                  )
                })}
              </div>
            )}
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
      </div>

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
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = previewDocument.url
                    link.download = previewDocument.name
                    link.click()
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
                  <a
                    href={previewDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ouvrir dans un nouvel onglet
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
