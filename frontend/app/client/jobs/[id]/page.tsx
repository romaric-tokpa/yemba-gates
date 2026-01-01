'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, User, Briefcase, MapPin, DollarSign, Calendar, FileText, Tag, Award, Languages, Building2, UserCheck, Edit, X, Save, Plus } from 'lucide-react'
import { getJob, getJobHistory, updateJob, JobResponse, JobHistoryItem, JobUpdate } from '@/lib/api'
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
  const { success, error: showError } = useToastContext()

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

      {/* Contenu principal */}
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
    </div>
  )
}

