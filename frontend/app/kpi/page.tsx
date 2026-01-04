'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getRecruiterKPIs,
  getRecruiterKPIsAIAnalysis,
  getAvailableRecruiters,
  type RecruiterKPIs,
  type KPIAnalysis,
  type DetailedStatistics
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
  Download,
  X,
  MessageSquare,
  Award,
  Star,
  Sparkles,
  Loader2,
  AlertTriangle,
  Lightbulb
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
  icon: Icon,
  color = 'blue'
}: { 
  title: string, 
  value: number | null | string, 
  unit?: string,
  trend?: 'up' | 'down' | 'neutral',
  icon?: any,
  color?: string
}) {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600', icon: 'text-red-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-600' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: 'text-indigo-600' },
  }

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {Icon && (
          <div className={`${colors.bg} rounded-full p-2`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-2">
        <p className={`text-3xl font-bold ${colors.text}`}>
          {value === null || value === undefined ? 'N/A' : value}
        </p>
        {unit && value !== null && value !== undefined && (
          <span className="text-sm text-gray-500">{unit}</span>
        )}
        {trend && trend !== 'neutral' && (
          <div className={`${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RecruiterKPIPage() {
  const router = useRouter()
  const [recruiterKPIs, setRecruiterKPIs] = useState<RecruiterKPIs | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<KPIAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showAIAnalysis, setShowAIAnalysis] = useState(true)
  const { error: showError } = useToastContext()

  // Filtres
  const [filters, setFilters] = useState<{
    start_date: string
    end_date: string
    job_id: string
    source: string
    recruiter_id: string
  }>({
    start_date: '',
    end_date: '',
    job_id: '',
    source: '',
    recruiter_id: '',
  })
  
  const [recruiters, setRecruiters] = useState<Array<{ id: string; first_name: string; last_name: string; email: string }>>([])

  useEffect(() => {
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    loadRecruiters()
    loadKPIData()
  }, [router])
  
  const loadRecruiters = async () => {
    try {
      const data = await getAvailableRecruiters()
      setRecruiters(data)
    } catch (err) {
      // Si l'accès est refusé (403), c'est normal pour un recruteur
      // On ne charge simplement pas la liste des recruteurs
      if (err instanceof Error && err.message.includes('Accès refusé')) {
        console.log('Accès à la liste des recruteurs non autorisé (réservé aux managers)')
      } else {
        console.error('Erreur lors du chargement des recruteurs:', err)
      }
    }
  }

  const loadKPIData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const params: any = {}
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      if (filters.job_id) params.job_id = filters.job_id
      if (filters.source) params.source = filters.source
      if (filters.recruiter_id) params.recruiter_id = filters.recruiter_id

      const data = await getRecruiterKPIs(params)
      setRecruiterKPIs(data)
      
      // Charger l'analyse IA en parallèle
      loadAIAnalysis(params)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des KPI'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAIAnalysis = async (params: any) => {
    try {
      setIsLoadingAI(true)
      const analysis = await getRecruiterKPIsAIAnalysis(params)
      setAiAnalysis(analysis)
    } catch (err) {
      // Gérer spécifiquement les erreurs de rate limit
      if (err instanceof Error && (err as any).isRateLimit) {
        console.warn('Limite de requêtes OpenAI atteinte:', err.message)
        // Ne pas afficher d'erreur pour les rate limits - c'est temporaire
        // L'utilisateur pourra réessayer plus tard
      } else {
        console.error('Erreur lors du chargement de l\'analyse IA:', err)
      }
      // Ne pas bloquer l'affichage si l'analyse IA échoue
      setAiAnalysis(null)
    } finally {
      setIsLoadingAI(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApplyFilters = () => {
    loadKPIData()
    setShowFilters(false)
  }

  const handleResetFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      job_id: '',
      source: '',
    })
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Mes KPIs</h1>
            <p className="text-gray-600 mt-1">Mesurez votre performance et vos activités de recrutement</p>
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
            <div className={`grid grid-cols-1 md:grid-cols-2 ${recruiters.length > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
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
              {recruiters.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recruteur</label>
                  <select
                    value={filters.recruiter_id}
                    onChange={(e) => handleFilterChange('recruiter_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tous les recruteurs</option>
                    {recruiters.map((recruiter) => (
                      <option key={recruiter.id} value={recruiter.id}>
                        {recruiter.first_name} {recruiter.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <input
                  type="text"
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  placeholder="LinkedIn, APEC, etc."
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
      </div>

      {/* Analyse IA */}
      {showAIAnalysis && !isLoading && (
        <div className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Analyse IA des KPIs</h2>
            </div>
            {isLoadingAI && (
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            )}
          </div>

          {isLoadingAI ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
              <p className="text-gray-600">Analyse en cours...</p>
            </div>
          ) : aiAnalysis ? (
            <div className="space-y-6">
              {/* Résumé global */}
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Résumé global
                </h3>
                <p className="text-gray-700 leading-relaxed">{aiAnalysis.overall_summary}</p>
              </div>

              {/* Top recommandations */}
              {aiAnalysis.top_recommendations.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    Top Recommandations
                  </h3>
                  <ol className="space-y-2">
                    {aiAnalysis.top_recommendations.map((rec, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold">
                          {idx + 1}
                        </span>
                        <span className="text-gray-700 flex-1">{rec}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Insights clés */}
              {aiAnalysis.key_insights.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Insights Clés
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiAnalysis.key_insights.map((insight, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{insight.kpi_name}</h4>
                          <div className="flex items-center gap-1">
                            {insight.trend === 'improving' && (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            )}
                            {insight.trend === 'declining' && (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            {insight.priority === 'high' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Priorité
                              </span>
                            )}
                          </div>
                        </div>
                        {insight.current_value !== null && (
                          <p className="text-xs text-gray-500 mb-1">Valeur: {insight.current_value}</p>
                        )}
                        <p className="text-sm text-gray-700 mb-2">{insight.insight}</p>
                        <p className="text-xs text-purple-700 font-medium">{insight.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alertes de risques */}
              {aiAnalysis.risk_alerts.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Alertes de Risques
                  </h3>
                  <ul className="space-y-2">
                    {aiAnalysis.risk_alerts.map((alert, idx) => (
                      <li key={idx} className="flex gap-2 text-red-800">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>{alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opportunités */}
              {aiAnalysis.opportunities.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-600" />
                    Opportunités
                  </h3>
                  <ul className="space-y-2">
                    {aiAnalysis.opportunities.map((opp, idx) => (
                      <li key={idx} className="flex gap-2 text-green-800">
                        <Star className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tendances prédites */}
              {aiAnalysis.predicted_trends && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Tendances Prédites
                  </h3>
                  <p className="text-blue-800 leading-relaxed">{aiAnalysis.predicted_trends}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>Cliquez sur "Actualiser" pour générer l'analyse IA</p>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Chargement des KPI...</p>
        </div>
      ) : recruiterKPIs ? (
        <div className="space-y-6">
          {/* Vue d'ensemble - KPIs principaux */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Candidats sourcés"
              value={recruiterKPIs?.volume_productivity?.total_candidates_sourced ?? 0}
              icon={Users}
              color="blue"
            />
            <KPICard
              title="CV traités"
              value={recruiterKPIs?.volume_productivity?.total_cvs_processed ?? 0}
              icon={FileText}
              color="green"
            />
            <KPICard
              title="Entretiens réalisés"
              value={recruiterKPIs?.volume_productivity?.total_interviews_conducted ?? 0}
              icon={MessageSquare}
              color="purple"
            />
            <KPICard
              title="Postes gérés"
              value={recruiterKPIs?.recruiter_performance?.jobs_managed ?? 0}
              icon={Briefcase}
              color="orange"
            />
          </div>

          {/* Volume & Productivité */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Volume & Productivité
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <KPICard
                title="Total candidats sourcés"
                value={recruiterKPIs?.volume_productivity?.total_candidates_sourced ?? 0}
                icon={Users}
                color="blue"
              />
              <KPICard
                title="Total CV traités"
                value={recruiterKPIs?.volume_productivity?.total_cvs_processed ?? 0}
                icon={FileText}
                color="green"
              />
              <KPICard
                title="Entretiens réalisés"
                value={recruiterKPIs?.volume_productivity?.total_interviews_conducted ?? 0}
                icon={MessageSquare}
                color="purple"
              />
              <KPICard
                title="Ratio Clos / Ouverts"
                value={recruiterKPIs?.volume_productivity?.closed_vs_open_recruitments?.toFixed(2) ?? 'N/A'}
                icon={Activity}
                color="orange"
              />
            </div>

            {/* Statistiques de sourcing par période */}
            {recruiterKPIs?.volume_productivity?.sourcing_statistics && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                  Statistiques de Sourcing par Période
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Aujourd'hui</span>
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {recruiterKPIs.volume_productivity.sourcing_statistics.today_count}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats sourcés</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Ce mois</span>
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {recruiterKPIs.volume_productivity.sourcing_statistics.this_month_count}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats sourcés</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Cette année</span>
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      {recruiterKPIs.volume_productivity.sourcing_statistics.this_year_count}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats sourcés</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Moyenne par jour</span>
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-700">
                      {recruiterKPIs.volume_productivity.sourcing_statistics.per_day.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats/jour</p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-4 border border-teal-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Moyenne par mois</span>
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                    </div>
                    <p className="text-2xl font-bold text-teal-700">
                      {recruiterKPIs.volume_productivity.sourcing_statistics.per_month.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats/mois</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Moyenne par an</span>
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-indigo-700">
                      {recruiterKPIs.volume_productivity.sourcing_statistics.per_year.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">candidats/an</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Statistiques détaillées */}
          {recruiterKPIs?.detailed_statistics && (
            <div className="space-y-6">
              {/* Statistiques par étape du processus */}
              {recruiterKPIs.detailed_statistics.candidates_by_status && recruiterKPIs.detailed_statistics.candidates_by_status.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    Répartition par Étape du Processus
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recruiterKPIs.detailed_statistics.candidates_by_status.map((stat) => (
                      <div key={stat.status} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 capitalize">{stat.status.replace('_', ' ')}</span>
                          <Users className="w-4 h-4 text-gray-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                        <p className="text-xs text-gray-600 mt-1">{stat.percentage.toFixed(1)}% du total</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistiques par statut de besoin */}
              {recruiterKPIs.detailed_statistics.jobs_by_status && recruiterKPIs.detailed_statistics.jobs_by_status.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-purple-600" />
                    Répartition par Statut de Besoin
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recruiterKPIs.detailed_statistics.jobs_by_status.map((stat) => (
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

              {/* Performance par recruteur */}
              {recruiterKPIs.detailed_statistics.recruiters_performance && recruiterKPIs.detailed_statistics.recruiters_performance.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <UserCheck className="w-5 h-5 mr-2 text-green-600" />
                    Performance par Recruteur
                  </h2>
                  <div className="space-y-4">
                    {recruiterKPIs.detailed_statistics.recruiters_performance.map((perf) => (
                      <div key={perf.recruiter_id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-md font-semibold text-gray-900">{perf.recruiter_name}</h3>
                          <UserCheck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Candidats sourcés</p>
                            <p className="text-xl font-bold text-blue-700">{perf.total_candidates_sourced}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Besoins gérés</p>
                            <p className="text-xl font-bold text-purple-700">{perf.total_jobs_managed}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Moyenne/jour</p>
                            <p className="text-xl font-bold text-green-700">{perf.sourcing_statistics.per_day.toFixed(1)}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Répartition par statut candidat:</p>
                          <div className="flex flex-wrap gap-2">
                            {perf.candidates_by_status.filter(s => s.count > 0).map((stat) => (
                              <span key={stat.status} className="px-2 py-1 bg-white rounded text-xs text-gray-700 border border-gray-300">
                                {stat.status.replace('_', ' ')}: {stat.count}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Qualité & Sélection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-600" />
              Qualité & Sélection
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <BarChart
                  value={recruiterKPIs?.quality_selection?.qualified_candidates_rate ?? null}
                  max={100}
                  label="Taux de candidats qualifiés (%)"
                  color="green"
                />
                <BarChart
                  value={recruiterKPIs?.quality_selection?.shortlist_acceptance_rate ?? null}
                  max={100}
                  label="% Shortlist acceptée"
                  color="blue"
                />
              </div>
              <div className="space-y-4">
                {recruiterKPIs?.quality_selection?.average_candidate_score !== null && recruiterKPIs?.quality_selection?.average_candidate_score !== undefined && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Score moyen candidat</span>
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {recruiterKPIs.quality_selection.average_candidate_score?.toFixed(1)}/10
                    </p>
                  </div>
                )}
                {recruiterKPIs?.quality_selection?.rejection_rate_per_stage !== null && recruiterKPIs?.quality_selection?.rejection_rate_per_stage !== undefined && (
                  <BarChart
                    value={recruiterKPIs.quality_selection.rejection_rate_per_stage}
                    max={100}
                    label="Taux de rejet par étape (%)"
                    color="red"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Temps & Process */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Temps & Process
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <KPICard
                title="Time to Hire"
                value={recruiterKPIs?.time_process?.time_to_hire ?? null}
                unit="jours"
                icon={Clock}
                color="blue"
              />
              {recruiterKPIs?.time_process?.average_cycle_per_stage !== null && recruiterKPIs?.time_process?.average_cycle_per_stage !== undefined && (
                <KPICard
                  title="Cycle moyen par étape"
                  value={recruiterKPIs.time_process.average_cycle_per_stage}
                  unit="jours"
                  icon={Activity}
                  color="green"
                />
              )}
              {recruiterKPIs?.time_process?.average_feedback_delay !== null && recruiterKPIs?.time_process?.average_feedback_delay !== undefined && (
                <KPICard
                  title="Délai moyen feedback"
                  value={recruiterKPIs.time_process.average_feedback_delay}
                  unit="jours"
                  icon={MessageSquare}
                  color="orange"
                />
              )}
              {recruiterKPIs?.time_process?.percentage_jobs_on_time !== null && recruiterKPIs?.time_process?.percentage_jobs_on_time !== undefined && (
                <div className="space-y-2">
                  <BarChart
                    value={recruiterKPIs.time_process.percentage_jobs_on_time}
                    max={100}
                    label="% Postes respectant le délai"
                    color="green"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Engagement & Conversion */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-600" />
              Engagement & Conversion
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <BarChart
                  value={recruiterKPIs?.engagement_conversion?.offer_acceptance_rate ?? null}
                  max={100}
                  label="Taux acceptation offre (%)"
                  color="green"
                />
              </div>
              <div className="space-y-3">
                <BarChart
                  value={recruiterKPIs?.engagement_conversion?.offer_rejection_rate ?? null}
                  max={100}
                  label="Taux refus offre (%)"
                  color="red"
                />
              </div>
              <div className="space-y-3">
                {recruiterKPIs?.engagement_conversion?.candidate_response_rate !== null && recruiterKPIs?.engagement_conversion?.candidate_response_rate !== undefined && (
                  <BarChart
                    value={recruiterKPIs.engagement_conversion.candidate_response_rate}
                    max={100}
                    label="Taux réponse candidat (%)"
                    color="blue"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Performance Recruteur */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-indigo-600" />
              Ma Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Postes gérés"
                value={recruiterKPIs?.recruiter_performance?.jobs_managed ?? 0}
                icon={Briefcase}
                color="blue"
              />
              {recruiterKPIs?.recruiter_performance?.success_rate !== null && recruiterKPIs?.recruiter_performance?.success_rate !== undefined && (
                <div className="space-y-2">
                  <BarChart
                    value={recruiterKPIs.recruiter_performance.success_rate}
                    max={100}
                    label="Taux de réussite (%)"
                    color="green"
                  />
                </div>
              )}
              {recruiterKPIs?.recruiter_performance?.average_time_per_stage !== null && recruiterKPIs?.recruiter_performance?.average_time_per_stage !== undefined && (
                <KPICard
                  title="Temps moyen par étape"
                  value={recruiterKPIs.recruiter_performance.average_time_per_stage}
                  unit="jours"
                  icon={Clock}
                  color="orange"
                />
              )}
              {recruiterKPIs?.recruiter_performance?.feedbacks_on_time_rate !== null && recruiterKPIs?.recruiter_performance?.feedbacks_on_time_rate !== undefined && (
                <div className="space-y-2">
                  <BarChart
                    value={recruiterKPIs.recruiter_performance.feedbacks_on_time_rate}
                    max={100}
                    label="Feedbacks à temps (%)"
                    color="purple"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Source & Canal */}
          {(recruiterKPIs?.source_channel?.performance_per_source !== null || 
            recruiterKPIs?.source_channel?.conversion_rate_per_source !== null ||
            recruiterKPIs?.source_channel?.average_sourcing_time !== null) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                Source & Canal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recruiterKPIs?.source_channel?.performance_per_source !== null && recruiterKPIs?.source_channel?.performance_per_source !== undefined && (
                  <div className="space-y-2">
                    <BarChart
                      value={recruiterKPIs.source_channel.performance_per_source}
                      max={100}
                      label="Performance par source (%)"
                      color="blue"
                    />
                  </div>
                )}
                {recruiterKPIs?.source_channel?.conversion_rate_per_source !== null && recruiterKPIs?.source_channel?.conversion_rate_per_source !== undefined && (
                  <div className="space-y-2">
                    <BarChart
                      value={recruiterKPIs.source_channel.conversion_rate_per_source}
                      max={100}
                      label="Taux conversion par source (%)"
                      color="green"
                    />
                  </div>
                )}
                {recruiterKPIs?.source_channel?.average_sourcing_time !== null && recruiterKPIs?.source_channel?.average_sourcing_time !== undefined && (
                  <KPICard
                    title="Temps moyen de sourcing"
                    value={recruiterKPIs.source_channel.average_sourcing_time}
                    unit="jours"
                    icon={Clock}
                    color="orange"
                  />
                )}
              </div>
            </div>
          )}

          {/* Onboarding */}
          {(recruiterKPIs?.onboarding?.onboarding_success_rate !== null ||
            recruiterKPIs?.onboarding?.average_onboarding_delay !== null ||
            (recruiterKPIs?.onboarding?.post_integration_issues_count ?? 0) > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-purple-600" />
                Onboarding
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recruiterKPIs?.onboarding?.onboarding_success_rate !== null && recruiterKPIs?.onboarding?.onboarding_success_rate !== undefined && (
                  <div className="space-y-2">
                    <BarChart
                      value={recruiterKPIs.onboarding.onboarding_success_rate}
                      max={100}
                      label="Taux réussite onboarding (%)"
                      color="green"
                    />
                  </div>
                )}
                {recruiterKPIs?.onboarding?.average_onboarding_delay !== null && recruiterKPIs?.onboarding?.average_onboarding_delay !== undefined && (
                  <KPICard
                    title="Délai moyen d'onboarding"
                    value={recruiterKPIs.onboarding.average_onboarding_delay}
                    unit="jours"
                    icon={Clock}
                    color="blue"
                  />
                )}
                <KPICard
                  title="Problèmes post-intégration"
                  value={recruiterKPIs?.onboarding?.post_integration_issues_count ?? 0}
                  icon={AlertCircle}
                  color="red"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Aucune donnée KPI disponible</p>
        </div>
      )}
    </div>
  )
}
