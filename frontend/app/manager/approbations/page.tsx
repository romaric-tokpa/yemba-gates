'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  getPendingApprovalJobs, 
  JobResponseWithCreator, 
  validateJob, 
  JobValidation, 
  updateJobStatus,
  archiveJob,
  markJobAsWon,
  deleteJob,
  getDeletedJobs,
  DeletedJobItem,
  getAvailableRecruiters
} from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { 
  Check, X, Clock, Briefcase, MapPin, DollarSign, Calendar, 
  Building2, User, Mail, Search, Filter, XCircle, AlertCircle,
  FileText, Eye, MoreVertical, Archive, Trash2, Trophy, Edit,
  ChevronDown, TrendingUp, TrendingDown, BarChart3, RefreshCw,
  History, Activity, Target, Zap, ArrowUp, ArrowDown, Users
} from 'lucide-react'

// Composant pour les cartes de statistiques améliorées
function StatCard({ 
  title, 
  value, 
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  color = 'blue',
  onClick
}: { 
  title: string, 
  value: number | string, 
  subtitle?: string,
  trend?: 'up' | 'down' | 'neutral',
  trendValue?: string,
  icon?: any,
  color?: string,
  onClick?: () => void
}) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-600' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-600' },
  }

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border ${colors.border} p-6 hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`${colors.bg} rounded-lg p-3`}>
          {Icon && <Icon className={`w-6 h-6 ${colors.icon}`} />}
        </div>
        {trend && trend !== 'neutral' && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-3xl font-bold ${colors.text}`}>
            {value}
          </p>
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

// Composant pour les graphiques en barres simples
function MiniBarChart({ value, max, label, color = 'blue' }: { 
  value: number, 
  max: number, 
  label: string,
  color?: string 
}) {
  const percentage = Math.min((value / max) * 100, 100)
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    orange: 'bg-orange-600',
    purple: 'bg-purple-600',
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function ManagerApprovalsPage() {
  const router = useRouter()
  const { success, error: showError } = useToastContext()
  const [jobs, setJobs] = useState<JobResponseWithCreator[]>([])
  const [deletedJobs, setDeletedJobs] = useState<DeletedJobItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedRecruiters, setSelectedRecruiters] = useState<string[]>([])
  const [availableRecruiters, setAvailableRecruiters] = useState<Array<{ id: string; first_name: string; last_name: string; email: string; department?: string }>>([])
  const [validationFeedback, setValidationFeedback] = useState<string>('')
  const [isLoadingRecruiters, setIsLoadingRecruiters] = useState(false)
  
  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [creatorFilter, setCreatorFilter] = useState<string>('')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateFromFilter, setDateFromFilter] = useState<string>('')
  const [dateToFilter, setDateToFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }
    loadJobs()
    loadDeletedJobs()
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

  const loadDeletedJobs = async () => {
    try {
      setIsLoadingDeleted(true)
      const data = await getDeletedJobs()
      setDeletedJobs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Erreur lors du chargement des besoins supprimés:', err)
      setDeletedJobs([])
    } finally {
      setIsLoadingDeleted(false)
    }
  }

  const openValidationModal = async (jobId: string, validated: boolean) => {
    setSelectedJobId(jobId)
    setSelectedRecruiters([])
    setValidationFeedback(validated ? 'Besoin approuvé par le manager' : 'Besoin rejeté par le manager')
    
    if (validated) {
      // Charger les recruteurs disponibles uniquement si on valide
      setIsLoadingRecruiters(true)
      try {
        const recruiters = await getAvailableRecruiters()
        setAvailableRecruiters(recruiters)
      } catch (err: any) {
        showError(err.message || 'Erreur lors du chargement des recruteurs')
      } finally {
        setIsLoadingRecruiters(false)
      }
    }
    
    setShowValidationModal(true)
    setOpenMenuId(null)
  }

  const handleValidateJob = async () => {
    if (!selectedJobId) return
    
    const validated = validationFeedback.includes('approuvé')
    
    try {
      await validateJob(selectedJobId, { 
        validated, 
        feedback: validationFeedback,
        recruiter_ids: validated && selectedRecruiters.length > 0 ? selectedRecruiters : undefined
      })
      success(validated ? 'Besoin approuvé avec succès' : 'Besoin rejeté')
      await loadJobs()
      setShowValidationModal(false)
      setSelectedJobId(null)
      setSelectedRecruiters([])
      setValidationFeedback('')
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la validation du besoin')
    }
  }

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await updateJobStatus(jobId, newStatus)
      success('Statut mis à jour avec succès')
      await loadJobs()
      setOpenMenuId(null)
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la mise à jour du statut')
    }
  }

  const handleArchive = async (jobId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce besoin ?')) {
      return
    }
    try {
      await archiveJob(jobId)
      success('Besoin archivé avec succès')
      await loadJobs()
      setOpenMenuId(null)
    } catch (err: any) {
      showError(err.message || 'Erreur lors de l\'archivage')
    }
  }

  const handleMarkAsWon = async (jobId: string) => {
    try {
      await markJobAsWon(jobId)
      success('Besoin marqué comme gagné')
      await loadJobs()
      setOpenMenuId(null)
    } catch (err: any) {
      showError(err.message || 'Erreur lors du marquage comme gagné')
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce besoin ? Cette action est irréversible.')) {
      return
    }
    try {
      await deleteJob(jobId)
      success('Besoin supprimé avec succès')
      await loadJobs()
      await loadDeletedJobs()
      setOpenMenuId(null)
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la suppression')
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
      const matchesStatus = !statusFilter || job.status === statusFilter
      
      const matchesDateFrom = !dateFromFilter || new Date(job.created_at) >= new Date(dateFromFilter)
      const matchesDateTo = !dateToFilter || new Date(job.created_at) <= new Date(dateToFilter)
      
      return matchesSearch && matchesCreator && matchesUrgency && matchesStatus && matchesDateFrom && matchesDateTo
    })
  }, [jobs, searchQuery, creatorFilter, urgencyFilter, statusFilter, dateFromFilter, dateToFilter])

  // Statistiques améliorées
  const stats = useMemo(() => {
    const total = jobs.length
    const clients = jobs.filter(j => j.created_by_role === 'client').length
    const recruteurs = jobs.filter(j => j.created_by_role === 'recruteur').length
    const managers = jobs.filter(j => j.created_by_role === 'manager').length
    const critiques = jobs.filter(j => j.urgency === 'critique').length
    const aValider = jobs.filter(j => j.status === 'a_valider' || j.status === 'brouillon').length
    const valides = jobs.filter(j => j.status === 'validé').length
    const enCours = jobs.filter(j => j.status === 'en_cours').length
    const gagnes = jobs.filter(j => j.status === 'gagne').length
    const archives = jobs.filter(j => j.status === 'archive').length
    const tresUrgent = jobs.filter(j => j.urgency === 'tres_urgent' || j.status === 'tres_urgent').length
    
    // Calculs de pourcentages
    const tauxValidation = total > 0 ? ((valides / total) * 100).toFixed(1) : '0'
    const tauxGagne = total > 0 ? ((gagnes / total) * 100).toFixed(1) : '0'
    const tauxArchive = total > 0 ? ((archives / total) * 100).toFixed(1) : '0'
    
    return { 
      total, 
      clients, 
      recruteurs, 
      managers, 
      critiques, 
      aValider,
      valides,
      enCours,
      gagnes,
      archives,
      tresUrgent,
      tauxValidation,
      tauxGagne,
      tauxArchive
    }
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
      'tres_urgent': { bg: 'bg-red-200', text: 'text-red-900', label: 'Très urgent' },
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
      'a_valider': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'À valider' },
      'urgent': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Urgent' },
      'tres_urgent': { bg: 'bg-red-100', text: 'text-red-800', label: 'Très urgent' },
      'besoin_courant': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Besoin courant' },
      'validé': { bg: 'bg-green-100', text: 'text-green-800', label: 'Validé' },
      'en_cours': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'En cours' },
      'gagne': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Gagné' },
      'standby': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Standby' },
      'archive': { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Archivé' },
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
    setStatusFilter('')
    setDateFromFilter('')
    setDateToFilter('')
  }

  const activeFiltersCount = [searchQuery, creatorFilter, urgencyFilter, statusFilter, dateFromFilter, dateToFilter].filter(Boolean).length

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Chargement des approbations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Approbations</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">Gestion et approbation de tous les besoins</p>
        </div>
        <button
          onClick={() => { loadJobs(); loadDeletedJobs(); }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Statistiques améliorées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Total besoins"
          value={stats.total}
          subtitle={`${stats.aValider} en attente`}
          icon={Briefcase}
          color="blue"
        />
        <StatCard
          title="À valider"
          value={stats.aValider}
          subtitle={`${stats.total > 0 ? ((stats.aValider / stats.total) * 100).toFixed(1) : 0}% du total`}
          icon={AlertCircle}
          color="yellow"
          trend={stats.aValider > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Validés"
          value={stats.valides}
          subtitle={`${stats.tauxValidation}% de validation`}
          icon={Check}
          color="green"
        />
        <StatCard
          title="Gagnés"
          value={stats.gagnes}
          subtitle={`${stats.tauxGagne}% de réussite`}
          icon={Trophy}
          color="purple"
        />
      </div>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Répartition par créateur */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Par créateur
          </h3>
          <div className="space-y-3">
            <MiniBarChart value={stats.clients} max={stats.total} label="Clients" color="green" />
            <MiniBarChart value={stats.recruteurs} max={stats.total} label="Recruteurs" color="blue" />
            <MiniBarChart value={stats.managers} max={stats.total} label="Managers" color="purple" />
          </div>
        </div>

        {/* Répartition par statut */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Par statut
          </h3>
          <div className="space-y-3">
            <MiniBarChart value={stats.enCours} max={stats.total} label="En cours" color="blue" />
            <MiniBarChart value={stats.archives} max={stats.total} label="Archivés" color="gray" />
            <MiniBarChart value={stats.gagnes} max={stats.total} label="Gagnés" color="green" />
          </div>
        </div>

        {/* Urgences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Urgences
          </h3>
          <div className="space-y-3">
            <MiniBarChart value={stats.tresUrgent} max={stats.total} label="Très urgent" color="red" />
            <MiniBarChart value={stats.critiques} max={stats.total} label="Critique" color="orange" />
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total urgent</span>
                <span className="font-semibold text-gray-900">{stats.tresUrgent + stats.critiques}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres améliorés */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par titre, département, entreprise, créateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm lg:text-base"
            />
          </div>
          
          {/* Bouton filtres */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
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

        {/* Panneau de filtres amélioré */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                  <option value="tres_urgent">Très urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="brouillon">Brouillon</option>
                  <option value="a_valider">À valider</option>
                  <option value="urgent">Urgent</option>
                  <option value="tres_urgent">Très urgent</option>
                  <option value="besoin_courant">Besoin courant</option>
                  <option value="validé">Validé</option>
                  <option value="en_cours">En cours</option>
                  <option value="gagne">Gagné</option>
                  <option value="standby">Standby</option>
                  <option value="archive">Archivé</option>
                  <option value="clôturé">Clôturé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
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

      {/* Onglets */}
      <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setShowDeleted(false)}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              !showDeleted
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Besoins actifs ({filteredJobs.length})
          </button>
          <button
            onClick={() => setShowDeleted(true)}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              showDeleted
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Besoins supprimés ({deletedJobs.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Liste des jobs ou historique des supprimés */}
      {!showDeleted ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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
                    className="p-5 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all bg-white relative"
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
                        
                        {/* Menu d'actions */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id || null)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          {openMenuId === job.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                                <div className="py-1">
                                  {/* Sélecteur de statut */}
                                  <div className="px-4 py-2 border-b border-gray-200">
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Changer le statut</label>
                                    <select
                                      value={job.status}
                                      onChange={(e) => handleStatusChange(job.id!, e.target.value)}
                                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="brouillon">Brouillon</option>
                                      <option value="a_valider">À valider</option>
                                      <option value="urgent">Urgent</option>
                                      <option value="tres_urgent">Très urgent</option>
                                      <option value="besoin_courant">Besoin courant</option>
                                      <option value="validé">Validé</option>
                                      <option value="en_cours">En cours</option>
                                      <option value="gagne">Gagné</option>
                                      <option value="standby">Standby</option>
                                      <option value="archive">Archivé</option>
                                      <option value="clôturé">Clôturé</option>
                                    </select>
                                  </div>
                                  
                                  {/* Actions rapides */}
                                  <button
                                    onClick={() => handleMarkAsWon(job.id!)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Trophy className="w-4 h-4 text-emerald-600" />
                                    Marquer comme gagné
                                  </button>
                                  
                                  <button
                                    onClick={() => handleArchive(job.id!)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Archive className="w-4 h-4 text-gray-600" />
                                    Archiver
                                  </button>
                                  
                                  <div className="border-t border-gray-200 my-1" />
                                  
                                  <button
                                    onClick={() => openValidationModal(job.id!, true)}
                                    className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                                  >
                                    <Check className="w-4 h-4" />
                                    Approuver
                                  </button>
                                  
                                  <button
                                    onClick={() => openValidationModal(job.id!, false)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <X className="w-4 h-4" />
                                    Rejeter
                                  </button>
                                  
                                  <div className="border-t border-gray-200 my-1" />
                                  
                                  <button
                                    onClick={() => handleDelete(job.id!)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
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
                  {searchQuery || creatorFilter || urgencyFilter || statusFilter || dateFromFilter || dateToFilter
                    ? 'Aucun besoin ne correspond à vos critères de recherche.'
                    : 'Aucun besoin à afficher'}
                </p>
                {searchQuery || creatorFilter || urgencyFilter || statusFilter || dateFromFilter || dateToFilter ? (
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
      ) : (
        /* Historique des besoins supprimés */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-600" />
                Historique des besoins supprimés ({deletedJobs.length})
              </h2>
            </div>
          </div>
          
          <div className="p-4 lg:p-6">
            {isLoadingDeleted ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Chargement de l'historique...</p>
              </div>
            ) : deletedJobs.length > 0 ? (
              <div className="space-y-4">
                {deletedJobs.map((deletedJob) => (
                  <div
                    key={deletedJob.job_id}
                    className="p-5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-base lg:text-lg mb-2">
                          {deletedJob.title}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {deletedJob.department && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                              {deletedJob.department}
                            </span>
                          )}
                          {deletedJob.last_status && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                              Statut: {deletedJob.last_status}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>Supprimé par: <strong>{deletedJob.deleted_by_name}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-400" />
                            <span>Supprimé le: <strong>{new Date(deletedJob.deleted_at).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</strong></span>
                          </div>
                          {deletedJob.created_at && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>Créé le: {new Date(deletedJob.created_at).toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'long',
                                year: 'numeric'
                              })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Aucun besoin supprimé</p>
                <p className="text-sm text-gray-400">L'historique des besoins supprimés apparaîtra ici</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de validation avec attribution de recruteurs */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {validationFeedback.includes('approuvé') ? 'Approuver le besoin' : 'Rejeter le besoin'}
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Commentaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire {validationFeedback.includes('approuvé') ? '(optionnel)' : ''}
                </label>
                <textarea
                  value={validationFeedback}
                  onChange={(e) => setValidationFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={validationFeedback.includes('approuvé') ? 'Ajouter un commentaire...' : 'Raison du rejet...'}
                />
              </div>

              {/* Sélection des recruteurs (uniquement si validation) */}
              {validationFeedback.includes('approuvé') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attribuer à un ou plusieurs recruteurs <span className="text-gray-500">(optionnel)</span>
                  </label>
                  
                  {isLoadingRecruiters ? (
                    <div className="text-center py-4 text-gray-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Chargement des recruteurs...</p>
                    </div>
                  ) : availableRecruiters.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {availableRecruiters.map((recruiter) => (
                        <label
                          key={recruiter.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecruiters.includes(recruiter.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecruiters([...selectedRecruiters, recruiter.id])
                              } else {
                                setSelectedRecruiters(selectedRecruiters.filter(id => id !== recruiter.id))
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {recruiter.first_name} {recruiter.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {recruiter.email}
                              {recruiter.department && ` • ${recruiter.department}`}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucun recruteur disponible</p>
                  )}
                  
                  {selectedRecruiters.length > 0 && (
                    <p className="mt-2 text-sm text-indigo-600">
                      {selectedRecruiters.length} recruteur{selectedRecruiters.length > 1 ? 's' : ''} sélectionné{selectedRecruiters.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowValidationModal(false)
                  setSelectedJobId(null)
                  setSelectedRecruiters([])
                  setValidationFeedback('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleValidateJob}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  validationFeedback.includes('approuvé')
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {validationFeedback.includes('approuvé') ? 'Approuver' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
