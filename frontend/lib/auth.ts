// Détection automatique de l'URL de l'API en fonction de l'URL actuelle
function getApiUrl(): string {
  // Si une variable d'environnement est définie, l'utiliser
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Sinon, détecter automatiquement depuis l'URL actuelle
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    const port = window.location.port || '3000'
    
    // Si on est sur localhost ou 127.0.0.1, utiliser localhost:8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000'
    }
    
    // Si on est sur un tunnel (cloudflare, localtunnel, etc.), utiliser le même hostname avec le port 8000
    // ou détecter si c'est HTTPS (tunnel) et adapter
    if (protocol === 'https:' || hostname.includes('cloudflare') || hostname.includes('tunnel') || hostname.includes('loca.lt') || hostname.includes('trycloudflare.com')) {
      // Pour les tunnels, on peut utiliser le même hostname mais avec le port backend
      // ou stocker l'URL du tunnel backend dans sessionStorage
      const tunnelBackendUrl = sessionStorage.getItem('TUNNEL_BACKEND_URL')
      if (tunnelBackendUrl) {
        return tunnelBackendUrl
      }
      // Pour les autres tunnels, utiliser le même hostname
      return `${protocol}//${hostname.replace(':3000', ':8000').replace(':3001', ':8000')}`
    }
    
    // Sinon, utiliser la même IP avec le port 8000
    return `http://${hostname}:8000`
  }
  
  // Par défaut pour le SSR
  return 'http://localhost:8000'
}

const API_URL = getApiUrl()

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id: string
  user_role: string
  user_email: string
  user_name: string
}

export interface UserInfo {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone: string | null
  department: string | null
  is_active: boolean
}

// Gestion du token dans le localStorage
export const TOKEN_KEY = 'auth_token'
export const USER_KEY = 'user_info'

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    // Stocker dans localStorage pour l'utilisation côté client
    localStorage.setItem(TOKEN_KEY, token)
    
    // Stocker aussi dans les cookies pour que le middleware puisse y accéder
    // Le cookie expire dans 7 jours
    const expires = new Date()
    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000)
    // Utiliser path=/ pour que le cookie soit accessible partout
    const isSecure = window.location.protocol === 'https:'
    const cookieString = `${TOKEN_KEY}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`
    document.cookie = cookieString
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    // Essayer d'abord localStorage
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      return token
    }
    // Fallback sur les cookies
    return getTokenFromCookies()
  }
  return null
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    
    // Supprimer aussi le cookie
    document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  }
}

export function setUserInfo(userInfo: LoginResponse) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
  }
}

export function getUserInfo(): LoginResponse | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem(USER_KEY)
    if (userStr) {
      return JSON.parse(userStr)
    }
  }
  return null
}

export function isAuthenticated(): boolean {
  // Vérifier que le token existe réellement
  return getToken() !== null
}

export function getUserRole(): string | null {
  const userInfo = getUserInfo()
  return userInfo?.user_role || null
}

export function hasRole(role: string): boolean {
  const userRole = getUserRole()
  return userRole === role
}

export function hasAnyRole(roles: string[]): boolean {
  const userRole = getUserRole()
  return userRole ? roles.includes(userRole) : false
}

/**
 * Retourne le chemin du dashboard par défaut selon le rôle de l'utilisateur
 */
// Import des routes centralisées
import { getDashboardPath as getDashboardPathFromRoutes } from './routes'

export function getDashboardPath(role: string | null): string {
  return getDashboardPathFromRoutes(role)
}

// Fonction pour récupérer le token depuis les cookies (pour le middleware Next.js)
function getTokenFromCookies(): string | null {
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';')
    const tokenCookie = cookies.find(c => c.trim().startsWith(`${TOKEN_KEY}=`))
    if (tokenCookie) {
      return tokenCookie.split('=')[1]?.trim() || null
    }
  }
  return null
}

