'use client'

import { useState, useEffect } from 'react'
import { getUsers, getSecurityLogs, type UserResponse, type SecurityLogResponse } from '@/lib/api'
import { Users, Shield, Settings, Activity } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [recentLogs, setRecentLogs] = useState<SecurityLogResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const [usersData, logsData] = await Promise.all([
        getUsers().catch(() => []),
        getSecurityLogs({ limit: 5 }).catch(() => [])
      ])

      setUsers(usersData)
      setRecentLogs(logsData)
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const activeUsers = users.filter(u => u.is_active).length
  const recentLogins = recentLogs.filter(l => l.action === 'login' && l.success).length

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrateur</h1>
        <p className="text-gray-600 mt-2">Gestion de l'application et des utilisateurs</p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/dashboard/admin/users"
          className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors"
        >
          <Users className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Gestion des utilisateurs</h3>
          <p className="text-sm text-blue-100 mt-1">{users.length} utilisateur(s)</p>
        </Link>
        <Link
          href="/dashboard/admin/settings"
          className="bg-green-600 text-white rounded-lg p-6 hover:bg-green-700 transition-colors"
        >
          <Settings className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Paramétrage</h3>
          <p className="text-sm text-green-100 mt-1">Configuration système</p>
        </Link>
        <Link
          href="/dashboard/admin/logs"
          className="bg-red-600 text-white rounded-lg p-6 hover:bg-red-700 transition-colors"
        >
          <Shield className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Logs de sécurité</h3>
          <p className="text-sm text-red-100 mt-1">Historique des connexions</p>
        </Link>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilisateurs actifs</p>
              <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total utilisateurs</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connexions récentes</p>
              <p className="text-2xl font-bold text-gray-900">{recentLogins}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Logs récents */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Activité récente</h2>
        </div>
        <div className="p-6">
          {recentLogs.length > 0 ? (
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {log.user_name || 'Utilisateur inconnu'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{log.action}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      log.success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.success ? 'Réussi' : 'Échoué'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucune activité récente</p>
          )}
        </div>
      </div>
    </div>
  )
}

