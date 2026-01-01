'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getJobs, JobResponse } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { 
  Plus, History, Clock, ChevronDown, FileText, UserPlus, 
  Search, Filter, XCircle, Briefcase, MapPin, DollarSign,
  Calendar, Building2, AlertCircle, CheckCircle2, FileEdit
} from 'lucide-react'

export default function ManagerJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  
  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }
    loadJobs()
  }, [router])

  // Fermer le menu déroulant quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showAddMenu && !target.closest('.relative')) {
        setShowAddMenu(false)
      }
    }

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showAddMenu])

  const loadJobs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getJobs()
      setJobs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Erreur lors du chargement des besoins:', err)
      setError('Impossible de charger les besoins. Vérifiez votre connexion.')
      setJobs([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrage des jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = !searchQuery || 
        job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.manager_demandeur?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.entreprise?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = !statusFilter || job.status === statusFilter
      const matchesUrgency = !urgencyFilter || job.urgency === urgencyFilter
      
      return matchesSearch && matchesStatus && matchesUrgency
    })
  }, [jobs, searchQuery, statusFilter, urgencyFilter])

  // Statistiques
  const stats = useMemo(() => {
    const total = jobs.length
    const brouillons = jobs.filter(j => j.status === 'brouillon').length
    const valides = jobs.filter(j => j.status === 'validé').length
    const enCours = jobs.filter(j => j.status === 'en_cours').length
    const critiques = jobs.filter(j => j.urgency === 'critique').length
    
    return { total, brouillons, valides, enCours, critiques }
  }, [jobs])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      'brouillon': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Brouillon', icon: FileEdit },
      'validé': { bg: 'bg-green-100', text: 'text-green-800', label: 'Validé', icon: CheckCircle2 },
      'en_cours': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En cours', icon: Briefcase },
      'clôturé': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Clôturé', icon: CheckCircle2 },
    }
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: Briefcase }
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        <Icon className="w-3 h-3" />
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
      <span className={`px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setUrgencyFilter('')
  }

  const activeFiltersCount = [searchQuery, statusFilter, urgencyFilter].filter(Boolean).length

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Chargement des besoins...</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Mes Postes</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">Gestion des besoins de recrutement</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Créer un besoin</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <Link
                href="/manager/jobs/new"
                onClick={() => setShowAddMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
              >
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="font-medium text-gray-900">Créer manuellement</div>
                  <div className="text-xs text-gray-500">Saisie manuelle des informations</div>
                </div>
              </Link>
              <Link
                href="/manager/jobs/new?mode=upload"
                onClick={() => setShowAddMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-b-lg"
              >
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="font-medium text-gray-900">Via fiche de poste</div>
                  <div className="text-xs text-gray-500">Upload et extraction automatique</div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Total</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-600">{stats.brouillons}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Brouillons</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.valides}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Validés</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{stats.enCours}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">En cours</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.critiques}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Critiques</div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par titre, département, manager, entreprise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm lg:text-base"
            />
          </div>
          
          {/* Bouton filtres */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
          >
            <Filter className="w-4 h-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Panneau de filtres */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="brouillon">Brouillon</option>
                  <option value="validé">Validé</option>
                  <option value="en_cours">En cours</option>
                  <option value="clôturé">Clôturé</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urgence</label>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  <option value="">Toutes les urgences</option>
                  <option value="faible">Faible</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                  <option value="critique">Critique</option>
                  <option value="normale">Normale</option>
                </select>
              </div>
              
              <div className="flex items-end">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        </div>
      )}

      {/* Liste des jobs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
              Liste des besoins ({filteredJobs.length})
            </h2>
          </div>
        </div>
        
        <div className="p-4 lg:p-6">
          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/manager/jobs/${job.id}`}
                  className="block p-5 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base lg:text-lg mb-2 line-clamp-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {getStatusBadge(job.status)}
                        {getUrgencyBadge(job.urgency)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        router.push(`/manager/jobs/${job.id}?tab=history`)
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                      title="Voir l'historique"
                    >
                      <History className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {job.department && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{job.department}</span>
                      </div>
                    )}
                    
                    {job.manager_demandeur && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{job.manager_demandeur}</span>
                      </div>
                    )}
                    
                    {job.localisation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{job.localisation}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
                      {job.contract_type && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs">{job.contract_type}</span>
                        </div>
                      )}
                      
                      {job.budget && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs">{job.budget.toLocaleString('fr-FR')} F CFA</span>
                        </div>
                      )}
                      
                      {job.date_prise_poste && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs">
                            {new Date(job.date_prise_poste).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">
                          {new Date(job.created_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Aucun besoin trouvé</p>
              <p className="text-sm mb-4">
                {searchQuery || statusFilter || urgencyFilter 
                  ? 'Aucun besoin ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre premier besoin de recrutement.'}
              </p>
              {!searchQuery && !statusFilter && !urgencyFilter && (
                <Link
                  href="/manager/jobs/new"
                  className="inline-flex items-center gap-2 mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Créer votre premier besoin
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

