'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  History, 
  Clock, 
  User, 
  Briefcase, 
  CheckCircle, 
  XCircle, 
  FileText, 
  ArrowRight,
  Calendar,
  MessageSquare,
  Tag,
  Eye
} from 'lucide-react'
import { formatDateTime, formatRelativeDateTime } from '@/lib/utils'
import { 
  getJobs, 
  getJobHistory, 
  getClientShortlists,
  type JobResponse, 
  type JobHistoryItem,
  type ShortlistItem
} from '@/lib/api'
import { useToastContext } from '@/components/ToastProvider'

type TabType = 'all' | 'jobs' | 'shortlists'

interface TimelineItem {
  id: string
  type: 'job_created' | 'job_modified' | 'job_validated' | 'candidate_validated' | 'candidate_rejected'
  title: string
  description: string
  date: string
  icon: any
  color: string
  bgColor: string
  link?: string
  metadata?: Record<string, any>
}

export default function ClientHistoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([])
  const [jobHistories, setJobHistories] = useState<Record<string, JobHistoryItem[]>>({})
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error: showError } = useToastContext()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (jobs.length > 0 || shortlists.length > 0) {
      buildTimeline()
    }
  }, [jobs, shortlists, jobHistories])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Charger les besoins du client
      const jobsData = await getJobs()
      setJobs(jobsData)
      
      // Charger les shortlists
      const shortlistsData = await getClientShortlists()
      setShortlists(shortlistsData)
      
      // Charger l'historique de chaque besoin
      const histories: Record<string, JobHistoryItem[]> = {}
      for (const job of jobsData) {
        try {
          const history = await getJobHistory(job.id)
          histories[job.id] = history
        } catch (err) {
          console.error(`Erreur lors du chargement de l'historique pour le besoin ${job.id}:`, err)
        }
      }
      setJobHistories(histories)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      showError('Erreur lors du chargement de l\'historique')
    } finally {
      setIsLoading(false)
    }
  }

  const buildTimeline = () => {
    const items: TimelineItem[] = []

    // Ajouter les créations de besoins
    jobs.forEach(job => {
      items.push({
        id: `job-created-${job.id}`,
        type: 'job_created',
        title: `Besoin créé : ${job.title}`,
        description: `Besoin de recrutement créé pour le département ${job.department || 'Non spécifié'}`,
        date: job.created_at,
        icon: Briefcase,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        link: `/client/jobs/${job.id}`,
        metadata: { job }
      })
    })

    // Ajouter les modifications de besoins
    Object.entries(jobHistories).forEach(([jobId, history]) => {
      const job = jobs.find(j => j.id === jobId)
      history.forEach(item => {
        items.push({
          id: `job-modified-${jobId}-${item.id}`,
          type: 'job_modified',
          title: `Besoin modifié : ${job?.title || 'Besoin'}`,
          description: item.field_name 
            ? `${item.field_name} modifié${item.old_value ? ` : "${item.old_value}" → "${item.new_value}"` : ''}`
            : 'Modification effectuée',
          date: item.created_at,
          icon: FileText,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          link: `/client/jobs/${jobId}`,
          metadata: { job, historyItem: item }
        })
      })
    })

    // Ajouter les validations/rejets de candidats
    shortlists.forEach(item => {
      if (item.client_validated !== null && item.client_validated_at) {
        items.push({
          id: `candidate-${item.client_validated ? 'validated' : 'rejected'}-${item.application_id}`,
          type: item.client_validated ? 'candidate_validated' : 'candidate_rejected',
          title: item.client_validated 
            ? `Candidat validé : ${item.candidate_name}`
            : `Candidat refusé : ${item.candidate_name}`,
          description: item.client_feedback 
            ? `Commentaire : "${item.client_feedback}"`
            : item.client_validated 
              ? `Candidat validé pour le poste ${item.job_title}`
              : `Candidat refusé pour le poste ${item.job_title}`,
          date: item.client_validated_at,
          icon: item.client_validated ? CheckCircle : XCircle,
          color: item.client_validated ? 'text-green-600' : 'text-red-600',
          bgColor: item.client_validated ? 'bg-green-100' : 'bg-red-100',
          link: `/client/shortlist`,
          metadata: { shortlistItem: item }
        })
      }
    })

    // Trier par date (plus récent en premier)
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    setTimeline(items)
  }

  const getFilteredTimeline = () => {
    if (activeTab === 'all') return timeline
    if (activeTab === 'jobs') {
      return timeline.filter(item => item.type === 'job_created' || item.type === 'job_modified' || item.type === 'job_validated')
    }
    if (activeTab === 'shortlists') {
      return timeline.filter(item => item.type === 'candidate_validated' || item.type === 'candidate_rejected')
    }
    return timeline
  }

  // Utiliser la fonction utilitaire formatRelativeDateTime

  const getStatusBadge = (job: JobResponse) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'brouillon': { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      'en_attente': { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
      'en_attente_validation': { label: 'En attente de validation', className: 'bg-orange-100 text-orange-800' },
      'validé': { label: 'Validé', className: 'bg-green-100 text-green-800' },
      'en_cours': { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
      'clôturé': { label: 'Clôturé', className: 'bg-gray-100 text-gray-800' }
    }
    
    const status = statusMap[job.status] || { label: job.status, className: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
        {status.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement de l'historique...</div>
      </div>
    )
  }

  const filteredTimeline = getFilteredTimeline()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <History className="w-8 h-8 text-emerald-600" />
              Historique
            </h1>
            <p className="text-gray-600 mt-2">Consultez l'historique de toutes vos activités</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total d'activités</p>
                <p className="text-2xl font-bold text-gray-900">{timeline.length}</p>
              </div>
              <History className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Besoins créés</p>
                <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Candidats validés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {shortlists.filter(s => s.client_validated === true).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Candidats refusés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {shortlists.filter(s => s.client_validated === false).length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'jobs'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Besoins
          </button>
          <button
            onClick={() => setActiveTab('shortlists')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'shortlists'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Shortlists
          </button>
        </div>
      </div>

      {/* Timeline */}
      {filteredTimeline.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <History className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">Aucun historique disponible</p>
          <p className="text-gray-500 text-sm mt-2">Vos activités apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="relative">
              {/* Ligne verticale de la timeline */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {/* Items de la timeline */}
              <div className="space-y-6">
                {filteredTimeline.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={item.id} className="relative flex items-start gap-4">
                      {/* Icône */}
                      <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full ${item.bgColor} border-4 border-white shadow-lg`}>
                        <Icon className={`w-8 h-8 ${item.color}`} />
                      </div>
                      
                      {/* Contenu */}
                      <div className="flex-1 pb-6">
                        <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                              
                              {/* Métadonnées supplémentaires */}
                              {item.metadata?.job && (
                                <div className="flex items-center gap-2 mt-2">
                                  {getStatusBadge(item.metadata.job)}
                                  <span className="text-xs text-gray-500">
                                    {item.metadata.job.department || 'Département non spécifié'}
                                  </span>
                                </div>
                              )}
                              
                              {item.metadata?.shortlistItem && (
                                <div className="mt-2">
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Tag className="w-3 h-3" />
                                    <span>{item.metadata.shortlistItem.job_title}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Date */}
                            <div className="flex items-center gap-2 text-xs text-gray-500 ml-4">
                              <Calendar className="w-4 h-4" />
                              <span>{formatRelativeDateTime(item.date)}</span>
                            </div>
                          </div>
                          
                          {/* Lien */}
                          {item.link && (
                            <Link
                              href={item.link}
                              className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 mt-2"
                            >
                              <Eye className="w-4 h-4" />
                              Voir les détails
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

