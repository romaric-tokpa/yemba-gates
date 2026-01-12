'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createJob, JobCreate } from '@/lib/api'

export default function NouveauBesoinPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<JobCreate>({
    title: '',
    department: '',
    contract_type: '',
    budget: undefined,
    urgency: undefined,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validation : le titre est obligatoire
      if (!formData.title.trim()) {
        setError('L\'intitulé du poste est obligatoire')
        setIsSubmitting(false)
        return
      }

      // Préparer les données (enlever les champs vides)
      const dataToSend: JobCreate = {
        title: formData.title.trim(),
        ...(formData.department && { department: formData.department.trim() }),
        ...(formData.contract_type && { contract_type: formData.contract_type.trim() }),
        ...(formData.budget !== undefined && formData.budget !== null && formData.budget > 0 && { budget: formData.budget }),
        // Convertir l'urgence en minuscules pour correspondre à l'enum backend
        ...(formData.urgency && { urgency: formData.urgency.toLowerCase() as 'faible' | 'moyenne' | 'haute' | 'critique' }),
      }

      // TODO: Récupérer created_by depuis l'authentification
      // Pour l'instant, utiliser un UUID d'exemple
      // Vous devrez créer un utilisateur dans la base et utiliser son UUID
      const createdBy = '00000000-0000-0000-0000-000000000001' // UUID temporaire - À remplacer par l'UUID de l'utilisateur connecté
      
      await createJob(dataToSend)
      
      // Rediriger vers la liste des besoins
      router.push('/besoins')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du besoin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? (value ? parseFloat(value) : undefined) : value,
    }))
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link 
          href="/besoins" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux besoins
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Créer un besoin de recrutement</h1>
        <p className="text-gray-600 mt-2">Remplissez les informations pour créer un nouveau besoin</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Intitulé du poste <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Développeur Full Stack"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
              Département / Client
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: IT, Marketing, Client XYZ"
            />
          </div>

          <div>
            <label htmlFor="contract_type" className="block text-sm font-medium text-gray-700 mb-2">
              Type de contrat
            </label>
            <select
              id="contract_type"
              name="contract_type"
              value={formData.contract_type || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un type</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Stage">Stage</option>
              <option value="Freelance">Freelance</option>
              <option value="Alternance">Alternance</option>
            </select>
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
              Budget (€)
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget || ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: 50000"
            />
          </div>

          <div>
            <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-2">
              Urgence
            </label>
            <select
              id="urgency"
              name="urgency"
              value={formData.urgency || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un niveau</option>
              <option value="faible">Faible</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <Link
              href="/besoins"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création...' : 'Créer le besoin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

