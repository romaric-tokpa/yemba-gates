'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getClientKPIs,
  type ClientKPIs
} from '@/lib/api'
import { isAuthenticated, getToken } from '@/lib/auth'
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
  Activity,
  FileText,
  Briefcase,
  Filter,
  RefreshCw,
  Calendar,
  MessageSquare,
  Award,
  Star,
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

// Composant pour afficher une carte KPI
function KPICard({ 
  title, 
  value, 
  unit = '', 
  icon: Icon,
  color = 'blue',
  subtitle
}: { 
  title: string, 
  value: number | null | string, 
  unit?: string,
  icon?: any,
  color?: string,
  subtitle?: string
}) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-600' },
  }

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${colors.border} p-6 hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${colors.bg} rounded-lg p-3`}>
          {Icon && <Icon className={`w-6 h-6 ${colors.icon}`} />}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className={`text-3xl font-bold ${colors.text}`}>
          {value === null || value === undefined ? 'N/A' : value}
          {unit && value !== null && value !== undefined && ` ${unit}`}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

export default function ClientKPIPage() {
  const router = useRouter()
  const [clientKPIs, setClientKPIs] = useState<ClientKPIs | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const { error: showError } = useToastContext()

  // Filtres
  const [filters, setFilters] = useState<{
    start_date: string
    end_date: string
    job_id: string
  }>({
    start_date: '',
    end_date: '',
    job_id: '',
  })

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    loadKPIData()
  }, [router])

  const loadKPIData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const params: any = {}
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      if (filters.job_id) params.job_id = filters.job_id

      const data = await getClientKPIs(params)
      setClientKPIs(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des KPI'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      job_id: '',
    })
  }

  const handleApplyFilters = () => {
    loadKPIData()
  }

  return (
    <div className="p-4 lg:p-8">
      {/* En-tête */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Mes KPIs</h1>
            <p className="text-gray-600 mt-1">Suivez la performance de vos besoins de recrutement</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </button>
            <button
              onClick={loadKPIData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Panneau de filtres */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Besoin</label>
                <input
                  type="text"
                  value={filters.job_id}
                  onChange={(e) => handleFilterChange('job_id', e.target.value)}
                  placeholder="ID du besoin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {isLoading && !clientKPIs ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Chargement des KPIs...</p>
          </div>
        ) : clientKPIs ? (
          <div className="space-y-6">
            {/* Vue d'ensemble */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Besoins créés"
                value={clientKPIs.total_jobs_created}
                icon={Briefcase}
                color="blue"
              />
              <KPICard
                title="Candidats en shortlist"
                value={clientKPIs.total_candidates_in_shortlist}
                icon={Users}
                color="green"
              />
              <KPICard
                title="Candidats validés"
                value={clientKPIs.total_candidates_validated}
                icon={CheckCircle}
                color="green"
              />
              <KPICard
                title="Entretiens planifiés"
                value={clientKPIs.total_interviews_scheduled}
                icon={MessageSquare}
                color="purple"
              />
            </div>

            {/* Statistiques de validation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                Validation des Candidats
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                  title="Taux de validation"
                  value={clientKPIs.validation_rate?.toFixed(1) ?? 'N/A'}
                  unit="%"
                  icon={Award}
                  color="green"
                  subtitle={`${clientKPIs.total_candidates_validated} validés sur ${clientKPIs.total_candidates_in_shortlist} en shortlist`}
                />
                <KPICard
                  title="Candidats validés"
                  value={clientKPIs.total_candidates_validated}
                  icon={CheckCircle}
                  color="green"
                />
                <KPICard
                  title="Candidats rejetés"
                  value={clientKPIs.total_candidates_rejected}
                  icon={XCircle}
                  color="red"
                />
              </div>
            </div>

            {/* Temps de recrutement */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Temps de Recrutement
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <BarChart
                    value={clientKPIs.average_time_to_hire}
                    max={120}
                    label="Temps moyen d'embauche (jours)"
                    color="blue"
                  />
                  {clientKPIs.average_time_to_hire && (
                    <p className="text-sm text-gray-600">
                      Temps moyen entre la création du besoin et l'embauche
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <BarChart
                    value={clientKPIs.average_time_to_fill}
                    max={90}
                    label="Temps moyen de pourvoir (jours)"
                    color="green"
                  />
                  {clientKPIs.average_time_to_fill && (
                    <p className="text-sm text-gray-600">
                      Temps moyen entre la validation du besoin et l'envoi d'offre
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <BarChart
                    value={clientKPIs.jobs_on_time_rate}
                    max={100}
                    label="% Postes respectant délai"
                    color="purple"
                  />
                  {clientKPIs.jobs_on_time_rate && (
                    <p className="text-sm text-gray-600">
                      Pourcentage de postes clôturés dans les 60 jours
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Répartition par statut de besoin */}
            {clientKPIs.jobs_by_status && clientKPIs.jobs_by_status.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-purple-600" />
                  Répartition par Statut de Besoin
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {clientKPIs.jobs_by_status.filter(stat => stat.count > 0).map((stat) => (
                    <div key={stat.status} className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">{stat.status.replace('_', ' ')}</span>
                        <Briefcase className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold text-purple-700">{stat.count}</p>
                      <p className="text-xs text-gray-600 mt-1">{stat.percentage.toFixed(1)}% du total</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistiques de sourcing par période */}
            {clientKPIs.sourcing_statistics && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                  Statistiques de Sourcing par Période
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Aujourd'hui</span>
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {clientKPIs.sourcing_statistics.today_count}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats sourcés</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Ce mois</span>
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {clientKPIs.sourcing_statistics.this_month_count}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats sourcés</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Cette année</span>
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      {clientKPIs.sourcing_statistics.this_year_count}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats sourcés</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Moyenne par jour</span>
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-700">
                      {clientKPIs.sourcing_statistics.per_day.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats/jour</p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-4 border border-teal-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Moyenne par mois</span>
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                    </div>
                    <p className="text-2xl font-bold text-teal-700">
                      {clientKPIs.sourcing_statistics.per_month.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats/mois</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Moyenne par an</span>
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-indigo-700">
                      {clientKPIs.sourcing_statistics.per_year.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats/an</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </div>
  )
}

