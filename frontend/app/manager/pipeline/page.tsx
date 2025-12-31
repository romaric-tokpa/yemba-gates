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
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-2 cursor-move"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {candidate.first_name} {candidate.last_name}
          </h4>
          <p className="text-sm text-gray-600 truncate">{candidate.email}</p>
          {candidate.tags && candidate.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {candidate.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ManagerPipelinePage() {
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
      console.warn('Erreur lors du chargement des candidats:', err)
      setError('Impossible de charger les candidats. Vérifiez votre connexion.')
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
    const newStatus = over.id as string

    try {
      await updateCandidateStatus(candidateId, newStatus)
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
      )
      success('Candidat déplacé avec succès')
    } catch (err) {
      console.error('Erreur lors du déplacement:', err)
      showError('Erreur lors du déplacement du candidat')
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

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Chargement du pipeline...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pipeline Kanban</h1>
        <p className="text-gray-600 mt-2">Gestion visuelle des candidats par étape</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {DISPLAYED_STATUSES.map((status) => {
            const statusCandidates = getCandidatesByStatus(status)
            return (
              <div key={status} className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900">{STATUS_LABELS[status]}</h3>
                  <span className="text-sm text-gray-500">
                    {statusCandidates.length} candidat{statusCandidates.length > 1 ? 's' : ''}
                  </span>
                </div>
                <SortableContext
                  items={statusCandidates.map((c) => c.id || '')}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {statusCandidates.map((candidate) => (
                      <CandidateCard key={candidate.id} candidate={candidate} status={status} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeCandidate ? (
            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-64">
              <h4 className="font-medium text-gray-900">
                {activeCandidate.first_name} {activeCandidate.last_name}
              </h4>
              <p className="text-sm text-gray-600">{activeCandidate.email}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

