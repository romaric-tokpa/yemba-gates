'use client'

import { useState, useEffect } from 'react'
import { getClientShortlists, getJobs, type ShortlistItem, type JobResponse } from '@/lib/api'
import { Users, CheckCircle, XCircle, Clock, Eye, FileText, Briefcase, History } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'

type TabType = 'shortlists' | 'jobs'

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('shortlists')
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([])
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (activeTab === 'shortlists') {
      loadShortlists()
    } else {
      loadJobs()
    }
  }, [activeTab])

  const loadShortlists = async () => {
    try {
      setIsLoading(true)
      const data = await getClientShortlists()
      setShortlists(data)
    } catch (error) {
      console.error('Erreur lors du chargement des shortlists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadJobs = async () => {
    try {
      setIsLoading(true)
      const data = await getJobs()
      setJobs(data)
    } catch (error) {
      console.error('Erreur lors du chargement des besoins:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const pendingCount = shortlists.filter(s => s.client_validated === null).length
  const validatedCount = shortlists.filter(s => s.client_validated === true).length
  const rejectedCount = shortlists.filter(s => s.client_validated === false).length
  const pendingCandidates = shortlists.filter(s => s.client_validated === null)

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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Client</h1>
        <p className="text-gray-600 mt-2">Gérez vos besoins de recrutement et vos shortlists</p>
      </div>

      {/* Actions rapides */}
      <div className="mb-6 flex gap-4">
        <Link
          href="/client/jobs/new"
          className="bg-emerald-600 text-white rounded-lg p-4 hover:bg-emerald-700 transition-colors inline-flex items-center"
        >
          <FileText className="w-5 h-5 mr-2" />
          <span className="font-semibold">Créer un besoin</span>
        </Link>
        <Link
          href="/client/history"
          className="bg-white text-emerald-600 border-2 border-emerald-600 rounded-lg p-4 hover:bg-emerald-50 transition-colors inline-flex items-center"
        >
          <History className="w-5 h-5 mr-2" />
          <span className="font-semibold">Voir l'historique</span>
        </Link>
      </div>

      {/* Onglets */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('shortlists')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shortlists'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Shortlists
              {shortlists.length > 0 && (
                <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {shortlists.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'jobs'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Mes besoins
              {jobs.length > 0 && (
                <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {jobs.length}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'shortlists' ? (
        <>
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Validés</p>
                  <p className="text-2xl font-bold text-gray-900">{validatedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejetés</p>
                  <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
                </div>
                <XCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Candidats en attente */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Candidats en attente de validation</h2>
            </div>
            <div className="p-6">
              {pendingCandidates.length > 0 ? (
                <div className="space-y-4">
                  {pendingCandidates.map((item) => (
                    <div
                      key={item.application_id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{item.candidate_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.job_title}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.job_department || 'Non spécifié'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            En attente
                          </span>
                          <Link
                            href="/client/shortlist"
                            className="flex items-center text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun candidat en attente de validation</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Mes besoins</h2>
          </div>
          <div className="p-6">
            {jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/client/jobs/${job.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{job.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          {job.department && (
                            <span className="text-sm text-gray-600">{job.department}</span>
                          )}
                          {job.contract_type && (
                            <span className="text-sm text-gray-600">• {job.contract_type}</span>
                          )}
                        </div>
                        {job.localisation && (
                          <p className="text-xs text-gray-500 mt-1">{job.localisation}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getUrgencyBadge(job.urgency)}
                        {getStatusBadge(job.status)}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center text-xs text-gray-500">
                      <span>Créé le {formatDateTime(job.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun besoin créé</p>
                <Link
                  href="/client/jobs/new"
                  className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Créer votre premier besoin
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

