'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, User, CheckCircle, XCircle, Clock, Eye, FileText, Mail, Phone, Tag, ExternalLink, MessageSquare, Calendar, Plus, X, Search, Filter, Sparkles, TrendingUp, Award, MapPin, Building2, ArrowLeft, Download } from 'lucide-react'
import { getClientShortlists, validateCandidate, type ShortlistItem, type ShortlistValidation, createClientInterviewRequest, type AvailabilitySlot, type ClientInterviewRequestResponse } from '@/lib/api'
import { useToastContext } from '@/components/ToastProvider'
import { formatDateTime } from '@/lib/utils'
import { getToken } from '@/lib/auth'
import { getApiUrl } from '@/lib/api'

export default function ClientShortlistPage() {
  const router = useRouter()
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [validationModal, setValidationModal] = useState<{ open: boolean; item: ShortlistItem | null }>({ open: false, item: null })
  const [validationFeedback, setValidationFeedback] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [interviewRequestModal, setInterviewRequestModal] = useState<{ open: boolean; item: ShortlistItem | null }>({ open: false, item: null })
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [requestNotes, setRequestNotes] = useState('')
  const [isCreatingRequest, setIsCreatingRequest] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all')
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all')
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string; type: string; filePath?: string } | null>(null)
  const { success, error: showError } = useToastContext()
  
  const API_URL = getApiUrl()

  useEffect(() => {
    loadShortlists()
  }, [])

  const loadShortlists = async () => {
    try {
      setIsLoading(true)
      const data = await getClientShortlists()
      setShortlists(data)
    } catch (error) {
      console.error('Erreur lors du chargement des shortlists:', error)
      showError('Erreur lors du chargement des shortlists')
    } finally {
      setIsLoading(false)
    }
  }

  // Grouper les shortlists par besoin (job)
  const shortlistsByJob = useMemo(() => {
    return shortlists.reduce((acc, item) => {
      if (!acc[item.job_id]) {
        acc[item.job_id] = {
          job_id: item.job_id,
          job_title: item.job_title,
          job_department: item.job_department,
          candidates: []
        }
      }
      acc[item.job_id].candidates.push(item)
      return acc
    }, {} as Record<string, { job_id: string; job_title: string; job_department: string | null; candidates: ShortlistItem[] }>)
  }, [shortlists])

  const jobs = Object.values(shortlistsByJob)

  // Filtrer les candidats
  const filteredShortlists = useMemo(() => {
    let filtered = shortlists

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.candidate_name.toLowerCase().includes(query) ||
        item.candidate_email?.toLowerCase().includes(query) ||
        item.job_title.toLowerCase().includes(query) ||
        item.candidate_tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filtre par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => {
        if (filterStatus === 'pending') return item.client_validated === null
        if (filterStatus === 'validated') return item.client_validated === true
        if (filterStatus === 'rejected') return item.client_validated === false
        return true
      })
    }

    // Filtre par job
    if (selectedJobFilter !== 'all') {
      filtered = filtered.filter(item => item.job_id === selectedJobFilter)
    }

    return filtered
  }, [shortlists, searchQuery, filterStatus, selectedJobFilter])

  // Re-grouper les candidats filtrés
  const filteredShortlistsByJob = useMemo(() => {
    return filteredShortlists.reduce((acc, item) => {
      if (!acc[item.job_id]) {
        acc[item.job_id] = {
          job_id: item.job_id,
          job_title: item.job_title,
          job_department: item.job_department,
          candidates: []
        }
      }
      acc[item.job_id].candidates.push(item)
      return acc
    }, {} as Record<string, { job_id: string; job_title: string; job_department: string | null; candidates: ShortlistItem[] }>)
  }, [filteredShortlists])

  const filteredJobs = Object.values(filteredShortlistsByJob)

  // Statistiques
  const stats = useMemo(() => {
    const total = shortlists.length
    const pending = shortlists.filter(s => s.client_validated === null).length
    const validated = shortlists.filter(s => s.client_validated === true).length
    const rejected = shortlists.filter(s => s.client_validated === false).length
    return { total, pending, validated, rejected }
  }, [shortlists])

  const handleOpenValidationModal = (item: ShortlistItem) => {
    setValidationModal({ open: true, item })
    setValidationFeedback(item.client_feedback || '')
  }

  const handleCloseValidationModal = () => {
    setValidationModal({ open: false, item: null })
    setValidationFeedback('')
  }

  const handleValidate = async (validated: boolean) => {
    if (!validationModal.item) return

    try {
      setIsValidating(true)
      const validation: ShortlistValidation = {
        validated,
        feedback: validationFeedback.trim() || undefined
      }
      
      await validateCandidate(validationModal.item.application_id, validation)
      success(validated ? 'Candidat validé avec succès' : 'Candidat refusé')
      handleCloseValidationModal()
      await loadShortlists()
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showError('Erreur de connexion au serveur. Vérifiez que le serveur backend est démarré.')
      } else {
        showError(error instanceof Error ? error.message : 'Erreur lors de la validation')
      }
    } finally {
      setIsValidating(false)
    }
  }

  const handleOpenInterviewRequestModal = (item: ShortlistItem) => {
    setInterviewRequestModal({ open: true, item })
    setAvailabilitySlots([{ date: '', start_time: '', end_time: '' }])
    setRequestNotes('')
  }

  const handleCloseInterviewRequestModal = () => {
    setInterviewRequestModal({ open: false, item: null })
    setAvailabilitySlots([])
    setRequestNotes('')
  }

  const handleAddAvailabilitySlot = () => {
    setAvailabilitySlots([...availabilitySlots, { date: '', start_time: '', end_time: '' }])
  }

  const handleRemoveAvailabilitySlot = (index: number) => {
    setAvailabilitySlots(availabilitySlots.filter((_, i) => i !== index))
  }

  const handleUpdateAvailabilitySlot = (index: number, field: keyof AvailabilitySlot, value: string) => {
    const updated = [...availabilitySlots]
    updated[index] = { ...updated[index], [field]: value }
    setAvailabilitySlots(updated)
  }

  const handleCreateInterviewRequest = async () => {
    if (!interviewRequestModal.item) return

    // Validation
    if (availabilitySlots.length === 0) {
      showError('Veuillez ajouter au moins un créneau de disponibilité')
      return
    }

    const validSlots = availabilitySlots.filter(slot => slot.date && slot.start_time && slot.end_time)
    if (validSlots.length === 0) {
      showError('Veuillez remplir tous les champs pour au moins un créneau')
      return
    }

    try {
      setIsCreatingRequest(true)
      await createClientInterviewRequest({
        application_id: interviewRequestModal.item.application_id,
        availability_slots: validSlots,
        notes: requestNotes.trim() || undefined
      })
      success('Demande d\'entretien créée avec succès. Le recruteur sera notifié.')
      handleCloseInterviewRequestModal()
      await loadShortlists()
    } catch (error) {
      console.error('Erreur lors de la création de la demande:', error)
      showError(error instanceof Error ? error.message : 'Erreur lors de la création de la demande')
    } finally {
      setIsCreatingRequest(false)
    }
  }

  const getValidationBadge = (item: ShortlistItem) => {
    if (item.client_validated === null) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          En attente
        </span>
      )
    }
    if (item.client_validated === true) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Validé
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center">
        <XCircle className="w-3 h-3 mr-1" />
        Refusé
      </span>
    )
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-600">Chargement des shortlists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header avec fond coloré */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <Link 
            href="/client" 
            className="inline-flex items-center text-emerald-100 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Retour au dashboard</span>
          </Link>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-2">Shortlists</h1>
              <p className="text-emerald-100 text-sm lg:text-base">
                Candidats proposés pour vos besoins de recrutement
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Statistiques améliorées */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 -mt-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total candidats</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <User className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En attente</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Validés</p>
                <p className="text-3xl font-bold text-green-600">{stats.validated}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Refusés</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 lg:p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un candidat, un poste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            {/* Filtre par statut */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="validated">Validés</option>
                <option value="rejected">Refusés</option>
              </select>
            </div>

            {/* Filtre par job */}
            {jobs.length > 1 && (
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedJobFilter}
                  onChange={(e) => setSelectedJobFilter(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white"
                >
                  <option value="all">Tous les postes</option>
                  {jobs.map((job) => (
                    <option key={job.job_id} value={job.job_id}>
                      {job.job_title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Liste des shortlists groupées par besoin */}
        {filteredJobs.length > 0 ? (
          <div className="space-y-6">
            {filteredJobs.map((job) => (
              <div key={job.job_id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* En-tête du besoin amélioré */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-gray-200">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-600 rounded-lg">
                          <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{job.job_title}</h2>
                          {job.job_department && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                              <Building2 className="w-4 h-4" />
                              <span>{job.job_department}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-full shadow-sm">
                        {job.candidates.length} candidat{job.candidates.length > 1 ? 's' : ''}
                      </span>
                      <Link
                        href={`/client/jobs/${job.job_id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Voir le besoin
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Liste des candidats améliorée */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {job.candidates.map((candidate) => (
                      <div
                        key={candidate.application_id}
                        className={`p-5 border-2 rounded-xl transition-all hover:shadow-lg ${
                          candidate.client_validated === true
                            ? 'border-green-200 bg-green-50/30'
                            : candidate.client_validated === false
                            ? 'border-red-200 bg-red-50/30'
                            : 'border-yellow-200 bg-yellow-50/30 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-lg truncate">{candidate.candidate_name}</h3>
                              </div>
                            </div>
                            {getValidationBadge(candidate)}
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          {candidate.candidate_email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{candidate.candidate_email}</span>
                            </div>
                          )}
                          {candidate.candidate_phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>{candidate.candidate_phone}</span>
                            </div>
                          )}
                        </div>

                        {candidate.candidate_tags && candidate.candidate_tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {candidate.candidate_tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {candidate.candidate_tags.length > 3 && (
                              <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                +{candidate.candidate_tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {candidate.client_feedback && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-blue-900 mb-1">Votre commentaire</p>
                                <p className="text-sm text-blue-800 line-clamp-2">{candidate.client_feedback}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Dates */}
                        <div className="mb-4 pt-3 border-t border-gray-200">
                          <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Ajouté le {formatDateTime(candidate.created_at)}</span>
                            </div>
                            {candidate.client_validated_at && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Décision le {formatDateTime(candidate.client_validated_at)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {candidate.candidate_cv_path && (
                            <button
                              onClick={() => handlePreview(candidate.candidate_cv_path!, 'CV')}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              CV
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/client/candidats/${candidate.candidate_id}`)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Fiche
                          </button>
                          {candidate.client_validated === true && (
                            <button
                              onClick={() => handleOpenInterviewRequestModal(candidate)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Calendar className="w-4 h-4" />
                              Entretien
                            </button>
                          )}
                          {candidate.client_validated === null && (
                            <button
                              onClick={() => handleOpenValidationModal(candidate)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Décider
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-semibold mb-2">
              {searchQuery || filterStatus !== 'all' || selectedJobFilter !== 'all'
                ? 'Aucun candidat ne correspond à vos critères'
                : 'Aucune shortlist disponible'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchQuery || filterStatus !== 'all' || selectedJobFilter !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Les recruteurs vous enverront des candidats pour vos besoins'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de demande d'entretien client amélioré */}
      {interviewRequestModal.open && interviewRequestModal.item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Demander un entretien client</h3>
                  <p className="text-blue-100 text-sm">
                    {interviewRequestModal.item.candidate_name} - {interviewRequestModal.item.job_title}
                  </p>
                </div>
                <button
                  onClick={handleCloseInterviewRequestModal}
                  className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Indiquez vos disponibilités pour planifier l'entretien. Le recruteur sera notifié et pourra choisir parmi vos créneaux.</span>
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">
                    Créneaux de disponibilité *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAvailabilitySlot}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
                
                <div className="space-y-3">
                  {availabilitySlots.map((slot, index) => (
                    <div key={index} className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50 hover:border-emerald-300 transition-colors">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date *</label>
                          <input
                            type="date"
                            value={slot.date}
                            onChange={(e) => handleUpdateAvailabilitySlot(index, 'date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Heure début *</label>
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) => handleUpdateAvailabilitySlot(index, 'start_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Heure fin *</label>
                          <input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) => handleUpdateAvailabilitySlot(index, 'end_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            required
                          />
                        </div>
                        {availabilitySlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAvailabilitySlot(index)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ajoutez des informations complémentaires sur vos disponibilités..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseInterviewRequestModal}
                  disabled={isCreatingRequest}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateInterviewRequest}
                  disabled={isCreatingRequest || availabilitySlots.filter(s => s.date && s.start_time && s.end_time).length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingRequest ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Envoyer la demande
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validation amélioré */}
      {validationModal.open && validationModal.item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Valider ou refuser le candidat</h3>
                  <p className="text-emerald-100 text-sm">
                    {validationModal.item.candidate_name} - {validationModal.item.job_title}
                  </p>
                </div>
                <button
                  onClick={handleCloseValidationModal}
                  className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={validationFeedback}
                  onChange={(e) => setValidationFeedback(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ajoutez un commentaire sur votre décision..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseValidationModal}
                  disabled={isValidating}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleValidate(false)}
                  disabled={isValidating}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Refuser
                </button>
                <button
                  onClick={() => handleValidate(true)}
                  disabled={isValidating}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isValidating ? 'Validation...' : 'Valider'}
                </button>
              </div>
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

