'use client'

import { useState, useEffect } from 'react'
import { getUsers, getSecurityLogs, type UserResponse, type SecurityLogResponse } from '@/lib/api'
import { Users, Shield, Settings, Activity, TrendingUp, Lock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AdminSecureDashboard() {
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
        getSecurityLogs({ limit: 10 }).catch(() => [])
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
  const inactiveUsers = users.filter(u => !u.is_active).length
  const recentLogins = recentLogs.filter(l => l.action === 'login' && l.success).length
  const failedLogins = recentLogs.filter(l => !l.success).length

  // Statistiques par rôle
  const usersByRole = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Bannière de sécurité */}
      <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-r-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Zone d'Administration Sécurisée</h3>
            <p className="text-sm text-red-700">
              Vous accédez à une zone sécurisée. Toutes vos actions sont enregistrées et surveillées.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrateur</h1>
        <p className="text-gray-600 mt-2">Statistiques d'utilisation du système</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilisateurs actifs</p>
              <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
            </div>
            <Users className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total utilisateurs</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <Activity className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connexions récentes</p>
              <p className="text-2xl font-bold text-gray-900">{recentLogins}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tentatives échouées</p>
              <p className="text-2xl font-bold text-gray-900">{failedLogins}</p>
            </div>
            <Shield className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin-secure/users"
          className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg p-6 hover:from-red-700 hover:to-orange-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
        >
          <Users className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Gestion Utilisateurs</h3>
          <p className="text-sm text-white/90 mt-1">{users.length} utilisateur(s)</p>
        </Link>
        <Link
          href="/admin-secure/logs"
          className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg p-6 hover:from-red-700 hover:to-orange-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
        >
          <Shield className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Logs Système</h3>
          <p className="text-sm text-white/90 mt-1">Historique des connexions</p>
        </Link>
        <Link
          href="/admin-secure/settings"
          className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg p-6 hover:from-red-700 hover:to-orange-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
        >
          <Settings className="w-6 h-6 mb-2" />
          <h3 className="font-semibold">Paramètres Globaux</h3>
          <p className="text-sm text-white/90 mt-1">Configuration système</p>
        </Link>
      </div>

      {/* Répartition par rôle */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Répartition des utilisateurs par rôle</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(usersByRole).map(([role, count]) => (
              <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize mt-1">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activité récente */}
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
