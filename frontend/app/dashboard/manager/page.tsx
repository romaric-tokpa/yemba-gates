'use client'

import { useState, useEffect } from 'react'
import { getPendingValidationJobs, getManagerKPIs, type JobResponse, type ManagerKPIs } from '@/lib/api'
import { CheckCircle, BarChart3, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ManagerDashboard() {
  const [pendingJobs, setPendingJobs] = useState<JobResponse[]>([])
  const [kpis, setKpis] = useState<ManagerKPIs | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const [jobs, kpiData] = await Promise.all([
        getPendingValidationJobs().catch(() => []),
        getManagerKPIs().catch(() => null)
      ])

      setPendingJobs(jobs)
      setKpis(kpiData)
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Manager</h1>
        <p className="text-gray-600 mt-2">Vue d'ensemble et pilotage du recrutement</p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/manager/approbations"
          className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors relative"
        >
          <CheckCircle className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Besoins en attente</h3>
          <p className="text-sm text-blue-100 mt-1">{pendingJobs.length} besoin(s) à valider</p>
          {pendingJobs.length > 0 && (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {pendingJobs.length}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/manager/kpi"
          className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors"
        >
          <BarChart3 className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">KPI Global</h3>
          <p className="text-sm text-purple-100 mt-1">Métriques de performance</p>
        </Link>
      </div>

      {/* KPIs rapides */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Time to Hire</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.time_process.time_to_hire ? `${kpis.time_process.time_to_hire}j` : '-'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux d'acceptation</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.engagement_satisfaction.offer_acceptance_rate 
                    ? `${kpis.engagement_satisfaction.offer_acceptance_rate}%` 
                    : '-'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Candidats sourcés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.volume_productivity.total_candidates_sourced}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Entretiens réalisés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.volume_productivity.total_interviews_conducted}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Besoins en attente */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Besoins en attente de validation</h2>
        </div>
        <div className="p-6">
          {pendingJobs.length > 0 ? (
            <div className="space-y-4">
              {pendingJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/dashboard/manager/approbations`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{job.department || 'Non spécifié'}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      En attente
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucun besoin en attente</p>
          )}
        </div>
      </div>
    </div>
  )
}

