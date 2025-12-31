'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createCandidate, getCandidates, CandidateResponse, CandidateCreate, uploadCandidatePhoto, parseCv } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { Plus, X, Upload, Tag, Mail, Phone, Search, List, LayoutGrid, Image as ImageIcon, FileText, UserPlus, ChevronDown } from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'

export default function ManagerCandidatsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error: showError } = useToastContext()
  const [candidates, setCandidates] = useState<CandidateResponse[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list') // Switch Liste/Kanban
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedExperience, setSelectedExperience] = useState<string>('')
  const [selectedAvailability, setSelectedAvailability] = useState<string>('')
  
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
  const [showAddMenu, setShowAddMenu] = useState(false)
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
    // Vérifier l'authentification avant de charger les données
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    // Vérifier si on doit afficher le formulaire de création
    const action = searchParams.get('action')
    if (action === 'new') {
      setIsModalOpen(true)
    }

    loadCandidates()
  }, [router, searchParams])

  const loadCandidates = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getCandidates({
        tag_filter: selectedTag || undefined,
        source_filter: selectedSource || undefined,
        status_filter: selectedStatus || undefined,
      })
      
      // Normaliser les données pour gérer les cas où skills est null
      const normalizedData = Array.isArray(data) ? data.map(candidate => ({
        ...candidate,
        skills: candidate.skills || [], // Convertir null en tableau vide
        tags: candidate.tags || [], // Convertir null en tableau vide
      })) : []
      
      setCandidates(normalizedData)
    } catch (error) {
      console.error('❌ [ERREUR] Erreur lors du chargement des candidats:', error)
      
      // Afficher le message d'erreur détaillé dans la console pour debug
      if (error instanceof Error) {
        console.error('❌ [ERREUR] Message:', error.message)
        console.error('❌ [ERREUR] Stack:', error.stack)
      }
      
      // Si c'est une erreur de réponse HTTP, afficher les détails
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as any
        if (httpError.response) {
          console.error('❌ [ERREUR HTTP] Status:', httpError.response.status)
          console.error('❌ [ERREUR HTTP] StatusText:', httpError.response.statusText)
          if (httpError.response.status === 500) {
            httpError.response.json().then((errorData: any) => {
              console.error('❌ [ERREUR 500] Détails du serveur:', errorData)
            }).catch(() => {
              console.error('❌ [ERREUR 500] Impossible de parser la réponse JSON')
            })
          }
        }
      }
      
      showError('Erreur lors du chargement des candidats. Vérifiez la console pour plus de détails.')
      setCandidates([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedTag, selectedSource, selectedStatus, showError])

  // Récupérer tous les tags uniques
  const allTags = Array.from(
    new Set(candidates.flatMap((c) => c.tags || []))
  )

  // Récupérer toutes les sources uniques
  const allSources = Array.from(
    new Set(candidates.map((c) => c.source).filter(Boolean))
  )

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

  const filteredCandidates = candidates.filter((candidate) => {
    // Recherche par nom
    if (searchQuery) {
      const fullName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase()
      const searchLower = searchQuery.toLowerCase()
      if (!fullName.includes(searchLower)) return false
    }
    
    // Filtres existants
    if (selectedTag && !candidate.tags?.includes(selectedTag)) return false
    if (selectedSource && candidate.source !== selectedSource) return false
    if (selectedStatus && candidate.status !== selectedStatus) return false
    
    // Filtre par expérience (basé sur les tags - recherche de "junior", "senior", etc.)
    if (selectedExperience) {
      const tagsLower = candidate.tags?.map(t => t.toLowerCase()) || []
      if (selectedExperience === 'junior' && !tagsLower.some(t => t.includes('junior'))) return false
      if (selectedExperience === 'senior' && !tagsLower.some(t => t.includes('senior'))) return false
      if (selectedExperience === 'intermediate' && !tagsLower.some(t => t.includes('intermediate') || t.includes('intermédiaire'))) return false
    }
    
    // Filtre par disponibilité (basé sur le statut - si "embauché" alors non disponible)
    if (selectedAvailability) {
      if (selectedAvailability === 'available' && candidate.status === 'embauché') return false
      if (selectedAvailability === 'unavailable' && candidate.status !== 'embauché') return false
    }
    
    return true
  })

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
                  ? 'bg-indigo-600 text-white'
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
                  ? 'bg-indigo-600 text-white'
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
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
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
                  <UserPlus className="w-5 h-5 text-indigo-600" />
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
                  <FileText className="w-5 h-5 text-indigo-600" />
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

      {/* Barre de recherche */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher par nom</label>
          <input
            type="text"
            placeholder="Rechercher un candidat par nom ou prénom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tous les tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tous les statuts</option>
              <option value="sourcé">Sourcé</option>
              <option value="Entretien">Entretien</option>
              <option value="Offre">Offre</option>
              <option value="Refusé">Refusé</option>
              {/* Anciens statuts pour compatibilité */}
              <option value="sourcé">Sourcé</option>
              <option value="qualifié">Qualifié</option>
              <option value="entretien_rh">Entretien RH</option>
              <option value="entretien_client">Entretien Client</option>
              <option value="shortlist">Shortlist</option>
              <option value="embauché">Embauché</option>
              <option value="rejeté">Rejeté</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expérience</label>
            <select
              value={selectedExperience}
              onChange={(e) => setSelectedExperience(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tous les niveaux</option>
              <option value="junior">Junior</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="senior">Senior</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilité</label>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tous</option>
              <option value="available">Disponible</option>
              <option value="unavailable">Non disponible</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vue Liste ou Kanban */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredCandidates.length} candidat{filteredCandidates.length > 1 ? 's' : ''}
            </h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Chargement...</div>
            ) : filteredCandidates.length > 0 ? (
              <div className="space-y-4">
                {filteredCandidates.map((candidate) => (
                  <Link
                    key={candidate.id}
                    href={`/manager/candidats/${candidate.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Photo avec icône par défaut */}
                        {candidate.profile_picture_url || candidate.photo_url ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.profile_picture_url || candidate.photo_url}`}
                            alt={`${candidate.first_name} ${candidate.last_name}`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200"
                            onError={(e) => {
                              // Si l'image ne charge pas, afficher l'icône par défaut
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
                        <div className={`w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 ${candidate.profile_picture_url || candidate.photo_url ? 'hidden photo-fallback' : ''}`}>
                          <span className="text-indigo-600 font-medium text-sm">
                            {candidate.first_name[0]}{candidate.last_name[0]}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          {/* Nom */}
                          <h3 className="font-semibold text-gray-900 text-lg hover:text-indigo-600 transition-colors">
                            {candidate.first_name} {candidate.last_name}
                          </h3>
                          {candidate.profile_title && (
                            <p className="text-sm text-gray-600 mt-1">{candidate.profile_title}</p>
                          )}
                          {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {candidate.years_of_experience} ans d&apos;expérience
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            {candidate.email && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {candidate.email}
                              </p>
                            )}
                            {candidate.phone && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {candidate.phone}
                              </p>
                            )}
                          </div>
                          {candidate.tags && candidate.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {candidate.tags.slice(0, 5).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              {candidate.tags.length > 5 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                  +{candidate.tags.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="ml-4 px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 whitespace-nowrap">
                        {candidate.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Aucun candidat trouvé</p>
                <button
                  onClick={() => {
                    setAddMode('manual')
                    setIsModalOpen(true)
                  }}
                  className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Ajouter votre premier candidat
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vue Kanban */
        <div className="bg-white rounded-lg shadow p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Colonnes par statut - Utiliser les valeurs autorisées */}
              {[
                { value: 'sourcé', label: 'Sourcé' },
                { value: 'qualifié', label: 'Qualifié' },
                { value: 'entretien_rh', label: 'Entretien RH' },
                { value: 'entretien_client', label: 'Entretien Client' },
                { value: 'offre', label: 'Offre' },
                { value: 'rejeté', label: 'Rejeté' }
              ].map(({ value, label }) => {
                const statusCandidates = filteredCandidates.filter(
                  (c) => c.status === value
                )
                return (
                  <div key={value} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
                      <span>{label}</span>
                      <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                        {statusCandidates.length}
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {statusCandidates.map((candidate) => (
                        <Link
                          key={candidate.id}
                          href={`/manager/candidats/${candidate.id}`}
                          className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {/* Photo avec icône par défaut */}
                            {candidate.profile_picture_url || candidate.photo_url ? (
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.profile_picture_url || candidate.photo_url}`}
                                alt={`${candidate.first_name} ${candidate.last_name}`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200"
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
                            <div className={`w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 ${candidate.profile_picture_url || candidate.photo_url ? 'hidden photo-fallback' : ''}`}>
                              <span className="text-indigo-600 font-medium text-xs">
                                {candidate.first_name[0]}{candidate.last_name[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {candidate.first_name} {candidate.last_name}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {statusCandidates.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">
                          Aucun candidat
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
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
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-400'
                } ${isParsingCv ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isParsingCv ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
                    <label className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Tag className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-indigo-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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

