/**
 * Configuration centralisée des routes de l'application
 * Toutes les routes doivent être définies ici pour garantir la cohérence
 */

export const ROUTES = {
  // Routes publiques
  HOME: '/',
  AUTH: {
    CHOICE: '/auth/choice',
    LOGIN: '/auth/login',
  },

  // Routes par rôle - Manager
  MANAGER: {
    DASHBOARD: '/manager',
    JOBS: {
      LIST: '/manager/jobs',
      NEW: '/manager/jobs/new',
      DETAIL: (id: string) => `/manager/jobs/${id}`,
    },
    CANDIDATES: {
      LIST: '/manager/candidats',
      DETAIL: (id: string) => `/manager/candidats/${id}`,
    },
    APPROBATIONS: '/manager/approbations',
    KPI: '/manager/kpi',
    INTERVIEWS: '/manager/entretiens',
    PIPELINE: '/manager/pipeline',
    TEAMS: '/manager/teams',
  },

  // Routes par rôle - Recruteur
  RECRUITER: {
    DASHBOARD: '/recruiter',
    JOBS: {
      LIST: '/recruiter/jobs',
      NEW: '/recruiter/jobs/new',
      DETAIL: (id: string) => `/recruiter/jobs/${id}`,
    },
    CANDIDATES: {
      LIST: '/recruiter/candidates',
      DETAIL: (id: string) => `/recruiter/candidates/${id}`,
    },
    INTERVIEWS: '/recruiter/interviews',
    PIPELINE: '/recruiter/pipeline',
  },

  // Routes par rôle - Client
  CLIENT: {
    DASHBOARD: '/client',
    JOBS: {
      LIST: '/client/jobs',
      NEW: '/client/jobs/new',
      DETAIL: (id: string) => `/client/jobs/${id}`,
    },
    CANDIDATES: {
      DETAIL: (id: string) => `/client/candidats/${id}`,
    },
    SHORTLIST: '/client/shortlist',
    HISTORY: '/client/history',
  },

  // Routes par rôle - Admin
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
    LOGS: '/admin/logs',
    CREATE: '/admin/create',
  },

  // Routes communes
  COMMON: {
    NOTIFICATIONS: '/notifications',
    OFFERS: '/offres',
    ONBOARDING: '/onboarding',
  },
} as const

/**
 * Obtient le chemin du dashboard selon le rôle
 */
export function getDashboardPath(role: string | null): string {
  if (!role) return ROUTES.AUTH.CHOICE

  const normalizedRole = role.toLowerCase()

  switch (normalizedRole) {
    case 'admin':
    case 'administrateur':
      return ROUTES.ADMIN.DASHBOARD
    case 'manager':
      return ROUTES.MANAGER.DASHBOARD
    case 'recruteur':
    case 'recruiter':
      return ROUTES.RECRUITER.DASHBOARD
    case 'client':
      return ROUTES.CLIENT.DASHBOARD
    default:
      return ROUTES.AUTH.CHOICE
  }
}

/**
 * Vérifie si une route nécessite une authentification
 */
export function isProtectedRoute(pathname: string): boolean {
  const protectedPrefixes = [
    '/manager',
    '/recruiter',
    '/client',
    '/admin',
  ]

  return protectedPrefixes.some(prefix => pathname.startsWith(prefix))
}

/**
 * Obtient le rôle depuis le pathname
 */
export function getRoleFromPath(pathname: string): string | null {
  if (pathname.startsWith('/manager')) return 'manager'
  if (pathname.startsWith('/recruiter')) return 'recruiter'
  if (pathname.startsWith('/client')) return 'client'
  if (pathname.startsWith('/admin')) return 'admin'
  return null
}

