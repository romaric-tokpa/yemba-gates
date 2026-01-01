'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { getCandidates, updateCandidateStatus, CandidateResponse } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'
import { GripVertical } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  sourcé: 'Sourcé',
  qualifié: 'Qualifié',
  entretien_rh: 'Entretien RH',
  entretien_client: 'Entretien Client',
  shortlist: 'Shortlist',
  offre: 'Offre',
  rejeté: 'Rejeté',
  embauché: 'Embauché',
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

const DISPLAYED_STATUSES = STATUS_ORDER.filter(s => s !== 'rejeté')

function CandidateCard({ candidate, status }: { candidate: CandidateResponse; status: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id || '' })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Link
      href={`/recruiter/candidates/${candidate.id}`}
      ref={setNodeRef}
      style={style}
      className="block bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </div>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Photo de profil */}
          {candidate.profile_picture_url || candidate.photo_url ? (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${candidate.profile_picture_url || candidate.photo_url}`}
              alt={`${candidate.first_name} ${candidate.last_name}`}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 border-2 border-gray-200">
              <span className="text-white font-semibold text-xs">
                {candidate.first_name[0]}{candidate.last_name[0]}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">
              {candidate.first_name} {candidate.last_name}
            </h4>
            {candidate.profile_title && (
              <p className="text-xs text-gray-600 mt-0.5 truncate">
                {candidate.profile_title}
              </p>
            )}
            {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
              <p className="text-xs text-gray-500 mt-0.5">
                {candidate.years_of_experience} ans d&apos;expérience
              </p>
            )}
            {candidate.tags && candidate.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {candidate.tags.slice(0, 2).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {candidate.tags.length > 2 && (
                  <span className="px-2 py-0.5 text-xs text-gray-500 font-medium">
                    +{candidate.tags.length - 2}
                  </span>
                )}
              </div>
            )}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 truncate">
                  <span className="font-medium">Skills:</span> {candidate.skills.slice(0, 2).join(', ')}
                  {candidate.skills.length > 2 && '...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function RecruiterPipelinePage() {
  const router = useRouter()
  const { success, error: showError } = useToastContext()
  const [candidates, setCandidates] = useState<CandidateResponse[]>([])
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
    // Vérifier l'authentification avant de charger les données
    if (!isAuthenticated() || !getToken()) {
      router.push('/auth/choice')
      return
    }

    loadCandidates()
  }, [router])

  const loadCandidates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getCandidates()
      setCandidates(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des candidats:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(`Impossible de charger les candidats: ${errorMessage}. Vérifiez que le backend est démarré sur http://localhost:8000`)
      setCandidates([])
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

    const candidateId = active.id as string
    let newStatus = over.id as string

    // Si over.id n'est pas un statut valide (c'est un ID de candidat), récupérer le statut du candidat cible
    if (!DISPLAYED_STATUSES.includes(newStatus)) {
      const targetCandidate = candidates.find(c => c.id === newStatus)
      if (targetCandidate) {
        newStatus = targetCandidate.status
      } else {
        // Si ce n'est ni un statut ni un candidat valide, annuler
        return
      }
    }

    try {
      await updateCandidateStatus(candidateId, newStatus)
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
      )
      success('Candidat déplacé avec succès')
    } catch (err) {
      console.error('Erreur lors du déplacement:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du déplacement du candidat'
      showError(errorMessage)
      // Recharger les candidats pour récupérer l'état correct
      loadCandidates()
    }
  }

  const getCandidatesByStatus = (status: string) => {
    return candidates.filter((c) => c.status === status)
  }

  const activeCandidate = activeId
    ? candidates.find((c) => c.id === activeId)
    : null

  // Composant Column pour les zones droppables
  function Column({ status, children, colors }: { status: string; children: React.ReactNode; colors: { bg: string; text: string; border: string } }) {
    const { setNodeRef } = useDroppable({
      id: status,
    })

    return (
      <div
        ref={setNodeRef}
        className={`flex-shrink-0 w-[280px] lg:flex-1 lg:min-w-[280px] ${colors.bg} rounded-lg border-2 ${colors.border} p-4 transition-all hover:shadow-lg`}
      >
        {children}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center py-12 text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4">Chargement du pipeline...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pipeline Kanban</h1>
        <p className="text-gray-600 mt-2">Gérez visuellement vos candidats par étape de recrutement</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max lg:min-w-0">
            {DISPLAYED_STATUSES.map((status) => {
              const statusCandidates = getCandidatesByStatus(status)
              const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                'sourcé': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
                'qualifié': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
                'entretien_rh': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
                'entretien_client': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' },
                'shortlist': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
                'offre': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
                'embauché': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
              }
              const colors = statusColors[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' }
              
              return (
                <Column key={status} status={status} colors={colors}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold text-sm lg:text-base ${colors.text} mb-1`}>
                        {STATUS_LABELS[status]}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {statusCandidates.length} candidat{statusCandidates.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className={`${colors.text} bg-white/60 px-2 py-1 rounded-full text-xs font-medium`}>
                      {statusCandidates.length}
                    </div>
                  </div>
                  <SortableContext
                    items={statusCandidates.map((c) => c.id || '')}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[200px]">
                      {statusCandidates.map((candidate) => (
                        <CandidateCard key={candidate.id} candidate={candidate} status={status} />
                      ))}
                      {statusCandidates.length === 0 && (
                        <div className="bg-white/50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
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
          {activeCandidate ? (
            <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-blue-300 w-64">
              <div className="flex items-start gap-3">
                {activeCandidate.profile_picture_url || activeCandidate.photo_url ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${activeCandidate.profile_picture_url || activeCandidate.photo_url}`}
                    alt={`${activeCandidate.first_name} ${activeCandidate.last_name}`}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-blue-300"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 border-2 border-blue-300">
                    <span className="text-white font-semibold text-xs">
                      {activeCandidate.first_name[0]}{activeCandidate.last_name[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {activeCandidate.first_name} {activeCandidate.last_name}
                  </h4>
                  {activeCandidate.profile_title && (
                    <p className="text-xs text-gray-600 mt-0.5">{activeCandidate.profile_title}</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

