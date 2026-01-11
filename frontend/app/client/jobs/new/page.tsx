'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createJob, JobCreate, parseJobDescription } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { ArrowLeft, Upload, FileText } from 'lucide-react'

export default function ClientNewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error: showError } = useToastContext()
  const [isLoading, setIsLoading] = useState(false)
  const [isParsingJobDescription, setIsParsingJobDescription] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadMode, setUploadMode] = useState<'manual' | 'upload'>('manual')
  const [formData, setFormData] = useState<JobCreate>({
    title: '',
    department: '',
    manager_demandeur: '',
    entreprise: '',
    contract_type: '',
    motif_recrutement: '',
    urgency: 'moyenne',
    date_prise_poste: '',
    missions_principales: '',
    missions_secondaires: '',
    kpi_poste: '',
    niveau_formation: '',
    experience_requise: undefined,
    competences_techniques_obligatoires: [],
    competences_techniques_souhaitees: [],
    competences_comportementales: [],
    langues_requises: '',
    certifications_requises: '',
    localisation: '',
    mobilite_deplacements: '',
    teletravail: '',
    contraintes_horaires: '',
    criteres_eliminatoires: '',
    salaire_minimum: undefined,
    salaire_maximum: undefined,
    avantages: [],
    evolution_poste: '',
  })

  const [newCompetenceTechObligatoire, setNewCompetenceTechObligatoire] = useState('')
  const [newCompetenceTechSouhaitee, setNewCompetenceTechSouhaitee] = useState('')
  const [newCompetenceComportementale, setNewCompetenceComportementale] = useState('')
  const [newAvantage, setNewAvantage] = useState('')

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }
    
    // Vérifier le mode d'upload depuis l'URL
    const mode = searchParams.get('mode')
    if (mode === 'upload') {
      setUploadMode('upload')
    }
  }, [router, searchParams])

  const handleJobDescriptionParse = async (file: File) => {
    // Vérifier le type de fichier
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    if (!['pdf', 'doc', 'docx'].includes(fileExtension || '')) {
      showError('Format de fichier non supporté. Veuillez utiliser un fichier PDF ou Word (.doc, .docx)')
      return
    }

    setIsParsingJobDescription(true)
    try {
      const parsedData = await parseJobDescription(file)
      
      // Pré-remplir le formulaire avec les données parsées
      setFormData({
        title: parsedData.title || '',
        department: parsedData.department || '',
        manager_demandeur: parsedData.manager_demandeur || '',
        entreprise: parsedData.entreprise || '',
        contract_type: parsedData.contract_type || '',
        motif_recrutement: parsedData.motif_recrutement || '',
        urgency: parsedData.urgency || 'moyenne',
        date_prise_poste: parsedData.date_prise_poste || '',
        missions_principales: parsedData.missions_principales || '',
        missions_secondaires: parsedData.missions_secondaires || '',
        kpi_poste: parsedData.kpi_poste || '',
        niveau_formation: parsedData.niveau_formation || '',
        experience_requise: parsedData.experience_requise,
        competences_techniques_obligatoires: parsedData.competences_techniques_obligatoires || [],
        competences_techniques_souhaitees: parsedData.competences_techniques_souhaitees || [],
        competences_comportementales: parsedData.competences_comportementales || [],
        langues_requises: parsedData.langues_requises || '',
        certifications_requises: parsedData.certifications_requises || '',
        localisation: parsedData.localisation || '',
        mobilite_deplacements: parsedData.mobilite_deplacements || '',
        teletravail: parsedData.teletravail || '',
        contraintes_horaires: parsedData.contraintes_horaires || '',
        criteres_eliminatoires: parsedData.criteres_eliminatoires || '',
        salaire_minimum: parsedData.salaire_minimum,
        salaire_maximum: parsedData.salaire_maximum,
        avantages: parsedData.avantages || [],
        evolution_poste: parsedData.evolution_poste || '',
      })
      
      success('Texte extrait avec succès ! Le contenu du fichier a été placé dans "Missions principales". Vérifiez et complétez les informations ci-dessous.')
      
      // Passer en mode manuel après le parsing pour permettre l'édition
      setUploadMode('manual')
      
      // Faire défiler vers le formulaire
      setTimeout(() => {
        const formElement = document.querySelector('form')
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'analyse de la fiche de poste'
      showError(errorMessage)
    } finally {
      setIsParsingJobDescription(false)
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
      handleJobDescriptionParse(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleJobDescriptionParse(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      const dataToSend: JobCreate = {
        ...formData,
        department: formData.department || undefined,
        manager_demandeur: formData.manager_demandeur || undefined,
        entreprise: formData.entreprise || undefined,
        contract_type: formData.contract_type || undefined,
        motif_recrutement: formData.motif_recrutement || undefined,
        date_prise_poste: formData.date_prise_poste || undefined,
        missions_principales: formData.missions_principales || undefined,
        missions_secondaires: formData.missions_secondaires || undefined,
        kpi_poste: formData.kpi_poste || undefined,
        niveau_formation: formData.niveau_formation || undefined,
        langues_requises: formData.langues_requises || undefined,
        certifications_requises: formData.certifications_requises || undefined,
        localisation: formData.localisation || undefined,
        mobilite_deplacements: formData.mobilite_deplacements || undefined,
        teletravail: formData.teletravail || undefined,
        contraintes_horaires: formData.contraintes_horaires || undefined,
        criteres_eliminatoires: formData.criteres_eliminatoires || undefined,
        evolution_poste: formData.evolution_poste || undefined,
        competences_techniques_obligatoires: formData.competences_techniques_obligatoires?.length ? formData.competences_techniques_obligatoires : undefined,
        competences_techniques_souhaitees: formData.competences_techniques_souhaitees?.length ? formData.competences_techniques_souhaitees : undefined,
        competences_comportementales: formData.competences_comportementales?.length ? formData.competences_comportementales : undefined,
        avantages: formData.avantages?.length ? formData.avantages : undefined,
      }
      await createJob(dataToSend)
      success('Besoin créé avec succès. Il sera soumis à validation par le manager.')
      router.push('/client')
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      showError('Erreur lors de la création du besoin')
    } finally {
      setIsLoading(false)
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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href="/client"
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {uploadMode === 'upload' ? 'Créer un besoin via fiche de poste' : 'Créer un nouveau besoin'}
        </h1>
        <p className="text-gray-600 mt-2">
          {uploadMode === 'upload' 
            ? 'Importez une fiche de poste pour extraire automatiquement le texte (PDF ou Word). Le texte sera placé dans "Missions principales" et vous pourrez compléter les autres champs.'
            : 'Remplissez le formulaire pour créer un nouveau besoin de recrutement. Le besoin sera soumis à validation par le manager.'}
        </p>
      </div>

      {/* Zone Drag & Drop pour l'import de fiche de poste - Affichée uniquement en mode upload */}
      {uploadMode === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-8 ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-300 hover:border-emerald-400'
          } ${isParsingJobDescription ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {isParsingJobDescription ? (
            <div>
              <div className="text-lg font-medium text-gray-700 mb-2">Extraction du texte en cours...</div>
              <div className="text-sm text-gray-500">Veuillez patienter</div>
            </div>
          ) : (
            <>
              <div className="text-lg font-medium text-gray-700 mb-2">
                Glissez-déposez votre fiche de poste ici
              </div>
              <div className="text-sm text-gray-500 mb-4">
                ou cliquez pour sélectionner un fichier (PDF ou Word). Le texte sera extrait automatiquement.
              </div>
              <label className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors">
                <Upload className="w-5 h-5" />
                Sélectionner un fichier
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isParsingJobDescription}
                />
              </label>
              <div className="mt-4 text-xs text-gray-400">
                Formats acceptés: PDF, DOC, DOCX
              </div>
              <button
                type="button"
                onClick={() => setUploadMode('manual')}
                className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 underline"
              >
                Ou créer manuellement
              </button>
            </>
          )}
        </div>
      )}

      {/* Bouton pour basculer en mode upload si on est en mode manuel */}
      {uploadMode === 'manual' && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setUploadMode('upload')}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 underline"
          >
            <FileText className="w-4 h-4" />
            Créer via une fiche de poste (extraction de texte)
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* INFORMATIONS GÉNÉRALES */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">INFORMATIONS GÉNÉRALES</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intitulé du poste *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: Développeur Full Stack"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Département / Direction *
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: IT"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager demandeur *
                </label>
                <input
                  type="text"
                  required
                  value={formData.manager_demandeur}
                  onChange={(e) => setFormData({ ...formData, manager_demandeur: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: Jean Dupont"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <input
                type="text"
                value={formData.entreprise}
                onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de recrutement *
                </label>
                <select
                  required
                  value={formData.contract_type}
                  onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Intérim">Intérim</option>
                  <option value="Stage">Stage</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif du recrutement *
                </label>
                <select
                  required
                  value={formData.motif_recrutement}
                  onChange={(e) => setFormData({ ...formData, motif_recrutement: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="Création de poste">Création de poste</option>
                  <option value="Remplacement">Remplacement</option>
                  <option value="Renfort temporaire">Renfort temporaire</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priorité du besoin *
                </label>
                <select
                  required
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="faible">Faible</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="normale">Normale</option>
                  <option value="élevée">Élevée</option>
                  <option value="critique">Critique</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date souhaitée de prise de poste *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date_prise_poste}
                  onChange={(e) => setFormData({ ...formData, date_prise_poste: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* MISSIONS ET RESPONSABILITÉS */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">MISSIONS ET RESPONSABILITÉS</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Missions principales *
              </label>
              <textarea
                required
                value={formData.missions_principales}
                onChange={(e) => setFormData({ ...formData, missions_principales: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Décrivez les missions principales du poste"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Missions secondaires
              </label>
              <textarea
                value={formData.missions_secondaires}
                onChange={(e) => setFormData({ ...formData, missions_secondaires: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Missions secondaires optionnelles"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indicateurs de performance attendus (KPI du poste)
              </label>
              <textarea
                value={formData.kpi_poste}
                onChange={(e) => setFormData({ ...formData, kpi_poste: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="KPI attendus pour ce poste"
              />
            </div>
          </div>
        </div>

        {/* PROFIL RECHERCHÉ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">PROFIL RECHERCHÉ</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Niveau de formation requis *
                </label>
                <select
                  required
                  value={formData.niveau_formation}
                  onChange={(e) => setFormData({ ...formData, niveau_formation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="Bac">Bac</option>
                  <option value="Bac+2">Bac+2</option>
                  <option value="Bac+3">Bac+3</option>
                  <option value="Bac+4">Bac+4</option>
                  <option value="Bac+5">Bac+5</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expérience requise (en années) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.experience_requise || ''}
                  onChange={(e) => setFormData({ ...formData, experience_requise: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: 5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compétences techniques obligatoires *
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCompetenceTechObligatoire}
                  onChange={(e) => setNewCompetenceTechObligatoire(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem(
                        formData.competences_techniques_obligatoires || [],
                        (items) => setFormData({ ...formData, competences_techniques_obligatoires: items }),
                        newCompetenceTechObligatoire,
                        setNewCompetenceTechObligatoire
                      )
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ajouter une compétence"
                />
                <button
                  type="button"
                  onClick={() => addItem(
                    formData.competences_techniques_obligatoires || [],
                    (items) => setFormData({ ...formData, competences_techniques_obligatoires: items }),
                    newCompetenceTechObligatoire,
                    setNewCompetenceTechObligatoire
                  )}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.competences_techniques_obligatoires?.map((comp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm"
                  >
                    {comp}
                    <button
                      type="button"
                      onClick={() => removeItem(
                        formData.competences_techniques_obligatoires || [],
                        (items) => setFormData({ ...formData, competences_techniques_obligatoires: items }),
                        idx
                      )}
                      className="text-emerald-600 hover:text-emerald-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compétences techniques souhaitées
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCompetenceTechSouhaitee}
                  onChange={(e) => setNewCompetenceTechSouhaitee(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem(
                        formData.competences_techniques_souhaitees || [],
                        (items) => setFormData({ ...formData, competences_techniques_souhaitees: items }),
                        newCompetenceTechSouhaitee,
                        setNewCompetenceTechSouhaitee
                      )
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ajouter une compétence"
                />
                <button
                  type="button"
                  onClick={() => addItem(
                    formData.competences_techniques_souhaitees || [],
                    (items) => setFormData({ ...formData, competences_techniques_souhaitees: items }),
                    newCompetenceTechSouhaitee,
                    setNewCompetenceTechSouhaitee
                  )}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.competences_techniques_souhaitees?.map((comp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {comp}
                    <button
                      type="button"
                      onClick={() => removeItem(
                        formData.competences_techniques_souhaitees || [],
                        (items) => setFormData({ ...formData, competences_techniques_souhaitees: items }),
                        idx
                      )}
                      className="text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compétences comportementales (soft skills) *
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCompetenceComportementale}
                  onChange={(e) => setNewCompetenceComportementale(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem(
                        formData.competences_comportementales || [],
                        (items) => setFormData({ ...formData, competences_comportementales: items }),
                        newCompetenceComportementale,
                        setNewCompetenceComportementale
                      )
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ajouter une compétence"
                />
                <button
                  type="button"
                  onClick={() => addItem(
                    formData.competences_comportementales || [],
                    (items) => setFormData({ ...formData, competences_comportementales: items }),
                    newCompetenceComportementale,
                    setNewCompetenceComportementale
                  )}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.competences_comportementales?.map((comp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {comp}
                    <button
                      type="button"
                      onClick={() => removeItem(
                        formData.competences_comportementales || [],
                        (items) => setFormData({ ...formData, competences_comportementales: items }),
                        idx
                      )}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Langues requises *
              </label>
              <textarea
                required
                value={formData.langues_requises}
                onChange={(e) => setFormData({ ...formData, langues_requises: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: Français (natif), Anglais (niveau C1), Espagnol (niveau B2)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certifications / habilitations requises
              </label>
              <textarea
                value={formData.certifications_requises}
                onChange={(e) => setFormData({ ...formData, certifications_requises: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Certifications ou habilitations nécessaires"
              />
            </div>
          </div>
        </div>

        {/* CONTRAINTES ET CRITÈRES ÉLIMINATOIRES */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">CONTRAINTES ET CRITÈRES ÉLIMINATOIRES</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Localisation du poste *
              </label>
              <input
                type="text"
                required
                value={formData.localisation}
                onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: Paris, France"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobilité / déplacements
                </label>
                <select
                  value={formData.mobilite_deplacements}
                  onChange={(e) => setFormData({ ...formData, mobilite_deplacements: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="Aucun">Aucun</option>
                  <option value="Occasionnels">Occasionnels</option>
                  <option value="Fréquents">Fréquents</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Télétravail
                </label>
                <select
                  value={formData.teletravail}
                  onChange={(e) => setFormData({ ...formData, teletravail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="Aucun">Aucun</option>
                  <option value="Partiel">Partiel</option>
                  <option value="Total">Total</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraintes horaires
              </label>
              <textarea
                value={formData.contraintes_horaires}
                onChange={(e) => setFormData({ ...formData, contraintes_horaires: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: Disponibilité en soirée ou week-end"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Critères éliminatoires *
              </label>
              <textarea
                required
                value={formData.criteres_eliminatoires}
                onChange={(e) => setFormData({ ...formData, criteres_eliminatoires: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Critères qui excluent automatiquement un candidat"
              />
            </div>
          </div>
        </div>

        {/* RÉMUNÉRATION ET CONDITIONS */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">RÉMUNÉRATION ET CONDITIONS</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fourchette salariale minimum * (F CFA)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.salaire_minimum || ''}
                  onChange={(e) => setFormData({ ...formData, salaire_minimum: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: 2000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fourchette salariale maximum * (F CFA)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.salaire_maximum || ''}
                  onChange={(e) => setFormData({ ...formData, salaire_maximum: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: 3500000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Avantages
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  value={newAvantage}
                  onChange={(e) => setNewAvantage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sélectionner un avantage</option>
                  <option value="Prime">Prime</option>
                  <option value="Assurance">Assurance</option>
                  <option value="Véhicule">Véhicule</option>
                  <option value="Logement">Logement</option>
                  <option value="Autres">Autres</option>
                </select>
                <button
                  type="button"
                  onClick={() => addItem(
                    formData.avantages || [],
                    (items) => setFormData({ ...formData, avantages: items }),
                    newAvantage,
                    setNewAvantage
                  )}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.avantages?.map((av, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                  >
                    {av}
                    <button
                      type="button"
                      onClick={() => removeItem(
                        formData.avantages || [],
                        (items) => setFormData({ ...formData, avantages: items }),
                        idx
                      )}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Évolution possible du poste
              </label>
              <textarea
                value={formData.evolution_poste}
                onChange={(e) => setFormData({ ...formData, evolution_poste: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Perspectives d'évolution et de carrière"
              />
            </div>
          </div>
        </div>

        {/* BOUTONS D'ACTION */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/client"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? 'Création...' : 'Créer le besoin'}
          </button>
        </div>
      </form>
    </div>
  )
}

