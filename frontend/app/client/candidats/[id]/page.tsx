'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Tag, Mail, Phone, Calendar, User, Eye, Briefcase, Award, MapPin, GraduationCap, Languages, CheckCircle, XCircle, Clock } from 'lucide-react'
import { getCandidate, CandidateResponse } from '@/lib/api'
import { authenticatedFetch } from '@/lib/auth'
import { useToastContext } from '@/components/ToastProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ClientCandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<CandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCvPreview, setShowCvPreview] = useState(false)
  const { error: showError } = useToastContext()

  useEffect(() => {
    if (candidateId) {
      loadCandidate()
    }
  }, [candidateId])

  const loadCandidate = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const candidateData = await getCandidate(candidateId)
      setCandidate(candidateData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null
    
    const badges: Record<string, { label: string; className: string; icon: any }> = {
      'nouveau': { label: 'Nouveau', className: 'bg-blue-100 text-blue-800', icon: Clock },
      'en_contact': { label: 'En contact', className: 'bg-yellow-100 text-yellow-800', icon: Phone },
      'entretien': { label: 'Entretien', className: 'bg-purple-100 text-purple-800', icon: Calendar },
      'shortlist': { label: 'Shortlist', className: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
      'offre': { label: 'Offre', className: 'bg-green-100 text-green-800', icon: Award },
      'embauché': { label: 'Embauché', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
      'rejeté': { label: 'Rejeté', className: 'bg-red-100 text-red-800', icon: XCircle },
    }
    
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800', icon: User }
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${badge.className}`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error || 'Candidat non trouvé'}
        </div>
        <Link href="/client/shortlist" className="text-emerald-600 hover:text-emerald-700">
          ← Retour aux shortlists
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <Link
          href="/client/shortlist"
          className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux shortlists
        </Link>
        
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-emerald-600">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              {/* Photo du candidat */}
              <div className="relative">
                {candidate.profile_picture_url || candidate.photo_url ? (
                  <img
                    src={`${API_URL}${candidate.profile_picture_url || candidate.photo_url}`}
                    alt={`${candidate.first_name} ${candidate.last_name}`}
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-200">
                    <User className="w-12 h-12 text-emerald-600" />
                  </div>
                )}
                {getStatusBadge(candidate.status)}
              </div>
              
              {/* Informations principales */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {candidate.first_name} {candidate.last_name}
                </h1>
                {candidate.profile_title && (
                  <p className="text-xl text-gray-600 mb-4">{candidate.profile_title}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                  {candidate.email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-emerald-600" />
                      {candidate.email}
                    </div>
                  )}
                  {candidate.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-emerald-600" />
                      {candidate.phone}
                    </div>
                  )}
                  {candidate.years_of_experience !== null && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                      {candidate.years_of_experience} ans d'expérience
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* CV */}
          {candidate.cv_file_path && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                  Curriculum Vitae
                </h2>
                <a
                  href={`${API_URL}${candidate.cv_file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir le CV
                </a>
              </div>
              {showCvPreview && candidate.cv_file_path && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    src={`${API_URL}${candidate.cv_file_path}`}
                    className="w-full h-96"
                    title="CV Preview"
                  />
                </div>
              )}
            </div>
          )}

          {/* Compétences */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-emerald-600" />
                Compétences
              </h2>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(candidate.skills) ? (
                  candidate.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500">Aucune compétence spécifiée</p>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {candidate.tags && candidate.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-emerald-600" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {candidate.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {candidate.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                Notes
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{candidate.notes}</p>
            </div>
          )}

          {/* Lettre de motivation */}
          {candidate.motivation_letter_file_path && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                  Lettre de motivation
                </h2>
                <a
                  href={`${API_URL}${candidate.motivation_letter_file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir la lettre
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Informations rapides */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
            <div className="space-y-3">
              {candidate.source && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Source</p>
                  <p className="text-sm font-medium text-gray-900">{candidate.source}</p>
                </div>
              )}
              {candidate.created_at && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ajouté le</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(candidate.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {candidate.updated_at && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mis à jour le</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(candidate.updated_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              {candidate.cv_file_path && (
                <a
                  href={`${API_URL}${candidate.cv_file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Télécharger le CV
                </a>
              )}
              <Link
                href="/client/shortlist"
                className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux shortlists
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

