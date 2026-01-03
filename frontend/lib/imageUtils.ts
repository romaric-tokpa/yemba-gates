/**
 * Utilitaires pour la gestion des URLs d'images
 */

/**
 * Normalise une URL d'image en combinant l'URL de base de l'API et le chemin de l'image
 * @param apiUrl URL de base de l'API
 * @param imagePath Chemin de l'image (peut commencer par / ou non)
 * @returns URL complète normalisée
 */
export function normalizeImageUrl(apiUrl: string, imagePath: string | null | undefined): string | null {
  if (!imagePath) {
    return null
  }
  
  // Normaliser l'URL de base (enlever le slash final s'il existe)
  const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
  
  // Normaliser le chemin de l'image (ajouter le slash initial s'il n'existe pas)
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  
  return `${baseUrl}${normalizedPath}`
}

/**
 * Obtient l'URL complète d'une photo de candidat
 * @param candidate Candidat avec profile_picture_url ou photo_url
 * @param apiUrl URL de base de l'API (optionnel, utilise process.env.NEXT_PUBLIC_API_URL par défaut)
 * @returns URL complète de la photo ou null si aucune photo
 */
export function getCandidatePhotoUrl(
  candidate: { profile_picture_url?: string | null; photo_url?: string | null },
  apiUrl?: string
): string | null {
  const photoPath = candidate.profile_picture_url || candidate.photo_url
  if (!photoPath) {
    return null
  }
  
  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  return normalizeImageUrl(baseUrl, photoPath)
}

