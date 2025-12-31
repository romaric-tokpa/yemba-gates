'use client'

import { useState, useEffect } from 'react'
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
import { useToastContext } from '@/components/ToastProvider'

// Mapping des statuts vers les labels d'affichage
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

// Ordre des colonnes
const STATUS_ORDER = [
  'sourcé',
  'qualifié',
  'entretien_rh',
  'entretien_client',
  'shortlist',
  'offre',
  'embauché',
]

// Colonnes à afficher (sans "rejeté" dans le kanban principal)
const DISPLAYED_STATUSES = STATUS_ORDER.filter(s => s !== 'rejeté')

interface CandidateCardProps {
  candidate: CandidateResponse
}

function CandidateCard({ candidate }: CandidateCardProps) {
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
      {...attributes}
      {...listeners}
      className="bg-white p-3 lg:p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="font-medium text-sm lg:text-base text-gray-900">
        {candidate.first_name} {candidate.last_name}
      </div>
      {candidate.profile_title && (
        <div className="text-xs lg:text-sm text-gray-600 mt-1">
          {candidate.profile_title}
        </div>
      )}
      {candidate.years_of_experience !== null && candidate.years_of_experience !== undefined && (
        <div className="text-xs text-gray-500 mt-0.5">
          {candidate.years_of_experience} ans d&apos;expérience
        </div>
      )}
      {candidate.email && (
        <div className="text-xs lg:text-sm text-gray-500 mt-1 truncate">{candidate.email}</div>
      )}
      {candidate.source && (
        <div className="text-xs text-gray-400 mt-1">Source: {candidate.source}</div>
      )}
      {candidate.tags && candidate.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {candidate.tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
            >
              {tag}
            </span>
          ))}
          {candidate.tags.length > 2 && (
            <span className="px-2 py-0.5 text-xs text-gray-500">
              +{candidate.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface ColumnProps {
  status: string
  candidates: CandidateResponse[]
}

function Column({ status, candidates }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] lg:flex-1 lg:min-w-[280px] bg-gray-50 rounded-lg p-3 lg:p-4 transition-colors snap-start ${
        isOver ? 'bg-blue-50 border-2 border-blue-300' : ''
      }`}
    >
      <div className="mb-3 lg:mb-4">
        <h3 className="font-semibold text-sm lg:text-base text-gray-900">
          {STATUS_LABELS[status] || status}
        </h3>
        <span className="text-xs lg:text-sm text-gray-500">
          {candidates.length} candidat{candidates.length > 1 ? 's' : ''}
        </span>
      </div>
      <SortableContext
        items={candidates.map(c => c.id || '')}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 lg:space-y-3 min-h-[150px] lg:min-h-[200px]">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export default function PipelinePage() {
  const [candidates, setCandidates] = useState<CandidateResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const { success, error: showError } = useToastContext()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Charger les candidats
  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = async () => {
    try {
      setIsLoading(true)
      const data = await getCandidates()
      setCandidates(data)
    } catch (err) {
      console.error('Erreur lors du chargement des candidats:', err)
      showError('Erreur lors du chargement des candidats')
    } finally {
      setIsLoading(false)
    }
  }

  // Organiser les candidats par statut
  const candidatesByStatus = DISPLAYED_STATUSES.reduce((acc, status) => {
    acc[status] = candidates.filter(c => c.status === status)
    return acc
  }, {} as Record<string, CandidateResponse[]>)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || !active.id) return

    const candidateId = active.id as string
    const newStatus = over.id as string

    // Trouver le candidat
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate) return

    // Si le statut n'a pas changé, ne rien faire
    if (candidate.status === newStatus) return

    // Sauvegarder l'ancien statut pour pouvoir le restaurer en cas d'erreur
    const oldStatus = candidate.status

    // Mettre à jour localement immédiatement pour un feedback visuel rapide
    setCandidates(prev =>
      prev.map(c =>
        c.id === candidateId ? { ...c, status: newStatus } : c
      )
    )

    // Mettre à jour dans la base de données
    try {
      setIsUpdating(true)
      await updateCandidateStatus(candidateId, newStatus)
      
      // Recharger pour s'assurer que tout est synchronisé avec le backend
      await loadCandidates()
      
      // Notification de succès
      const candidateName = `${candidate.first_name} ${candidate.last_name}`
      const newStatusLabel = STATUS_LABELS[newStatus] || newStatus
      success(`Candidat "${candidateName}" déplacé vers "${newStatusLabel}" avec succès`)
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err)
      
      // Restaurer l'ancien statut en cas d'erreur
      setCandidates(prev =>
        prev.map(c =>
          c.id === candidateId ? { ...c, status: oldStatus } : c
        )
      )
      
      // Afficher le message d'erreur approprié
      if (err instanceof Error && (err as any).isFeedbackError) {
        showError('Feedback manquant : Veuillez saisir un feedback avant de changer le statut')
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut'
        showError(errorMessage)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const activeCandidate = activeId
    ? candidates.find(c => c.id === activeId)
    : null

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Pipeline de recrutement</h1>
        <p className="text-sm lg:text-base text-gray-600 mt-2">Glissez-déposez les candidats pour changer leur statut</p>
      </div>

      {isLoading && candidates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Chargement des candidats...</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {DISPLAYED_STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                candidates={candidatesByStatus[status] || []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCandidate ? (
              <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-64">
                <div className="font-medium text-gray-900">
                  {activeCandidate.first_name} {activeCandidate.last_name}
                </div>
                {activeCandidate.email && (
                  <div className="text-sm text-gray-500 mt-1">{activeCandidate.email}</div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

    </div>
  )
}