// Fonction pour faire des requêtes authentifiées
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Récupérer le token (getToken() essaie déjà localStorage puis cookies)
  const token = getToken()
  
  // Ne pas ajouter Content-Type si c'est un FormData (le navigateur le fera automatiquement avec le boundary)
  const isFormData = options.body instanceof FormData
  
  const headers: Record<string, string> = {}
  
  // Ajouter Content-Type seulement si ce n'est pas un FormData
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  
  // Fusionner avec les headers existants
  if (options.headers) {
    Object.assign(headers, options.headers)
  }
  
  // Ajouter le Bearer Token si disponible (OBLIGATOIRE pour toutes les requêtes)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    // Log de debug pour vérifier que le token est bien envoyé
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 [AUTH] Token présent pour:', url, 'Token (premiers 20 chars):', token.substring(0, 20) + '...')
    }
  } else {
    // Logger une erreur si le token est absent (c'est critique)
    console.error('❌ [AUTH] Aucun token d\'authentification trouvé pour la requête:', url)
    console.error('❌ [AUTH] localStorage token:', localStorage.getItem(TOKEN_KEY) ? 'présent' : 'absent')
    console.error('❌ [AUTH] Cookie token:', getTokenFromCookies() ? 'présent' : 'absent')
    // Ne pas bloquer la requête, mais elle échouera probablement avec 401
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Inclure les cookies dans les requêtes cross-origin
    })
    
    // Si erreur 401 (token expiré), rediriger vers login
    if (response.status === 401) {
      console.warn('⚠️ [AUTH] Token expiré ou invalide (401), redirection vers login')
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/choice'
      }
    }
    
    return response
  } catch (error) {
    // Gérer les erreurs réseau (serveur non accessible, CORS, etc.)
    // Les erreurs réseau (Failed to fetch) sont souvent attendues (backend non démarré)
    if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      // Ne pas logger comme une erreur critique, juste un avertissement
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [AUTH] Serveur backend non accessible:', url)
        console.warn('⚠️ [AUTH] Assurez-vous que le backend est démarré sur http://localhost:8000')
      }
      // Créer une erreur avec un message plus descriptif
      const networkError = new Error('Backend non accessible. Vérifiez que le serveur est démarré.')
      networkError.name = 'NetworkError'
      // Ajouter une propriété pour identifier facilement ce type d'erreur
      ;(networkError as any).isNetworkError = true
      throw networkError
    } else {
      console.error('❌ [AUTH] Erreur réseau lors de la requête:', url, error)
    }
    // Relancer l'erreur pour que l'appelant puisse la gérer
    throw error
  }
}

// API d'authentification
export async function login(email: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append('username', email)  // Le backend attend 'username' (qui correspond à l'email)
  formData.append('password', password)

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur de connexion' }))
    throw new Error(error.detail || 'Erreur de connexion')
  }

  const data = await response.json()
  
  // IMPORTANT: Sauvegarder le token et les infos utilisateur AVANT de retourner
  // Cela garantit que les données sont stockées dans localStorage avant toute redirection
  if (data.access_token) {
    setToken(data.access_token)
  }
  if (data.user_role && data.user_id) {
    setUserInfo(data)
  }
  
  // Vérifier que le stockage a bien fonctionné (localStorage ET cookie)
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUserInfo = localStorage.getItem(USER_KEY)
    
    // Vérifier que le cookie est bien présent
    const cookies = document.cookie.split(';')
    const cookieToken = cookies.find(c => c.trim().startsWith(`${TOKEN_KEY}=`))
    
    if (!storedToken || !storedUserInfo) {
      console.warn('Attention: Le token ou les infos utilisateur n\'ont pas été correctement stockés dans localStorage')
    }
    
    if (!cookieToken) {
      console.warn('Attention: Le cookie auth_token n\'a pas été correctement enregistré. Vérifiez que path=/ est bien défini.')
      // Réessayer d'enregistrer le cookie si le token est présent
      if (storedToken) {
        setToken(storedToken)
      }
    } else {
      console.log('✅ Cookie auth_token correctement enregistré avec path=/')
    }
  }
  
  return data
}

export async function logout() {
  removeToken()
  // Rediriger vers la page de choix de rôle
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/choice'
  }
}

export async function getCurrentUser(): Promise<UserInfo> {
  const response = await authenticatedFetch(`${API_URL}/auth/me`)

  if (!response.ok) {
    if (response.status === 401) {
      // Token invalide, déconnecter
      logout()
      throw new Error('Session expirée')
    }
    throw new Error('Erreur lors de la récupération des informations utilisateur')
  }

  return response.json()
}

