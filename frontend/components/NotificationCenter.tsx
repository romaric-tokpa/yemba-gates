'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, NotificationResponse } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { cn } from '@/lib/utils'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAuthenticated()) {
      loadUnreadCount()
      if (isOpen) {
        loadNotifications()
      }
    }
  }, [isOpen])

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Rafraîchir le compteur toutes les 30 secondes
  useEffect(() => {
    if (!isAuthenticated()) return
    
    const interval = setInterval(() => {
      if (isAuthenticated()) {
        loadUnreadCount()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    if (!isAuthenticated()) {
      setUnreadCount(0)
      return
    }
    
    try {
      const data = await getUnreadCount()
      setUnreadCount(data.unread_count)
    } catch (error) {
      // Ignorer silencieusement les erreurs 401 (non authentifié) et 422 (validation)
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('422'))) {
        setUnreadCount(0)
        return
      }
      console.warn('Erreur lors du chargement du compteur:', error)
      setUnreadCount(0) // En cas d'erreur, réinitialiser à 0
    }
  }

  const loadNotifications = async () => {
    if (!isAuthenticated()) {
      setNotifications([])
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      const data = await getNotifications(false) // Récupérer toutes les notifications
      setNotifications(data)
      await loadUnreadCount() // Rafraîchir le compteur
    } catch (error) {
      // Ignorer silencieusement les erreurs 401 (non authentifié) et 422 (validation)
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('422'))) {
        setNotifications([])
        return
      }
      console.warn('Erreur lors du chargement des notifications:', error)
      setNotifications([]) // En cas d'erreur, réinitialiser à une liste vide
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      await loadUnreadCount()
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-target"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay pour mobile */}
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown/Panel */}
          <div className="fixed lg:absolute right-0 lg:right-0 top-0 lg:top-auto lg:mt-2 w-full lg:w-80 xl:w-96 h-full lg:h-auto lg:max-h-[600px] bg-white lg:rounded-lg shadow-lg border border-gray-200 z-50 flex flex-col">
          <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 touch-target"
                >
                  Tout marquer comme lu
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 rounded touch-target"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm sm:text-base">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer touch-target",
                      !notification.is_read && "bg-blue-50"
                    )}
                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          {!notification.is_read && (
                            <div className="mt-1.5 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                              {notification.title}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0 touch-target"
                          aria-label="Marquer comme lu"
                        >
                          <Check className="w-4 h-4 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  )
}





