'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@/context/AuthContext'
import KPICard from '@/components/KPICard'
import { 
  Clock, TrendingUp, Users, Briefcase, 
  CheckCircle, Calendar, Target, DollarSign,
  BarChart3, FileText
} from 'lucide-react'
import Link from 'next/link'

interface ManagerKPIs {
  time_to_hire?: number
  time_to_fill?: number
  pipeline_conversion_rate?: number
  recruiter_performance?: Array<{
    recruiter_name: string
    candidates_sourced: number
    interviews_conducted: number
  }>
  source_performance?: Array<{
    source: string
    candidates_count: number
    conversion_rate: number
  }>
  average_hiring_cost?: number
  onboarding_success_rate?: number
}

export default function ManagerDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [kpis, setKpis] = useState<ManagerKPIs | null>(null)
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
      const data = await apiGet<ManagerKPIs>('/api/kpi/manager')
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
            <p className="text-gray-600">Chargement des données...</p>
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
        <h1 className="text-3xl font-bold text-[#1F2A44]">Dashboard Manager</h1>
        <p className="text-gray-600 mt-2">Vue d'ensemble et pilotage du recrutement</p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/manager/besoins"
          className="bg-gradient-to-r from-primary to-primary-600 text-white rounded-xl p-6 hover:shadow-lg transition-all transform hover:scale-[1.02]"
        >
          <Briefcase className="w-6 h-6 mb-2" />
          <h3 className="font-semibold text-lg">Gérer les besoins</h3>
          <p className="text-sm text-white/90 mt-1">Créer et valider les postes</p>
        </Link>
        
        <Link
          href="/manager/approbations"
          className="bg-gradient-to-r from-accent to-accent-600 text-white rounded-xl p-6 hover:shadow-lg transition-all transform hover:scale-[1.02]"
        >
          <CheckCircle className="w-6 h-6 mb-2" />
          <h3 className="font-semibold text-lg">Approbations</h3>
          <p className="text-sm text-white/90 mt-1">Valider les demandes</p>
        </Link>
        
        <Link
          href="/manager/kpi"
          className="bg-gradient-to-r from-secondary to-secondary-600 text-white rounded-xl p-6 hover:shadow-lg transition-all transform hover:scale-[1.02]"
        >
          <BarChart3 className="w-6 h-6 mb-2" />
          <h3 className="font-semibold text-lg">KPI Détaillés</h3>
          <p className="text-sm text-white/90 mt-1">Analyses approfondies</p>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Time to Hire"
          value={kpis?.time_to_hire || 0}
          format="duration"
          icon={<Clock className="w-6 h-6" />}
          trend="down"
        />
        
        <KPICard
          title="Time to Fill"
          value={kpis?.time_to_fill || 0}
          format="duration"
          icon={<Calendar className="w-6 h-6" />}
          trend="down"
        />
        
        <KPICard
          title="Taux de conversion"
          value={kpis?.pipeline_conversion_rate || 0}
          format="percentage"
          icon={<Target className="w-6 h-6" />}
          trend="up"
        />
        
        <KPICard
          title="Coût moyen"
          value={kpis?.average_hiring_cost || 0}
          format="currency"
          icon={<DollarSign className="w-6 h-6" />}
        />
      </div>

      {/* Performance des recruteurs */}
      {kpis?.recruiter_performance && kpis.recruiter_performance.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#1F2A44] flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary" />
              Performance des recruteurs
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recruteur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidats sourcés
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entretiens réalisés
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {kpis.recruiter_performance.map((recruiter, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {recruiter.recruiter_name}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {recruiter.candidates_sourced}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {recruiter.interviews_conducted}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Performance des sources */}
      {kpis?.source_performance && kpis.source_performance.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#1F2A44] flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Performance des sources
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {kpis.source_performance.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{source.source || 'Non spécifié'}</p>
                    <p className="text-sm text-gray-600">{source.candidates_count} candidats</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      {source.conversion_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Taux de conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
