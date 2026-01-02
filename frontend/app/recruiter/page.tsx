'use client'

import { useState, useEffect } from 'react'
import { 
  getJobs, 
  getInterviews, 
  getKPISummary,
  type JobResponse, 
  type InterviewResponse, 
  type KPISummary
} from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ToastProvider'
import { 
  Briefcase, 
  Calendar, 
  Users, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  RefreshCw,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  Zap,
  Activity,
  FileText,
  UserPlus,
  Eye,
  BarChart3,
  MapPin,
  DollarSign,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'

// Composant pour afficher un KPI
function StatCard({ 
  title, 
  value, 
  unit = '', 
  icon: Icon,
  color = 'blue',
  subtitle,
  onClick
}: { 
  title: string, 
  value: number | null | string, 
  unit?: string,
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
  color = 'blue'
}: {
  title: string,
  description: string,
  icon: any,
  href: string,
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
  href
}: {
  title: string,
  icon: any,
  href: string
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

export default function RecruiterDashboard() {
  const router = useRouter()
  const { success, error: showError } = useToastContext()
  const [activeJobs, setActiveJobs] = useState<JobResponse[]>([])
  const [todayInterviews, setTodayInterviews] = useState<InterviewResponse[]>([])
  const [kpis, setKpis] = useState<KPISummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Vérifier l'authentification
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [jobs, interviews, kpiData] = await Promise.all([
        getJobs().catch(() => []),
        getInterviews().catch(() => []),
        getKPISummary().catch(() => null)
      ])

      // Filtrer les jobs actifs
      const active = Array.isArray(jobs) 
        ? jobs.filter(job => job.status === 'en_cours' || job.status === 'validé')
        : []
      setActiveJobs(active.slice(0, 5))

      // Filtrer les entretiens d'aujourd'hui
      const today = new Date().toISOString().split('T')[0]
      const todayInt = Array.isArray(interviews)
        ? interviews.filter(int => int.scheduled_at?.startsWith(today))
        : []
      setTodayInterviews(todayInt)

      setKpis(kpiData)
      
      if (kpiData) {
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
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
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
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Dashboard Recruteur</h1>
          <p className="text-gray-600">Résumé des tâches du jour et pipeline actif</p>
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
          title="Postes actifs"
          value={activeJobs.length}
          icon={Briefcase}
          color="blue"
          subtitle="Besoins en cours de recrutement"
          onClick={() => router.push('/recruiter/jobs')}
        />
        <StatCard
          title="Candidats actifs"
          value={kpis?.total_candidates || 0}
          icon={Users}
          color="green"
          subtitle="Total candidats dans le système"
          onClick={() => router.push('/recruiter/candidates')}
        />
        <StatCard
          title="Entretiens aujourd'hui"
          value={todayInterviews.length}
          icon={Calendar}
          color="purple"
          subtitle="Entretiens planifiés pour aujourd'hui"
          onClick={() => router.push('/recruiter/interviews')}
        />
        <StatCard
          title="En shortlist"
          value={kpis?.candidates_in_shortlist || 0}
          icon={TrendingUp}
          color="orange"
          subtitle="Candidats en shortlist"
          onClick={() => router.push('/recruiter/candidates?status=shortlist')}
        />
      </div>

      {/* Actions rapides principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <QuickActionCard
          title="Créer un besoin"
          description="Nouveau poste à pourvoir"
          icon={Briefcase}
          href="/recruiter/jobs/new"
          color="blue"
        />
        <QuickActionCard
          title="Ajouter un candidat"
          description="Nouveau candidat dans le système"
          icon={UserPlus}
          href="/recruiter/candidates?action=new"
          color="green"
        />
        <QuickActionCard
          title="Planifier un entretien"
          description="Nouvel entretien avec un candidat"
          icon={Calendar}
          href="/recruiter/interviews?action=new"
          color="purple"
        />
        <QuickActionCard
          title="Voir le pipeline"
          description="Visualiser le pipeline de recrutement"
          icon={Activity}
          href="/recruiter/pipeline"
          color="orange"
        />
      </div>

      {/* Actions rapides secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MiniAction
          title="Mes besoins"
          icon={Briefcase}
          href="/recruiter/jobs"
        />
        <MiniAction
          title="Mes candidats"
          icon={Users}
          href="/recruiter/candidates"
        />
        <MiniAction
          title="Mes entretiens"
          icon={Calendar}
          href="/recruiter/interviews"
        />
        <MiniAction
          title="Voir statistiques"
          icon={BarChart3}
          href="/kpi"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Postes actifs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" />
              Mes Postes Actifs
            </h2>
            {activeJobs.length > 0 && (
              <Link
                href="/recruiter/jobs"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          <div className="p-6">
            {activeJobs.length > 0 ? (
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/recruiter/jobs/${job.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-1">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          {job.department && (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{job.department}</span>
                            </div>
                          )}
                          {job.localisation && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{job.localisation}</span>
                            </div>
                          )}
                          {job.budget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>{job.budget.toLocaleString('fr-FR')} F CFA</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        job.status === 'validé' ? 'bg-green-100 text-green-800' :
                        job.status === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    {job.urgency && (
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          job.urgency === 'critique' ? 'bg-red-100 text-red-800' :
                          job.urgency === 'haute' ? 'bg-orange-100 text-orange-800' :
                          job.urgency === 'moyenne' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.urgency}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Aucun poste actif</p>
                <Link
                  href="/recruiter/jobs/new"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Créer un besoin
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Entretiens du jour */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-purple-600" />
              Entretiens Aujourd'hui
            </h2>
            {todayInterviews.length > 0 && (
              <Link
                href="/recruiter/interviews"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          <div className="p-6">
            {todayInterviews.length > 0 ? (
              <div className="space-y-3">
                {todayInterviews.map((interview) => (
                  <Link
                    key={interview.id}
                    href={`/recruiter/interviews?interview=${interview.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 mb-1">
                          {interview.candidate_name || 'Candidat'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{interview.job_title || 'Poste'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {interview.scheduled_at 
                              ? formatDateTime(interview.scheduled_at)
                              : 'Heure non définie'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {interview.interview_type || 'Entretien'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Aucun entretien prévu aujourd'hui</p>
                <Link
                  href="/recruiter/interviews?action=new"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Planifier un entretien
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Résumé global */}
      {kpis && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 lg:p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Zap className="w-7 h-7" />
            Résumé Global
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-white/80 mb-1">Total candidats</p>
              <p className="text-3xl font-bold">{kpis.total_candidates}</p>
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">Total jobs</p>
              <p className="text-3xl font-bold">{kpis.total_jobs}</p>
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">Jobs actifs</p>
              <p className="text-3xl font-bold">{kpis.active_jobs}</p>
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">En shortlist</p>
              <p className="text-3xl font-bold">{kpis.candidates_in_shortlist}</p>
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">Embauchés</p>
              <p className="text-3xl font-bold">{kpis.candidates_hired}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
