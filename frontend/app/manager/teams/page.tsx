'use client'

import { useState, useEffect } from 'react'
import { 
  getTeams, 
  createTeam, 
  updateTeam, 
  deleteTeam, 
  addTeamMember, 
  removeTeamMember,
  getUsers,
  type TeamResponse,
  type TeamCreate,
  type TeamUpdate,
  type UserResponse
} from '@/lib/api'
import { useToastContext } from '@/components/ToastProvider'
import { 
  Plus, 
  X, 
  Users, 
  Edit, 
  Trash2, 
  UserPlus, 
  UserMinus,
  Search,
  Building2,
  User as UserIcon,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react'

export default function TeamsPage() {
  const { success, error: showError } = useToastContext()
  
  const [teams, setTeams] = useState<TeamResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamResponse | null>(null)
  
  // Formulaire
  const [formData, setFormData] = useState<Partial<TeamCreate>>({
    name: '',
    description: '',
    department: '',
    manager_id: '',
    member_ids: []
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [teamsData, usersData] = await Promise.all([
        getTeams(),
        getUsers()
      ])
      setTeams(teamsData)
      setUsers(usersData)
    } catch (err: any) {
      console.error('Erreur lors du chargement:', err)
      setError(err.message || 'Erreur lors du chargement des données')
      showError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      department: '',
      manager_id: '',
      member_ids: []
    })
    setSearchQuery('')
    setMemberSearchQuery('')
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      await createTeam(formData as TeamCreate)
      success('Équipe créée avec succès')
      setShowCreateModal(false)
      resetForm()
      loadData()
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la création de l\'équipe')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam) return
    
    try {
      setIsLoading(true)
      await updateTeam(selectedTeam.id, formData as TeamUpdate)
      success('Équipe mise à jour avec succès')
      setShowEditModal(false)
      resetForm()
      setSelectedTeam(null)
      loadData()
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la mise à jour de l\'équipe')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return
    
    try {
      setIsLoading(true)
      await deleteTeam(selectedTeam.id)
      success('Équipe supprimée avec succès')
      setShowDeleteModal(false)
      setSelectedTeam(null)
      loadData()
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la suppression de l\'équipe')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return
    
    try {
      setIsLoading(true)
      await addTeamMember(selectedTeam.id, userId)
      success('Membre ajouté avec succès')
      setShowAddMemberModal(false)
      setMemberSearchQuery('')
      loadData()
    } catch (err: any) {
      showError(err.message || 'Erreur lors de l\'ajout du membre')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return
    
    try {
      setIsLoading(true)
      await removeTeamMember(selectedTeam.id, userId)
      success('Membre retiré avec succès')
      loadData()
    } catch (err: any) {
      showError(err.message || 'Erreur lors du retrait du membre')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditModal = (team: TeamResponse) => {
    setSelectedTeam(team)
    setFormData({
      name: team.name,
      description: team.description || '',
      department: team.department || '',
      manager_id: team.manager_id || '',
      member_ids: []
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (team: TeamResponse) => {
    setSelectedTeam(team)
    setShowDeleteModal(true)
  }

  const openAddMemberModal = (team: TeamResponse) => {
    setSelectedTeam(team)
    setShowAddMemberModal(true)
  }

  // Filtrer les équipes
  const filteredTeams = teams.filter(team => {
    const searchLower = searchQuery.toLowerCase()
    return (
      team.name.toLowerCase().includes(searchLower) ||
      team.department?.toLowerCase().includes(searchLower) ||
      team.description?.toLowerCase().includes(searchLower)
    )
  })

  // Filtrer les utilisateurs disponibles pour ajout
  const availableUsers = users.filter(user => {
    if (!selectedTeam) return false
    const isAlreadyMember = selectedTeam.members?.some(m => m.user_id === user.id)
    if (isAlreadyMember) return false
    
    const searchLower = memberSearchQuery.toLowerCase()
    return (
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    )
  })

  if (isLoading && teams.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Chargement des équipes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">Gestion des Équipes</h1>
                <p className="text-indigo-100 text-lg">Organisez et gérez vos équipes de recrutement</p>
              </div>
              <button
                onClick={() => {
                  resetForm()
                  setShowCreateModal(true)
                }}
                className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="w-5 h-5" />
                Créer une équipe
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total équipes</p>
            <p className="text-3xl font-bold text-gray-900">{teams.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                <UserIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total membres</p>
            <p className="text-3xl font-bold text-gray-900">
              {teams.reduce((sum, team) => sum + (team.members_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Départements</p>
            <p className="text-3xl font-bold text-gray-900">
              {new Set(teams.filter(t => t.department).map(t => t.department)).size}
            </p>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une équipe par nom, département ou description..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
            />
          </div>
        </div>

        {/* Liste des équipes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTeams.length > 0 ? (
            filteredTeams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{team.name}</h3>
                        {team.department && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Building2 className="w-4 h-4" />
                            {team.department}
                          </p>
                        )}
                      </div>
                    </div>
                    {team.description && (
                      <p className="text-sm text-gray-600 mt-2 mb-3">{team.description}</p>
                    )}
                    {team.manager_name && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Manager:</span> {team.manager_name}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-indigo-600" />
                        {team.members_count || 0} membre{team.members_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Membres */}
                {team.members && team.members.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-2">MEMBRES</p>
                    <div className="space-y-2">
                      {team.members.slice(0, 3).map((member) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.user_first_name} {member.user_last_name}
                              </p>
                              <p className="text-xs text-gray-500">{member.user_role}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                            title="Retirer le membre"
                          >
                            <UserMinus className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{team.members.length - 3} autre{team.members.length - 3 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => openAddMemberModal(team)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    Ajouter membre
                  </button>
                  <button
                    onClick={() => openEditModal(team)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(team)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-16 bg-white rounded-xl shadow-lg">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                <Users className="w-10 h-10 text-indigo-600" />
              </div>
              <p className="text-xl font-semibold text-gray-900 mb-2">Aucune équipe trouvée</p>
              <p className="text-gray-600 mb-6">
                {searchQuery ? 'Aucune équipe ne correspond à votre recherche' : 'Commencez par créer votre première équipe'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    resetForm()
                    setShowCreateModal(true)
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Créer votre première équipe
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal de création */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-200">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Créer une équipe</h2>
                    <p className="text-indigo-100 text-sm mt-1">Remplissez les informations ci-dessous</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateTeam} className="p-8 space-y-6 bg-gray-50">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom de l'équipe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    placeholder="Ex: Équipe Recrutement IT"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    placeholder="Description de l'équipe..."
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Département</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    placeholder="Ex: IT, RH, Marketing..."
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Manager</label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  >
                    <option value="">Sélectionner un manager</option>
                    {users.filter(u => u.role === 'manager' || u.role === 'administrateur').map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 bg-white -mx-8 -mb-8 px-8 pb-8 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Création...' : 'Créer l\'équipe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal d'édition */}
        {showEditModal && selectedTeam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-200">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Modifier l'équipe</h2>
                    <p className="text-indigo-100 text-sm mt-1">Mettez à jour les informations</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                    setSelectedTeam(null)
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateTeam} className="p-8 space-y-6 bg-gray-50">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom de l'équipe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Département</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Manager</label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  >
                    <option value="">Sélectionner un manager</option>
                    {users.filter(u => u.role === 'manager' || u.role === 'administrateur').map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 bg-white -mx-8 -mb-8 px-8 pb-8 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      resetForm()
                      setSelectedTeam(null)
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de suppression */}
        {showDeleteModal && selectedTeam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer l'équipe</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer l'équipe <strong>{selectedTeam.name}</strong> ? Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedTeam(null)
                  }}
                  className="px-6 py-2 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteTeam}
                  disabled={isLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'ajout de membre */}
        {showAddMemberModal && selectedTeam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-200">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Ajouter un membre</h2>
                    <p className="text-indigo-100 text-sm mt-1">Équipe: {selectedTeam.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setMemberSearchQuery('')
                    setSelectedTeam(null)
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 bg-gray-50">
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Rechercher un utilisateur..."
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableUsers.length > 0 ? (
                    availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <p className="text-xs text-gray-500">{user.role}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddMember(user.id)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {memberSearchQuery ? 'Aucun utilisateur trouvé' : 'Commencez à taper pour rechercher'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

