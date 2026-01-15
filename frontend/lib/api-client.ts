/**
 * Client API centralisé avec gestion d'erreurs améliorée
 */
import { authenticatedFetch } from './auth'
import { getApiUrl } from './api'

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: any
}

/**
 * Wrapper pour les requêtes API avec gestion d'erreurs centralisée
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getApiUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  
  try {
    const response = await authenticatedFetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // Gérer les réponses non-JSON
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    // Si erreur HTTP, essayer de parser le JSON d'erreur
    if (!response.ok) {
      let errorMessage = `Erreur HTTP ${response.status}`
      let errorDetails: any = null

      if (isJson) {
        try {
          const error = await response.json()
          errorMessage = error.detail || error.message || errorMessage
          errorDetails = error
        } catch {
          // Si l'erreur n'est pas du JSON, utiliser le texte
          try {
            errorMessage = await response.text()
          } catch {
            // Ignorer si même le texte ne peut pas être lu
          }
        }
      }

      // Traduire les erreurs communes
      const translatedError = translateError(errorMessage, response.status)

      const apiError: ApiError = {
        message: translatedError,
        status: response.status,
        code: errorDetails?.code,
        details: errorDetails,
      }

      // Gérer les erreurs spécifiques
      handleSpecificErrors(response.status, apiError)

      throw apiError
    }

    // Parser la réponse JSON si c'est du JSON
    if (isJson) {
      return await response.json()
    }

    // Sinon retourner le texte ou une réponse vide
    const text = await response.text()
    return (text ? JSON.parse(text) : {}) as T
  } catch (error) {
    // Si c'est déjà une ApiError, la relancer
    if (error && typeof error === 'object' && 'status' in error) {
      throw error
    }

    // Gérer les erreurs réseau
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw {
        message: 'Impossible de se connecter au serveur. Vérifiez votre connexion.',
        status: 0,
        code: 'NETWORK_ERROR',
      } as ApiError
    }

    // Erreur inattendue
    throw {
      message: error instanceof Error ? error.message : 'Erreur inattendue',
      status: 0,
      code: 'UNKNOWN_ERROR',
    } as ApiError
  }
}

/**
 * Traduit les messages d'erreur en français
 */
function translateError(message: string, status: number): string {
  const translations: Record<string, string> = {
    // Erreurs d'authentification
    'Invalid credentials': 'Identifiants invalides',
    'User not found': 'Utilisateur non trouvé',
    'Incorrect email or password': 'Email ou mot de passe incorrect',
    'Unauthorized': 'Non autorisé',
    'Forbidden': 'Accès interdit',
    'Token expired': 'Session expirée',
    'Invalid token': 'Token invalide',

    // Erreurs de validation
    'Validation error': 'Erreur de validation',
    'Invalid request': 'Requête invalide',
    'Missing required field': 'Champ obligatoire manquant',

    // Erreurs de ressources
    'Not found': 'Ressource non trouvée',
    'Resource not found': 'Ressource non trouvée',
    'Already exists': 'Cette ressource existe déjà',
    'Conflict': 'Conflit de données',

    // Erreurs serveur
    'Internal server error': 'Erreur serveur interne',
    'Service unavailable': 'Service indisponible',
    'Database error': 'Erreur de base de données',
  }

  // Vérifier les traductions exactes
  if (translations[message]) {
    return translations[message]
  }

  // Vérifier les traductions partielles
  for (const [key, value] of Object.entries(translations)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  // Messages par code de statut
  const statusMessages: Record<number, string> = {
    400: 'Requête invalide',
    401: 'Non authentifié. Veuillez vous reconnecter.',
    403: 'Accès interdit. Vous n\'avez pas les permissions nécessaires.',
    404: 'Ressource non trouvée',
    409: 'Conflit. Cette ressource existe déjà.',
    422: 'Erreur de validation des données',
    500: 'Erreur serveur. Veuillez réessayer plus tard.',
    502: 'Service temporairement indisponible',
    503: 'Service indisponible',
    504: 'Délai d\'attente dépassé',
  }

  return statusMessages[status] || message
}

/**
 * Gère les erreurs spécifiques (redirection, logout, etc.)
 */
function handleSpecificErrors(status: number, error: ApiError) {
  if (status === 401) {
    // Le authenticatedFetch gère déjà la redirection, mais on peut ajouter des logs
    console.warn('⚠️ [API] Session expirée ou token invalide')
  } else if (status === 403) {
    console.warn('⚠️ [API] Accès interdit:', error.message)
  } else if (status >= 500) {
    console.error('❌ [API] Erreur serveur:', error.message)
  }
}

/**
 * Helper pour les requêtes GET
 */
export function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' })
}

/**
 * Helper pour les requêtes POST
 */
export function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Helper pour les requêtes PUT
 */
export function apiPut<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Helper pour les requêtes PATCH
 */
export function apiPatch<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * Helper pour les requêtes DELETE
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' })
}
