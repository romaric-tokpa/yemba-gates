'use client'

import { useState, useEffect } from 'react'
import { getPendingValidationJobs, getManagerKPIs, type JobResponse, type ManagerKPIs } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { CheckCircle, BarChart3, TrendingUp, Clock, Users, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ManagerDashboard() {
  const [pendingJobs, setPendingJobs] = useState<JobResponse[]>([])
  const [kpis, setKpis] = useState<ManagerKPIs | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    // Vérifier que l'utilisateur est authentifié avant d'exécuter les fetchs
    if (!isAuthenticated() || !getToken()) {
      console.warn('Utilisateur non authentifié, initialisation avec des valeurs par défaut')
      setPendingJobs([])
      setKpis(null)
      setIsLoading(false)
      setError('Vous devez être connecté pour voir les données.')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Gérer les erreurs individuellement pour ne pas bloquer l'UI
      let jobs: JobResponse[] = []
      let kpiData: ManagerKPIs | null = null
      
      // Charger les besoins en attente
      try {
        const response = await getPendingValidationJobs()
        jobs = Array.isArray(response) ? response : []
      } catch (error) {
        console.warn('Erreur lors du chargement des besoins:', error)
        jobs = [] // Retourner un tableau vide en cas d'erreur
      }
      
      // Charger les KPI
      try {
        const response = await getManagerKPIs()
        kpiData = response || null
      } catch (error) {
        console.warn('Erreur lors du chargement des KPI:', error)
        kpiData = null // Retourner null en cas d'erreur
      }

      setPendingJobs(jobs)
      setKpis(kpiData)
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      // En cas d'erreur globale, initialiser avec des valeurs par défaut
      setPendingJobs([])
      setKpis(null)
      setError('Impossible de charger certaines données. Vérifiez votre connexion au backend.')
    } finally {
      setIsLoading(false)
    }
  }

  // Préparer les données pour les graphiques
  const chartData = kpis ? [
    {
      name: 'Time to Hire',
      value: kpis.time_process.time_to_hire || 0,
    },
    {
      name: 'Taux acceptation',
      value: kpis.engagement_satisfaction.offer_acceptance_rate || 0,
    },
    {
      name: 'Candidats sourcés',
      value: kpis.volume_productivity.total_candidates_sourced || 0,
    },
  ] : []

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="text-center py-12 text-gray-500">Chargement des données...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Manager</h1>
        <p className="text-gray-600 mt-2">Vue globale et pilotage du recrutement</p>
        {error && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Time to Hire</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.time_process.time_to_hire ? `${kpis.time_process.time_to_hire}j` : '-'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux d'acceptation</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.engagement_satisfaction.offer_acceptance_rate 
                  ? `${kpis.engagement_satisfaction.offer_acceptance_rate}%` 
                  : '-'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Candidats sourcés</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.volume_productivity.total_candidates_sourced || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Besoins en attente</p>
              <p className="text-2xl font-bold text-gray-900">{pendingJobs.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/manager/approbations"
          className="bg-indigo-600 text-white rounded-lg p-6 hover:bg-indigo-700 transition-colors relative"
        >
          <CheckCircle className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Approbations Besoins</h3>
          <p className="text-sm text-indigo-100 mt-1">{pendingJobs.length} besoin(s) à valider</p>
          {pendingJobs.length > 0 && (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {pendingJobs.length}
            </span>
          )}
        </Link>
        <Link
          href="/manager/kpi"
          className="bg-indigo-600 text-white rounded-lg p-6 hover:bg-indigo-700 transition-colors"
        >
          <BarChart3 className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Dashboard KPI</h3>
          <p className="text-sm text-indigo-100 mt-1">Vue globale des métriques</p>
        </Link>
        <Link
          href="/manager/teams"
          className="bg-indigo-600 text-white rounded-lg p-6 hover:bg-indigo-700 transition-colors"
        >
          <Users className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Équipes</h3>
          <p className="text-sm text-indigo-100 mt-1">Gestion des équipes</p>
        </Link>
      </div>

      {/* Actions de création rapide */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link
          href="/manager/jobs/new"
          className="bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg p-4 hover:bg-indigo-50 transition-colors flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Créer un besoin</span>
        </Link>
        <Link
          href="/manager/pipeline"
          className="bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg p-4 hover:bg-indigo-50 transition-colors flex items-center gap-3"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Pipeline Kanban</span>
        </Link>
        <Link
          href="/manager/candidats?action=new"
          className="bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg p-4 hover:bg-indigo-50 transition-colors flex items-center gap-3"
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">Ajouter un candidat</span>
        </Link>
        <Link
          href="/manager/entretiens?action=new"
          className="bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg p-4 hover:bg-indigo-50 transition-colors flex items-center gap-3"
        >
          <Clock className="w-5 h-5" />
          <span className="font-medium">Planifier entretien</span>
        </Link>
      </div>

      {/* Graphiques de performance */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Time to Hire</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Taux d'acceptation</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#4f46e5" />
              </LineChart>
            </ResponsiveContainer>
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
                  href={`/manager/approbations`}
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

