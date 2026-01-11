'use client'

import { useState, useEffect, useMemo } from 'react'
import { getClientShortlists, getJobs, type ShortlistItem, type JobResponse } from '@/lib/api'
import { 
  Users, CheckCircle, XCircle, Clock, Eye, FileText, Briefcase, History, 
  TrendingUp, AlertCircle, Search, Filter, Plus, Calendar, MapPin, DollarSign,
  ArrowRight, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'

type TabType = 'shortlists' | 'jobs'

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('shortlists')
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([])
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

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

  // Statistiques calculées
  const stats = useMemo(() => {
  const pendingCount = shortlists.filter(s => s.client_validated === null).length
  const validatedCount = shortlists.filter(s => s.client_validated === true).length
  const rejectedCount = shortlists.filter(s => s.client_validated === false).length
    const totalShortlists = shortlists.length
    
    const activeJobs = jobs.filter(j => ['validé', 'en_cours', 'en_attente_validation'].includes(j.status)).length
    const closedJobs = jobs.filter(j => j.status === 'clôturé').length
    const draftJobs = jobs.filter(j => j.status === 'brouillon').length
    
    return {
      shortlists: {
        pending: pendingCount,
        validated: validatedCount,
        rejected: rejectedCount,
        total: totalShortlists,
        pendingPercentage: totalShortlists > 0 ? Math.round((pendingCount / totalShortlists) * 100) : 0
      },
      jobs: {
        active: activeJobs,
        closed: closedJobs,
        draft: draftJobs,
        total: jobs.length
      }
    }
  }, [shortlists, jobs])

  // Filtrage des données
  const filteredShortlists = useMemo(() => {
    let filtered = shortlists
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.job_department?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter) {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(item => item.client_validated === null)
      } else if (statusFilter === 'validated') {
        filtered = filtered.filter(item => item.client_validated === true)
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter(item => item.client_validated === false)
      }
    }
    
    return filtered
  }, [shortlists, searchTerm, statusFilter])

  const filteredJobs = useMemo(() => {
    let filtered = jobs
    
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter) {
      filtered = filtered.filter(job => job.status === statusFilter)
    }
    
    return filtered
  }, [jobs, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string; icon: any }> = {
      'brouillon': { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 border-gray-200', icon: FileText },
      'en_attente': { label: 'En attente', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
      'en_attente_validation': { label: 'En attente validation', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
      'validé': { label: 'Validé', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
      'en_cours': { label: 'En cours', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: TrendingUp },
      'clôturé': { label: 'Clôturé', className: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle },
    }
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle }
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${badge.className}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null
    const badges: Record<string, { label: string; className: string }> = {
      'faible': { label: 'Faible', className: 'bg-gray-50 text-gray-600' },
      'moyenne': { label: 'Moyenne', className: 'bg-blue-50 text-blue-600' },
      'normale': { label: 'Normale', className: 'bg-blue-50 text-blue-600' },
      'haute': { label: 'Haute', className: 'bg-orange-50 text-orange-600' },
      'critique': { label: 'Critique', className: 'bg-red-50 text-red-600' },
    }
    const badge = badges[urgency] || { label: urgency, className: 'bg-gray-50 text-gray-600' }
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  const getValidationBadge = (validated: boolean | null) => {
    if (validated === null) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          En attente
        </span>
      )
    }
    if (validated) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3" />
          Validé
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" />
        Rejeté
      </span>
    )
  }

  if (isLoading && shortlists.length === 0 && jobs.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded-lg w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* En-tête avec titre et actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-emerald-600" />
            Dashboard Client
          </h1>
          <p className="text-gray-600 mt-1.5">Gérez vos besoins de recrutement et vos shortlists</p>
      </div>
        <div className="flex flex-wrap gap-3">
        <Link
          href="/client/jobs/new"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
        >
            <Plus className="w-4 h-4" />
            Nouveau besoin
        </Link>
        <Link
          href="/client/history"
            className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
        >
            <History className="w-4 h-4" />
            Historique
        </Link>
        </div>
      </div>

      {/* Statistiques globales */}
      {activeTab === 'shortlists' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-200 rounded-lg">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <span className="text-2xl font-bold text-amber-900">{stats.shortlists.pending}</span>
            </div>
            <p className="text-sm font-medium text-amber-900">En attente</p>
            <p className="text-xs text-amber-700 mt-1">{stats.shortlists.pendingPercentage}% du total</p>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-700" />
              </div>
              <span className="text-2xl font-bold text-emerald-900">{stats.shortlists.validated}</span>
            </div>
            <p className="text-sm font-medium text-emerald-900">Validés</p>
            <p className="text-xs text-emerald-700 mt-1">Candidats approuvés</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-700" />
              </div>
              <span className="text-2xl font-bold text-red-900">{stats.shortlists.rejected}</span>
            </div>
            <p className="text-sm font-medium text-red-900">Rejetés</p>
            <p className="text-xs text-red-700 mt-1">Candidats refusés</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-200 rounded-lg">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
              <span className="text-2xl font-bold text-blue-900">{stats.shortlists.total}</span>
            </div>
            <p className="text-sm font-medium text-blue-900">Total</p>
            <p className="text-xs text-blue-700 mt-1">Candidats en shortlist</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-200 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-700" />
              </div>
              <span className="text-2xl font-bold text-blue-900">{stats.jobs.active}</span>
            </div>
            <p className="text-sm font-medium text-blue-900">Actifs</p>
            <p className="text-xs text-blue-700 mt-1">En cours de recrutement</p>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-700" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.jobs.closed}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Clôturés</p>
            <p className="text-xs text-gray-700 mt-1">Besoins terminés</p>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-200 rounded-lg">
                <FileText className="w-5 h-5 text-amber-700" />
              </div>
              <span className="text-2xl font-bold text-amber-900">{stats.jobs.draft}</span>
            </div>
            <p className="text-sm font-medium text-amber-900">Brouillons</p>
            <p className="text-xs text-amber-700 mt-1">En préparation</p>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-200 rounded-lg">
                <Briefcase className="w-5 h-5 text-emerald-700" />
              </div>
              <span className="text-2xl font-bold text-emerald-900">{stats.jobs.total}</span>
            </div>
            <p className="text-sm font-medium text-emerald-900">Total</p>
            <p className="text-xs text-emerald-700 mt-1">Besoins créés</p>
          </div>
        </div>
      )}

      {/* Onglets avec style amélioré */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/50">
          <nav className="flex" role="tablist">
          <button
              onClick={() => {
                setActiveTab('shortlists')
                setStatusFilter(null)
              }}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'shortlists'
                  ? 'border-emerald-500 text-emerald-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                <span>Shortlists</span>
              {shortlists.length > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    activeTab === 'shortlists' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                  {shortlists.length}
                </span>
              )}
            </div>
          </button>
          <button
              onClick={() => {
                setActiveTab('jobs')
                setStatusFilter(null)
              }}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'jobs'
                  ? 'border-emerald-500 text-emerald-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>Mes besoins</span>
              {jobs.length > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    activeTab === 'jobs' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                  {jobs.length}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

        {/* Barre de recherche et filtres */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/30">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={activeTab === 'shortlists' ? 'Rechercher un candidat...' : 'Rechercher un besoin...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            {activeTab === 'shortlists' ? (
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="validated">Validés</option>
                <option value="rejected">Rejetés</option>
              </select>
            ) : (
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
              >
                <option value="">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="en_attente_validation">En attente validation</option>
                <option value="validé">Validé</option>
                <option value="en_cours">En cours</option>
                <option value="clôturé">Clôturé</option>
              </select>
            )}
          </div>
            </div>

        {/* Contenu des onglets */}
            <div className="p-6">
          {activeTab === 'shortlists' ? (
            filteredShortlists.length > 0 ? (
                <div className="space-y-4">
                {filteredShortlists.map((item) => (
                    <div
                      key={item.application_id}
                    className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                              <Users className="w-6 h-6 text-emerald-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">{item.candidate_name}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                              <span className="font-medium">{item.job_title}</span>
                              {item.job_department && (
                                <>
                                  <span>•</span>
                                  <span>{item.job_department}</span>
                                </>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {getValidationBadge(item.client_validated)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <Link
                            href="/client/shortlist"
                          className="inline-flex items-center gap-2 px-4 py-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all duration-200 font-medium text-sm group-hover:border-emerald-300"
                          >
                          <Eye className="w-4 h-4" />
                          Voir détails
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter ? 'Aucun résultat' : 'Aucun candidat en shortlist'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || statusFilter 
                    ? 'Essayez de modifier vos critères de recherche'
                    : 'Les candidats validés par les recruteurs apparaîtront ici'}
                </p>
                {(searchTerm || statusFilter) && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter(null)
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Réinitialiser les filtres
                  </button>
              )}
            </div>
            )
          ) : (
            filteredJobs.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/client/jobs/${job.id}`}
                    className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all duration-200 block"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-emerald-600 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-3">
                          {job.department && (
                            <span className="inline-flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5" />
                              {job.department}
                            </span>
                          )}
                          {job.contract_type && (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {job.contract_type}
                            </span>
                          )}
                          {job.localisation && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.localisation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        {getUrgencyBadge(job.urgency)}
                        {getStatusBadge(job.status)}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Créé le {formatDateTime(job.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Voir détails</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Briefcase className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter ? 'Aucun résultat' : 'Aucun besoin créé'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || statusFilter
                    ? 'Essayez de modifier vos critères de recherche'
                    : 'Commencez par créer votre premier besoin de recrutement'}
                </p>
                {!searchTerm && !statusFilter && (
                <Link
                  href="/client/jobs/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Créer un besoin
                </Link>
                )}
                {(searchTerm || statusFilter) && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter(null)
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            )
            )}
          </div>
        </div>
    </div>
  )
}
