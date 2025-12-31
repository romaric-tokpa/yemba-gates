'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  getOffers, 
  sendOffer, 
  acceptOffer,
  rejectOffer,
  OfferResponse,
  OfferSend,
  OfferDecision
} from '@/lib/api'

export default function OffresPage() {
  const [offers, setOffers] = useState<OfferResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDecisionModal, setShowDecisionModal] = useState<string | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<OfferResponse | null>(null)

  const [formData, setFormData] = useState<Partial<OfferSend>>({
    application_id: '',
    notes: ''
  })

  const [decisionData, setDecisionData] = useState<Partial<OfferDecision>>({
    accepted: true,
    notes: ''
  })

  useEffect(() => {
    loadOffers()
  }, [])

  const loadOffers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getOffers()
      setOffers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.application_id) {
      alert('Veuillez entrer l\'ID de la candidature')
      return
    }

    try {
      setIsLoading(true)
      await sendOffer(formData as OfferSend)
      setShowModal(false)
      setFormData({ application_id: '', notes: '' })
      await loadOffers()
      alert('Offre envoyée avec succès!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'envoi')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOffer) return

    try {
      setIsLoading(true)
      await acceptOffer(selectedOffer.application_id, decisionData as OfferDecision)
      setShowDecisionModal(null)
      setSelectedOffer(null)
      setDecisionData({ accepted: true, notes: '' })
      await loadOffers()
      alert('Offre acceptée!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOffer) return

    try {
      setIsLoading(true)
      await rejectOffer(selectedOffer.application_id, { ...decisionData, accepted: false } as OfferDecision)
      setShowDecisionModal(null)
      setSelectedOffer(null)
      setDecisionData({ accepted: false, notes: '' })
      await loadOffers()
      alert('Offre refusée')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du refus')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (offer: OfferResponse) => {
    if (offer.offer_accepted === true) {
      return <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Acceptée</span>
    } else if (offer.offer_accepted === false) {
      return <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Refusée</span>
    }
    return <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">En attente</span>
  }

  const pendingOffers = offers.filter(o => o.offer_accepted === null)
  const acceptedOffers = offers.filter(o => o.offer_accepted === true)
  const rejectedOffers = offers.filter(o => o.offer_accepted === false)

  return (
    <ProtectedRoute allowedRoles={['recruteur', 'manager', 'administrateur']}>
      <div className="p-4 lg:p-8">
        <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Offres</h1>
            <p className="text-gray-600 mt-2 text-sm lg:text-base">Suivez les offres envoyées aux candidats</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm lg:text-base"
          >
            + Envoyer une offre
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-3 lg:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-yellow-600">{pendingOffers.length}</p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">En attente</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-green-600">{acceptedOffers.length}</p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Acceptées</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 lg:p-6">
            <div className="text-center">
              <p className="text-xl lg:text-2xl font-bold text-red-600">{rejectedOffers.length}</p>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Refusées</p>
            </div>
          </div>
        </div>

        {/* Liste des offres */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Liste des offres</h2>
          </div>
          <div className="p-4 lg:p-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Chargement...</div>
            ) : offers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Aucune offre envoyée</div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div 
                    key={offer.application_id} 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">{offer.candidate_name}</h3>
                        {getStatusBadge(offer)}
                      </div>
                      <p className="text-sm text-gray-600">{offer.job_title}</p>
                      {offer.job_department && (
                        <p className="text-xs text-gray-500">{offer.job_department}</p>
                      )}
                      {offer.offer_sent_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Envoyée le: {new Date(offer.offer_sent_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      {offer.offer_accepted_at && (
                        <p className="text-xs text-gray-500">
                          {offer.offer_accepted ? 'Acceptée' : 'Refusée'} le: {new Date(offer.offer_accepted_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {offer.offer_accepted === null && (
                        <button 
                          onClick={() => {
                            setSelectedOffer(offer)
                            setDecisionData({ accepted: true, notes: '' })
                            setShowDecisionModal('accept')
                          }}
                          className="text-green-600 hover:text-green-800 text-sm font-medium px-3 py-1 border border-green-600 rounded hover:bg-green-50"
                        >
                          Accepter
                        </button>
                      )}
                      {offer.offer_accepted === null && (
                        <button 
                          onClick={() => {
                            setSelectedOffer(offer)
                            setDecisionData({ accepted: false, notes: '' })
                            setShowDecisionModal('reject')
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                        >
                          Refuser
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal envoi offre */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Envoyer une offre</h2>
              <form onSubmit={handleSendOffer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Candidature (application_id) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.application_id || ''}
                    onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="UUID de la candidature"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le candidat doit être en shortlist et validé par le client
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes additionnelles
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notes pour l'offre"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Envoi...' : 'Envoyer l\'offre'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal décision */}
        {showDecisionModal && selectedOffer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {showDecisionModal === 'accept' ? 'Accepter l\'offre' : 'Refuser l\'offre'}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {selectedOffer.candidate_name} - {selectedOffer.job_title}
              </p>
              <form onSubmit={showDecisionModal === 'accept' ? handleAcceptOffer : handleRejectOffer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commentaires
                  </label>
                  <textarea
                    value={decisionData.notes || ''}
                    onChange={(e) => setDecisionData({ ...decisionData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Commentaires sur la décision"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                      showDecisionModal === 'accept' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isLoading ? 'Traitement...' : showDecisionModal === 'accept' ? 'Accepter' : 'Refuser'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDecisionModal(null)
                      setSelectedOffer(null)
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
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






