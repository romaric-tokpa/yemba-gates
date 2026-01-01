'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPendingApprovalJobs, JobResponseWithCreator, validateJob, JobValidation, updateJob, JobUpdate } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { 
  Check, X, Clock, Briefcase, MapPin, DollarSign, Calendar, 
  Building2, User, Mail, Search, Filter, XCircle, AlertCircle,
  FileText, Eye
} from 'lucide-react'

export default function ManagerApprovalsPage() {
  const router = useRouter()
  const { success, error: showError } = useToastContext()
  const [jobs, setJobs] = useState<JobResponseWithCreator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [creatorFilter, setCreatorFilter] = useState<string>('')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }
    loadJobs()
  }, [router])

  const loadJobs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getPendingApprovalJobs()
      setJobs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Erreur lors du chargement des besoins:', err)
      setError('Impossible de charger les besoins. Vérifiez votre connexion.')
      setJobs([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidateJob = async (jobId: string, validated: boolean) => {
    try {
      await validateJob(jobId, { validated, feedback: validated ? 'Besoin approuvé par le manager' : 'Besoin rejeté par le manager' })
      success(validated ? 'Besoin approuvé avec succès' : 'Besoin rejeté')
      await loadJobs()
    } catch (err) {
      showError('Erreur lors de la validation du besoin')
    }
  }

  // Filtrage des jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = !searchQuery || 
        job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.entreprise?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCreator = !creatorFilter || job.created_by_role === creatorFilter
      const matchesUrgency = !urgencyFilter || job.urgency === urgencyFilter
      
      return matchesSearch && matchesCreator && matchesUrgency
    })
  }, [jobs, searchQuery, creatorFilter, urgencyFilter])

  // Statistiques
  const stats = useMemo(() => {
    const total = jobs.length
    const clients = jobs.filter(j => j.created_by_role === 'client').length
    const recruteurs = jobs.filter(j => j.created_by_role === 'recruteur').length
    const managers = jobs.filter(j => j.created_by_role === 'manager').length
    const critiques = jobs.filter(j => j.urgency === 'critique').length
    
    return { total, clients, recruteurs, managers, critiques }
  }, [jobs])

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null
    const urgencyConfig: Record<string, { bg: string; text: string; label: string }> = {
      'faible': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Faible' },
      'moyenne': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moyenne' },
      'haute': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Haute' },
      'critique': { bg: 'bg-red-100', text: 'text-red-800', label: 'Critique' },
      'normale': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Normale' },
      'élevée': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Élevée' },
    }
    const config = urgencyConfig[urgency] || { bg: 'bg-gray-100', text: 'text-gray-800', label: urgency }
    return (
      <span className={`px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  const getCreatorBadge = (role: string | null | undefined) => {
    if (!role) return null
    const roleConfig: Record<string, { bg: string; text: string; label: string }> = {
      'client': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Client' },
      'recruteur': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Recruteur' },
      'manager': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Manager' },
      'administrateur': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Admin' },
    }
    const config = roleConfig[role] || { bg: 'bg-gray-100', text: 'text-gray-800', label: role }
    return (
      <span className={`px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'brouillon': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Brouillon' },
      'en_attente': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente' },
      'validé': { bg: 'bg-green-100', text: 'text-green-800', label: 'Validé' },
      'en_cours': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En cours' },
      'clôturé': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Clôturé' },
    }
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    return (
      <span className={`px-2 py-1 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    )
  }

  const resetFilters = () => {
    setSearchQuery('')
    setCreatorFilter('')
    setUrgencyFilter('')
  }

  const activeFiltersCount = [searchQuery, creatorFilter, urgencyFilter].filter(Boolean).length

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Chargement des approbations...</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Approbations</h1>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">Gestion et approbation de tous les besoins</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Total</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-emerald-600">{stats.clients}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Clients</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.recruteurs}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Recruteurs</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{stats.managers}</div>
          <div className="text-xs lg:text-sm text-gray-600 mt-1">Managers</div>
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
              placeholder="Rechercher par titre, département, entreprise, créateur..."
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Créateur</label>
                <select
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  <option value="">Tous les créateurs</option>
                  <option value="client">Client</option>
                  <option value="recruteur">Recruteur</option>
                  <option value="manager">Manager</option>
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
                  <option value="élevée">Élevée</option>
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
              Tous les besoins ({filteredJobs.length})
            </h2>
          </div>
        </div>
        
        <div className="p-4 lg:p-6">
          {filteredJobs.length > 0 ? (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/manager/jobs/${job.id}`}
                        className="block"
                      >
                        <h3 className="font-semibold text-gray-900 text-base lg:text-lg mb-2 line-clamp-2 hover:text-indigo-600">
                          {job.title}
                        </h3>
                      </Link>
                      
                      {/* Informations du créateur et statut */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {getCreatorBadge(job.created_by_role)}
                        {getUrgencyBadge(job.urgency)}
                        {getStatusBadge(job.status)}
                      </div>
                      
                      {/* Informations du créateur */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        {job.created_by_name && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{job.created_by_name}</span>
                            {job.created_by_email && (
                              <span className="text-gray-400">({job.created_by_email})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link
                        href={`/manager/jobs/${job.id}`}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      {/* Sélecteur de statut */}
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id!, e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        title="Changer le statut"
                      >
                        <option value="brouillon">Brouillon</option>
                        <option value="en_attente">En attente</option>
                        <option value="validé">Validé</option>
                        <option value="en_cours">En cours</option>
                        <option value="clôturé">Clôturé</option>
                      </select>
                      {/* Actions rapides */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleValidateJob(job.id!, true)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Approuver (Valider)"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleValidateJob(job.id!, false)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Rejeter (Brouillon)"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Détails du besoin */}
                  <div className="space-y-2 text-sm text-gray-600 border-t border-gray-100 pt-3">
                    {job.entreprise && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Entreprise/Client:</span>
                        <span>{job.entreprise}</span>
                      </div>
                    )}
                    
                    {job.department && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span>{job.department}</span>
                      </div>
                    )}
                    
                    {job.localisation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{job.localisation}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      {job.contract_type && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs">{job.contract_type}</span>
                        </div>
                      )}
                      
                      {job.salaire_minimum && job.salaire_maximum && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs">
                            {job.salaire_minimum.toLocaleString('fr-FR')} - {job.salaire_maximum.toLocaleString('fr-FR')} F CFA
                          </span>
                        </div>
                      )}
                      
                      {job.date_prise_poste && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs">
                            {new Date(job.date_prise_poste).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">
                          Créé le {new Date(job.created_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                {searchQuery || creatorFilter || urgencyFilter 
                  ? 'Aucun besoin ne correspond à vos critères de recherche.'
                  : 'Aucun besoin à afficher'}
              </p>
              {searchQuery || creatorFilter || urgencyFilter ? (
                <button
                  onClick={resetFilters}
                  className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Réinitialiser les filtres
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

