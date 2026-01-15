'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@/context/AuthContext'
import KPICard from '@/components/KPICard'
import { 
  Briefcase, Users, CheckCircle, Clock, 
  TrendingUp, Calendar, FileText, Target,
  MessageSquare, Zap
} from 'lucide-react'
import Link from 'next/link'

interface RecruiterKPIs {
  volume_productivity?: {
    total_candidates_sourced?: number
    total_cvs_processed?: number
    total_interviews_conducted?: number
  }
  quality_selection?: {
    qualified_candidates_rate?: number
    shortlist_acceptance_rate?: number
    average_candidate_score?: number
  }
  time_process?: {
    time_to_hire?: number
  }
  engagement_conversion?: {
    offer_acceptance_rate?: number
  }
  recruiter_performance?: {
    jobs_managed?: number
    feedbacks_on_time_rate?: number
  }
}

export default function RecruiterDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [kpis, setKpis] = useState<RecruiterKPIs | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadKPIs()
    }
  }, [authLoading, isAuthenticated])

  const loadKPIs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiGet<RecruiterKPIs>('/api/kpi/recruiter')
      setKpis(data)
    } catch (err: any) {
      console.error('Erreur lors du chargement des KPI:', err)
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de vos données...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadKPIs}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1F2A44]">Mon Dashboard</h1>
        <p className="text-gray-600 mt-2">Vue d'ensemble de vos activités de recrutement</p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/recruiter/jobs"
          className="bg-gradient-to-r from-primary to-primary-600 text-white rounded-xl p-6 hover:shadow-lg transition-all transform hover:scale-[1.02]"
        >
          <Briefcase className="w-6 h-6 mb-2" />
          <h3 className="font-semibold text-lg">Mes postes</h3>
          <p className="text-sm text-white/90 mt-1">Gérer mes postes actifs</p>
        </Link>
        
        <Link
          href="/recruiter/candidates"
          className="bg-gradient-to-r from-accent to-accent-600 text-white rounded-xl p-6 hover:shadow-lg transition-all transform hover:scale-[1.02]"
        >
          <Users className="w-6 h-6 mb-2" />
          <h3 className="font-semibold text-lg">Mes candidats</h3>
          <p className="text-sm text-white/90 mt-1">Gérer mes candidats</p>
        </Link>
        
        <Link
          href="/recruiter/interviews"
          className="bg-gradient-to-r from-secondary to-secondary-600 text-white rounded-xl p-6 hover:shadow-lg transition-all transform hover:scale-[1.02]"
        >
          <Calendar className="w-6 h-6 mb-2" />
          <h3 className="font-semibold text-lg">Mes entretiens</h3>
          <p className="text-sm text-white/90 mt-1">Planifier et suivre</p>
        </Link>
      </div>

      {/* KPI Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Postes gérés"
          value={kpis?.recruiter_performance?.jobs_managed || 0}
          format="number"
          icon={<Briefcase className="w-6 h-6" />}
          trend="up"
        />
        
        <KPICard
          title="Taux Shortlist → Embauche"
          value={kpis?.quality_selection?.shortlist_acceptance_rate || 0}
          format="percentage"
          icon={<Target className="w-6 h-6" />}
          trend="up"
        />
        
        <KPICard
          title="Time to Hire Personnel"
          value={kpis?.time_process?.time_to_hire || 0}
          format="duration"
          icon={<Clock className="w-6 h-6" />}
          trend="down"
        />
        
        <KPICard
          title="Feedbacks à temps"
          value={kpis?.recruiter_performance?.feedbacks_on_time_rate || 0}
          format="percentage"
          icon={<CheckCircle className="w-6 h-6" />}
          trend="up"
        />
      </div>

      {/* KPI Cards secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard
          title="Candidats traités"
          value={kpis?.candidates_processed || 0}
          format="number"
          icon={<Users className="w-6 h-6" />}
        />
        
        <KPICard
          title="Entretiens réalisés"
          value={kpis?.total_interviews_conducted || 0}
          format="number"
          icon={<MessageSquare className="w-6 h-6" />}
        />
        
        <KPICard
          title="Candidats actifs"
          value={kpis?.active_candidates || 0}
          format="number"
          icon={<Zap className="w-6 h-6" />}
        />
      </div>

      {/* Activités récentes / Résumé */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline actif */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#1F2A44] flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Pipeline actif
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">CVs traités</span>
              <span className="text-2xl font-bold text-[#1F2A44]">
                {kpis?.volume_productivity?.total_cvs_processed || 0}
              </span>
            </div>
            <Link
              href="/recruiter/pipeline"
              className="inline-flex items-center text-sm text-primary hover:text-primary-600 font-medium"
            >
              Voir le pipeline complet
              <FileText className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Performance résumé */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#1F2A44] flex items-center">
              <Target className="w-5 h-5 mr-2 text-primary" />
              Performance globale
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Taux de conversion</span>
              <span className="text-lg font-semibold text-primary">
                {kpis?.quality_selection?.shortlist_acceptance_rate ? `${kpis.quality_selection.shortlist_acceptance_rate.toFixed(1)}%` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Délai moyen</span>
              <span className="text-lg font-semibold text-[#1F2A44]">
                {kpis?.time_process?.time_to_hire ? `${kpis.time_process.time_to_hire.toFixed(0)}j` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Score moyen</span>
              <span className="text-lg font-semibold text-success">
                {kpis?.quality_selection?.average_candidate_score ? `${kpis.quality_selection.average_candidate_score.toFixed(1)}/10` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
