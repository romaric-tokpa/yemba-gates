'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createCandidate, getCandidates, CandidateResponse, CandidateCreate, uploadCandidatePhoto, parseCv, getJobs, JobResponse, createApplication } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { Plus, X, Tag, List, LayoutGrid, Image as ImageIcon, Upload, FileText, UserPlus, ChevronDown, Mail, Phone, Briefcase, Search, Filter, XCircle } from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'

export default function RecruiterCandidatesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error: showError } = useToastContext()
  const [candidates, setCandidates] = useState<CandidateResponse[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list') // Nouveau : mode d'affichage
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedSkill, setSelectedSkill] = useState<string>('')
  const [selectedExperienceMin, setSelectedExperienceMin] = useState<string>('')
  const [selectedExperienceMax, setSelectedExperienceMax] = useState<string>('')
  
  // Formulaire
  const [formData, setFormData] = useState<CandidateCreate>({
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
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [isParsingCv, setIsParsingCv] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addMode, setAddMode] = useState<'manual' | 'auto'>('manual')
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')

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
    // Vérifier l'authentification avant de charger les données
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    // Vérifier si on doit afficher le formulaire de création
    const action = searchParams.get('action')
    if (action === 'new') {
      setAddMode('manual')
      setIsModalOpen(true)
    }

    loadCandidates()
    loadJobs()
  }, [router, searchParams])
  
  const loadJobs = async () => {
    try {
      const jobsData = await getJobs()
      setJobs(Array.isArray(jobsData) ? jobsData : [])
    } catch (error) {
      console.error('Erreur lors du chargement des jobs:', error)
    }
  }

  const loadCandidates = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getCandidates({
        tag_filter: selectedTag || undefined,
        source_filter: selectedSource || undefined,
        status_filter: selectedStatus || undefined,
      })
      setCandidates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des candidats:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      showError(`Erreur lors du chargement des candidats: ${errorMessage}. Vérifiez que le backend est démarré.`)
      setCandidates([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedTag, selectedSource, selectedStatus, showError])

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
    // Vérifier le type de fichier
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    if (!['pdf', 'doc', 'docx'].includes(fileExtension || '')) {
      showError('Format de fichier non supporté. Veuillez utiliser un fichier PDF ou Word (.doc, .docx)')
      return
    }

    setIsParsingCv(true)
    try {
      const parsedData = await parseCv(file)
      
      // Pré-remplir le formulaire avec les données parsées
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
      
      // Si une image a été extraite du CV, l'utiliser comme preview
      if (parsedData.profile_picture_base64) {
        setPhotoPreview(parsedData.profile_picture_base64)
        // Convertir le base64 (data URI) en File pour l'upload
        try {
          // Le base64 est déjà au format data URI (data:image/...;base64,...)
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
          // Continuer sans l'image si la conversion échoue
        }
      }
      
      // Sauvegarder le fichier CV pour l'upload final
      setCvFile(file)
      
      success('CV analysé avec succès ! Vérifiez et complétez les informations ci-dessous.')
      
      // Faire défiler vers le formulaire
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
      // Créer une preview
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
      
      // Upload de la photo si elle existe
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
      
      // Créer le candidat avec la photo
      const candidateData = await createCandidate({
        ...formData,
        profile_picture_url: photoUrl,
        cv_file: cvFile || undefined,
      })
      
      // Si un job est sélectionné, créer l'application (attribuer le candidat au job)
      if (selectedJobId && candidateData.id) {
        try {
          await createApplication({
            candidate_id: candidateData.id,
            job_id: selectedJobId,
            status: 'sourcé'
          })
          success('Candidat créé et attribué au besoin avec succès')
        } catch (appError) {
          console.error('Erreur lors de l\'attribution au besoin:', appError)
          // Afficher un warning mais ne pas bloquer - le candidat est créé
          showError('Candidat créé mais erreur lors de l\'attribution au besoin')
        }
      } else {
        success('Candidat créé avec succès')
      }
      
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
      setSelectedJobId('')
      loadCandidates()
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du candidat'
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Récupérer tous les tags, sources et compétences uniques
  const allTags = Array.from(
    new Set(candidates.flatMap((c) => c.tags || []))
  )
  const allSources = Array.from(
    new Set(candidates.map((c) => c.source).filter(Boolean))
  )
  const allSkills = Array.from(
    new Set(candidates.flatMap((c) => c.skills || []))
  )

  const filteredCandidates = candidates.filter((candidate) => {
    // Recherche par nom et prénom
    if (searchQuery) {
      const fullName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase()
      const searchLower = searchQuery.toLowerCase()
      if (!fullName.includes(searchLower)) return false
    }
    
    // Filtre par tag
    if (selectedTag && !candidate.tags?.includes(selectedTag)) return false
    
    // Filtre par source
    if (selectedSource && candidate.source !== selectedSource) return false
    
    // Filtre par statut
    if (selectedStatus && candidate.status !== selectedStatus) return false
    
    // Filtre par compétence
    if (selectedSkill && !candidate.skills?.some(skill => skill.toLowerCase().includes(selectedSkill.toLowerCase()))) return false
    
    // Filtre par années d'expérience
    const yearsExp = candidate.years_of_experience ?? 0
    if (selectedExperienceMin && yearsExp < parseInt(selectedExperienceMin)) return false
    if (selectedExperienceMax && yearsExp > parseInt(selectedExperienceMax)) return false
    
    return true
  })

  // Compter les filtres actifs
  const activeFiltersCount = [
    searchQuery,
    selectedTag,
    selectedSource,
    selectedStatus,
    selectedSkill,
    selectedExperienceMin,
    selectedExperienceMax,
  ].filter(Boolean).length

  // Fonction pour réinitialiser tous les filtres
  const resetFilters = () => {
    setSearchQuery('')
    setSelectedTag('')
    setSelectedSource('')
    setSelectedStatus('')
    setSelectedSkill('')
    setSelectedExperienceMin('')
    setSelectedExperienceMax('')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Candidats</h1>
          <p className="text-gray-600 mt-2">Gestion de la base de candidats</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Switch Liste/Kanban */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4" />
              Liste
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter un candidat
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <button
                  onClick={() => {
                    setAddMode('manual')
                    setIsModalOpen(true)
                    setShowAddMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
                >
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Ajout manuel</div>
                    <div className="text-xs text-gray-500">Saisir les informations</div>
                  </div>
                </button>
                <div className="border-t border-gray-200"></div>
                <button
                  onClick={() => {
                    setAddMode('auto')
                    setIsModalOpen(true)
                    setShowAddMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-b-lg"
                >
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Import automatique</div>
                    <div className="text-xs text-gray-500">Analyser un CV</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="mb-6 space-y-4">
        {/* Barre de recherche */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou prénom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6">
          {/* En-tête des filtres */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {activeFiltersCount} actif{activeFiltersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>

          {/* Grille de filtres */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Filtre Tag */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Tag className="inline-block w-4 h-4 mr-1.5 text-gray-500" />
                Tag
              </label>
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

            {/* Filtre Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Source
              </label>
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

            {/* Filtre Statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Statut
              </label>
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

            {/* Filtre Compétence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Compétence
              </label>
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Toutes les compétences</option>
                {allSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre Années d'expérience - Minimum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Expérience (min)
              </label>
              <select
                value={selectedExperienceMin}
                onChange={(e) => setSelectedExperienceMin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Aucun minimum</option>
                <option value="0">0 ans</option>
                <option value="1">1 an</option>
                <option value="2">2 ans</option>
                <option value="3">3 ans</option>
                <option value="5">5 ans</option>
                <option value="7">7 ans</option>
                <option value="10">10 ans</option>
              </select>
            </div>

            {/* Filtre Années d'expérience - Maximum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Expérience (max)
              </label>
              <select
                value={selectedExperienceMax}
                onChange={(e) => setSelectedExperienceMax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Aucun maximum</option>
                <option value="2">2 ans</option>
                <option value="5">5 ans</option>
                <option value="7">7 ans</option>
                <option value="10">10 ans</option>
                <option value="15">15 ans</option>
                <option value="20">20 ans</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vue Liste ou Kanban */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* En-tête */}
          <div className="p-4 lg:p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
                  {filteredCandidates.length} candidat{filteredCandidates.length > 1 ? 's' : ''}
                </h2>
                {filteredCandidates.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {activeFiltersCount > 0
                      ? 'Résultats filtrés' 
                      : 'Tous les candidats'}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Liste des candidats */}
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4">Chargement des candidats...</p>
              </div>
            ) : filteredCandidates.length > 0 ? (
              filteredCandidates.map((candidate) => {
                // Couleur du badge selon le statut
                const getStatusBadgeColor = (status: string) => {
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    'sourcé': { bg: 'bg-gray-100', text: 'text-gray-700' },
                    'qualifié': { bg: 'bg-blue-100', text: 'text-blue-700' },
                    'entretien_rh': { bg: 'bg-purple-100', text: 'text-purple-700' },
                    'entretien_client': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
                    'shortlist': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
                    'offre': { bg: 'bg-orange-100', text: 'text-orange-700' },
                    'rejeté': { bg: 'bg-red-100', text: 'text-red-700' },
                    'embauché': { bg: 'bg-green-100', text: 'text-green-700' },
                  }
                  return statusColors[status] || { bg: 'bg-gray-100', text: 'text-gray-700' }
                }
                const statusColor = getStatusBadgeColor(candidate.status)
                const statusLabels: Record<string, string> = {
                  'sourcé': 'Sourcé',
                  'qualifié': 'Qualifié',
                  'entretien_rh': 'Entretien RH',
                  'entretien_client': 'Entretien Client',
                  'shortlist': 'Shortlist',
                  'offre': 'Offre',
                  'rejeté': 'Rejeté',
                  'embauché': 'Embauché',
                }
                
                return (
                  <Link
                    key={candidate.id}
                    href={`/recruiter/candidates/${candidate.id}`}
                    className="block p-4 lg:p-6 hover:bg-blue-50 transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Section principale */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Photo de profil */}
                        {candidate.profile_picture_url || candidate.photo_url ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.profile_picture_url || candidate.photo_url}`}
                            alt={`${candidate.first_name} ${candidate.last_name}`}
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-300 transition-colors flex-shrink-0"
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
                        <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-gray-200 group-hover:border-blue-300 transition-colors flex-shrink-0 ${candidate.profile_picture_url || candidate.photo_url ? 'hidden photo-fallback' : ''}`}>
                          <span className="text-white font-semibold text-lg lg:text-xl">
                            {candidate.first_name[0]}{candidate.last_name[0]}
                          </span>
                        </div>
                        
                        {/* Informations du candidat */}
                        <div className="flex-1 min-w-0">
                          {/* Nom et titre */}
                          <div className="mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg lg:text-xl group-hover:text-blue-600 transition-colors">
                              {candidate.first_name} {candidate.last_name}
                            </h3>
                            {candidate.profile_title && (
                              <p className="text-sm lg:text-base text-gray-600 mt-1 flex items-center gap-1">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                {candidate.profile_title}
                              </p>
                            )}
                            {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
                              <p className="text-xs lg:text-sm text-gray-500 mt-1">
                                {candidate.years_of_experience} ans d&apos;expérience
                              </p>
                            )}
                          </div>
                          
                          {/* Contact */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3">
                            {candidate.email && (
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{candidate.email}</span>
                              </p>
                            )}
                            {candidate.phone && (
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span>{candidate.phone}</span>
                              </p>
                            )}
                          </div>
                          
                          {/* Tags */}
                          {candidate.tags && candidate.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {candidate.tags.slice(0, 5).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              {candidate.tags.length > 5 && (
                                <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                  +{candidate.tags.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Compétences (premières compétences) */}
                          {candidate.skills && candidate.skills.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-1 font-medium">Compétences:</p>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {candidate.skills.slice(0, 5).join(' • ')}
                                {candidate.skills.length > 5 && ` +${candidate.skills.length - 5} autres`}
                              </p>
                            </div>
                          )}
                          
                          {/* Source */}
                          {candidate.source && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                {candidate.source}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Badge de statut */}
                      <div className="flex-shrink-0 lg:ml-4">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${statusColor.bg} ${statusColor.text} whitespace-nowrap`}>
                          {statusLabels[candidate.status] || candidate.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="text-center py-12 lg:py-16 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Tag className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">Aucun candidat trouvé</p>
                <p className="text-sm text-gray-500 mb-6">
                  {selectedStatus || selectedTag || selectedSource
                    ? 'Essayez de modifier vos filtres de recherche'
                    : 'Commencez par ajouter votre premier candidat'}
                </p>
                <button
                  onClick={() => {
                    setAddMode('manual')
                    setIsModalOpen(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un candidat
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vue Kanban */
        <div className="bg-transparent">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-12">
              <div className="text-center py-12 text-gray-500">Chargement...</div>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max lg:min-w-0">
                {/* Colonnes par statut */}
                {[
                  { value: 'sourcé', label: 'Sourcé', color: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-300' },
                  { value: 'qualifié', label: 'Qualifié', color: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-300' },
                  { value: 'entretien_rh', label: 'Entretien RH', color: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-300' },
                  { value: 'entretien_client', label: 'Entretien Client', color: 'bg-indigo-50', textColor: 'text-indigo-700', borderColor: 'border-indigo-300' },
                  { value: 'shortlist', label: 'Shortlist', color: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-300' },
                  { value: 'offre', label: 'Offre', color: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-300' },
                  { value: 'rejeté', label: 'Rejeté', color: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-300' },
                  { value: 'embauché', label: 'Embauché', color: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-300' },
                ].map((statusConfig) => {
                  const statusCandidates = filteredCandidates.filter(
                    (c) => c.status === statusConfig.value
                  )
                  return (
                    <div 
                      key={statusConfig.value} 
                      className={`flex-shrink-0 w-[280px] lg:flex-1 lg:min-w-[280px] ${statusConfig.color} rounded-lg border-2 ${statusConfig.borderColor} p-4 transition-all hover:shadow-lg`}
                    >
                      {/* En-tête de colonne */}
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
                      
                      {/* Liste des candidats */}
                      <div className="space-y-3 min-h-[200px]">
                        {statusCandidates.map((candidate) => (
                          <Link
                            key={candidate.id}
                            href={`/recruiter/candidates/${candidate.id}`}
                            className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-gray-300"
                          >
                            {/* En-tête avec photo et nom */}
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
                                    {candidate.years_of_experience} ans d&apos;expérience
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Tags */}
                            {candidate.tags && candidate.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {candidate.tags.slice(0, 2).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full font-medium"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {candidate.tags.length > 2 && (
                                  <span className="px-2 py-0.5 text-xs text-gray-500 font-medium">
                                    +{candidate.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Compétences (première compétence si disponible) */}
                            {candidate.skills && candidate.skills.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-xs text-gray-500 truncate">
                                  <span className="font-medium">Skills:</span> {candidate.skills.slice(0, 3).join(', ')}
                                  {candidate.skills.length > 3 && '...'}
                                </p>
                              </div>
                            )}
                          </Link>
                        ))}
                        {statusCandidates.length === 0 && (
                          <div className="bg-white/50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                            <p className="text-sm text-gray-400">
                              Aucun candidat
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de création */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {addMode === 'auto' ? 'Import automatique de CV' : 'Ajouter un candidat'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {addMode === 'auto' 
                    ? 'Importez un CV pour extraire automatiquement les informations'
                    : 'Saisissez manuellement les informations du candidat'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setAddMode('manual')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Zone Drag & Drop pour l'import de CV - Affichée uniquement en mode auto */}
              {addMode === 'auto' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400'
                  } ${isParsingCv ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {isParsingCv ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-600">Analyse du CV en cours...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Glissez-déposez un CV ici ou cliquez pour sélectionner
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Formats acceptés: PDF, Word (.doc, .docx)
                      </p>
                      <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 mr-2" />
                        Importer un CV
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </label>
                    </>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre du profil
                  </label>
                  <input
                    type="text"
                    value={formData.profile_title || ''}
                    onChange={(e) => setFormData({ ...formData, profile_title: e.target.value })}
                    placeholder="ex: Développeur Fullstack, Designer UX..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Années d&apos;expérience
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.years_of_experience || ''}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Attribuer à un besoin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Briefcase className="w-4 h-4 mr-1" />
                  Attribuer à un besoin (optionnel)
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Aucun besoin sélectionné --</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                      {job.department && ` - ${job.department}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Le candidat sera automatiquement attribué au besoin sélectionné après création
                </p>
              </div>
              
              {/* Upload Photo avec aperçu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo de profil
                </label>
                <div className="space-y-3">
                  {photoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={photoPreview}
                        alt="Aperçu"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null)
                          setPhotoPreview(null)
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Tag className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Compétences avec badges colorés */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compétences
                </label>
                <div className="flex gap-2 mb-2">
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
                    placeholder="Ajouter une compétence (ex: Python, React)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Tag className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills?.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-green-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CV (PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

