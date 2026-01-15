'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/components/DashboardLayout'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useAuth } from '@/context/AuthContext'
import { GripVertical, ArrowLeft, Briefcase, Users } from 'lucide-react'
import Link from 'next/link'

interface Application {
  id: string
  candidate_id: string
  candidate_name: string
  candidate_email?: string | null
  candidate_profile_title?: string | null
  candidate_years_of_experience?: number | null
  candidate_photo_url?: string | null
  job_id: string
  job_title: string
  status: string
  is_in_shortlist: boolean
  created_by: string
  created_by_name: string
  client_validated?: boolean | null
  client_feedback?: string | null
  created_at: string
  updated_at: string
}

interface JobInfo {
  id: string
  title: string
  department?: string | null
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  sourcé: 'Sourcé',
  qualifié: 'Qualifié',
  entretien_rh: 'Entretien RH',
  entretien_client: 'Entretien Client',
  shortlist: 'Shortlist',
  offre: 'Offre',
  embauché: 'Embauché',
  rejeté: 'Rejeté',
}

const STATUS_ORDER = [
  'sourcé',
  'qualifié',
  'entretien_rh',
  'entretien_client',
  'shortlist',
  'offre',
  'embauché',
]

const DISPLAYED_STATUSES = STATUS_ORDER

