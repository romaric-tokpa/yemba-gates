'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, Tag, Mail, Phone, Calendar, User, Briefcase, Edit, X, Plus, Save, Eye } from 'lucide-react'
import { getCandidate, CandidateResponse, updateCandidateStatus, updateCandidate, CandidateUpdate } from '@/lib/api'
import { authenticatedFetch, getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function RecruiterCandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<CandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvPreview, setCvPreview] = useState<string | null>(null)
  const [motivationLetterFile, setMotivationLetterFile] = useState<File | null>(null)
  const [motivationLetterPreview, setMotivationLetterPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCvPreview, setShowCvPreview] = useState(false)
  const [showInterviewReportPreview, setShowInterviewReportPreview] = useState(false)
  const { success, error: showError } = useToastContext()

  // État du formulaire d'édition
  const [formData, setFormData] = useState<CandidateUpdate>({
    first_name: '',
    last_name: '',
    profile_title: '',
    years_of_experience: undefined,
    email: '',
    phone: '',
    source: '',
    notes: '',
    tags: [],
    skills: [],
  })

  // États pour l'ajout de tags/compétences
  const [newTag, setNewTag] = useState('')
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    // Vérifier l'authentification
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    if (candidateId) {
      loadCandidate()
    }
  }, [candidateId, router])

  // Initialiser le formulaire quand le candidat est chargé
  useEffect(() => {
    if (candidate && !isEditing) {
      setFormData({
        first_name: candidate.first_name || '',
        last_name: candidate.last_name || '',
        profile_title: candidate.profile_title || '',
        years_of_experience: candidate.years_of_experience ?? undefined,
        email: candidate.email || '',
        phone: candidate.phone || '',
        source: candidate.source || '',
        notes: candidate.notes || '',
        tags: candidate.tags || [],
        skills: Array.isArray(candidate.skills) ? candidate.skills : (typeof candidate.skills === 'string' ? candidate.skills.split(',').map(s => s.trim()) : []),
      })
    }
  }, [candidate, isEditing])

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

  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCvFile(file)
      // Créer une prévisualisation pour les PDF
      if (file.type === 'application/pdf') {
        const reader = new FileReader()
        reader.onloadend = () => {
          setCvPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setCvPreview(null)
      }
    }
  }

  const handleCvUpload = async () => {
    if (!cvFile || !candidate) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('cv_file', cvFile)

      const token = getToken()
      if (!token) {
        throw new Error('Non authentifié')
      }

      const response = await authenticatedFetch(`${API_URL}/candidates/${candidateId}/cv`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du CV')
      }

      await loadCandidate()
      setCvFile(null)
      setCvPreview(null)
      success('CV uploadé avec succès !')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'upload'
      showError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleInterviewReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMotivationLetterFile(file)
      // Créer une prévisualisation pour les PDF
      if (file.type === 'application/pdf') {
        const reader = new FileReader()
        reader.onloadend = () => {
          setMotivationLetterPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setMotivationLetterPreview(null)
      }
    }
  }

  const handleInterviewReportUpload = async () => {
    if (!motivationLetterFile || !candidate) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('motivation_letter', motivationLetterFile)

      const token = getToken()
      if (!token) {
        throw new Error('Non authentifié')
      }

      // Note: Cette route devra être créée dans le backend si elle n'existe pas
      const response = await authenticatedFetch(`${API_URL}/candidates/${candidateId}/motivation-letter`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du compte rendu d\'entretien')
      }

      await loadCandidate()
      setMotivationLetterFile(null)
      setMotivationLetterPreview(null)
      success('Compte rendu d\'entretien uploadé avec succès !')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'upload'
      showError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!candidate) return

    try {
      await updateCandidateStatus(candidateId, newStatus)
      await loadCandidate()
      const statusLabels: Record<string, string> = {
        sourcé: 'Sourcé',
        qualifié: 'Qualifié',
        entretien_rh: 'Entretien RH',
        entretien_client: 'Entretien Client',
        shortlist: 'Shortlist',
        offre: 'Offre',
        rejeté: 'Rejeté',
        embauché: 'Embauché',
      }
      const statusLabel = statusLabels[newStatus] || newStatus
      success(`Statut mis à jour : "${statusLabel}"`)
    } catch (err) {
      if (err instanceof Error && (err as any).isFeedbackError) {
        showError('Feedback manquant : Veuillez saisir un feedback avant de changer le statut')
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
        showError(errorMessage)
      }
    }
  }

  const handleSave = async () => {
    if (!candidate) return

    try {
      setIsSaving(true)
      const updatedCandidate = await updateCandidate(candidateId, formData)
      setCandidate(updatedCandidate)
      setIsEditing(false)
      success('Profil candidat mis à jour avec succès !')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      showError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Réinitialiser le formulaire avec les données originales
    if (candidate) {
      setFormData({
        first_name: candidate.first_name || '',
        last_name: candidate.last_name || '',
        profile_title: candidate.profile_title || '',
        years_of_experience: candidate.years_of_experience ?? undefined,
        email: candidate.email || '',
        phone: candidate.phone || '',
        source: candidate.source || '',
        notes: candidate.notes || '',
        tags: candidate.tags || [],
        skills: Array.isArray(candidate.skills) ? candidate.skills : (typeof candidate.skills === 'string' ? candidate.skills.split(',').map(s => s.trim()) : []),
      })
    }
    setIsEditing(false)
    setNewTag('')
    setNewSkill('')
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()],
      })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || [],
    })
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills?.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), newSkill.trim()],
      })
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills?.filter(skill => skill !== skillToRemove) || [],
    })
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
        <Link href="/recruiter/candidates" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Retour à la liste
        </Link>
      </div>
    )
  }

  const statusOptions = [
    'sourcé',
    'qualifié',
    'entretien_rh',
    'entretien_client',
    'shortlist',
    'offre',
    'rejeté',
    'embauché'
  ]

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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6 lg:mb-8">
        <Link 
          href="/recruiter/candidates" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux candidats
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Fiche Candidat
          </h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier le profil
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Informations principales */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Photo/Logo */}
            <div className="flex justify-center">
              {candidate.profile_picture_url || candidate.photo_url ? (
                <img
                  src={`${API_URL}${candidate.profile_picture_url || candidate.photo_url}`}
                  alt={`${candidate.first_name} ${candidate.last_name}`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-lg">
                  <User className="w-16 h-16 text-blue-600" />
                </div>
              )}
            </div>

            {/* Nom et Prénom */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full text-center px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                      placeholder="Prénom"
                    />
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full text-center px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nom"
                    />
                  </>
                ) : (
                  <>
                    {candidate.first_name} {candidate.last_name}
                  </>
                )}
              </h2>
              {!isEditing && candidate.profile_title && (
                <p className="text-sm text-gray-600 mt-1">
                  {candidate.profile_title}
                </p>
              )}
              {!isEditing && candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {candidate.years_of_experience} ans d&apos;expérience
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                Candidat
              </p>
            </div>

            {/* Badge de statut */}
            <div className="flex justify-center">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeColor(candidate.status)}`}>
                {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1).replace('_', ' ')}
              </span>
            </div>

            {/* Contacts rapides - Cliquables */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </>
              ) : (
                <>
                  {candidate.email && (
                    <a
                      href={`mailto:${candidate.email}`}
                      className="flex items-center text-sm text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="truncate">{candidate.email}</span>
                    </a>
                  )}
                  {candidate.phone && (
                    <a
                      href={`tel:${candidate.phone}`}
                      className="flex items-center text-sm text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{candidate.phone}</span>
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite - Informations détaillées */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations détaillées */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2" />
              Informations détaillées
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.email || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  Téléphone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.phone || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre du profil</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.profile_title || ''}
                    onChange={(e) => setFormData({ ...formData, profile_title: e.target.value })}
                    placeholder="ex: Développeur Fullstack, Designer UX..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.profile_title || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Années d&apos;expérience</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.years_of_experience || ''}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined 
                      ? `${candidate.years_of_experience} ans` 
                      : '-'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="LinkedIn, APEC, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{candidate.source || '-'}</p>
                )}
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

          {/* Tags */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Tags & Mots-clés
            </h2>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.tags && formData.tags.length > 0 ? (
                    formData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucun tag associé</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Ajouter un tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {candidate.tags && candidate.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {candidate.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun tag associé</p>
                )}
              </>
            )}
          </div>

          {/* Compétences */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Compétences
            </h2>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.skills && formData.skills.length > 0 ? (
                    formData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucune compétence renseignée</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Ajouter une compétence"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes internes</h2>
            {isEditing ? (
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes internes sur le candidat..."
              />
            ) : (
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {candidate.notes || 'Aucune note'}
              </p>
            )}
          </div>

          {/* Section Documents */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Documents
            </h2>
            
            <div className="space-y-6">
              {/* CV */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">CV</h3>
                
                {candidate.cv_file_path ? (
                  <div className="mb-4 space-y-2">
                    <div className="flex gap-2">
                      <a
                        href={`${API_URL}/candidates/${candidateId}/cv`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Télécharger le CV
                      </a>
                      {candidate.cv_file_path.endsWith('.pdf') && (
                        <button
                          onClick={() => setShowCvPreview(!showCvPreview)}
                          className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {showCvPreview ? 'Masquer' : 'Prévisualiser'}
                        </button>
                      )}
                    </div>
                    {showCvPreview && candidate.cv_file_path.endsWith('.pdf') && (
                      <div className="mt-2 border border-gray-300 rounded-lg overflow-hidden">
                        <iframe
                          src={`${API_URL}/candidates/${candidateId}/cv`}
                          className="w-full h-96"
                          title="Prévisualisation CV"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">Aucun CV uploadé</p>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Uploader un CV (PDF, Word)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCvFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {cvFile && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Fichier sélectionné: {cvFile.name}</p>
                      {cvPreview && (
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                          <iframe
                            src={cvPreview}
                            className="w-full h-64"
                            title="Prévisualisation CV"
                          />
                        </div>
                      )}
                      <button
                        onClick={handleCvUpload}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? 'Upload en cours...' : 'Uploader le CV'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Compte rendu d'entretien */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Compte rendu d&apos;entretien</h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Uploader un compte rendu d&apos;entretien (PDF, Word)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleInterviewReportFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {motivationLetterFile && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Fichier sélectionné: {motivationLetterFile.name}</p>
                      {motivationLetterPreview && (
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                          <iframe
                            src={motivationLetterPreview}
                            className="w-full h-64"
                            title="Prévisualisation compte rendu"
                          />
                        </div>
                      )}
                      <button
                        onClick={handleInterviewReportUpload}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? 'Upload en cours...' : 'Uploader le compte rendu'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statut actuel</h2>
            <select
              value={candidate.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Boutons d'action en mode édition */}
          {isEditing && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bouton "Modifier le profil" en bas de page (visible uniquement en mode lecture) */}
      {!isEditing && (
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit className="w-5 h-5 mr-2" />
              Modifier le profil
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
