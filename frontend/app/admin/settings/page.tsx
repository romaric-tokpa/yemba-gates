'use client'

import { useState, useEffect } from 'react'
import { 
  getSettings, 
  createSetting, 
  updateSetting, 
  deleteSetting,
  type SettingResponse,
  type SettingCreate,
  type SettingUpdate
} from '@/lib/api'
import { Plus, Edit, Trash2, X, Save, Settings as SettingsIcon } from 'lucide-react'

const CATEGORIES = [
  { value: 'department', label: 'Départements' },
  { value: 'contract_type', label: 'Types de contrats' },
  { value: 'kpi_threshold', label: 'Seuils d\'alerte KPI' },
  { value: 'other', label: 'Autres' }
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSetting, setEditingSetting] = useState<SettingResponse | null>(null)
  
  const [formData, setFormData] = useState<SettingCreate>({
    key: '',
    value: '',
    category: 'other',
    description: ''
  })

  useEffect(() => {
    loadSettings()
  }, [selectedCategory])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await getSettings(selectedCategory || undefined)
      setSettings(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      if (!formData.key || !formData.value) {
        setError('La clé et la valeur sont obligatoires')
        return
      }
      
      await createSetting(formData)
      setShowCreateModal(false)
      setFormData({
        key: '',
        value: '',
        category: 'other',
        description: ''
      })
      loadSettings()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création')
    }
  }

  const handleUpdate = async (settingKey: string, updates: SettingUpdate) => {
    try {
      await updateSetting(settingKey, updates)
      setEditingSetting(null)
      loadSettings()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async (settingKey: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paramètre ?')) {
      return
    }
    
    try {
      await deleteSetting(settingKey)
      loadSettings()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression')
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'department':
        return 'bg-blue-100 text-blue-800'
      case 'contract_type':
        return 'bg-green-100 text-green-800'
      case 'kpi_threshold':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, SettingResponse[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramétrage</h1>
          <p className="text-gray-600 mt-1">Gérez les départements, types de contrats et seuils d'alerte</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau paramètre</span>
        </button>
      </div>

      {/* Filtres par catégorie */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedCategory === ''
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tous
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Affichage par catégorie */}
      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <div key={category} className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            {CATEGORIES.find(c => c.value === category)?.label || category}
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valeur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière modification
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categorySettings.map((setting) => (
                  <tr key={setting.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{setting.key}</div>
                      <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(setting.category)}`}>
                        {setting.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {setting.value}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-md">
                        {setting.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(setting.updated_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingSetting(setting)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(setting.key)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {settings.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun paramètre trouvé</p>
        </div>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Nouveau paramètre</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clé *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="ex: department_rh"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur *
                </label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="ex: Ressources Humaines"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Créer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition */}
      {editingSetting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Modifier le paramètre</h2>
              <button
                onClick={() => setEditingSetting(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <EditSettingForm
              setting={editingSetting}
              onClose={() => setEditingSetting(null)}
              onSave={(updates) => handleUpdate(editingSetting.key, updates)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EditSettingForm({ 
  setting, 
  onClose, 
  onSave 
}: { 
  setting: SettingResponse
  onClose: () => void
  onSave: (updates: SettingUpdate) => void
}) {
  const [formData, setFormData] = useState<SettingUpdate>({
    value: setting.value,
    description: setting.description || undefined
  })

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Clé (non modifiable)
          </label>
          <input
            type="text"
            value={setting.key}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valeur *
          </label>
          <input
            type="text"
            value={formData.value || ''}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Annuler
        </button>
        <button
          onClick={() => onSave(formData)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer</span>
        </button>
      </div>
    </>
  )
}