function ApplicationCard({ application }: { application: Application }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Link
      href={`/candidats/${application.candidate_id}`}
      ref={setNodeRef}
      style={style}
      className="block bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-primary" />
        </div>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Photo de profil */}
          {application.candidate_photo_url ? (
            <img
              src={application.candidate_photo_url}
              alt={application.candidate_name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-gray-200">
              <span className="text-white font-semibold text-sm">
                {application.candidate_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-[#1F2A44] truncate">
              {application.candidate_name}
            </h4>
            {application.candidate_profile_title && (
              <p className="text-xs text-gray-600 mt-0.5 truncate">
                {application.candidate_profile_title}
              </p>
            )}
            {application.candidate_years_of_experience !== null && application.candidate_years_of_experience !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                {application.candidate_years_of_experience} ans d&apos;expérience
              </p>
            )}
            {application.is_in_shortlist && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-accent/20 text-accent-700 rounded-full font-medium">
                ⭐ Shortlist
              </span>
            )}
            {application.client_validated === true && (
              <span className="inline-block mt-2 ml-1 px-2 py-0.5 text-xs bg-success/20 text-success-700 rounded-full font-medium">
                ✓ Validé
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function JobPipelinePage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const jobId = params.jobId as string

  const [applications, setApplications] = useState<Application[]>([])
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (!authLoading && isAuthenticated && jobId) {
      loadData()
    }
  }, [authLoading, isAuthenticated, jobId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [applicationsData, jobData] = await Promise.all([
        apiGet<Application[]>(`/api/applications/job/${jobId}`),
        apiGet<JobInfo>(`/api/jobs/${jobId}`).catch(() => null),
      ])
      
      setApplications(applicationsData || [])
      
      // Utiliser les infos du job récupérées, ou celles de la première application en fallback
      if (jobData) {
        setJobInfo(jobData)
      } else if (applicationsData && applicationsData.length > 0) {
        setJobInfo({
          id: jobId,
          title: applicationsData[0].job_title,
          department: null,
          status: 'active',
        })
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement:', err)
      setError(err.message || 'Impossible de charger les données')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const applicationId = active.id as string
    let newStatus = over.id as string

    // Si over.id n'est pas un statut valide, récupérer le statut de l'application cible
    if (!DISPLAYED_STATUSES.includes(newStatus)) {
      const targetApplication = applications.find(a => a.id === newStatus)
      if (targetApplication) {
        newStatus = targetApplication.status
      } else {
        return
      }
    }

    // Trouver l'application à mettre à jour
    const application = applications.find(a => a.id === applicationId)
    if (!application || application.status === newStatus) {
      return
    }

    try {
      // Mettre à jour le statut via l'API
      const updated = await apiPatch<Application>(`/api/applications/${applicationId}/status`, { status: newStatus })
      
      // Mettre à jour l'état local avec les données retournées
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? updated : a))
      )
      
      // Effacer l'erreur en cas de succès
      setError(null)
    } catch (err: any) {
      console.error('Erreur lors du déplacement:', err)
      setError(err.message || 'Erreur lors du déplacement de la candidature')
      // Recharger les données pour récupérer l'état correct
      loadData()
    }
  }

  const getApplicationsByStatus = (status: string) => {
    return applications.filter((a) => a.status === status)
  }

  const activeApplication = activeId
    ? applications.find((a) => a.id === activeId)
    : null

  function Column({ status, children, colors }: { 
    status: string
    children: React.ReactNode
    colors: { bg: string; text: string; border: string }
  }) {
    const { setNodeRef } = useDroppable({
      id: status,
    })

    const applicationsCount = getApplicationsByStatus(status).length

    return (
      <div
        ref={setNodeRef}
        className={`flex-shrink-0 w-[300px] ${colors.bg} rounded-xl border-2 ${colors.border} p-4 transition-all hover:shadow-lg`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className={`font-semibold text-base ${colors.text} mb-1`}>
              {STATUS_LABELS[status]}
            </h3>
            <span className="text-xs text-gray-600">
              {applicationsCount} candidat{applicationsCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className={`${colors.text} bg-white/70 px-3 py-1 rounded-full text-sm font-bold shadow-sm`}>
            {applicationsCount}
          </div>
        </div>
        {children}
      </div>
    )
  }

  if (authLoading || isLoading) {
    return (
      <ProtectedRoute allowedRoles={['recruteur', 'recruiter', 'manager', 'administrateur']}>
        <DashboardLayout allowedRoles={['recruteur', 'recruiter', 'manager', 'administrateur']}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement du pipeline...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error && applications.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['recruteur', 'recruiter', 'manager', 'administrateur']}>
        <DashboardLayout allowedRoles={['recruteur', 'recruiter', 'manager', 'administrateur']}>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'sourcé': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
    'qualifié': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    'entretien_rh': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
    'entretien_client': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' },
    'shortlist': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-400' },
    'offre': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-400' },
    'embauché': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-400' },
  }

  return (
    <ProtectedRoute allowedRoles={['recruteur', 'recruiter', 'manager', 'administrateur']}>
      <DashboardLayout allowedRoles={['recruteur', 'recruiter', 'manager', 'administrateur']}>
        <div className="max-w-[1800px] mx-auto w-full p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
        <Link
          href="/recruiter/jobs"
          className="inline-flex items-center text-sm text-gray-600 hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux postes
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2A44] flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-primary" />
              {jobInfo?.title || 'Pipeline'}
            </h1>
            {jobInfo?.department && (
              <p className="text-gray-600 mt-2">{jobInfo.department}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {applications.length} candidat{applications.length > 1 ? 's' : ''} dans le pipeline
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Pipeline Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {DISPLAYED_STATUSES.map((status) => {
              const statusApplications = getApplicationsByStatus(status)
              const colors = statusColors[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' }
              
              return (
                <Column key={status} status={status} colors={colors}>
                  <SortableContext
                    items={statusApplications.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[400px]">
                      {statusApplications.map((application) => (
                        <ApplicationCard key={application.id} application={application} />
                      ))}
                      {statusApplications.length === 0 && (
                        <div className="bg-white/50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center mt-4">
                          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">
                            Aucun candidat
                          </p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </Column>
              )
            })}
          </div>
        </div>

        <DragOverlay>
          {activeApplication ? (
            <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-primary w-72">
              <div className="flex items-start gap-3">
                {activeApplication.candidate_photo_url ? (
                  <img
                    src={activeApplication.candidate_photo_url}
                    alt={activeApplication.candidate_name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-primary"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-primary">
                    <span className="text-white font-semibold text-sm">
                      {activeApplication.candidate_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-[#1F2A44]">
                    {activeApplication.candidate_name}
                  </h4>
                  {activeApplication.candidate_profile_title && (
                    <p className="text-xs text-gray-600 mt-0.5">{activeApplication.candidate_profile_title}</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
