'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, User, Briefcase, MapPin, DollarSign, Calendar, FileText, Tag, Award, Languages, Building2, UserCheck, Edit, X, Save, Plus, CheckCircle, XCircle, Eye, Mail, Phone, MessageSquare, Search, Filter, Sparkles } from 'lucide-react'
import { getJob, getJobHistory, updateJob, JobResponse, JobHistoryItem, JobUpdate, getClientShortlists, validateCandidate, type ShortlistItem, type ShortlistValidation, createClientInterviewRequest, type AvailabilitySlot } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'

export default function ClientJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<JobResponse | null>(null)
  const [history, setHistory] = useState<JobHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'shortlist'>('details')
  const { success, error: showError } = useToastContext()

  // États pour la shortlist
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([])
  const [isLoadingShortlist, setIsLoadingShortlist] = useState(false)
  const [validationModal, setValidationModal] = useState<{ open: boolean; item: ShortlistItem | null }>({ open: false, item: null })
  const [validationFeedback, setValidationFeedback] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [interviewRequestModal, setInterviewRequestModal] = useState<{ open: boolean; item: ShortlistItem | null }>({ open: false, item: null })
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [requestNotes, setRequestNotes] = useState('')
  const [isCreatingRequest, setIsCreatingRequest] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all')

  // États pour l'édition
  const [formData, setFormData] = useState<JobUpdate>({})
  const [newCompetenceTechObligatoire, setNewCompetenceTechObligatoire] = useState('')
  const [newCompetenceTechSouhaitee, setNewCompetenceTechSouhaitee] = useState('')
  const [newCompetenceComportementale, setNewCompetenceComportementale] = useState('')
  const [newAvantage, setNewAvantage] = useState('')

  useEffect(() => {
    // Vérifier l'authentification
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    if (jobId) {
      loadData()
    }
  }, [jobId, router])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const jobData = await getJob(jobId)
      setJob(jobData)

      const historyData = await getJobHistory(jobId)
      setHistory(historyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const loadShortlist = async () => {
    try {
      setIsLoadingShortlist(true)
      const allShortlists = await getClientShortlists()
      // Filtrer par job_id
      const jobShortlists = allShortlists.filter(item => item.job_id === jobId)
      setShortlists(jobShortlists)
    } catch (error) {
      console.error('Erreur lors du chargement de la shortlist:', error)
      showError('Erreur lors du chargement de la shortlist')
    } finally {
      setIsLoadingShortlist(false)
    }
  }

  // Charger la shortlist quand on passe à l'onglet shortlist
  useEffect(() => {
    if (activeTab === 'shortlist' && jobId) {
      loadShortlist()
    }
  }, [activeTab, jobId])

  // Initialiser le formulaire quand le besoin est chargé
  useEffect(() => {
    if (job && !isEditing) {
      setFormData({
        title: job.title || '',
        department: job.department || '',
        manager_demandeur: job.manager_demandeur || '',
        entreprise: job.entreprise || '',
        contract_type: job.contract_type || '',
        motif_recrutement: job.motif_recrutement || '',
        urgency: job.urgency || undefined,
        date_prise_poste: job.date_prise_poste || undefined,
        missions_principales: job.missions_principales || '',
        missions_secondaires: job.missions_secondaires || '',
        kpi_poste: job.kpi_poste || '',
        niveau_formation: job.niveau_formation || '',
        experience_requise: job.experience_requise || undefined,
        competences_techniques_obligatoires: job.competences_techniques_obligatoires || [],
        competences_techniques_souhaitees: job.competences_techniques_souhaitees || [],
        competences_comportementales: job.competences_comportementales || [],
        langues_requises: job.langues_requises || '',
        certifications_requises: job.certifications_requises || '',
        localisation: job.localisation || '',
        mobilite_deplacements: job.mobilite_deplacements || '',
        teletravail: job.teletravail || '',
        contraintes_horaires: job.contraintes_horaires || '',
        criteres_eliminatoires: job.criteres_eliminatoires || '',
        salaire_minimum: job.salaire_minimum || undefined,
        salaire_maximum: job.salaire_maximum || undefined,
        avantages: job.avantages || [],
        evolution_poste: job.evolution_poste || '',
        budget: job.budget || undefined,
      })
    }
  }, [job, isEditing])

  const handleSave = async () => {
    if (!job) return

    try {
      setIsSaving(true)
      const updatedJob = await updateJob(jobId, formData)
      setJob(updatedJob)
      setIsEditing(false)
      success('Besoin mis à jour avec succès')
      await loadData()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Réinitialiser le formulaire avec les données originales
    if (job) {
      setFormData({
        title: job.title || '',
        department: job.department || '',
        manager_demandeur: job.manager_demandeur || '',
        entreprise: job.entreprise || '',
        contract_type: job.contract_type || '',
        motif_recrutement: job.motif_recrutement || '',
        urgency: job.urgency || undefined,
        date_prise_poste: job.date_prise_poste || undefined,
        missions_principales: job.missions_principales || '',
        missions_secondaires: job.missions_secondaires || '',
        kpi_poste: job.kpi_poste || '',
        niveau_formation: job.niveau_formation || '',
        experience_requise: job.experience_requise || undefined,
        competences_techniques_obligatoires: job.competences_techniques_obligatoires || [],
        competences_techniques_souhaitees: job.competences_techniques_souhaitees || [],
        competences_comportementales: job.competences_comportementales || [],
        langues_requises: job.langues_requises || '',
        certifications_requises: job.certifications_requises || '',
        localisation: job.localisation || '',
        mobilite_deplacements: job.mobilite_deplacements || '',
        teletravail: job.teletravail || '',
        contraintes_horaires: job.contraintes_horaires || '',
        criteres_eliminatoires: job.criteres_eliminatoires || '',
        salaire_minimum: job.salaire_minimum || undefined,
        salaire_maximum: job.salaire_maximum || undefined,
        avantages: job.avantages || [],
        evolution_poste: job.evolution_poste || '',
        budget: job.budget || undefined,
      })
    }
  }

  const addCompetenceTechObligatoire = () => {
    if (newCompetenceTechObligatoire.trim()) {
      setFormData({
        ...formData,
        competences_techniques_obligatoires: [
          ...(formData.competences_techniques_obligatoires || []),
          newCompetenceTechObligatoire.trim()
        ]
      })
      setNewCompetenceTechObligatoire('')
    }
  }

  const removeCompetenceTechObligatoire = (index: number) => {
    const updated = [...(formData.competences_techniques_obligatoires || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, competences_techniques_obligatoires: updated })
  }

  const addCompetenceTechSouhaitee = () => {
    if (newCompetenceTechSouhaitee.trim()) {
      setFormData({
        ...formData,
        competences_techniques_souhaitees: [
          ...(formData.competences_techniques_souhaitees || []),
          newCompetenceTechSouhaitee.trim()
        ]
      })
      setNewCompetenceTechSouhaitee('')
    }
  }

  const removeCompetenceTechSouhaitee = (index: number) => {
    const updated = [...(formData.competences_techniques_souhaitees || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, competences_techniques_souhaitees: updated })
  }

  const addCompetenceComportementale = () => {
    if (newCompetenceComportementale.trim()) {
      setFormData({
        ...formData,
        competences_comportementales: [
          ...(formData.competences_comportementales || []),
          newCompetenceComportementale.trim()
        ]
      })
      setNewCompetenceComportementale('')
    }
  }

  const removeCompetenceComportementale = (index: number) => {
    const updated = [...(formData.competences_comportementales || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, competences_comportementales: updated })
  }

  const addAvantage = () => {
    if (newAvantage.trim()) {
      setFormData({
        ...formData,
        avantages: [
          ...(formData.avantages || []),
          newAvantage.trim()
        ]
      })
      setNewAvantage('')
    }
  }

  const removeAvantage = (index: number) => {
    const updated = [...(formData.avantages || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, avantages: updated })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      'brouillon': { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      'en_attente': { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
      'en_attente_validation': { label: 'En attente validation', className: 'bg-yellow-100 text-yellow-800' },
      'validé': { label: 'Validé', className: 'bg-green-100 text-green-800' },
      'en_cours': { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
      'clôturé': { label: 'Clôturé', className: 'bg-gray-100 text-gray-800' },
    }
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null
    const badges: Record<string, { label: string; className: string }> = {
      'faible': { label: 'Faible', className: 'bg-gray-100 text-gray-800' },
      'moyenne': { label: 'Moyenne', className: 'bg-blue-100 text-blue-800' },
      'normale': { label: 'Normale', className: 'bg-blue-100 text-blue-800' },
      'haute': { label: 'Haute', className: 'bg-orange-100 text-orange-800' },
      'critique': { label: 'Critique', className: 'bg-red-100 text-red-800' },
    }
    const badge = badges[urgency] || { label: urgency, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  // Fonctions pour la shortlist
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
      await loadShortlist()
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
      showError(error instanceof Error ? error.message : 'Erreur lors de la validation')
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
      await loadShortlist()
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

  // Filtrer les candidats de la shortlist
  const filteredShortlists = useMemo(() => {
    let filtered = shortlists

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.candidate_name.toLowerCase().includes(query) ||
        item.candidate_email?.toLowerCase().includes(query) ||
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

    return filtered
  }, [shortlists, searchQuery, filterStatus])

  // Statistiques pour la shortlist
  const shortlistStats = useMemo(() => {
    const total = shortlists.length
    const pending = shortlists.filter(s => s.client_validated === null).length
    const validated = shortlists.filter(s => s.client_validated === true).length
    const rejected = shortlists.filter(s => s.client_validated === false).length
    return { total, pending, validated, rejected }
  }, [shortlists])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Besoin non trouvé'}</p>
          <Link href="/client" className="text-emerald-600 hover:text-emerald-700">
            Retour au dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <Link
          href="/client"
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-3xl font-bold"
                />
              ) : (
                job.title
              )}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              {getStatusBadge(job.status)}
              {getUrgencyBadge(job.urgency)}
            </div>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Système d'onglets */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-6 py-5 text-sm font-semibold transition-all relative ${
                activeTab === 'details'
                  ? 'text-emerald-600 bg-white'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Briefcase className={`w-5 h-5 ${activeTab === 'details' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>Détails</span>
              </div>
              {activeTab === 'details' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('shortlist')}
              className={`flex-1 px-6 py-5 text-sm font-semibold transition-all relative ${
                activeTab === 'shortlist'
                  ? 'text-emerald-600 bg-white'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className={`w-5 h-5 ${activeTab === 'shortlist' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>Shortlist</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === 'shortlist' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {shortlistStats.total}
                </span>
              </div>
              {activeTab === 'shortlist' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
              )}
            </button>
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6 lg:p-8">
          {/* Onglet Détails */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne principale */}
              <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-emerald-600" />
              Informations générales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{job.department || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.entreprise || ''}
                    onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{job.entreprise || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
                {isEditing ? (
                  <select
                    value={formData.contract_type || ''}
                    onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Intérim">Intérim</option>
                    <option value="Stage">Stage</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{job.contract_type || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif de recrutement</label>
                {isEditing ? (
                  <select
                    value={formData.motif_recrutement || ''}
                    onChange={(e) => setFormData({ ...formData, motif_recrutement: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Création de poste">Création de poste</option>
                    <option value="Remplacement">Remplacement</option>
                    <option value="Renfort temporaire">Renfort temporaire</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{job.motif_recrutement || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgence</label>
                {isEditing ? (
                  <select
                    value={formData.urgency || ''}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{getUrgencyBadge(job.urgency)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de prise de poste souhaitée</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.date_prise_poste || ''}
                    onChange={(e) => setFormData({ ...formData, date_prise_poste: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">
                    {job.date_prise_poste ? new Date(job.date_prise_poste).toLocaleDateString('fr-FR') : 'Non spécifié'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Missions et responsabilités */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-emerald-600" />
              Missions et responsabilités
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Missions principales</label>
                {isEditing ? (
                  <textarea
                    value={formData.missions_principales || ''}
                    onChange={(e) => setFormData({ ...formData, missions_principales: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{job.missions_principales || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Missions secondaires</label>
                {isEditing ? (
                  <textarea
                    value={formData.missions_secondaires || ''}
                    onChange={(e) => setFormData({ ...formData, missions_secondaires: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{job.missions_secondaires || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI du poste</label>
                {isEditing ? (
                  <textarea
                    value={formData.kpi_poste || ''}
                    onChange={(e) => setFormData({ ...formData, kpi_poste: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{job.kpi_poste || 'Non spécifié'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Profil recherché */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-emerald-600" />
              Profil recherché
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau de formation</label>
                {isEditing ? (
                  <select
                    value={formData.niveau_formation || ''}
                    onChange={(e) => setFormData({ ...formData, niveau_formation: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Bac">Bac</option>
                    <option value="Bac+2">Bac+2</option>
                    <option value="Bac+3">Bac+3</option>
                    <option value="Bac+4">Bac+4</option>
                    <option value="Bac+5">Bac+5</option>
                    <option value="Autre">Autre</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{job.niveau_formation || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expérience requise (années)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.experience_requise || ''}
                    onChange={(e) => setFormData({ ...formData, experience_requise: parseInt(e.target.value) || undefined })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    min="0"
                  />
                ) : (
                  <p className="text-gray-900">{job.experience_requise !== null ? `${job.experience_requise} ans` : 'Non spécifié'}</p>
                )}
              </div>
              
              {/* Compétences techniques obligatoires */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compétences techniques obligatoires</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCompetenceTechObligatoire}
                        onChange={(e) => setNewCompetenceTechObligatoire(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCompetenceTechObligatoire()}
                        placeholder="Ajouter une compétence"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <button
                        onClick={addCompetenceTechObligatoire}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(formData.competences_techniques_obligatoires || []).map((comp, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                          {comp}
                          <button
                            onClick={() => removeCompetenceTechObligatoire(index)}
                            className="ml-2 text-emerald-600 hover:text-emerald-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(job.competences_techniques_obligatoires || []).length > 0 ? (
                      job.competences_techniques_obligatoires!.map((comp, index) => (
                        <span key={index} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                          {comp}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Aucune compétence spécifiée</p>
                    )}
                  </div>
                )}
              </div>

              {/* Compétences techniques souhaitées */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compétences techniques souhaitées</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCompetenceTechSouhaitee}
                        onChange={(e) => setNewCompetenceTechSouhaitee(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCompetenceTechSouhaitee()}
                        placeholder="Ajouter une compétence"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <button
                        onClick={addCompetenceTechSouhaitee}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(formData.competences_techniques_souhaitees || []).map((comp, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {comp}
                          <button
                            onClick={() => removeCompetenceTechSouhaitee(index)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(job.competences_techniques_souhaitees || []).length > 0 ? (
                      job.competences_techniques_souhaitees!.map((comp, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {comp}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Aucune compétence spécifiée</p>
                    )}
                  </div>
                )}
              </div>

              {/* Compétences comportementales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compétences comportementales</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCompetenceComportementale}
                        onChange={(e) => setNewCompetenceComportementale(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCompetenceComportementale()}
                        placeholder="Ajouter une compétence"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <button
                        onClick={addCompetenceComportementale}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(formData.competences_comportementales || []).map((comp, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {comp}
                          <button
                            onClick={() => removeCompetenceComportementale(index)}
                            className="ml-2 text-purple-600 hover:text-purple-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(job.competences_comportementales || []).length > 0 ? (
                      job.competences_comportementales!.map((comp, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {comp}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Aucune compétence spécifiée</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Langues requises</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.langues_requises || ''}
                    onChange={(e) => setFormData({ ...formData, langues_requises: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: Français (natif), Anglais (C1)"
                  />
                ) : (
                  <p className="text-gray-900">{job.langues_requises || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certifications requises</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.certifications_requises || ''}
                    onChange={(e) => setFormData({ ...formData, certifications_requises: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{job.certifications_requises || 'Non spécifié'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contraintes et critères */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
              Contraintes et critères
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.localisation || ''}
                    onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{job.localisation || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobilité / Déplacements</label>
                {isEditing ? (
                  <select
                    value={formData.mobilite_deplacements || ''}
                    onChange={(e) => setFormData({ ...formData, mobilite_deplacements: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Aucun">Aucun</option>
                    <option value="Occasionnels">Occasionnels</option>
                    <option value="Fréquents">Fréquents</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{job.mobilite_deplacements || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Télétravail</label>
                {isEditing ? (
                  <select
                    value={formData.teletravail || ''}
                    onChange={(e) => setFormData({ ...formData, teletravail: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Aucun">Aucun</option>
                    <option value="Partiel">Partiel</option>
                    <option value="Total">Total</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{job.teletravail || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraintes horaires</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.contraintes_horaires || ''}
                    onChange={(e) => setFormData({ ...formData, contraintes_horaires: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{job.contraintes_horaires || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Critères éliminatoires</label>
                {isEditing ? (
                  <textarea
                    value={formData.criteres_eliminatoires || ''}
                    onChange={(e) => setFormData({ ...formData, criteres_eliminatoires: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{job.criteres_eliminatoires || 'Non spécifié'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Rémunération et conditions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
              Rémunération et conditions
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salaire minimum (F CFA)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.salaire_minimum || ''}
                      onChange={(e) => setFormData({ ...formData, salaire_minimum: parseFloat(e.target.value) || undefined })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      min="0"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {job.salaire_minimum ? `${job.salaire_minimum.toLocaleString('fr-FR')} F CFA` : 'Non spécifié'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salaire maximum (F CFA)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.salaire_maximum || ''}
                      onChange={(e) => setFormData({ ...formData, salaire_maximum: parseFloat(e.target.value) || undefined })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      min="0"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {job.salaire_maximum ? `${job.salaire_maximum.toLocaleString('fr-FR')} F CFA` : 'Non spécifié'}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avantages</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAvantage}
                        onChange={(e) => setNewAvantage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addAvantage()}
                        placeholder="Ajouter un avantage"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <button
                        onClick={addAvantage}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(formData.avantages || []).map((av, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {av}
                          <button
                            onClick={() => removeAvantage(index)}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(job.avantages || []).length > 0 ? (
                      job.avantages!.map((av, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {av}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Aucun avantage spécifié</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Évolution possible du poste</label>
                {isEditing ? (
                  <textarea
                    value={formData.evolution_poste || ''}
                    onChange={(e) => setFormData({ ...formData, evolution_poste: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{job.evolution_poste || 'Non spécifié'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (F CFA)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.budget || ''}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || undefined })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    min="0"
                  />
                ) : (
                  <p className="text-gray-900">
                    {job.budget ? `${job.budget.toLocaleString('fr-FR')} F CFA` : 'Non spécifié'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

              {/* Colonne latérale */}
              <div className="space-y-6">
                {/* Informations rapides */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Créé le {new Date(job.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {job.validated_at && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Validé le {new Date(job.validated_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Historique */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-emerald-600" />
                    Historique récent
                  </h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {history.length > 0 ? (
                      history.slice(0, 5).map((item, index) => (
                        <div key={index} className="text-sm border-l-2 border-emerald-200 pl-3 py-2">
                          <p className="font-medium text-gray-900">{item.field_name}</p>
                          <p className="text-gray-600 text-xs mt-1">
                            {new Date(item.created_at).toLocaleDateString('fr-FR')} à {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Aucun historique</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Shortlist */}
          {activeTab === 'shortlist' && (
            <div className="space-y-6">
              {/* Statistiques */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{shortlistStats.total}</p>
                    </div>
                    <User className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">En attente</p>
                      <p className="text-2xl font-bold text-orange-600">{shortlistStats.pending}</p>
                    </div>
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Validés</p>
                      <p className="text-2xl font-bold text-green-600">{shortlistStats.validated}</p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Refusés</p>
                      <p className="text-2xl font-bold text-red-600">{shortlistStats.rejected}</p>
                    </div>
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Barre de recherche et filtres */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Recherche */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Rechercher un candidat..."
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
                </div>
              </div>

              {/* Liste des candidats */}
              {isLoadingShortlist ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                  <p className="text-gray-600">Chargement de la shortlist...</p>
                </div>
              ) : filteredShortlists.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {filteredShortlists.map((candidate) => (
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
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.candidate_cv_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            CV
                          </a>
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
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-semibold mb-2">
                    {searchQuery || filterStatus !== 'all'
                      ? 'Aucun candidat ne correspond à vos critères'
                      : 'Aucun candidat en shortlist pour ce poste'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {searchQuery || filterStatus !== 'all'
                      ? 'Essayez de modifier vos filtres de recherche'
                      : 'Les recruteurs vous enverront des candidats pour ce besoin'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals de la shortlist */}
      {/* Modal de demande d'entretien client */}
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

      {/* Modal de validation */}
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
    </div>
  )
}

