// Détection automatique de l'URL de l'API en fonction de l'URL actuelle
function getApiUrl(): string {
  // Si une variable d'environnement est définie, l'utiliser (sauf si c'est un domaine de production en développement local)
  if (process.env.NEXT_PUBLIC_API_URL) {
    const envUrl = process.env.NEXT_PUBLIC_API_URL
    // Si on est en développement local (localhost) mais que l'URL env pointe vers un domaine de production,
    // forcer l'utilisation de localhost:8000
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if ((hostname === 'localhost' || hostname === '127.0.0.1') && 
          (envUrl.includes('yemma-gates.com') || envUrl.includes('https://'))) {
        return 'http://localhost:8000'
      }
    }
    return envUrl
  }
  
  // Sinon, détecter automatiquement depuis l'URL actuelle
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    const port = window.location.port
    
    // PRIORITÉ 1: Si on est sur localhost, 127.0.0.1 ou 0.0.0.0, TOUJOURS utiliser localhost:8000
    // Même si le port est différent (3000, 80, etc.), on utilise toujours le backend direct
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return 'http://localhost:8000'
    }
    
    // PRIORITÉ 2: Si on est sur un tunnel (cloudflare, localtunnel, etc.)
    if (protocol === 'https:' || hostname.includes('cloudflare') || hostname.includes('tunnel') || hostname.includes('loca.lt') || hostname.includes('trycloudflare.com')) {
      const tunnelBackendUrl = sessionStorage.getItem('TUNNEL_BACKEND_URL')
      if (tunnelBackendUrl) {
        return tunnelBackendUrl
      }
      // Pour les tunnels, utiliser le même hostname (nginx route vers le backend)
      return `${protocol}//${hostname}`
    }
    
    // PRIORITÉ 3: Pour les domaines de production (yemma-gates.com, etc.)
    // nginx route les requêtes API vers le backend
    return `${protocol}//${hostname}`
  }
  
  // Par défaut pour le SSR
  return 'http://localhost:8000'
}

// Ne pas calculer API_URL une seule fois, mais le récupérer à chaque fois
// pour éviter les problèmes avec les variables d'environnement au build time
function getApiUrlSafe(): string {
  // FORCER localhost:8000 en développement local
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return 'http://localhost:8000'
    }
  }
  return getApiUrl()
}

// Utiliser une fonction au lieu d'une constante pour forcer la réévaluation
const API_URL = () => getApiUrlSafe()

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
export async function login(email: string, password: string, subdomain?: string): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append('username', email)  // Le backend attend 'username' (qui correspond à l'email)
  formData.append('password', password)

  // Récupérer le subdomain depuis localStorage si non fourni
  const tenantSubdomain = subdomain || (typeof window !== 'undefined' ? localStorage.getItem('tenant_subdomain') : null)

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  // Ajouter le header X-Tenant-Subdomain si disponible
  if (tenantSubdomain) {
    headers['X-Tenant-Subdomain'] = tenantSubdomain
  }

  const response = await fetch(`${API_URL()}/api/auth/login`, {
    method: 'POST',
    headers,
    body: formData.toString(),
  })

  if (!response.ok) {
    let errorMessage = 'Erreur de connexion'
    try {
      const error = await response.json()
      const detail = error.detail || error.message || errorMessage
      
      // Traduire les messages d'erreur en français
      const errorTranslations: Record<string, string> = {
        'User not found': 'Utilisateur non trouvé',
        'Incorrect email or password': 'Email ou mot de passe incorrect',
        'User account is inactive': 'Compte utilisateur inactif',
        'User account has no password set': 'Aucun mot de passe défini pour ce compte',
        'Email and password are required': 'Email et mot de passe requis',
        'Invalid request format. Use JSON or form data.': 'Format de requête invalide',
      }
      
      errorMessage = errorTranslations[detail] || detail
    } catch (e) {
      // Si la réponse n'est pas du JSON, utiliser le statut
      if (response.status === 401) {
        errorMessage = 'Email ou mot de passe incorrect'
      } else if (response.status === 400) {
        errorMessage = 'Requête invalide. Vérifiez vos informations.'
      } else if (response.status === 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
      }
    }
    throw new Error(errorMessage)
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

export interface CompanyRegisterData {
  company_name: string
  subdomain?: string
  company_email: string
  company_phone?: string
  country?: string
  industry?: string
  company_size?: string
  admin_email: string
  admin_password: string
  admin_first_name: string
  admin_last_name: string
  admin_phone?: string
}

export async function registerCompany(data: CompanyRegisterData): Promise<LoginResponse> {
  const response = await fetch(`${API_URL()}/api/auth/register-company`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    let errorMessage = 'Erreur lors de l\'inscription'
    try {
      const error = await response.json()
      const detail = error.detail || error.message || errorMessage
      
      // Traduire les messages d'erreur en français
      const errorTranslations: Record<string, string> = {
        'Le sous-domaine doit contenir au moins 3 caractères alphanumériques': 'Le sous-domaine doit contenir au moins 3 caractères alphanumériques',
        'Le sous-domaine est déjà utilisé': 'Ce sous-domaine est déjà utilisé. Veuillez en choisir un autre.',
        'Un utilisateur avec cet email existe déjà': 'Un utilisateur avec cet email existe déjà',
        'Base de données par défaut non trouvée': 'Erreur de configuration serveur. Contactez le support.',
        'Impossible de se connecter à la base de données': 'Erreur de connexion à la base de données',
      }
      
      errorMessage = errorTranslations[detail] || detail
    } catch (e) {
      // Si la réponse n'est pas du JSON, utiliser le statut
      if (response.status === 400) {
        errorMessage = 'Données invalides. Vérifiez vos informations.'
      } else if (response.status === 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
      }
    }
    throw new Error(errorMessage)
  }

  const responseData = await response.json()

  // Stocker le subdomain dans localStorage pour les futures connexions
  if (typeof window !== 'undefined') {
    // Utiliser le subdomain de la réponse ou celui envoyé dans la requête
    const subdomain = responseData.subdomain || data.subdomain
    if (subdomain) {
      localStorage.setItem('tenant_subdomain', subdomain)
    }
  }

  // Le token et les infos utilisateur seront sauvegardés dans la page
  return responseData
}

export async function getCurrentUser(): Promise<UserInfo> {
  const response = await authenticatedFetch(`${API_URL()}/api/auth/me`)

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

