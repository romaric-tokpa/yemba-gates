'use client'

import { useState, useEffect } from 'react'
import { getSecurityLogs, type SecurityLogResponse } from '@/lib/api'
import { Shield, Filter, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const ACTION_TYPES = [
  { value: '', label: 'Toutes les actions' },
  { value: 'login', label: 'Connexions' },
  { value: 'logout', label: 'Déconnexions' },
  { value: 'failed_login', label: 'Tentatives échouées' },
  { value: 'password_change', label: 'Changements de mot de passe' }
]

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLogResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [page, setPage] = useState(0)
  const [limit] = useState(50)

  useEffect(() => {
    loadLogs()
  }, [selectedAction, page])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await getSecurityLogs({
        action: selectedAction || undefined,
        skip: page * limit,
        limit
      })
      setLogs(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des logs')
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string, success: boolean) => {
    if (!success) {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    
    switch (action) {
      case 'login':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'logout':
        return <AlertCircle className="w-5 h-5 text-blue-500" />
      case 'password_change':
        return <Shield className="w-5 h-5 text-purple-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'login':
        return 'Connexion'
      case 'logout':
        return 'Déconnexion'
      case 'failed_login':
        return 'Tentative échouée'
      case 'password_change':
        return 'Changement de mot de passe'
      default:
        return action
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('fr-FR'),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading && logs.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Logs de Sécurité</h1>
          <p className="text-gray-600 mt-1">Historique des connexions et actions de sécurité</p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Action :</label>
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value)
              setPage(0)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {ACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total des logs</div>
          <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Connexions réussies</div>
          <div className="text-2xl font-bold text-green-600">
            {logs.filter(l => l.action === 'login' && l.success).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Tentatives échouées</div>
          <div className="text-2xl font-bold text-red-600">
            {logs.filter(l => !l.success).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Actions aujourd'hui</div>
          <div className="text-2xl font-bold text-blue-600">
            {logs.filter(l => {
              const logDate = new Date(l.created_at)
              const today = new Date()
              return logDate.toDateString() === today.toDateString()
            }).length}
          </div>
        </div>
      </div>

      {/* Liste des logs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Détails
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => {
                const { date, time } = formatDate(log.created_at)
                return (
                  <tr key={log.id} className={!log.success ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{date}</div>
                      <div className="text-xs text-gray-500">{time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.user_name ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                          <div className="text-xs text-gray-500">{log.user_email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Utilisateur inconnu</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action, log.success)}
                        <span className="text-sm text-gray-900">{getActionLabel(log.action)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        log.success
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.success ? 'Réussi' : 'Échoué'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.ip_address || '-'}</div>
                      {log.user_agent && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {log.user_agent}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-md">
                        {log.details || '-'}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun log trouvé</p>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Affichage de {logs.length} log{logs.length > 1 ? 's' : ''}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={logs.length < limit}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

