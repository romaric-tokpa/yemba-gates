'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createCandidate, getCandidates, CandidateResponse, CandidateCreate } from '@/lib/api'


export default function CandidatsPage() {
  const [candidates, setCandidates] = useState<CandidateResponse[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  
  // Formulaire
  const [formData, setFormData] = useState<CandidateCreate>({
    first_name: '',
    last_name: '',
    profile_title: '',
    years_of_experience: undefined,
    email: '',
    phone: '',
    tags: [],
    source: '',
    notes: '',
  })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [tagInput, setTagInput] = useState('')

  const loadCandidates = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getCandidates({
        tag_filter: selectedTag || undefined,
        source_filter: selectedSource || undefined,
        status_filter: selectedStatus || undefined,
      })
      setCandidates(data)
    } catch (error) {
      console.error('Erreur lors du chargement des candidats:', error)
      alert('Erreur lors du chargement des candidats')
    } finally {
      setIsLoading(false)
    }
  }, [selectedTag, selectedSource, selectedStatus])

  useEffect(() => {
    loadCandidates()
  }, [loadCandidates])

  // Récupérer tous les tags uniques
  const allTags = Array.from(
    new Set(candidates.flatMap(c => c.tags || []))
  ).sort()

  // Récupérer toutes les sources uniques
  const allSources = Array.from(
    new Set(candidates.map(c => c.source).filter(Boolean) as string[])
  ).sort()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.first_name || !formData.last_name) {
      alert('Le prénom et le nom sont obligatoires')
      return
    }

    try {
      setIsLoading(true)
      await createCandidate({
        ...formData,
        cv_file: cvFile || undefined,
      })
      
      // Réinitialiser le formulaire
      setFormData({
        first_name: '',
        last_name: '',
        profile_title: '',
        years_of_experience: undefined,
        email: '',
        phone: '',
        tags: [],
        source: '',
        notes: '',
      })
      setCvFile(null)
      setTagInput('')
      setIsModalOpen(false)
      
      // Recharger les candidats
      await loadCandidates()
      
      alert('Candidat créé avec succès!')
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors de la création du candidat')
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      })
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || [],
    })
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Candidats</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-2">Gérez votre pipeline de candidats</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Ajouter un candidat
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par tag
            </label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Toutes les sources</option>
              {allSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par statut
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les statuts</option>
              <option value="sourcé">Sourcé</option>
              <option value="qualifié">Qualifié</option>
              <option value="entretien_rh">Entretien RH</option>
              <option value="entretien_client">Entretien Client</option>
              <option value="shortlist">Shortlist</option>
              <option value="offre">Offre</option>
              <option value="rejeté">Rejeté</option>
              <option value="embauché">Embauché</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des candidats */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">
            Liste des candidats ({candidates.length})
          </h2>
        </div>

        {isLoading && candidates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : candidates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun candidat trouvé</div>
        ) : (
          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom complet
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CV
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/candidats/${candidate.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {candidate.first_name} {candidate.last_name}
                      </Link>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{candidate.email || '-'}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{candidate.phone || '-'}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.tags && candidate.tags.length > 0 ? (
                          candidate.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{candidate.source || '-'}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {candidate.status}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {candidate.cv_file_path ? (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/${candidate.id}/cv`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Télécharger
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/candidats/${candidate.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Voir fiche
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale d'ajout */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Ajouter un candidat</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="LinkedIn, cooptation, job board, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        addTag()
                      }
                    }}
                    placeholder="Ajouter un tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CV (PDF, Word)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {cvFile && (
                  <p className="mt-2 text-sm text-gray-600">Fichier sélectionné: {cvFile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
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
                  {isLoading ? 'Création...' : 'Créer le candidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
