'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, History, Clock, User, Briefcase, MapPin, DollarSign, Calendar, FileText, Tag, Award, Languages, Building2, UserCheck, Edit, X, Save, Plus, Filter, Search, TrendingUp, CheckCircle, Users, ListChecks, Trash2, Mail, ExternalLink } from 'lucide-react'
import { getJob, getJobHistory, updateJob, validateJob, JobResponse, JobHistoryItem, JobUpdate, getJobApplications, getJobShortlist, createApplication, toggleShortlist, deleteApplication, ApplicationResponse, getCandidates, CandidateResponse } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'

export default function ManagerJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = params.id as string
  const activeTab = searchParams.get('tab') || 'details'

  const [job, setJob] = useState<JobResponse | null>(null)
  const [history, setHistory] = useState<JobHistoryItem[]>([])
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [shortlist, setShortlist] = useState<ApplicationResponse[]>([])
  const [allCandidates, setAllCandidates] = useState<CandidateResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('')
  const { success, error: showError } = useToastContext()

  // États pour l'édition
  const [formData, setFormData] = useState<JobUpdate>({})
  const [newCompetenceTechObligatoire, setNewCompetenceTechObligatoire] = useState('')
  const [newCompetenceTechSouhaitee, setNewCompetenceTechSouhaitee] = useState('')
  const [newCompetenceComportementale, setNewCompetenceComportementale] = useState('')
  const [newAvantage, setNewAvantage] = useState('')

  // États pour les filtres de l'historique
  const [historyFilter, setHistoryFilter] = useState<string>('all') // 'all', 'field', 'user'
  const [historySearch, setHistorySearch] = useState('')
  const [selectedField, setSelectedField] = useState<string>('')

  useEffect(() => {
    // Vérifier l'authentification
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const jobData = await getJob(jobId)
        setJob(jobData)

        if (activeTab === 'history') {
          const historyData = await getJobHistory(jobId)
          setHistory(historyData)
        }
        
        if (activeTab === 'positionnement') {
          const applicationsData = await getJobApplications(jobId)
          setApplications(applicationsData)
        }
        
        if (activeTab === 'shortlist') {
          const shortlistData = await getJobShortlist(jobId)
          setShortlist(shortlistData)
          // Charger aussi toutes les applications pour permettre d'ajouter à la shortlist
          const applicationsData = await getJobApplications(jobId)
          setApplications(applicationsData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      } finally {
        setIsLoading(false)
      }
    }

    if (jobId) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, activeTab, router])

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
        status: job.status || undefined,
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
      // Recharger l'historique si on est sur l'onglet historique
      if (activeTab === 'history') {
        const historyData = await getJobHistory(jobId)
        setHistory(historyData)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
      showError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleValidate = async () => {
    if (!job) return

    try {
      setIsSaving(true)
      // Valider le besoin via l'API - cela change le statut à "validé"
      const updatedJob = await validateJob(jobId, { validated: true, feedback: null })
      
      // Mettre à jour l'état local avec le job validé (le statut est maintenant "validé")
      setJob(updatedJob)
      
      // Recharger les données pour s'assurer que tout est synchronisé
      const refreshedJob = await getJob(jobId)
      setJob(refreshedJob)
      
      success('Besoin validé avec succès')
      
      // Recharger l'historique si on est sur l'onglet historique
      if (activeTab === 'history') {
        const historyData = await getJobHistory(jobId)
        setHistory(historyData)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la validation'
      showError(errorMessage)
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
        status: job.status || undefined,
      })
    }
  }

  const addItem = (list: string[], setter: (items: string[]) => void, newItem: string, setNewItem: (item: string) => void) => {
    if (newItem.trim()) {
      setter([...list, newItem.trim()])
      setNewItem('')
    }
  }

  const removeItem = (list: string[], setter: (items: string[]) => void, index: number) => {
    setter(list.filter((_, i) => i !== index))
  }

  const handleAddCandidate = async () => {
    if (!selectedCandidateId || !jobId) return

    try {
      setIsSaving(true)
      await createApplication({
        candidate_id: selectedCandidateId,
        job_id: jobId,
        status: 'sourcé'
      })
      success('Candidat attribué au besoin avec succès')
      setShowAddCandidateModal(false)
      setSelectedCandidateId('')
      // Recharger les applications
      const applicationsData = await getJobApplications(jobId)
      setApplications(applicationsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'attribution du candidat'
      showError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleShortlist = async (applicationId: string, currentValue: boolean) => {
    try {
      setIsSaving(true)
      await toggleShortlist(applicationId, !currentValue)
      success(currentValue ? 'Candidat retiré de la shortlist' : 'Candidat ajouté à la shortlist')
      // Recharger les données
      const applicationsData = await getJobApplications(jobId)
      setApplications(applicationsData)
      const shortlistData = await getJobShortlist(jobId)
      setShortlist(shortlistData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la shortlist'
      showError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteApplication = async (applicationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce candidat de ce besoin ?')) return

    try {
      setIsSaving(true)
      await deleteApplication(applicationId)
      success('Candidat retiré du besoin')
      // Recharger les applications
      const applicationsData = await getJobApplications(jobId)
      setApplications(applicationsData)
      const shortlistData = await getJobShortlist(jobId)
      setShortlist(shortlistData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      showError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'brouillon': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Brouillon' },
      'validé': { bg: 'bg-green-100', text: 'text-green-800', label: 'Validé' },
      'en_cours': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En cours' },
      'clôturé': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Clôturé' },
    }
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    return (
      <span className={`px-3 py-1 text-sm font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null
    const urgencyConfig: Record<string, { bg: string; text: string; label: string }> = {
      'faible': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Faible' },
      'moyenne': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moyenne' },
      'haute': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Haute' },
      'critique': { bg: 'bg-red-100', text: 'text-red-800', label: 'Critique' },
      'normale': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Normale' },
    }
    const config = urgencyConfig[urgency] || { bg: 'bg-gray-100', text: 'text-gray-800', label: urgency }
    return (
      <span className={`px-3 py-1 text-sm font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
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

  if (error || !job) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Besoin non trouvé'}
        </div>
        <Link href="/manager/jobs" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
          ← Retour à la liste
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Besoin non trouvé'}
        </div>
        <Link href="/manager/jobs" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
          ← Retour à la liste
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <Link 
          href="/manager/jobs" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux besoins
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-2xl lg:text-3xl font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 w-full"
                placeholder="Intitulé du poste"
              />
            ) : (
              <>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{job.title}</h1>
                <p className="text-sm lg:text-base text-gray-600 mt-2">
                  Créé le {new Date(job.created_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isEditing && (
              <>
                {getStatusBadge(job.status)}
                {getUrgencyBadge(job.urgency)}
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Modifier le besoin
                </button>
                {job.status !== 'validé' && (
                  <button
                    onClick={handleValidate}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Valider le besoin
                  </button>
                )}
              </>
            )}
            {isEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => router.push(`/manager/jobs/${jobId}`)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Détails
          </button>
          <button
            onClick={() => router.push(`/manager/jobs/${jobId}?tab=history`)}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4 mr-2" />
            Historique ({history.length})
          </button>
          <button
            onClick={() => router.push(`/manager/jobs/${jobId}?tab=positionnement`)}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'positionnement'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Positionnement ({applications.length})
          </button>
          <button
            onClick={() => router.push(`/manager/jobs/${jobId}?tab=shortlist`)}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'shortlist'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ListChecks className="w-4 h-4 mr-2" />
            Shortlist ({shortlist.length})
          </button>
        </nav>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'details' ? (
        <div className="space-y-6">
          {/* INFORMATIONS GÉNÉRALES */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-indigo-600" />
              Informations générales
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Intitulé du poste</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{job.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Département / Direction</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{job.department || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager demandeur</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.manager_demandeur || ''}
                    onChange={(e) => setFormData({ ...formData, manager_demandeur: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{job.manager_demandeur || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.entreprise || ''}
                    onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{job.entreprise || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de contrat</label>
                {isEditing ? (
                  <select
                    value={formData.contract_type || ''}
                    onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Intérim">Intérim</option>
                    <option value="Stage">Stage</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{job.contract_type || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motif du recrutement</label>
                {isEditing ? (
                  <select
                    value={formData.motif_recrutement || ''}
                    onChange={(e) => setFormData({ ...formData, motif_recrutement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Création de poste">Création de poste</option>
                    <option value="Remplacement">Remplacement</option>
                    <option value="Renfort temporaire">Renfort temporaire</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{job.motif_recrutement || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Date souhaitée de prise de poste
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.date_prise_poste ? new Date(formData.date_prise_poste).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, date_prise_poste: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {job.date_prise_poste 
                      ? new Date(job.date_prise_poste).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : '-'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Budget
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.budget || ''}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="0"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{job.budget ? `${job.budget.toLocaleString('fr-FR')} F CFA` : '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                {isEditing ? (
                  <select
                    value={formData.urgency || ''}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                    <option value="normale">Normale</option>
                  </select>
                ) : (
                  getUrgencyBadge(job.urgency)
                )}
              </div>
            </div>
          </div>

          {/* MISSIONS ET RESPONSABILITÉS */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Missions et responsabilités
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Missions principales</label>
                {isEditing ? (
                  <textarea
                    value={formData.missions_principales || ''}
                    onChange={(e) => setFormData({ ...formData, missions_principales: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px]"
                    placeholder="Décrivez les missions principales..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.missions_principales || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Missions secondaires</label>
                {isEditing ? (
                  <textarea
                    value={formData.missions_secondaires || ''}
                    onChange={(e) => setFormData({ ...formData, missions_secondaires: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px]"
                    placeholder="Décrivez les missions secondaires..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.missions_secondaires || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Indicateurs de performance attendus (KPI du poste)</label>
                {isEditing ? (
                  <textarea
                    value={formData.kpi_poste || ''}
                    onChange={(e) => setFormData({ ...formData, kpi_poste: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px]"
                    placeholder="Décrivez les KPI attendus..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.kpi_poste || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* PROFIL RECHERCHÉ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-indigo-600" />
              Profil recherché
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de formation requis</label>
                {isEditing ? (
                  <select
                    value={formData.niveau_formation || ''}
                    onChange={(e) => setFormData({ ...formData, niveau_formation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Bac">Bac</option>
                    <option value="Bac+2">Bac+2</option>
                    <option value="Bac+3">Bac+3</option>
                    <option value="Bac+4">Bac+4</option>
                    <option value="Bac+5">Bac+5</option>
                    <option value="Autre">Autre</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{job.niveau_formation || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expérience requise (en années)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.experience_requise || ''}
                    onChange={(e) => setFormData({ ...formData, experience_requise: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="0"
                    min="0"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {job.experience_requise !== null && job.experience_requise !== undefined
                      ? `${job.experience_requise} ${job.experience_requise > 1 ? 'ans' : 'an'} d'expérience`
                      : '-'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Compétences techniques obligatoires</label>
                {isEditing ? (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.competences_techniques_obligatoires || []).map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full flex items-center gap-2">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeItem(formData.competences_techniques_obligatoires || [], (items) => setFormData({ ...formData, competences_techniques_obligatoires: items }), index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCompetenceTechObligatoire}
                        onChange={(e) => setNewCompetenceTechObligatoire(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addItem(formData.competences_techniques_obligatoires || [], (items) => setFormData({ ...formData, competences_techniques_obligatoires: items }), newCompetenceTechObligatoire, setNewCompetenceTechObligatoire)
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Ajouter une compétence..."
                      />
                      <button
                        type="button"
                        onClick={() => addItem(formData.competences_techniques_obligatoires || [], (items) => setFormData({ ...formData, competences_techniques_obligatoires: items }), newCompetenceTechObligatoire, setNewCompetenceTechObligatoire)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.competences_techniques_obligatoires && job.competences_techniques_obligatoires.length > 0 ? (
                      job.competences_techniques_obligatoires.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Compétences techniques souhaitées</label>
                {isEditing ? (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.competences_techniques_souhaitees || []).map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full flex items-center gap-2">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeItem(formData.competences_techniques_souhaitees || [], (items) => setFormData({ ...formData, competences_techniques_souhaitees: items }), index)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCompetenceTechSouhaitee}
                        onChange={(e) => setNewCompetenceTechSouhaitee(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addItem(formData.competences_techniques_souhaitees || [], (items) => setFormData({ ...formData, competences_techniques_souhaitees: items }), newCompetenceTechSouhaitee, setNewCompetenceTechSouhaitee)
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Ajouter une compétence..."
                      />
                      <button
                        type="button"
                        onClick={() => addItem(formData.competences_techniques_souhaitees || [], (items) => setFormData({ ...formData, competences_techniques_souhaitees: items }), newCompetenceTechSouhaitee, setNewCompetenceTechSouhaitee)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.competences_techniques_souhaitees && job.competences_techniques_souhaitees.length > 0 ? (
                      job.competences_techniques_souhaitees.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Compétences comportementales</label>
                {isEditing ? (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.competences_comportementales || []).map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center gap-2">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeItem(formData.competences_comportementales || [], (items) => setFormData({ ...formData, competences_comportementales: items }), index)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCompetenceComportementale}
                        onChange={(e) => setNewCompetenceComportementale(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addItem(formData.competences_comportementales || [], (items) => setFormData({ ...formData, competences_comportementales: items }), newCompetenceComportementale, setNewCompetenceComportementale)
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Ajouter une compétence..."
                      />
                      <button
                        type="button"
                        onClick={() => addItem(formData.competences_comportementales || [], (items) => setFormData({ ...formData, competences_comportementales: items }), newCompetenceComportementale, setNewCompetenceComportementale)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.competences_comportementales && job.competences_comportementales.length > 0 ? (
                      job.competences_comportementales.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Languages className="w-4 h-4 mr-1" />
                  Langues requises
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.langues_requises || ''}
                    onChange={(e) => setFormData({ ...formData, langues_requises: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    placeholder="Ex: Français (natif), Anglais (niveau C1)..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.langues_requises || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Award className="w-4 h-4 mr-1" />
                  Certifications / habilitations requises
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.certifications_requises || ''}
                    onChange={(e) => setFormData({ ...formData, certifications_requises: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    placeholder="Listez les certifications requises..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.certifications_requises || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* CONTRAINTES ET CRITÈRES */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-indigo-600" />
              Contraintes et critères éliminatoires
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Localisation du poste</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.localisation || ''}
                    onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Ex: Paris, Lyon..."
                  />
                ) : (
                  <p className="text-sm text-gray-900">{job.localisation || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobilité / déplacements</label>
                {isEditing ? (
                  <select
                    value={formData.mobilite_deplacements || ''}
                    onChange={(e) => setFormData({ ...formData, mobilite_deplacements: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Aucun">Aucun</option>
                    <option value="Occasionnels">Occasionnels</option>
                    <option value="Fréquents">Fréquents</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{job.mobilite_deplacements || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Télétravail</label>
                {isEditing ? (
                  <select
                    value={formData.teletravail || ''}
                    onChange={(e) => setFormData({ ...formData, teletravail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Aucun">Aucun</option>
                    <option value="Partiel">Partiel</option>
                    <option value="Total">Total</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{job.teletravail || '-'}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraintes horaires</label>
                {isEditing ? (
                  <textarea
                    value={formData.contraintes_horaires || ''}
                    onChange={(e) => setFormData({ ...formData, contraintes_horaires: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    placeholder="Décrivez les contraintes horaires..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.contraintes_horaires || '-'}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Critères éliminatoires</label>
                {isEditing ? (
                  <textarea
                    value={formData.criteres_eliminatoires || ''}
                    onChange={(e) => setFormData({ ...formData, criteres_eliminatoires: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    placeholder="Listez les critères éliminatoires..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.criteres_eliminatoires || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* RÉMUNÉRATION ET CONDITIONS */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-indigo-600" />
              Rémunération et conditions
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salaire minimum (F CFA)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.salaire_minimum || ''}
                      onChange={(e) => setFormData({ ...formData, salaire_minimum: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                      min="0"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {job.salaire_minimum ? `${job.salaire_minimum.toLocaleString('fr-FR')} F CFA` : '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salaire maximum (F CFA)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.salaire_maximum || ''}
                      onChange={(e) => setFormData({ ...formData, salaire_maximum: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                      min="0"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {job.salaire_maximum ? `${job.salaire_maximum.toLocaleString('fr-FR')} F CFA` : '-'}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avantages</label>
                {isEditing ? (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.avantages || []).map((avantage, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full flex items-center gap-2">
                          {avantage}
                          <button
                            type="button"
                            onClick={() => removeItem(formData.avantages || [], (items) => setFormData({ ...formData, avantages: items }), index)}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAvantage}
                        onChange={(e) => setNewAvantage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addItem(formData.avantages || [], (items) => setFormData({ ...formData, avantages: items }), newAvantage, setNewAvantage)
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Ajouter un avantage..."
                      />
                      <button
                        type="button"
                        onClick={() => addItem(formData.avantages || [], (items) => setFormData({ ...formData, avantages: items }), newAvantage, setNewAvantage)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.avantages && job.avantages.length > 0 ? (
                      job.avantages.map((avantage, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                          {avantage}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Évolution possible du poste</label>
                {isEditing ? (
                  <textarea
                    value={formData.evolution_poste || ''}
                    onChange={(e) => setFormData({ ...formData, evolution_poste: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    placeholder="Décrivez les possibilités d'évolution..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.evolution_poste || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* INFORMATIONS SYSTÈME */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Informations système</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                {isEditing ? (
                  <select
                    value={formData.status || job.status || 'brouillon'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="validé">Validé</option>
                    <option value="en_cours">En cours</option>
                    <option value="clôturé">Clôturé</option>
                  </select>
                ) : (
                  getStatusBadge(job.status)
                )}
              </div>

              {job.validated_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Validé le
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(job.validated_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Dernière mise à jour
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(job.updated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'history' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <History className="w-5 h-5 mr-2" />
                Historique des modifications
              </h2>
              {history.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{history.length} modification{history.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Filtres et recherche */}
            {history.length > 0 && (
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Rechercher dans l'historique..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={historyFilter}
                    onChange={(e) => {
                      setHistoryFilter(e.target.value)
                      setSelectedField('')
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">Tous les champs</option>
                    <option value="field">Par champ</option>
                    <option value="user">Par utilisateur</option>
                  </select>
                </div>
                {historyFilter === 'field' && (
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tous les champs</option>
                    {Array.from(new Set(history.map(h => h.field_name).filter(Boolean))).map((field) => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Chargement de l'historique...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Aucune modification enregistrée</p>
            </div>
          ) : (() => {
            // Filtrer l'historique
            let filteredHistory = history

            // Filtre par recherche
            if (historySearch) {
              const searchLower = historySearch.toLowerCase()
              filteredHistory = filteredHistory.filter(item =>
                item.field_name?.toLowerCase().includes(searchLower) ||
                item.old_value?.toLowerCase().includes(searchLower) ||
                item.new_value?.toLowerCase().includes(searchLower) ||
                item.modified_by_name?.toLowerCase().includes(searchLower)
              )
            }

            // Filtre par champ
            if (historyFilter === 'field' && selectedField) {
              filteredHistory = filteredHistory.filter(item => item.field_name === selectedField)
            }

            // Grouper par date
            const groupedByDate = filteredHistory.reduce((acc, item) => {
              const date = new Date(item.created_at)
              const dateKey = date.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })
              if (!acc[dateKey]) {
                acc[dateKey] = []
              }
              acc[dateKey].push(item)
              return acc
            }, {} as Record<string, typeof history>)

            return (
              <div className="p-6">
                {Object.keys(groupedByDate).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucun résultat trouvé</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedByDate).map(([dateKey, items]) => (
                      <div key={dateKey}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px flex-1 bg-gray-200"></div>
                          <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full">
                            {dateKey}
                          </div>
                          <div className="h-px flex-1 bg-gray-200"></div>
                        </div>
                        <div className="space-y-4 ml-4 border-l-2 border-indigo-200 pl-6">
                          {items.map((item) => (
                            <div key={item.id} className="relative">
                              <div className="absolute -left-[26px] top-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white"></div>
                              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {item.modified_by_name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                  {item.field_name && (
                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                                      {item.field_name}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="space-y-2">
                                  {item.old_value && (
                                    <div className="flex items-start gap-2">
                                      <div className="flex-shrink-0 w-16 text-xs text-gray-500 mt-1">Avant:</div>
                                      <div className="flex-1 text-sm text-gray-700 bg-red-50 border border-red-200 rounded px-3 py-2 line-through">
                                        {item.old_value.length > 200 ? `${item.old_value.substring(0, 200)}...` : item.old_value}
                                      </div>
                                    </div>
                                  )}
                                  {item.new_value && (
                                    <div className="flex items-start gap-2">
                                      <div className="flex-shrink-0 w-16 text-xs text-gray-500 mt-1">Après:</div>
                                      <div className="flex-1 text-sm text-gray-900 bg-green-50 border border-green-200 rounded px-3 py-2">
                                        {item.new_value.length > 200 ? `${item.new_value.substring(0, 200)}...` : item.new_value}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      ) : activeTab === 'positionnement' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" />
                Candidats attribués au besoin
              </h2>
              <button
                onClick={async () => {
                  setShowAddCandidateModal(true)
                  if (allCandidates.length === 0) {
                    try {
                      const candidatesData = await getCandidates({})
                      setAllCandidates(Array.isArray(candidatesData) ? candidatesData : [])
                    } catch (error) {
                      console.error('Erreur lors du chargement des candidats:', error)
                      showError('Erreur lors du chargement des candidats')
                    }
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter un candidat
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Aucun candidat attribué à ce besoin</p>
                <button
                  onClick={async () => {
                    setShowAddCandidateModal(true)
                    if (allCandidates.length === 0) {
                      try {
                        const candidatesData = await getCandidates({})
                        setAllCandidates(Array.isArray(candidatesData) ? candidatesData : [])
                      } catch (error) {
                        console.error('Erreur lors du chargement des candidats:', error)
                        showError('Erreur lors du chargement des candidats')
                      }
                    }
                  }}
                  className="mt-4 text-indigo-600 hover:text-indigo-800 underline"
                >
                  Ajouter un candidat
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applications.map((application) => {
                  const getStatusConfig = (status: string) => {
                    const configs: Record<string, { bg: string; text: string; label: string }> = {
                      'sourcé': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Sourcé' },
                      'qualifié': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Qualifié' },
                      'entretien_rh': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Entretien RH' },
                      'entretien_client': { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Entretien Client' },
                      'shortlist': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Shortlist' },
                      'offre': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Offre' },
                      'rejeté': { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' },
                      'embauché': { bg: 'bg-green-100', text: 'text-green-700', label: 'Embauché' },
                    }
                    return configs[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }
                  }
                  const statusConfig = getStatusConfig(application.status)
                  
                  return (
                    <div key={application.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                      <Link 
                        href={`/manager/candidats/${application.candidate_id}`}
                        className="block"
                      >
                        <div className="p-5">
                          <div className="flex items-start gap-4 mb-4">
                            {application.candidate_photo_url ? (
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${application.candidate_photo_url}`}
                                alt={application.candidate_name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-indigo-300 transition-colors flex-shrink-0"
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
                            <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center border-2 border-gray-200 group-hover:border-indigo-300 transition-colors flex-shrink-0 ${application.candidate_photo_url ? 'hidden photo-fallback' : ''}`}>
                              <span className="text-white font-semibold text-lg">
                                {application.candidate_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors mb-1">
                                {application.candidate_name}
                              </h3>
                              {application.candidate_profile_title && (
                                <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                  {application.candidate_profile_title}
                                </p>
                              )}
                              {application.candidate_years_of_experience !== undefined && application.candidate_years_of_experience !== null && (
                                <p className="text-xs text-gray-500">
                                  {application.candidate_years_of_experience} ans d'expérience
                                </p>
                              )}
                            </div>
                          </div>
                          {application.candidate_email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{application.candidate_email}</span>
                            </div>
                          )}
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="px-5 pb-4 flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleToggleShortlist(application.id, application.is_in_shortlist)
                          }}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                            application.is_in_shortlist
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50 hover:border-purple-300'
                          }`}
                        >
                          {application.is_in_shortlist ? '✓ En shortlist' : '+ Ajouter à la shortlist'}
                        </button>
                        <Link
                          href={`/manager/candidats/${application.candidate_id}`}
                          className="px-3 py-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Voir la fiche"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteApplication(application.id)
                          }}
                          className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Retirer du besoin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'shortlist' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <ListChecks className="w-5 h-5 mr-2 text-indigo-600" />
                Shortlist
              </h2>
            </div>

            {shortlist.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ListChecks className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Aucun candidat en shortlist pour ce besoin</p>
                <p className="text-sm mt-2">Ajoutez des candidats depuis l'onglet "Positionnement"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shortlist.map((application) => (
                  <div key={application.id} className="bg-white border-2 border-purple-300 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                    <Link 
                      href={`/manager/candidats/${application.candidate_id}`}
                      className="block"
                    >
                      <div className="p-5 bg-gradient-to-br from-purple-50 to-white">
                        <div className="flex items-start gap-4 mb-4">
                          {application.candidate_photo_url ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${application.candidate_photo_url}`}
                              alt={application.candidate_name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-purple-300 group-hover:border-purple-400 transition-colors flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  const fallback = parent.querySelector('.photo-fallback-shortlist') as HTMLElement
                                  if (fallback) fallback.style.display = 'flex'
                                }
                              }}
                            />
                          ) : null}
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center border-2 border-purple-300 group-hover:border-purple-400 transition-colors flex-shrink-0 ${application.candidate_photo_url ? 'hidden photo-fallback-shortlist' : ''}`}>
                            <span className="text-white font-semibold text-lg">
                              {application.candidate_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-purple-600 transition-colors">
                                {application.candidate_name}
                              </h3>
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-600 text-white">
                                Shortlist
                              </span>
                            </div>
                            {application.candidate_profile_title && (
                              <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                {application.candidate_profile_title}
                              </p>
                            )}
                            {application.candidate_years_of_experience !== undefined && application.candidate_years_of_experience !== null && (
                              <p className="text-xs text-gray-500">
                                {application.candidate_years_of_experience} ans d'expérience
                              </p>
                            )}
                          </div>
                        </div>
                        {application.candidate_email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{application.candidate_email}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="px-5 pb-4 flex items-center justify-between gap-2 border-t border-purple-200 bg-purple-50">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleShortlist(application.id, true)
                        }}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        Retirer de la shortlist
                      </button>
                      <Link
                        href={`/manager/candidats/${application.candidate_id}`}
                        className="px-3 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Voir la fiche"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal pour ajouter un candidat */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Ajouter un candidat au besoin</h2>
                <button
                  onClick={() => {
                    setShowAddCandidateModal(false)
                    setSelectedCandidateId('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un candidat
                </label>
                <select
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">-- Sélectionner un candidat --</option>
                  {allCandidates
                    .filter(candidate => !applications.some(app => app.candidate_id === candidate.id))
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.first_name} {candidate.last_name}
                        {candidate.profile_title && ` - ${candidate.profile_title}`}
                        {candidate.years_of_experience !== undefined && candidate.years_of_experience !== null && ` (${candidate.years_of_experience} ans)`}
                      </option>
                    ))}
                </select>
                {allCandidates.filter(candidate => !applications.some(app => app.candidate_id === candidate.id)).length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Tous les candidats sont déjà attribués à ce besoin
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowAddCandidateModal(false)
                  setSelectedCandidateId('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddCandidate}
                disabled={!selectedCandidateId || isSaving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Ajout en cours...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

