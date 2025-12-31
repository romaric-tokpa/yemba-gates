'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  getKPISummary, 
  getRecruitersPerformance, 
  getManagerKPIs,
  KPISummary, 
  RecruiterPerformance,
  ManagerKPIs
} from '@/lib/api'
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
  Activity
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
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
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
  }

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue

  return (
    <div className="bg-white rounded-lg shadow p-4 lg:p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs lg:text-sm font-medium text-gray-600">{title}</p>
        {Icon && (
          <div className={`${colors.bg} rounded-full p-2`}>
            <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${colors.icon}`} />
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-2">
        <p className={`text-2xl lg:text-3xl font-bold ${colors.text}`}>
          {value === null || value === undefined ? 'N/A' : value}
        </p>
        {unit && value !== null && value !== undefined && (
          <span className="text-sm text-gray-500">{unit}</span>
        )}
        {trend && trend !== 'neutral' && (
          <div className={`${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function KPIPage() {
  const [kpiSummary, setKpiSummary] = useState<KPISummary | null>(null)
  const [managerKPIs, setManagerKPIs] = useState<ManagerKPIs | null>(null)
  const [recruitersPerf, setRecruitersPerf] = useState<RecruiterPerformance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview')

  useEffect(() => {
    loadKPIData()
  }, [])

  const loadKPIData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Charger le résumé et les KPI détaillés en parallèle
      const [summary, managerData, recruiters] = await Promise.all([
        getKPISummary().catch(() => null),
        getManagerKPIs().catch(() => null),
        getRecruitersPerformance().catch(() => []),
      ])
      
      setKpiSummary(summary)
      setManagerKPIs(managerData)
      setRecruitersPerf(recruiters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des KPI')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['manager', 'administrateur']}>
      <div className="p-4 lg:p-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard KPI Global</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-2">
            Vue d&apos;ensemble des performances de recrutement (Tableau KPI Manager)
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Onglets */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vue d&apos;ensemble
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
          <div className="text-center py-12 text-gray-500">Chargement des KPI...</div>
        ) : (
          <>
            {activeTab === 'overview' ? (
          <>
            {/* Résumé global */}
            {kpiSummary && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-6 mb-6 lg:mb-8">
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-blue-600" />
                        Temps & Process
                      </h2>
                      <div className="space-y-4">
                        <KPICard
                          title="Time to Hire"
                          value={managerKPIs.time_process.time_to_hire}
                          unit="jours"
                          icon={Clock}
                          color="blue"
                        />
                        <KPICard
                          title="Time to Fill"
                          value={managerKPIs.time_process.time_to_fill}
                          unit="jours"
                          icon={Clock}
                          color="green"
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
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Target className="w-5 h-5 mr-2 text-green-600" />
                        Qualité & Sélection
                      </h2>
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <BarChart
                            value={managerKPIs.quality_selection.qualified_candidates_rate}
                            max={100}
                            label="Taux candidats qualifiés"
                            color="green"
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
                            label="Score moyen candidat"
                            color="purple"
                          />
                        </div>
                      </div>
                    </div>
                </div>
                )}

                {/* KPI Engagement & Satisfaction */}
                {managerKPIs && (
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-orange-600" />
                      Engagement & Satisfaction
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.engagement_satisfaction.offer_acceptance_rate}
                          max={100}
                          label="Taux acceptation offre"
                          color="green"
                        />
                </div>
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.engagement_satisfaction.offer_rejection_rate}
                          max={100}
                          label="Taux refus offre"
                          color="red"
                        />
                </div>
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.engagement_satisfaction.candidate_response_rate}
                          max={100}
                          label="Taux réponse candidat"
                          color="blue"
                        />
                </div>
                </div>
              </div>
            )}

            {/* Performance des recruteurs */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 lg:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Performance par recruteur</h2>
              </div>
                  <div className="p-4 lg:p-6">
                    {recruitersPerf.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Aucune donnée disponible</div>
                    ) : (
                      <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recruteur</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidats</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jobs</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">En shortlist</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Embauchés</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recruitersPerf.map((perf) => (
                              <tr key={perf.recruiter_id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {perf.recruiter_name}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-gray-900">{perf.total_candidates}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-gray-900">{perf.total_jobs}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-green-600">{perf.candidates_in_shortlist}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-purple-600">{perf.candidates_hired}</td>
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
                <div className="space-y-6">
                  {/* Volume & Productivité */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                      Volume & Productivité
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <KPICard
                        title="Candidats sourcés"
                        value={managerKPIs.volume_productivity.total_candidates_sourced}
                        icon={Users}
                        color="blue"
                      />
                      <KPICard
                        title="CV traités"
                        value={managerKPIs.volume_productivity.total_cvs_processed}
                        icon={Users}
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
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                      Coût / Budget
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <KPICard
                        title="Coût moyen recrutement"
                        value={managerKPIs.cost_budget.average_recruitment_cost}
                        unit="€"
                        icon={DollarSign}
                        color="blue"
                      />
                      <KPICard
                        title="Coût par source"
                        value={managerKPIs.cost_budget.cost_per_source}
                        unit="€"
                        icon={DollarSign}
                        color="green"
                      />
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.cost_budget.budget_spent_vs_planned}
                          max={100}
                          label="Budget dépensé vs prévu"
                          color="orange"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Onboarding */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-purple-600" />
                      Onboarding
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <BarChart
                          value={managerKPIs.onboarding.onboarding_success_rate}
                          max={100}
                          label="Taux réussite onboarding"
                          color="green"
                        />
                      </div>
                      <KPICard
                        title="Délai moyen onboarding"
                        value={managerKPIs.onboarding.average_onboarding_delay}
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
    </ProtectedRoute>
  )
}
