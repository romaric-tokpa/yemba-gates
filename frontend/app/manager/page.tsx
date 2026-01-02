'use client'

import { useState, useEffect } from 'react'
import { 
  getPendingValidationJobs, 
  getManagerKPIs, 
  getKPISummary,
  getRecruitersPerformance,
  type JobResponse, 
  type ManagerKPIs,
  type KPISummary,
  type RecruiterPerformance
} from '@/lib/api'
import { useToastContext } from '@/components/ToastProvider'
import { 
  CheckCircle, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Users, 
  Briefcase,
  AlertCircle,
  ArrowRight,
  Calendar,
  Target,
  DollarSign,
  Activity,
  FileText,
  UserPlus,
  Settings,
  RefreshCw,
  Eye,
  Zap
} from 'lucide-react'
import Link from 'next/link'

// Composant pour afficher un KPI avec indicateur de tendance
function StatCard({ 
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

// Composant pour les actions rapides
function QuickActionCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  badge,
  color = 'blue'
}: {
  title: string,
  description: string,
  icon: any,
  href: string,
  badge?: number,
  color?: string
}) {
  const colorClasses = {
    blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', light: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-600', hover: 'hover:bg-green-700', light: 'bg-green-50', text: 'text-green-600' },
    purple: { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', light: 'bg-purple-50', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-600', hover: 'hover:bg-orange-700', light: 'bg-orange-50', text: 'text-orange-600' },
  }

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue

  return (
    <Link
      href={href}
      className={`${colors.bg} ${colors.hover} text-white rounded-xl p-6 transition-all duration-200 hover:shadow-lg relative group`}
    >
      {badge && badge > 0 && (
        <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
          {badge}
        </span>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className={`${colors.light} rounded-lg p-3`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-white/90">{description}</p>
    </Link>
  )
}

// Composant pour les mini actions
function MiniAction({ 
  title, 
  icon: Icon, 
  href, 
  color = 'gray'
}: {
  title: string,
  icon: any,
  href: string,
  color?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
    >
      <div className="bg-gray-100 group-hover:bg-blue-100 rounded-lg p-2 transition-colors">
        <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
      </div>
      <span className="font-medium text-gray-700 group-hover:text-blue-700">{title}</span>
      <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
    </Link>
  )
}

export default function ManagerDashboard() {
  const { success, error: showError } = useToastContext()
  const [pendingJobs, setPendingJobs] = useState<JobResponse[]>([])
  const [kpis, setKpis] = useState<ManagerKPIs | null>(null)
  const [kpiSummary, setKpiSummary] = useState<KPISummary | null>(null)
  const [recruitersPerf, setRecruitersPerf] = useState<RecruiterPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Charger toutes les données en parallèle
      const [jobs, kpiData, summary, recruiters] = await Promise.all([
        getPendingValidationJobs().catch(() => []),
        getManagerKPIs().catch(() => null),
        getKPISummary().catch(() => null),
        getRecruitersPerformance().catch(() => []),
      ])
      
      setPendingJobs(Array.isArray(jobs) ? jobs : [])
      setKpis(kpiData)
      setKpiSummary(summary)
      setRecruitersPerf(recruiters)
      
      if (kpiData || summary) {
        success('Dashboard chargé avec succès')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des données'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="mb-8">
          <div className="h-10 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="text-center py-12 text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Dashboard Manager</h1>
          <p className="text-gray-600">Vue globale et pilotage du recrutement</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden lg:inline">Actualiser</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Time to Hire"
          value={kpis?.time_process.time_to_hire?.toFixed(1) || kpiSummary?.average_time_to_hire?.toFixed(1) || 'N/A'}
          unit="jours"
          icon={Clock}
          color="blue"
          subtitle="Temps moyen d'embauche"
          trend={kpis?.time_process.time_to_hire ? 'down' : undefined}
          trendValue={kpis?.time_process.time_to_hire ? '-5%' : undefined}
        />
        <StatCard
          title="Taux d'acceptation"
          value={kpis?.engagement_satisfaction.offer_acceptance_rate?.toFixed(1) || 'N/A'}
          unit="%"
          icon={TrendingUp}
          color="green"
          subtitle="Offres acceptées"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Candidats sourcés"
          value={kpis?.volume_productivity.total_candidates_sourced || kpiSummary?.total_candidates || 0}
          icon={Users}
          color="purple"
          subtitle="Total depuis le début"
        />
        <StatCard
          title="Besoins en attente"
          value={pendingJobs.length}
          icon={AlertCircle}
          color="orange"
          subtitle={`${pendingJobs.length} besoin(s) à valider`}
          onClick={() => window.location.href = '/manager/approbations'}
        />
      </div>

      {/* Actions rapides principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <QuickActionCard
          title="Approbations"
          description={`${pendingJobs.length} besoin(s) en attente de validation`}
          icon={CheckCircle}
          href="/manager/approbations"
          badge={pendingJobs.length}
          color="blue"
        />
        <QuickActionCard
          title="Dashboard KPI"
          description="Vue détaillée des métriques de performance"
          icon={BarChart3}
          href="/manager/kpi"
          color="green"
        />
        <QuickActionCard
          title="Gestion des équipes"
          description="Créer et gérer les équipes et utilisateurs"
          icon={Users}
          href="/manager/teams"
          color="purple"
        />
        <QuickActionCard
          title="Pipeline Kanban"
          description="Visualiser le pipeline de recrutement"
          icon={Activity}
          href="/manager/pipeline"
          color="orange"
        />
      </div>

      {/* Actions rapides secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MiniAction
          title="Créer un besoin"
          icon={Briefcase}
          href="/manager/jobs/new"
        />
        <MiniAction
          title="Ajouter un candidat"
          icon={UserPlus}
          href="/manager/candidats?action=new"
        />
        <MiniAction
          title="Planifier entretien"
          icon={Calendar}
          href="/manager/entretiens?action=new"
        />
        <MiniAction
          title="Voir tous les jobs"
          icon={Eye}
          href="/manager/jobs"
        />
      </div>

      {/* Section métriques détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Qualité & Sélection */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-6 h-6 text-green-600" />
              Qualité & Sélection
            </h2>
            <Link 
              href="/manager/kpi"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Voir plus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Taux candidats qualifiés</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.quality_selection.qualified_candidates_rate?.toFixed(1) || 'N/A'}
                <span className="text-sm text-gray-500">%</span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">% Shortlist acceptée</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.quality_selection.shortlist_acceptance_rate?.toFixed(1) || 'N/A'}
                <span className="text-sm text-gray-500">%</span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Score moyen candidat</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.quality_selection.average_candidate_score?.toFixed(1) || 'N/A'}
                <span className="text-sm text-gray-500">/10</span>
              </p>
            </div>
          </div>
        </div>

        {/* Volume & Productivité */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600" />
            Volume & Productivité
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">CV traités</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.volume_productivity.total_cvs_processed || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Entretiens réalisés</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.volume_productivity.total_interviews_conducted || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Ratio clos/ouverts</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.volume_productivity.closed_vs_open_recruitments?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Besoins en attente et Performance recruteurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Besoins en attente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              Besoins en attente
            </h2>
            {pendingJobs.length > 0 && (
              <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">
                {pendingJobs.length}
              </span>
            )}
          </div>
          <div className="p-6">
            {pendingJobs.length > 0 ? (
              <div className="space-y-3">
                {pendingJobs.slice(0, 5).map((job) => (
                  <Link
                    key={job.id}
                    href={`/manager/approbations`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">{job.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{job.department || 'Non spécifié'}</p>
                        {job.urgency && (
                          <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                            job.urgency === 'critique' ? 'bg-red-100 text-red-800' :
                            job.urgency === 'haute' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {job.urgency}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
                {pendingJobs.length > 5 && (
                  <Link
                    href="/manager/approbations"
                    className="block text-center text-blue-600 hover:text-blue-700 font-medium py-2"
                  >
                    Voir tous les besoins ({pendingJobs.length})
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">Aucun besoin en attente</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance recruteurs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Performance recruteurs
            </h2>
          </div>
          <div className="p-6">
            {recruitersPerf.length > 0 ? (
              <div className="space-y-4">
                {recruitersPerf.slice(0, 5).map((perf) => (
                  <div key={perf.recruiter_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{perf.recruiter_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {perf.total_candidates} candidats • {perf.total_jobs} jobs
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{perf.candidates_hired}</p>
                      <p className="text-xs text-gray-500">embauchés</p>
                    </div>
                  </div>
                ))}
                {recruitersPerf.length > 5 && (
                  <Link
                    href="/manager/kpi"
                    className="block text-center text-blue-600 hover:text-blue-700 font-medium py-2"
                  >
                    Voir toutes les performances
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Résumé global */}
      {kpiSummary && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 lg:p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Zap className="w-7 h-7" />
            Résumé global
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-white/80 mb-1">Total candidats</p>
              <p className="text-3xl font-bold">{kpiSummary.total_candidates}</p>
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">Total jobs</p>
              <p className="text-3xl font-bold">{kpiSummary.total_jobs}</p>
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">Jobs actifs</p>
              <p className="text-3xl font-bold">{kpiSummary.active_jobs}</p>
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">En shortlist</p>
              <p className="text-3xl font-bold">{kpiSummary.candidates_in_shortlist}</p>
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">Embauchés</p>
              <p className="text-3xl font-bold">{kpiSummary.candidates_hired}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
