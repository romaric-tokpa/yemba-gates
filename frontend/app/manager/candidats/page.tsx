'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createCandidate, getCandidates, CandidateResponse, CandidateCreate, uploadCandidatePhoto, parseCv } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { 
  Plus, X, Upload, Tag, Mail, Phone, Search, List, LayoutGrid, Image as ImageIcon, 
  FileText, UserPlus, ChevronDown, Filter, XCircle, Briefcase, Users, Clock,
  Grid3x3, RefreshCw, ArrowRight, Eye, CheckCircle2, AlertCircle, MapPin, Calendar
} from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'

export default function ManagerCandidatsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error: showError } = useToastContext()
  const [candidates, setCandidates] = useState<CandidateResponse[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedSkill, setSelectedSkill] = useState<string>('')
  const [selectedExperienceMin, setSelectedExperienceMin] = useState<string>('')
  const [selectedExperienceMax, setSelectedExperienceMax] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  
  // Formulaire
  const [formData, setFormData] = useState<CandidateCreate>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    tags: [],
    skills: [],
    source: '',
    notes: '',
  })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [isParsingCv, setIsParsingCv] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [addMode, setAddMode] = useState<'manual' | 'auto'>('manual')

  // Fermer le menu déroulant quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showAddMenu && !target.closest('.relative')) {
        setShowAddMenu(false)
      }
    }

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showAddMenu])

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    const action = searchParams.get('action')
    if (action === 'new') {
      setIsModalOpen(true)
    }

    loadCandidates()
  }, [router, searchParams])

  const loadCandidates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getCandidates({
        tag_filter: selectedTag || undefined,
        source_filter: selectedSource || undefined,
        status_filter: selectedStatus || undefined,
      })
      
      const normalizedData = Array.isArray(data) ? data.map(candidate => ({
        ...candidate,
        skills: candidate.skills || [],
        tags: candidate.tags || [],
      })) : []
      
      setCandidates(normalizedData)
    } catch (err: any) {
      console.warn('Erreur lors du chargement des candidats:', err)
      setError('Impossible de charger les candidats. Vérifiez votre connexion.')
      setCandidates([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedTag, selectedSource, selectedStatus])

  // Récupérer tous les tags, sources et compétences uniques
  const allTags = Array.from(new Set(candidates.flatMap((c) => c.tags || [])))
  const allSources = Array.from(new Set(candidates.map((c) => c.source).filter(Boolean)))
  const allSkills = Array.from(new Set(candidates.flatMap((c) => c.skills || [])))

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills?.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), skillInput.trim()],
      })
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills?.filter((skill) => skill !== skillToRemove) || [],
    })
  }

  const handleCvParse = async (file: File) => {
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    if (!['pdf', 'doc', 'docx'].includes(fileExtension || '')) {
      showError('Format de fichier non supporté. Veuillez utiliser un fichier PDF ou Word (.doc, .docx)')
      return
    }

    setIsParsingCv(true)
    try {
      const parsedData = await parseCv(file)
      
      setFormData({
        first_name: parsedData.first_name || '',
        last_name: parsedData.last_name || '',
        profile_title: parsedData.profile_title || '',
        years_of_experience: parsedData.years_of_experience,
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        tags: parsedData.tags || [],
        skills: parsedData.skills || [],
        source: parsedData.source || '',
        notes: parsedData.notes || '',
      })
      
      if (parsedData.profile_picture_base64) {
        setPhotoPreview(parsedData.profile_picture_base64)
        try {
          const base64Data = parsedData.profile_picture_base64.split(',')[1]
          const mimeType = parsedData.profile_picture_base64.split(',')[0].split(':')[1].split(';')[0]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: mimeType })
          const imageFile = new File([blob], 'photo-extracted.jpg', { type: mimeType })
          setPhotoFile(imageFile)
        } catch (convertError) {
          console.warn('Erreur lors de la conversion de l\'image extraite:', convertError)
        }
      }
      
      setCvFile(file)
      success('CV analysé avec succès ! Vérifiez et complétez les informations ci-dessous.')
      
      setTimeout(() => {
        const formElement = document.querySelector('form')
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'analyse du CV'
      showError(errorMessage)
    } finally {
      setIsParsingCv(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleCvParse(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleCvParse(files[0])
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      
      let photoUrl: string | undefined = undefined
      if (photoFile) {
        try {
          const photoResponse = await uploadCandidatePhoto(photoFile)
          photoUrl = photoResponse.photo_url
        } catch (photoError) {
          console.error('Erreur lors de l\'upload de la photo:', photoError)
          showError('Erreur lors de l\'upload de la photo')
          return
        }
      }
      
      const candidateData = await createCandidate({
        ...formData,
        profile_picture_url: photoUrl,
        cv_file: cvFile || undefined,
      })
      
      success('Candidat créé avec succès')
      setIsModalOpen(false)
      setAddMode('manual')
      setFormData({
        first_name: '',
        last_name: '',
        profile_title: '',
        years_of_experience: undefined,
        email: '',
        phone: '',
        tags: [],
        skills: [],
        source: '',
        notes: '',
      })
      setCvFile(null)
      setPhotoFile(null)
      setPhotoPreview(null)
      loadCandidates()
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du candidat'
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrage des candidats
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      if (searchQuery) {
        const fullName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase()
        const searchLower = searchQuery.toLowerCase()
        if (!fullName.includes(searchLower) && 
            !candidate.email?.toLowerCase().includes(searchLower) &&
            !candidate.profile_title?.toLowerCase().includes(searchLower)) return false
      }
      
      if (selectedTag && !candidate.tags?.includes(selectedTag)) return false
      if (selectedSource && candidate.source !== selectedSource) return false
      if (selectedStatus && candidate.status !== selectedStatus) return false
      if (selectedSkill && !candidate.skills?.some(skill => skill.toLowerCase().includes(selectedSkill.toLowerCase()))) return false
      
      const yearsExp = candidate.years_of_experience ?? 0
      if (selectedExperienceMin && yearsExp < parseInt(selectedExperienceMin)) return false
      if (selectedExperienceMax && yearsExp > parseInt(selectedExperienceMax)) return false
      
      return true
    })
  }, [candidates, searchQuery, selectedTag, selectedSource, selectedStatus, selectedSkill, selectedExperienceMin, selectedExperienceMax])

  // Statistiques
  const stats = useMemo(() => {
    return {
      total: candidates.length,
      sourcé: candidates.filter(c => c.status === 'sourcé').length,
      qualifié: candidates.filter(c => c.status === 'qualifié').length,
      shortlist: candidates.filter(c => c.status === 'shortlist').length,
      embauché: candidates.filter(c => c.status === 'embauché').length,
      entretien: candidates.filter(c => c.status === 'entretien_rh' || c.status === 'entretien_client').length,
    }
  }, [candidates])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      'sourcé': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Sourcé', icon: Users },
      'qualifié': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Qualifié', icon: CheckCircle2 },
      'entretien_rh': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Entretien RH', icon: Calendar },
      'entretien_client': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Entretien Client', icon: Calendar },
      'shortlist': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Shortlist', icon: Briefcase },
      'offre': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Offre', icon: FileText },
      'rejeté': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeté', icon: X },
      'embauché': { bg: 'bg-green-100', text: 'text-green-800', label: 'Embauché', icon: CheckCircle2 },
    }
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: Users }
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedTag('')
    setSelectedSource('')
    setSelectedStatus('')
    setSelectedSkill('')
    setSelectedExperienceMin('')
    setSelectedExperienceMax('')
  }

  const activeFiltersCount = [
    searchQuery,
    selectedTag,
    selectedSource,
    selectedStatus,
    selectedSkill,
    selectedExperienceMin,
    selectedExperienceMax,
  ].filter(Boolean).length

  // Composant pour une carte de candidat en mode grille
  const CandidateCard = ({ candidate }: { candidate: CandidateResponse }) => {
    return (
      <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden group">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {candidate.profile_picture_url || candidate.photo_url ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.profile_picture_url || candidate.photo_url}`}
                  alt={`${candidate.first_name} ${candidate.last_name}`}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-300 transition-colors flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      const fallback = parent.querySelector('.photo-fallback') as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-gray-200 group-hover:border-blue-300 transition-colors flex-shrink-0 ${candidate.profile_picture_url || candidate.photo_url ? 'hidden photo-fallback' : ''}`}>
                <span className="text-white font-semibold text-lg">
                  {candidate.first_name[0]}{candidate.last_name[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/manager/candidats/${candidate.id}`}>
                  <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {candidate.first_name} {candidate.last_name}
                  </h3>
                </Link>
                {candidate.profile_title && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-1">{candidate.profile_title}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {getStatusBadge(candidate.status)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            {candidate.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
            )}
            
            {candidate.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{candidate.phone}</span>
              </div>
            )}
            
            {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{candidate.years_of_experience} ans d&apos;expérience</span>
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
              {candidate.source && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{candidate.source}</span>
                </div>
              )}
              
              {candidate.tags && candidate.tags.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{candidate.tags.length} tag{candidate.tags.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short',
                year: 'numeric'
              }) : 'Date inconnue'}
            </span>
          </div>
          <Link
            href={`/manager/candidats/${candidate.id}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
          >
            Voir détails
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  // Composant pour une ligne de candidat en mode liste
  const CandidateRow = ({ candidate }: { candidate: CandidateResponse }) => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {candidate.profile_picture_url || candidate.photo_url ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.profile_picture_url || candidate.photo_url}`}
                alt={`${candidate.first_name} ${candidate.last_name}`}
                className="w-16 h-16 lg:w-20 lg:h-20 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    const fallback = parent.querySelector('.photo-fallback') as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }
                }}
              />
            ) : null}
            <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-gray-200 flex-shrink-0 ${candidate.profile_picture_url || candidate.photo_url ? 'hidden photo-fallback' : ''}`}>
              <span className="text-white font-semibold text-lg lg:text-xl">
                {candidate.first_name[0]}{candidate.last_name[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-4 mb-3">
                <Link href={`/manager/candidats/${candidate.id}`} className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                    {candidate.first_name} {candidate.last_name}
                  </h3>
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {getStatusBadge(candidate.status)}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                {candidate.profile_title && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{candidate.profile_title}</span>
                  </div>
                )}
                {candidate.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{candidate.email}</span>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 text-sm">
            {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{candidate.years_of_experience} ans</span>
              </div>
            )}
            {candidate.source && (
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{candidate.source}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4" />
              <span>
                {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                }) : 'Date inconnue'}
              </span>
            </div>
            <Link
              href={`/manager/candidats/${candidate.id}`}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Voir détails
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Vérification du chargement initial
  if (isLoading && candidates.length === 0) {
    return (
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Chargement des candidats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Gestion des Candidats</h1>
          <p className="text-gray-600">Gérez tous vos candidats</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCandidates}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">Actualiser</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Ajouter un candidat</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setAddMode('manual')
                    setIsModalOpen(true)
                    setShowAddMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="bg-blue-100 rounded-lg p-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Créer manuellement</div>
                    <div className="text-xs text-gray-500">Saisie manuelle des informations</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setAddMode('auto')
                    setIsModalOpen(true)
                    setShowAddMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  <div className="bg-purple-100 rounded-lg p-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Via CV</div>
                    <div className="text-xs text-gray-500">Upload et extraction automatique</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 rounded-lg p-2">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Total</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gray-100 rounded-lg p-2">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-gray-600">{stats.sourcé}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Sourcés</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-indigo-100 rounded-lg p-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-indigo-600">{stats.qualifié}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Qualifiés</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-yellow-100 rounded-lg p-2">
              <Briefcase className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-yellow-600">{stats.shortlist}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Shortlist</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-100 rounded-lg p-2">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-purple-600">{stats.entretien}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Entretiens</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-100 rounded-lg p-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-green-600">{stats.embauché}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Embauchés</div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, titre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base"
            />
          </div>
          
          {/* Boutons d'action */}
          <div className="flex items-center gap-2">
            {/* Toggle vue */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
                title="Vue grille"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
                title="Vue liste"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
                title="Vue kanban"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
            
            {/* Bouton filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
            >
              <Filter className="w-4 h-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Panneau de filtres */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="sourcé">Sourcé</option>
                  <option value="qualifié">Qualifié</option>
                  <option value="entretien_rh">Entretien RH</option>
                  <option value="entretien_client">Entretien Client</option>
                  <option value="shortlist">Shortlist</option>
                  <option value="offre">Offre</option>
                  <option value="embauché">Embauché</option>
                  <option value="rejeté">Rejeté</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Toutes les sources</option>
                  {allSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Tous les tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Liste des candidats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
            Candidats
            <span className="text-gray-500 font-normal ml-2">({filteredCandidates.length})</span>
          </h2>
        </div>
        
        {filteredCandidates.length > 0 ? (
          viewMode === 'kanban' ? (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max lg:min-w-0">
                {[
                  { value: 'sourcé', label: 'Sourcé', color: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-300' },
                  { value: 'qualifié', label: 'Qualifié', color: 'bg-indigo-50', textColor: 'text-indigo-700', borderColor: 'border-indigo-300' },
                  { value: 'entretien_rh', label: 'Entretien RH', color: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-300' },
                  { value: 'entretien_client', label: 'Entretien Client', color: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-300' },
                  { value: 'shortlist', label: 'Shortlist', color: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-300' },
                  { value: 'offre', label: 'Offre', color: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-300' },
                  { value: 'embauché', label: 'Embauché', color: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-300' },
                  { value: 'rejeté', label: 'Rejeté', color: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-300' },
                ].map((statusConfig) => {
                  const statusCandidates = filteredCandidates.filter(
                    (c) => c.status === statusConfig.value
                  )
                  return (
                    <div 
                      key={statusConfig.value} 
                      className={`flex-shrink-0 w-[280px] lg:flex-1 lg:min-w-[280px] ${statusConfig.color} rounded-lg border-2 ${statusConfig.borderColor} p-4 transition-all hover:shadow-lg`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className={`font-semibold text-sm lg:text-base ${statusConfig.textColor} mb-1`}>
                            {statusConfig.label}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {statusCandidates.length} candidat{statusCandidates.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className={`${statusConfig.textColor} bg-white/60 px-2 py-1 rounded-full text-xs font-medium`}>
                          {statusCandidates.length}
                        </div>
                      </div>
                      
                      <div className="space-y-3 min-h-[200px]">
                        {statusCandidates.map((candidate) => (
                          <Link
                            key={candidate.id}
                            href={`/manager/candidats/${candidate.id}`}
                            className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-gray-300"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              {candidate.profile_picture_url || candidate.photo_url ? (
                                <img
                                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.profile_picture_url || candidate.photo_url}`}
                                  alt={`${candidate.first_name} ${candidate.last_name}`}
                                  className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 border-2 border-gray-200">
                                  <span className="text-white font-semibold text-sm">
                                    {candidate.first_name[0]}{candidate.last_name[0]}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 truncate">
                                  {candidate.first_name} {candidate.last_name}
                                </p>
                                {candidate.profile_title && (
                                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                                    {candidate.profile_title}
                                  </p>
                                )}
                                {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {candidate.years_of_experience} ans
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {candidate.tags && candidate.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {candidate.tags.slice(0, 2).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {candidate.tags.length > 2 && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                    +{candidate.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCandidates.map((candidate) => (
                <CandidateRow key={candidate.id} candidate={candidate} />
              ))}
            </div>
          )
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900 mb-2">Aucun candidat trouvé</p>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery || selectedStatus || selectedSource || selectedTag
                ? 'Aucun candidat ne correspond à vos critères de recherche.'
                : 'Commencez par ajouter votre premier candidat.'}
            </p>
            {!searchQuery && !selectedStatus && !selectedSource && !selectedTag && (
              <button
                onClick={() => {
                  setAddMode('manual')
                  setIsModalOpen(true)
                }}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Ajouter votre premier candidat
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de création de candidat */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {addMode === 'auto' ? 'Ajouter un candidat via CV' : 'Ajouter un candidat'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setAddMode('manual')
                  setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    tags: [],
                    skills: [],
                    source: '',
                    notes: '',
                  })
                  setCvFile(null)
                  setPhotoFile(null)
                  setPhotoPreview(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {addMode === 'auto' ? (
                <div>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="text-gray-700 mb-2 font-medium">Glissez-déposez votre CV ici</p>
                    <p className="text-sm text-gray-500 mb-4">ou</p>
                    <label className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                      <FileText className="w-5 h-5" />
                      Sélectionner un fichier
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                    {isParsingCv && (
                      <div className="mt-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-600 mt-2">Analyse du CV en cours...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              
              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Titre du profil</label>
                    <input
                      type="text"
                      value={formData.profile_title || ''}
                      onChange={(e) => setFormData({ ...formData, profile_title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Années d'expérience</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.years_of_experience || ''}
                      onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photo de profil</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {photoPreview && (
                      <img src={photoPreview} alt="Preview" className="mt-2 w-24 h-24 rounded-full object-cover" />
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      placeholder="Ajouter un tag"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Compétences</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.skills?.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSkill()
                        }
                      }}
                      placeholder="Ajouter une compétence"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      setAddMode('manual')
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Création...' : 'Créer le candidat'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
