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
  createUserByManager,
  getUsersByManager,
  getUserByManager,
  updateUserByManager,
  deleteUserByManager,
  type TeamResponse,
  type TeamCreate,
  type TeamUpdate,
  type UserResponse,
  type UserCreateByManager,
  type UserCreateResponse
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
  Briefcase,
  Key,
  Copy,
  CheckCircle,
  Shield,
  UserCheck,
  AlertCircle
} from 'lucide-react'

type TabType = 'teams' | 'users'

export default function TeamsPage() {
  const { success, error: showError } = useToastContext()
  
  const [activeTab, setActiveTab] = useState<TabType>('teams')
  
  // Teams state
  const [teams, setTeams] = useState<TeamResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Teams modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamResponse | null>(null)
  
  // Teams form
  const [formData, setFormData] = useState<Partial<TeamCreate>>({
    name: '',
    description: '',
    department: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  
  // Users state
  const [managedUsers, setManagedUsers] = useState<UserCreateResponse[]>([])
  const [userFilter, setUserFilter] = useState<'all' | 'recruteur' | 'client'>('all')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  
  // Users modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserCreateResponse | null>(null)
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)
  // Stocker les mots de passe générés par ID utilisateur pour pouvoir les afficher plus tard
  const [storedPasswords, setStoredPasswords] = useState<Record<string, string>>({})
  
  // Users form
  const [userFormData, setUserFormData] = useState<Partial<UserCreateByManager>>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'recruteur',
    phone: '',
    department: '',
    generate_password: true,
    is_active: true
  })

  useEffect(() => {
    console.log('🔄 [TEAMS] useEffect déclenché - activeTab:', activeTab, 'userFilter:', userFilter)
    loadData()
  }, [activeTab, userFilter])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (activeTab === 'teams') {
        let hasNetworkError = false
        
        try {
          const teamsData = await getTeams()
          setTeams(teamsData)
        } catch (err: any) {
          setTeams([])
          if (err.name === 'NetworkError' || (err as any).isNetworkError) {
            hasNetworkError = true
          } else {
            console.error('❌ [TEAMS] Erreur lors du chargement des équipes:', err)
          }
        }
        
        try {
          const usersData = await getUsers()
          setUsers(usersData)
        } catch (err: any) {
          setUsers([])
          if (err.name === 'NetworkError' || (err as any).isNetworkError) {
            hasNetworkError = true
          } else {
            console.error('❌ [TEAMS] Erreur lors du chargement des utilisateurs:', err)
          }
        }
        
        // Afficher un message d'erreur seulement si c'est une erreur réseau
        if (hasNetworkError) {
          setError('Backend non accessible. Vérifiez que le serveur est démarré sur http://localhost:8000')
          // Ne pas afficher de toast pour les erreurs réseau, juste mettre le message dans l'état
        }
      } else {
        // Charger les utilisateurs créés par le manager
        const role = userFilter === 'all' ? undefined : userFilter
        console.log('📥 [TEAMS] Chargement des utilisateurs avec filtre:', role)
        try {
          const usersData = await getUsersByManager(role)
          console.log('✅ [TEAMS] Utilisateurs chargés:', usersData.length, usersData)
          setManagedUsers(usersData)
        } catch (err: any) {
          setManagedUsers([])
          if (err.name === 'NetworkError' || (err as any).isNetworkError) {
            setError('Backend non accessible. Vérifiez que le serveur est démarré sur http://localhost:8000')
            // Ne pas afficher de toast pour les erreurs réseau
          } else {
            console.error('❌ [TEAMS] Erreur lors du chargement des utilisateurs:', err)
            setError(err.message || 'Erreur lors du chargement des utilisateurs')
            showError(err.message || 'Erreur lors du chargement des utilisateurs')
          }
        }
      }
    } catch (err: any) {
      // Vérifier si c'est une erreur de connexion
      if (err.name === 'NetworkError' || (err as any).isNetworkError) {
        setError('Backend non accessible. Vérifiez que le serveur est démarré sur http://localhost:8000')
        // Ne pas afficher de toast pour les erreurs réseau
      } else {
        console.error('❌ [TEAMS] Erreur lors du chargement:', err)
        const errorMessage = err.message || 'Erreur lors du chargement des données'
        setError(errorMessage)
        showError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      department: ''
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

  // Fonctions pour la gestion des utilisateurs
  const resetUserForm = () => {
    setUserFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'recruteur',
      phone: '',
      department: '',
      generate_password: true,
      is_active: true
    })
    setGeneratedCredentials(null)
    setCopiedPassword(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      const result = await createUserByManager(userFormData as UserCreateByManager)
      if (result.generated_password) {
        setGeneratedCredentials({
          email: result.email,
          password: result.generated_password
        })
        // Stocker le mot de passe pour pouvoir l'afficher plus tard
        setStoredPasswords(prev => ({ ...prev, [result.id]: result.generated_password || '' }))
      }
      success('Utilisateur créé avec succès')
      setShowCreateUserModal(false)
      resetUserForm()
      await loadData()
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la création de l\'utilisateur')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    
    try {
      setIsLoading(true)
      const result = await updateUserByManager(selectedUser.id, userFormData as UserCreateByManager)
      if (result.generated_password) {
        setGeneratedCredentials({
          email: result.email,
          password: result.generated_password
        })
        // Stocker le mot de passe pour pouvoir l'afficher plus tard
        setStoredPasswords(prev => ({ ...prev, [result.id]: result.generated_password || '' }))
      }
      success('Utilisateur mis à jour avec succès')
      setShowEditUserModal(false)
      resetUserForm()
      setSelectedUser(null)
      await loadData()
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la mise à jour de l\'utilisateur')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      setIsLoading(true)
      await deleteUserByManager(selectedUser.id)
      success('Utilisateur désactivé avec succès')
      setShowDeleteUserModal(false)
      setSelectedUser(null)
      await loadData()
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la suppression de l\'utilisateur')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditUserModal = (user: UserCreateResponse) => {
    setSelectedUser(user)
    setUserFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role as 'recruteur' | 'client',
      phone: user.phone || '',
      department: user.department || '',
      generate_password: false,
      is_active: user.is_active
    })
    setShowEditUserModal(true)
  }

  const openDeleteUserModal = (user: UserCreateResponse) => {
    setSelectedUser(user)
    setShowDeleteUserModal(true)
  }

  const openUserDetailsModal = (user: UserCreateResponse) => {
    setSelectedUser(user)
    setShowUserDetailsModal(true)
  }

  const copyPassword = () => {
    if (generatedCredentials?.password) {
      navigator.clipboard.writeText(generatedCredentials.password)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    }
  }

  // Filtrer les utilisateurs
  const filteredUsers = managedUsers.filter(user => {
    const searchLower = userSearchQuery.toLowerCase()
    return (
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.department?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec onglets */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary via-primary-600 to-primary-700 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">Gestion des Équipes & Utilisateurs</h1>
                <p className="text-primary-100 text-lg">Organisez vos équipes et créez des accès utilisateurs</p>
              </div>
              {activeTab === 'teams' ? (
                <button
                  onClick={() => {
                    resetForm()
                    setShowCreateModal(true)
                  }}
                  className="flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Créer une équipe
                </button>
              ) : (
                <button
                  onClick={() => {
                    resetUserForm()
                    setShowCreateUserModal(true)
                  }}
                  className="flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <UserPlus className="w-5 h-5" />
                  Créer un utilisateur
                </button>
              )}
            </div>
            
            {/* Onglets */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 p-1">
              <button
                onClick={() => setActiveTab('teams')}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'teams'
                    ? 'bg-white text-primary shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Équipes
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-white text-primary shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <UserIcon className="w-4 h-4 inline mr-2" />
                Utilisateurs
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Contenu conditionnel selon l'onglet */}
        {activeTab === 'teams' ? (
          <>
            {/* Statistiques équipes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary-100 rounded-xl group-hover:bg-primary-200 transition-colors">
                    <Users className="w-6 h-6 text-primary" />
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
                  <div className="p-3 bg-accent-100 rounded-xl group-hover:bg-accent-200 transition-colors">
                    <Building2 className="w-6 h-6 text-accent" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Départements</p>
                <p className="text-3xl font-bold text-gray-900">
                  {new Set(teams.filter(t => t.department).map(t => t.department)).size}
                </p>
              </div>
            </div>

            {/* Barre de recherche équipes */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une équipe par nom, département ou description..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                />
              </div>
            </div>

            {/* Liste des équipes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTeams.length > 0 ? (
            filteredTeams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-primary-300 hover:shadow-xl transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Users className="w-5 h-5 text-primary" />
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
                        <Users className="w-4 h-4 text-primary" />
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
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.user_name || 'Utilisateur sans nom'}
                              </p>
                              <p className="text-xs text-gray-500">{member.role}</p>
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition-colors text-sm font-medium"
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
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-4">
                <Users className="w-10 h-10 text-primary" />
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Créer votre première équipe
                </button>
              )}
            </div>
          )}
        </div>
          </>
        ) : (
          <>
            {/* Statistiques utilisateurs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary-100 rounded-xl group-hover:bg-primary-200 transition-colors">
                    <UserIcon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total utilisateurs</p>
                <p className="text-3xl font-bold text-gray-900">{managedUsers.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <UserCheck className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Recruteurs</p>
                <p className="text-3xl font-bold text-gray-900">
                  {managedUsers.filter(u => u.role === 'recruteur').length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Clients</p>
                <p className="text-3xl font-bold text-gray-900">
                  {managedUsers.filter(u => u.role === 'client').length}
                </p>
              </div>
            </div>

            {/* Filtres et recherche utilisateurs */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                />
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-gray-200 p-1">
                <button
                  onClick={() => setUserFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    userFilter === 'all'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setUserFilter('recruteur')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    userFilter === 'recruteur'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Recruteurs
                </button>
                <button
                  onClick={() => setUserFilter('client')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    userFilter === 'client'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Clients
                </button>
              </div>
            </div>

            {/* Liste des utilisateurs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-primary-300 hover:shadow-xl transition-all p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {user.first_name} {user.last_name}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </p>
                          <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-lg ${
                            user.role === 'recruteur' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {user.role === 'recruteur' ? 'Recruteur' : 'Client'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-primary" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.department && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span>{user.department}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className={`w-4 h-4 ${user.is_active ? 'text-green-600' : 'text-red-600'}`} />
                        <span>{user.is_active ? 'Actif' : 'Inactif'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => openUserDetailsModal(user)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition-colors text-sm font-medium"
                      >
                        <UserIcon className="w-4 h-4" />
                        Voir fiche
                      </button>
                      {!user.is_active && (
                        <button
                          onClick={async () => {
                            try {
                              setIsLoading(true)
                              await updateUserByManager(user.id, { ...user, is_active: true } as UserCreateByManager)
                              success('Utilisateur réactivé avec succès')
                              await loadData()
                            } catch (err: any) {
                              showError(err.message || 'Erreur lors de la réactivation de l\'utilisateur')
                            } finally {
                              setIsLoading(false)
                            }
                          }}
                          disabled={isLoading}
                          className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium disabled:opacity-50"
                          title="Réactiver l'utilisateur"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditUserModal(user)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.is_active && (
                        <button
                          onClick={() => openDeleteUserModal(user)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-16 bg-white rounded-xl shadow-lg">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-4">
                    <UserIcon className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">Aucun utilisateur trouvé</p>
                  <p className="text-gray-600 mb-6">
                    {userSearchQuery ? 'Aucun utilisateur ne correspond à votre recherche' : 'Commencez par créer votre premier utilisateur'}
                  </p>
                  {!userSearchQuery && (
                    <button
                      onClick={() => {
                        resetUserForm()
                        setShowCreateUserModal(true)
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl font-semibold"
                    >
                      <UserPlus className="w-5 h-5" />
                      Créer votre premier utilisateur
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modals pour les équipes */}
        {/* Modal de création */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-200">
              <div className="bg-gradient-to-r from-primary to-primary-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Créer une équipe</h2>
                    <p className="text-primary-100 text-sm mt-1">Remplissez les informations ci-dessous</p>
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    placeholder="Ex: Équipe Recrutement IT"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    placeholder="Description de l'équipe..."
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Département</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    placeholder="Ex: IT, RH, Marketing..."
                  />
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
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-gradient-to-r from-primary to-primary-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Modifier l'équipe</h2>
                    <p className="text-primary-100 text-sm mt-1">Mettez à jour les informations</p>
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Département</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  />
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
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-gradient-to-r from-primary to-primary-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Ajouter un membre</h2>
                    <p className="text-primary-100 text-sm mt-1">Équipe: {selectedTeam.name}</p>
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
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableUsers.length > 0 ? (
                    availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="bg-white p-4 rounded-xl border border-gray-200 hover:border-primary-300 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-primary" />
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
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50"
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

        {/* Modals pour les utilisateurs */}
        {/* Modal de création d'utilisateur */}
        {showCreateUserModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-200">
              <div className="bg-gradient-to-r from-primary to-primary-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Créer un utilisateur</h2>
                    <p className="text-primary-100 text-sm mt-1">Créez un accès recruteur ou client</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateUserModal(false)
                    resetUserForm()
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="p-8 space-y-6 bg-gray-50">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Rôle <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'recruteur' | 'client' })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  >
                    <option value="recruteur">Recruteur</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    placeholder="exemple@email.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.first_name}
                      onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    />
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.last_name}
                      onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={userFormData.phone || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Département</label>
                  <input
                    type="text"
                    value={userFormData.department || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    placeholder="Ex: IT, RH, Marketing..."
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.generate_password}
                      onChange={(e) => setUserFormData({ ...userFormData, generate_password: e.target.checked })}
                      className="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      Générer un mot de passe automatiquement
                    </span>
                  </label>
                  {!userFormData.generate_password && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        required={!userFormData.generate_password}
                        value={userFormData.password || ''}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 bg-white -mx-8 -mb-8 px-8 pb-8 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUserModal(false)
                      resetUserForm()
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Création...' : 'Créer l\'utilisateur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal d'affichage des identifiants générés */}
        {generatedCredentials && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Key className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Identifiants générés</h3>
                  <p className="text-sm text-gray-600">Notez ces informations, elles ne seront plus affichées</p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                  <p className="text-sm font-mono text-gray-900">{generatedCredentials.email}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg relative">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Mot de passe</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-900 flex-1">{generatedCredentials.password}</p>
                    <button
                      onClick={copyPassword}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Copier le mot de passe"
                    >
                      {copiedPassword ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  ⚠️ Ces identifiants permettent de se connecter à la page de connexion. Partagez-les de manière sécurisée.
                </p>
              </div>
              <button
                onClick={() => {
                  setGeneratedCredentials(null)
                  setCopiedPassword(false)
                }}
                className="w-full px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 transition-all font-semibold"
              >
                J'ai noté les identifiants
              </button>
            </div>
          </div>
        )}

        {/* Modal de détails utilisateur */}
        {showUserDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-200">
              <div className="bg-gradient-to-r from-primary to-primary-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Fiche utilisateur</h2>
                    <p className="text-primary-100 text-sm mt-1">{selectedUser.first_name} {selectedUser.last_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserDetailsModal(false)
                    setSelectedUser(null)
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-6 bg-gray-50">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Prénom</label>
                      <p className="text-sm text-gray-900">{selectedUser.first_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom</label>
                      <p className="text-sm text-gray-900">{selectedUser.last_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                      <p className="text-sm text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Téléphone</label>
                      <p className="text-sm text-gray-900">{selectedUser.phone || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Rôle</label>
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-lg ${
                        selectedUser.role === 'recruteur' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {selectedUser.role === 'recruteur' ? 'Recruteur' : 'Client'}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Département</label>
                      <p className="text-sm text-gray-900">{selectedUser.department || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Statut</label>
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-lg ${
                        selectedUser.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedUser.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Date de création</label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    Accès et Identifiants
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        L'utilisateur peut se connecter avec son email et son mot de passe via la page de connexion.
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Espace de travail:</strong> {selectedUser.role === 'recruteur' ? '/recruteur' : '/client'}
                      </p>
                    </div>
                    
                    {/* Section Email */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Email de connexion</label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-gray-900 flex-1">{selectedUser.email}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedUser.email)
                            setCopiedPassword(true)
                            setTimeout(() => setCopiedPassword(false), 2000)
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Copier l'email"
                        >
                          {copiedPassword ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Section Mot de passe généré */}
                    {(selectedUser.generated_password || storedPasswords[selectedUser.id]) ? (
                      <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="w-4 h-4 text-yellow-700" />
                          <p className="text-sm font-semibold text-yellow-800">Mot de passe généré</p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-base font-mono text-yellow-900 flex-1 bg-white px-3 py-2 rounded border border-yellow-200">
                            {selectedUser.generated_password || storedPasswords[selectedUser.id]}
                          </p>
                          <button
                            onClick={() => {
                              const password = selectedUser.generated_password || storedPasswords[selectedUser.id] || ''
                              navigator.clipboard.writeText(password)
                              setCopiedPassword(true)
                              setTimeout(() => setCopiedPassword(false), 2000)
                            }}
                            className="p-2 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors"
                            title="Copier le mot de passe"
                          >
                            {copiedPassword ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Copy className="w-5 h-5 text-yellow-700" />
                            )}
                          </button>
                        </div>
                        <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-2">
                          <p className="text-xs text-yellow-800 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Ce mot de passe a été généré lors de la création ou de la dernière mise à jour. Notez-le, il ne sera plus affiché après fermeture de cette session.</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Mot de passe:</strong> Le mot de passe n'est pas disponible. Il a été défini lors de la création de l'utilisateur et n'est pas stocké pour des raisons de sécurité.
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Pour réinitialiser le mot de passe, modifiez l'utilisateur et cochez "Régénérer un nouveau mot de passe".
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 bg-white -mx-8 -mb-8 px-8 pb-8 rounded-b-2xl">
                  <button
                    onClick={() => {
                      setShowUserDetailsModal(false)
                      setSelectedUser(null)
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDetailsModal(false)
                      openEditUserModal(selectedUser)
                    }}
                    className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 transition-all font-semibold"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition utilisateur */}
        {showEditUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-200">
              <div className="bg-gradient-to-r from-primary to-primary-600 p-6 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Modifier l'utilisateur</h2>
                    <p className="text-primary-100 text-sm mt-1">Mettez à jour les informations</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditUserModal(false)
                    resetUserForm()
                    setSelectedUser(null)
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-8 space-y-6 bg-gray-50">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Rôle <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'recruteur' | 'client' })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  >
                    <option value="recruteur">Recruteur</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.first_name}
                      onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    />
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.last_name}
                      onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={userFormData.phone || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Département</label>
                  <input
                    type="text"
                    value={userFormData.department || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={userFormData.is_active ?? true}
                      onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                      className="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      Utilisateur actif
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.generate_password}
                      onChange={(e) => setUserFormData({ ...userFormData, generate_password: e.target.checked })}
                      className="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      Régénérer un nouveau mot de passe
                    </span>
                  </label>
                  {!userFormData.generate_password && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={userFormData.password || ''}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 bg-white -mx-8 -mb-8 px-8 pb-8 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUserModal(false)
                      resetUserForm()
                      setSelectedUser(null)
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de suppression/réactivation utilisateur */}
        {showDeleteUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              {selectedUser.is_active ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Désactiver l'utilisateur</h3>
                  <p className="text-gray-600 mb-6">
                    Êtes-vous sûr de vouloir désactiver l'utilisateur <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> ? Il ne pourra plus se connecter.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteUserModal(false)
                        setSelectedUser(null)
                      }}
                      className="px-6 py-2 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDeleteUser}
                      disabled={isLoading}
                      className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Désactivation...' : 'Désactiver'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Réactiver l'utilisateur</h3>
                  <p className="text-gray-600 mb-6">
                    Êtes-vous sûr de vouloir réactiver l'utilisateur <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> ? Il pourra à nouveau se connecter.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteUserModal(false)
                        setSelectedUser(null)
                      }}
                      className="px-6 py-2 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setIsLoading(true)
                          await updateUserByManager(selectedUser.id, { ...selectedUser, is_active: true } as UserCreateByManager)
                          success('Utilisateur réactivé avec succès')
                          setShowDeleteUserModal(false)
                          setSelectedUser(null)
                          await loadData()
                        } catch (err: any) {
                          showError(err.message || 'Erreur lors de la réactivation de l\'utilisateur')
                        } finally {
                          setIsLoading(false)
                        }
                      }}
                      disabled={isLoading}
                      className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Réactivation...' : 'Réactiver'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

