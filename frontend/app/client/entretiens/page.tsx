'use client'

import { useState, useEffect, useMemo } from 'react'
import { getInterviews, getClientInterviewRequests, getJobs, getJobApplications, type InterviewResponse, type ClientInterviewRequestResponse, type ApplicationResponse, type JobResponse } from '@/lib/api'
import { useToastContext } from '@/components/ToastProvider'
import { formatDateTime } from '@/lib/utils'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MessageSquare,
  Briefcase,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

type CalendarView = 'month' | 'week' | 'day'

export default function ClientInterviewsPage() {
  const { error: showError } = useToastContext()
  
  const [interviews, setInterviews] = useState<InterviewResponse[]>([])
  const [requests, setRequests] = useState<ClientInterviewRequestResponse[]>([])
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Map pour trouver le candidate_id depuis l'application_id
  const candidateIdMap = useMemo(() => {
    const map: Record<string, string> = {}
    applications.forEach(app => {
      map[app.id] = app.candidate_id
    })
    return map
  }, [applications])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Charger les jobs du client pour obtenir les applications
      const jobs = await getJobs()
      const clientJobs = jobs // Les jobs sont déjà filtrés par le backend pour le client
      
      // Charger les applications pour tous les jobs
      const appsPromises = clientJobs.map(job => getJobApplications(job.id).catch(() => []))
      const appsResults = await Promise.all(appsPromises)
      const allApps = appsResults.flat()
      setApplications(allApps)
      
      // Obtenir tous les IDs d'applications des jobs du client
      const applicationIds = allApps.map(app => app.id)
      
      // Charger tous les entretiens (tous types) et filtrer ceux liés aux applications du client
      const allInterviews = await getInterviews()
      const clientInterviews = allInterviews.filter(interview => 
        applicationIds.includes(interview.application_id)
      )
      setInterviews(clientInterviews)
      
      // Charger les demandes d'entretien
      const requestsData = await getClientInterviewRequests()
      setRequests(requestsData)
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      showError('Erreur lors du chargement des entretiens')
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrer les entretiens programmés (scheduled)
  const scheduledInterviews = useMemo(() => {
    return interviews.filter(i => i.status === 'planifié' || i.status === 'réalisé')
  }, [interviews])

  // Grouper les entretiens par date
  const interviewsByDate = useMemo(() => {
    const grouped: Record<string, InterviewResponse[]> = {}
    scheduledInterviews.forEach(interview => {
      const dateKey = new Date(interview.scheduled_at).toISOString().split('T')[0]
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(interview)
    })
    return grouped
  }, [scheduledInterviews])

  // Générer les jours du mois
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days: Array<{ date: Date; isCurrentMonth: boolean; interviews: InterviewResponse[] }> = []
    
    // Jours du mois précédent
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      const dateKey = date.toISOString().split('T')[0]
      days.push({
        date,
        isCurrentMonth: false,
        interviews: interviewsByDate[dateKey] || []
      })
    }
    
    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = date.toISOString().split('T')[0]
      days.push({
        date,
        isCurrentMonth: true,
        interviews: interviewsByDate[dateKey] || []
      })
    }
    
    // Jours du mois suivant pour compléter la grille
    const remainingDays = 42 - days.length // 6 semaines * 7 jours
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      const dateKey = date.toISOString().split('T')[0]
      days.push({
        date,
        isCurrentMonth: false,
        interviews: interviewsByDate[dateKey] || []
      })
    }
    
    return days
  }, [currentDate, interviewsByDate])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getStatusBadge = (status: string | undefined) => {
    const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      planifié: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, label: 'Planifié' },
      réalisé: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Réalisé' },
      reporté: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Reporté' },
      annulé: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Annulé' },
    }
    const statusConfig = status && config[status] ? config[status] : config.planifié
    const Icon = statusConfig.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
        <Icon className="w-3 h-3" />
        {statusConfig.label}
      </span>
    )
  }

  const getInterviewTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'rh': 'Entretien RH',
      'technique': 'Entretien Technique',
      'client': 'Entretien Client',
      'prequalification': 'Préqualification',
      'qualification': 'Qualification',
      'autre': 'Autre',
    }
    return labels[type] || type
  }

  const getInterviewTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'rh': 'bg-blue-100 text-blue-800',
      'technique': 'bg-purple-100 text-purple-800',
      'client': 'bg-orange-100 text-orange-800',
      'prequalification': 'bg-indigo-100 text-indigo-800',
      'qualification': 'bg-teal-100 text-teal-800',
      'autre': 'bg-gray-100 text-gray-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <Link
          href="/client"
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-4"
        >
          ← Retour au dashboard
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Mes entretiens</h1>
        <p className="text-gray-600 mt-2">Calendrier de vos entretiens programmés</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entretiens programmés</p>
              <p className="text-2xl font-bold text-gray-900">{scheduledInterviews.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Demandes en attente</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entretiens réalisés</p>
              <p className="text-2xl font-bold text-gray-900">
                {interviews.filter(i => i.status === 'réalisé').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* En-tête du calendrier */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {/* Grille du calendrier */}
        <div className="p-6">
          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Jours du mois */}
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((dayData, index) => {
              const isToday = dayData.date.toDateString() === new Date().toDateString()
              return (
                <div
                  key={index}
                  className={`min-h-[100px] border rounded-lg p-2 ${
                    dayData.isCurrentMonth 
                      ? 'bg-white border-gray-200' 
                      : 'bg-gray-50 border-gray-100'
                  } ${
                    isToday ? 'ring-2 ring-emerald-500' : ''
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    dayData.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  } ${isToday ? 'text-emerald-600' : ''}`}>
                    {dayData.date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayData.interviews.map(interview => (
                      <div
                        key={interview.id}
                        className={`text-xs p-1.5 rounded cursor-pointer hover:opacity-80 transition-colors ${
                          interview.interview_type === 'client' 
                            ? 'bg-orange-100 text-orange-800' 
                            : interview.interview_type === 'rh'
                            ? 'bg-blue-100 text-blue-800'
                            : interview.interview_type === 'technique'
                            ? 'bg-purple-100 text-purple-800'
                            : interview.interview_type === 'prequalification'
                            ? 'bg-indigo-100 text-indigo-800'
                            : interview.interview_type === 'qualification'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                        title={`${interview.candidate_name} - ${interview.job_title} (${getInterviewTypeLabel(interview.interview_type)})`}
                      >
                        <div className="font-medium truncate">{interview.candidate_name}</div>
                        <div className="opacity-80">
                          {new Date(interview.scheduled_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-[10px] opacity-70 mt-0.5 truncate">
                          {getInterviewTypeLabel(interview.interview_type)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Liste des entretiens programmés */}
      <div className="mt-8 bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Entretiens programmés</h2>
        </div>
        <div className="p-6">
          {scheduledInterviews.length > 0 ? (
            <div className="space-y-4">
              {scheduledInterviews.map(interview => (
                <div
                  key={interview.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{interview.candidate_name}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getInterviewTypeColor(interview.interview_type)}`}>
                          {getInterviewTypeLabel(interview.interview_type)}
                        </span>
                        {getStatusBadge(interview.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{interview.job_title}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(interview.scheduled_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {interview.scheduled_end_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              Fin: {new Date(interview.scheduled_end_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                        {interview.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{interview.location}</span>
                          </div>
                        )}
                        {interview.interviewer_name && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{interview.interviewer_name}</span>
                          </div>
                        )}
                      </div>
                      {interview.preparation_notes && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs font-medium text-blue-900 mb-1">Notes de préparation</p>
                          <p className="text-sm text-blue-800">{interview.preparation_notes}</p>
                        </div>
                      )}
                    </div>
                    {candidateIdMap[interview.application_id] && (
                      <Link
                        href={`/client/candidats/${candidateIdMap[interview.application_id]}`}
                        className="ml-4 px-3 py-2 text-sm text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        Voir candidat
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun entretien programmé</p>
              <p className="text-sm text-gray-400 mt-2">
                Les entretiens que vous avez demandés apparaîtront ici une fois programmés
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Demandes en attente */}
      {requests.filter(r => r.status === 'pending').length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Demandes en attente de programmation</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {requests.filter(r => r.status === 'pending').map(request => (
                <div
                  key={request.id}
                  className="p-4 border border-yellow-200 rounded-lg bg-yellow-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{request.candidate_name}</h3>
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          En attente
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Briefcase className="w-4 h-4" />
                        <span>{request.job_title}</span>
                      </div>
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Vos disponibilités proposées :</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {request.availability_slots.map((slot, index) => (
                            <div key={index} className="p-2 bg-white border border-gray-200 rounded text-xs">
                              <div className="font-medium">{new Date(slot.date).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                              })}</div>
                              <div className="text-gray-600">
                                {slot.start_time} - {slot.end_time}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {request.notes && (
                        <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-1">Vos notes</p>
                          <p className="text-sm text-gray-600">{request.notes}</p>
                        </div>
                      )}
                    </div>
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

