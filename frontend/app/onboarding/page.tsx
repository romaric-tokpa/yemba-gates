'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  getOnboardingList,
  getOnboardingChecklist,
  updateOnboardingChecklist,
  completeOnboarding,
  OnboardingChecklist,
  OnboardingChecklistUpdate
} from '@/lib/api'

export default function OnboardingPage() {
  const [onboardingList, setOnboardingList] = useState<OnboardingChecklist[]>([])
  const [selectedChecklist, setSelectedChecklist] = useState<OnboardingChecklist | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChecklistModal, setShowChecklistModal] = useState(false)

  const [checklistData, setChecklistData] = useState<Partial<OnboardingChecklistUpdate>>({
    contract_signed: false,
    equipment_ready: false,
    training_scheduled: false,
    access_granted: false,
    welcome_meeting_scheduled: false,
    notes: ''
  })

  useEffect(() => {
    loadOnboardingList()
  }, [])

  const loadOnboardingList = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getOnboardingList()
      setOnboardingList(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChecklist = async (applicationId: string) => {
    try {
      setIsLoading(true)
      const checklist = await getOnboardingChecklist(applicationId)
      setSelectedChecklist(checklist)
      setChecklistData({
        contract_signed: checklist.contract_signed,
        equipment_ready: checklist.equipment_ready,
        training_scheduled: checklist.training_scheduled,
        access_granted: checklist.access_granted,
        welcome_meeting_scheduled: checklist.welcome_meeting_scheduled,
        notes: checklist.notes || ''
      })
      setShowChecklistModal(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateChecklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChecklist) return

    try {
      setIsLoading(true)
      await updateOnboardingChecklist(selectedChecklist.application_id, checklistData as OnboardingChecklistUpdate)
      await loadOnboardingList()
      alert('Checklist mise à jour avec succès!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteOnboarding = async () => {
    if (!selectedChecklist) return
    if (!confirm('Êtes-vous sûr de vouloir finaliser l\'onboarding ?')) return

    try {
      setIsLoading(true)
      await completeOnboarding(selectedChecklist.application_id)
      setShowChecklistModal(false)
      setSelectedChecklist(null)
      await loadOnboardingList()
      alert('Onboarding finalisé avec succès!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la finalisation')
    } finally {
      setIsLoading(false)
    }
  }

  const getProgress = (checklist: OnboardingChecklist) => {
    const items = [
      checklist.contract_signed,
      checklist.equipment_ready,
      checklist.training_scheduled,
      checklist.access_granted,
      checklist.welcome_meeting_scheduled
    ]
    const completed = items.filter(Boolean).length
    return (completed / items.length) * 100
  }

  return (
    <ProtectedRoute allowedRoles={['recruteur', 'manager', 'administrateur']}>
      <div className="p-4 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Onboarding</h1>
          <p className="text-gray-600 mt-2 text-sm lg:text-base">Suivez le processus d&apos;intégration des candidats</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{onboardingList.length}</p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">En cours</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-green-600">
                {onboardingList.filter(o => o.onboarding_completed).length}
              </p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Terminés</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-blue-600">
                {onboardingList.filter(o => o.contract_signed).length}
              </p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Contrats signés</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-purple-600">
                {onboardingList.filter(o => o.equipment_ready).length}
              </p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Équipements prêts</p>
            </div>
          </div>
        </div>

        {/* Liste des onboarding */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Onboarding en cours</h2>
          </div>
          <div className="p-4 lg:p-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Chargement...</div>
            ) : onboardingList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Aucun onboarding en cours</div>
            ) : (
              <div className="space-y-4">
                {onboardingList.map((item) => {
                  const progress = getProgress(item)
                  return (
                    <div 
                      key={item.application_id} 
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">{item.candidate_name}</h3>
                            {item.onboarding_completed ? (
                              <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Terminé
                              </span>
                            ) : (
                              <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                En cours
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{item.job_title}</p>
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Progression</span>
                              <span className="text-xs font-medium text-gray-900">{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                            <div className={`p-2 rounded ${item.contract_signed ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                              ✓ Contrat
                            </div>
                            <div className={`p-2 rounded ${item.equipment_ready ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                              ✓ Équipement
                            </div>
                            <div className={`p-2 rounded ${item.training_scheduled ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                              ✓ Formation
                            </div>
                            <div className={`p-2 rounded ${item.access_granted ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                              ✓ Accès
                            </div>
                            <div className={`p-2 rounded ${item.welcome_meeting_scheduled ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                              ✓ Welcome
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenChecklist(item.application_id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium px-4 py-2 border border-blue-600 rounded hover:bg-blue-50 whitespace-nowrap"
                        >
                          Voir checklist
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal checklist */}
        {showChecklistModal && selectedChecklist && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Checklist Onboarding</h2>
              <p className="text-sm text-gray-600 mb-6">
                {selectedChecklist.candidate_name} - {selectedChecklist.job_title}
              </p>
              <form onSubmit={handleUpdateChecklist} className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklistData.contract_signed || false}
                      onChange={(e) => setChecklistData({ ...checklistData, contract_signed: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Contrat signé</span>
                      {selectedChecklist.contract_signed_at && (
                        <p className="text-xs text-gray-500">
                          Le {new Date(selectedChecklist.contract_signed_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklistData.equipment_ready || false}
                      onChange={(e) => setChecklistData({ ...checklistData, equipment_ready: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Équipement prêt</span>
                      {selectedChecklist.equipment_ready_at && (
                        <p className="text-xs text-gray-500">
                          Le {new Date(selectedChecklist.equipment_ready_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklistData.training_scheduled || false}
                      onChange={(e) => setChecklistData({ ...checklistData, training_scheduled: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Formation prévue</span>
                      {selectedChecklist.training_scheduled_at && (
                        <p className="text-xs text-gray-500">
                          Le {new Date(selectedChecklist.training_scheduled_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklistData.access_granted || false}
                      onChange={(e) => setChecklistData({ ...checklistData, access_granted: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Accès accordés</span>
                      {selectedChecklist.access_granted_at && (
                        <p className="text-xs text-gray-500">
                          Le {new Date(selectedChecklist.access_granted_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklistData.welcome_meeting_scheduled || false}
                      onChange={(e) => setChecklistData({ ...checklistData, welcome_meeting_scheduled: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Réunion de bienvenue planifiée</span>
                      {selectedChecklist.welcome_meeting_scheduled_at && (
                        <p className="text-xs text-gray-500">
                          Le {new Date(selectedChecklist.welcome_meeting_scheduled_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={checklistData.notes || ''}
                    onChange={(e) => setChecklistData({ ...checklistData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notes sur l'onboarding"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                  {!selectedChecklist.onboarding_completed && (
                    <button
                      type="button"
                      onClick={handleCompleteOnboarding}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Finaliser onboarding
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowChecklistModal(false)
                      setSelectedChecklist(null)
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Fermer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}






