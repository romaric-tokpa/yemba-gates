'use client'

import { useState, useEffect } from 'react'
import { 
  getKPISummary, 
  getRecruitersPerformance, 
  getManagerKPIs,
  getUsersByManager,
  getJobs,
  type KPISummary, 
  type RecruiterPerformance,
  type ManagerKPIs,
  type UserCreateResponse,
  type JobResponse
} from '@/lib/api'
import { useToastContext } from '@/components/ToastProvider'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Target,
  DollarSign,
  Activity,
  FileText,
  Briefcase,
  Filter,
  RefreshCw,
  Calendar,
  UserCheck,
  Zap,
  AlertCircle,
  TrendingUp as TrendingUpIcon,
  Download,
  X
} from 'lucide-react'

// Composant pour afficher un graphique en barres simple
function BarChart({ value, max, label, color = 'blue' }: { 
  value: number | null, 
  max: number, 
  label: string,
  color?: string 
}) {
  if (value === null || value === undefined) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="text-gray-400">N/A</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="bg-gray-300 h-4 rounded-full flex items-center justify-center text-xs text-gray-500">
            Données non disponibles
          </div>
        </div>
      </div>
    )
  }

  const percentage = Math.min((value / max) * 100, 100)
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    orange: 'bg-orange-600',
    purple: 'bg-purple-600',
    indigo: 'bg-indigo-600',
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
          {label.includes('%') ? '%' : label.includes('jours') ? ' j' : ''}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div 
          className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} h-4 rounded-full transition-all flex items-center justify-end pr-2`}
          style={{ width: `${percentage}%` }}
        >
          {percentage > 20 && (
            <span className="text-xs text-white font-medium">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Composant pour afficher un KPI avec indicateur de tendance
function KPICard({ 
  title, 
  value, 
  unit = '', 
  trend, 
  trendValue,
  icon: Icon,
  color = 'blue',
  subtitle,
  onClick
}: { 
  title: string, 
  value: number | null | string, 
  unit?: string,
  trend?: 'up' | 'down' | 'neutral',
  trendValue?: string,
  icon?: any,
  color?: string,
  subtitle?: string,
  onClick?: () => void
}) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600', accent: 'bg-blue-500' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600', accent: 'bg-green-500' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600', accent: 'bg-red-500' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600', accent: 'bg-orange-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600', accent: 'bg-purple-500' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-600', accent: 'bg-indigo-500' },
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
            {value === null || value === undefined ? 'N/A' : value}
          </p>
          {unit && value !== null && value !== undefined && (
            <span className="text-sm text-gray-500">{unit}</span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

// Composant de filtre
function FilterPanel({
  filters,
  onFilterChange,
  recruiters,
  jobs,
  sources,
  onReset
}: {
  filters: any,
  onFilterChange: (key: string, value: any) => void,
  recruiters: UserCreateResponse[],
  jobs: JobResponse[],
  sources: string[],
  onReset: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
          {(filters.start_date || filters.end_date || filters.recruiter_id || filters.job_id || filters.source) && (
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {[
                filters.start_date,
                filters.end_date,
                filters.recruiter_id,
                filters.job_id,
                filters.source
              ].filter(Boolean).length}
            </span>
          )}
        </button>
        {(filters.start_date || filters.end_date || filters.recruiter_id || filters.job_id || filters.source) && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date début
              </label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => onFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date fin
              </label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => onFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recruteur
              </label>
              <select
                value={filters.recruiter_id || ''}
                onChange={(e) => onFilterChange('recruiter_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.first_name} {r.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poste
              </label>
              <select
                value={filters.job_id || ''}
                onChange={(e) => onFilterChange('job_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={filters.source || ''}
                onChange={(e) => onFilterChange('source', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ManagerKPIPage() {
  const { success, error: showError } = useToastContext()
  const [kpiSummary, setKpiSummary] = useState<KPISummary | null>(null)
  const [managerKPIs, setManagerKPIs] = useState<ManagerKPIs | null>(null)
  const [recruitersPerf, setRecruitersPerf] = useState<RecruiterPerformance[]>([])
  const [recruiters, setRecruiters] = useState<UserCreateResponse[]>([])
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview')
  const [filters, setFilters] = useState<{
    start_date?: string
    end_date?: string
    recruiter_id?: string | null
    job_id?: string | null
    source?: string | null
  }>({})

  useEffect(() => {
    loadFilterData()
  }, [])

  useEffect(() => {
    loadKPIData()
  }, [filters])

  const loadFilterData = async () => {
    try {
      const [recruitersData, jobsData] = await Promise.all([
        getUsersByManager('recruteur').catch(() => []),
        getJobs().catch(() => [])
      ])
      setRecruiters(recruitersData)
      setJobs(jobsData)
      
      // Extraire les sources uniques des jobs
      const uniqueSources = Array.from(new Set(
        jobsData.flatMap(job => job.source ? [job.source] : [])
      )).filter(Boolean) as string[]
      setSources(uniqueSources)
    } catch (err) {
      console.error('Erreur lors du chargement des données de filtre:', err)
    }
  }

  const loadKPIData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Préparer les paramètres de filtre
      const params: any = {}
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      if (filters.recruiter_id) params.recruiter_id = filters.recruiter_id
      if (filters.job_id) params.job_id = filters.job_id
      if (filters.source) params.source = filters.source
      
      // Charger le résumé et les KPI détaillés en parallèle
      const [summary, managerData, recruiters] = await Promise.all([
        getKPISummary().catch(() => null),
        getManagerKPIs(Object.keys(params).length > 0 ? params : undefined).catch(() => null),
        getRecruitersPerformance().catch(() => []),
      ])
      
      setKpiSummary(summary)
      setManagerKPIs(managerData)
      setRecruitersPerf(recruiters)
      
      if (summary || managerData) {
        success('KPI chargés avec succès')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des KPI'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleResetFilters = () => {
    setFilters({})
  }

  return (
    <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Dashboard KPI Manager</h1>
          <p className="text-sm lg:text-base text-gray-600">
            Vue d&apos;ensemble des performances de recrutement
          </p>
        </div>
        <button
          onClick={loadKPIData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Panneau de filtres */}
      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        recruiters={recruiters}
        jobs={jobs}
        sources={sources}
        onReset={handleResetFilters}
      />

      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6 bg-white rounded-lg shadow-sm">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Vue d&apos;ensemble
          </button>
          <button
            onClick={() => setActiveTab('detailed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'detailed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            KPI détaillés
          </button>
        </nav>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Chargement des KPI...</p>
        </div>
      ) : (
        <>
          {activeTab === 'overview' ? (
            <>
              {/* Résumé global */}
              {kpiSummary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 mb-8">
                  <KPICard
                    title="Total candidats"
                    value={kpiSummary.total_candidates}
                    icon={Users}
                    color="blue"
                  />
                  <KPICard
                    title="Total jobs"
                    value={kpiSummary.total_jobs}
                    icon={BarChart3}
                    color="purple"
                  />
                  <KPICard
                    title="Jobs actifs"
                    value={kpiSummary.active_jobs}
                    icon={Activity}
                    color="green"
                  />
                  <KPICard
                    title="En shortlist"
                    value={kpiSummary.candidates_in_shortlist}
                    icon={Target}
                    color="orange"
                  />
                  <KPICard
                    title="Embauchés"
                    value={kpiSummary.candidates_hired}
                    icon={CheckCircle}
                    color="green"
                  />
                </div>
              )}

              {/* KPI Temps & Process */}
              {managerKPIs && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Clock className="w-6 h-6 text-blue-600" />
                      Temps & Process
                    </h2>
                    <div className="space-y-6">
                      <KPICard
                        title="Time to Hire"
                        value={managerKPIs.time_process.time_to_hire?.toFixed(1)}
                        unit="jours"
                        icon={Clock}
                        color="blue"
                        subtitle="Délai moyen d'embauche"
                      />
                      <KPICard
                        title="Time to Fill"
                        value={managerKPIs.time_process.time_to_fill?.toFixed(1)}
                        unit="jours"
                        icon={Clock}
                        color="green"
                        subtitle="Délai moyen de remplissage"
                      />
                      <KPICard
                        title="Cycle moyen par étape"
                        value={managerKPIs.time_process.average_cycle_per_stage?.toFixed(1)}
                        unit="jours"
                        icon={Activity}
                        color="purple"
                        subtitle="Durée moyenne par étape"
                      />
                      <KPICard
                        title="Délai moyen feedback"
                        value={managerKPIs.time_process.average_feedback_delay?.toFixed(1)}
                        unit="jours"
                        icon={Clock}
                        color="orange"
                        subtitle="Temps de retour moyen"
                      />
                      <div className="pt-4 border-t">
                        <BarChart
                          value={managerKPIs.time_process.percentage_jobs_on_time}
                          max={100}
                          label="% Postes respectant délai"
                          color="green"
                        />
                      </div>
                    </div>
                  </div>

                  {/* KPI Qualité & Sélection */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Target className="w-6 h-6 text-green-600" />
                      Qualité & Sélection
                    </h2>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <BarChart
                          value={managerKPIs.quality_selection.qualified_candidates_rate}
                          max={100}
                          label="Taux candidats qualifiés (%)"
                          color="green"
                        />
                        <BarChart
                          value={managerKPIs.quality_selection.rejection_rate_per_stage}
                          max={100}
                          label="Taux de rejet par étape (%)"
                          color="red"
                        />
                        <BarChart
                          value={managerKPIs.quality_selection.shortlist_acceptance_rate}
                          max={100}
                          label="% Shortlist acceptée"
                          color="blue"
                        />
                        <BarChart
                          value={managerKPIs.quality_selection.average_candidate_score}
                          max={10}
                          label="Score moyen candidat (/10)"
                          color="purple"
                        />
                        <BarChart
                          value={managerKPIs.quality_selection.no_show_rate}
                          max={100}
                          label="Taux de no-show entretien (%)"
                          color="orange"
                        />
                        <BarChart
                          value={managerKPIs.quality_selection.turnover_rate_post_onboarding}
                          max={100}
                          label="Taux de turnover post-onboarding (%)"
                          color="red"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Volume & Productivité */}
              {managerKPIs && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-purple-600" />
                    Volume & Productivité
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard
                      title="Candidats sourcés"
                      value={managerKPIs.volume_productivity.total_candidates_sourced}
                      icon={Users}
                      color="blue"
                    />
                    <KPICard
                      title="CV traités"
                      value={managerKPIs.volume_productivity.total_cvs_processed}
                      icon={FileText}
                      color="green"
                    />
                    <KPICard
                      title="Entretiens réalisés"
                      value={managerKPIs.volume_productivity.total_interviews_conducted}
                      icon={Activity}
                      color="purple"
                    />
                    <KPICard
                      title="Clos / Ouverts"
                      value={managerKPIs.volume_productivity.closed_vs_open_recruitments?.toFixed(2)}
                      icon={BarChart3}
                      color="orange"
                    />
                  </div>
                </div>
              )}

              {/* KPI Engagement & Satisfaction */}
              {managerKPIs && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-orange-600" />
                    Engagement & Satisfaction
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <BarChart
                        value={managerKPIs.engagement_satisfaction.offer_acceptance_rate}
                        max={100}
                        label="Taux acceptation offre (%)"
                        color="green"
                      />
                    </div>
                    <div className="space-y-3">
                      <BarChart
                        value={managerKPIs.engagement_satisfaction.offer_rejection_rate}
                        max={100}
                        label="Taux refus offre (%)"
                        color="red"
                      />
                    </div>
                    <div className="space-y-3">
                      <BarChart
                        value={managerKPIs.engagement_satisfaction.candidate_response_rate}
                        max={100}
                        label="Taux réponse candidat (%)"
                        color="blue"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Performance des recruteurs */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    Performance par recruteur
                  </h2>
                </div>
                <div className="p-6">
                  {recruitersPerf.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Aucune donnée disponible</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recruteur</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidats</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobs</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">En shortlist</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Embauchés</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recruitersPerf.map((perf) => (
                            <tr key={perf.recruiter_id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                {perf.recruiter_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-900">{perf.total_candidates}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-900">{perf.total_jobs}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">{perf.candidates_in_shortlist}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-purple-600 font-medium">{perf.candidates_hired}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Vue détaillée avec tous les KPI */
            managerKPIs && (
              <div className="space-y-8">
                {/* Temps & Process - Détails */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    Temps & Process
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <KPICard
                      title="Time to Hire"
                      value={managerKPIs.time_process.time_to_hire?.toFixed(1)}
                      unit="jours"
                      icon={Clock}
                      color="blue"
                    />
                    <KPICard
                      title="Time to Fill"
                      value={managerKPIs.time_process.time_to_fill?.toFixed(1)}
                      unit="jours"
                      icon={Clock}
                      color="green"
                    />
                    <KPICard
                      title="Cycle moyen par étape"
                      value={managerKPIs.time_process.average_cycle_per_stage?.toFixed(1)}
                      unit="jours"
                      icon={Activity}
                      color="purple"
                    />
                    <KPICard
                      title="Délai moyen feedback"
                      value={managerKPIs.time_process.average_feedback_delay?.toFixed(1)}
                      unit="jours"
                      icon={Clock}
                      color="orange"
                    />
                    <div className="space-y-3">
                      <BarChart
                        value={managerKPIs.time_process.percentage_jobs_on_time}
                        max={100}
                        label="% Postes respectant délai"
                        color="green"
                      />
                    </div>
                  </div>
                </div>

                {/* Qualité & Sélection - Détails */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Target className="w-6 h-6 text-green-600" />
                    Qualité & Sélection
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <BarChart
                        value={managerKPIs.quality_selection.qualified_candidates_rate}
                        max={100}
                        label="Taux candidats qualifiés (%)"
                        color="green"
                      />
                      <BarChart
                        value={managerKPIs.quality_selection.rejection_rate_per_stage}
                        max={100}
                        label="Taux de rejet par étape (%)"
                        color="red"
                      />
                    </div>
                    <div className="space-y-4">
                      <BarChart
                        value={managerKPIs.quality_selection.shortlist_acceptance_rate}
                        max={100}
                        label="% Shortlist acceptée"
                        color="blue"
                      />
                      <BarChart
                        value={managerKPIs.quality_selection.average_candidate_score}
                        max={10}
                        label="Score moyen candidat (/10)"
                        color="purple"
                      />
                    </div>
                    <div className="space-y-4">
                      <BarChart
                        value={managerKPIs.quality_selection.no_show_rate}
                        max={100}
                        label="Taux de no-show entretien (%)"
                        color="orange"
                      />
                      <BarChart
                        value={managerKPIs.quality_selection.turnover_rate_post_onboarding}
                        max={100}
                        label="Taux de turnover post-onboarding (%)"
                        color="red"
                      />
                    </div>
                  </div>
                </div>

                {/* Volume & Productivité - Détails */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    Volume & Productivité
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard
                      title="Candidats sourcés"
                      value={managerKPIs.volume_productivity.total_candidates_sourced}
                      icon={Users}
                      color="blue"
                    />
                    <KPICard
                      title="CV traités"
                      value={managerKPIs.volume_productivity.total_cvs_processed}
                      icon={FileText}
                      color="green"
                    />
                    <KPICard
                      title="Entretiens réalisés"
                      value={managerKPIs.volume_productivity.total_interviews_conducted}
                      icon={Activity}
                      color="purple"
                    />
                    <KPICard
                      title="Clos / Ouverts"
                      value={managerKPIs.volume_productivity.closed_vs_open_recruitments?.toFixed(2)}
                      icon={BarChart3}
                      color="orange"
                    />
                  </div>
                </div>

                {/* Coût / Budget */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    Coût / Budget
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard
                      title="Coût moyen recrutement"
                      value={managerKPIs.cost_budget.average_recruitment_cost?.toFixed(2)}
                      unit="F CFA"
                      icon={DollarSign}
                      color="blue"
                    />
                    <KPICard
                      title="Coût par source"
                      value={managerKPIs.cost_budget.cost_per_source?.toFixed(2)}
                      unit="F CFA"
                      icon={DollarSign}
                      color="green"
                    />
                    <div className="space-y-3">
                      <BarChart
                        value={managerKPIs.cost_budget.budget_spent_vs_planned}
                        max={100}
                        label="Budget dépensé vs prévu (%)"
                        color="orange"
                      />
                    </div>
                  </div>
                </div>

                {/* Performance Recruteurs */}
                {managerKPIs.recruiter_performance && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Briefcase className="w-6 h-6 text-purple-600" />
                      Performance Recruteurs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <KPICard
                        title="Jobs gérés"
                        value={managerKPIs.recruiter_performance.jobs_managed}
                        icon={Briefcase}
                        color="blue"
                      />
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.recruiter_performance.success_rate}
                          max={100}
                          label="Taux de réussite (%)"
                          color="green"
                        />
                      </div>
                      <KPICard
                        title="Temps moyen par étape"
                        value={managerKPIs.recruiter_performance.average_time_per_stage?.toFixed(1)}
                        unit="jours"
                        icon={Clock}
                        color="orange"
                      />
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.recruiter_performance.feedbacks_on_time_rate}
                          max={100}
                          label="Feedbacks à temps (%)"
                          color="purple"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Source & Canal */}
                {managerKPIs.source_channel && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Target className="w-6 h-6 text-orange-600" />
                      Source & Canal
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.source_channel.performance_per_source}
                          max={100}
                          label="Performance par source (%)"
                          color="blue"
                        />
                      </div>
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.source_channel.conversion_rate_per_source}
                          max={100}
                          label="Taux conversion par source (%)"
                          color="green"
                        />
                      </div>
                      <KPICard
                        title="Temps moyen sourcing"
                        value={managerKPIs.source_channel.average_sourcing_time?.toFixed(1)}
                        unit="jours"
                        icon={Clock}
                        color="orange"
                      />
                    </div>
                  </div>
                )}

                {/* Onboarding */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                    Onboarding
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <BarChart
                        value={managerKPIs.onboarding.onboarding_success_rate}
                        max={100}
                        label="Taux réussite onboarding (%)"
                        color="green"
                      />
                    </div>
                    <KPICard
                      title="Délai moyen onboarding"
                      value={managerKPIs.onboarding.average_onboarding_delay?.toFixed(1)}
                      unit="jours"
                      icon={Clock}
                      color="blue"
                    />
                    <KPICard
                      title="Problèmes post-intégration"
                      value={managerKPIs.onboarding.post_integration_issues_count}
                      icon={XCircle}
                      color="red"
                    />
                  </div>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
