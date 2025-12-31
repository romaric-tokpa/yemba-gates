'use client'

import { useState, useEffect } from 'react'
import { getJobs, getInterviews, getKPISummary, type JobResponse, type InterviewResponse, type KPISummary } from '@/lib/api'
import { Briefcase, Calendar, Users, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'

export default function RecruiterDashboard() {
  const [activeJobs, setActiveJobs] = useState<JobResponse[]>([])
  const [todayInterviews, setTodayInterviews] = useState<InterviewResponse[]>([])
  const [kpis, setKpis] = useState<KPISummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const [jobs, interviews, kpiData] = await Promise.all([
        getJobs().catch(() => []),
        getInterviews().catch(() => []),
        getKPISummary().catch(() => null)
      ])

      // Filtrer les jobs actifs
      const active = jobs.filter(job => job.status === 'en_cours' || job.status === 'validé')
      setActiveJobs(active.slice(0, 5))

      // Filtrer les entretiens d'aujourd'hui
      const today = new Date().toISOString().split('T')[0]
      const todayInt = interviews.filter(int => 
        int.scheduled_at.startsWith(today)
      )
      setTodayInterviews(todayInt)

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Recruteur</h1>
        <p className="text-gray-600 mt-2">Résumé des tâches du jour et pipeline actif</p>
      </div>

      {/* Mini-KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Postes actifs</p>
              <p className="text-2xl font-bold text-gray-900">{activeJobs.length}</p>
            </div>
            <Briefcase className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Candidats actifs</p>
              <p className="text-2xl font-bold text-gray-900">{kpis?.total_candidates || 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entretiens aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">{todayInterviews.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En shortlist</p>
              <p className="text-2xl font-bold text-gray-900">{kpis?.candidates_in_shortlist || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/recruiter/jobs/new"
          className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-6 h-6 mr-3" />
          <div>
            <h3 className="font-semibold">Créer un besoin</h3>
            <p className="text-sm text-blue-100 mt-1">Nouveau poste à pourvoir</p>
          </div>
        </Link>
        <Link
          href="/recruiter/candidates/new"
          className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-6 h-6 mr-3" />
          <div>
            <h3 className="font-semibold">Ajouter un candidat</h3>
            <p className="text-sm text-blue-100 mt-1">Nouveau candidat</p>
          </div>
        </Link>
        <Link
          href="/recruiter/interviews/new"
          className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-6 h-6 mr-3" />
          <div>
            <h3 className="font-semibold">Planifier un entretien</h3>
            <p className="text-sm text-blue-100 mt-1">Nouvel entretien</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Postes actifs */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Mes Postes</h2>
          </div>
          <div className="p-6">
            {activeJobs.length > 0 ? (
              <div className="space-y-4">
                {activeJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/recruiter/jobs/${job.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{job.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{job.department || 'Non spécifié'}</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {job.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucun poste actif</p>
            )}
          </div>
        </div>

        {/* Entretiens du jour */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Entretiens aujourd'hui</h2>
          </div>
          <div className="p-6">
            {todayInterviews.length > 0 ? (
              <div className="space-y-4">
                {todayInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{interview.candidate_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{interview.job_title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(interview.scheduled_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {interview.interview_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucun entretien prévu aujourd'hui</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

