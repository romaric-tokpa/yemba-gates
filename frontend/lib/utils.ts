/**
 * Utilitaires pour le formatage des dates et heures et la gestion des classes CSS
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine les classes CSS de manière optimale avec Tailwind
 * @param inputs - Classes CSS à combiner
 * @returns Classes CSS combinées
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formate une date avec la date et l'heure complètes
 * @param dateString - Date au format ISO string
 * @param includeTime - Inclure l'heure (par défaut: true)
 * @returns Date formatée en français
 */
export function formatDateTime(
  dateString: string | null | undefined,
  includeTime: boolean = true
): string {
  if (!dateString) return 'Non spécifié'
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return 'Date invalide'
    }
    
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
    
    if (includeTime) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }
    
    return date.toLocaleDateString('fr-FR', options)
  } catch (error) {
    return 'Date invalide'
  }
}

/**
 * Formate une date avec la date et l'heure complètes (format court)
 * @param dateString - Date au format ISO string
 * @returns Date formatée en format court (DD/MM/YYYY HH:mm)
 */
export function formatDateTimeShort(
  dateString: string | null | undefined
): string {
  if (!dateString) return 'Non spécifié'
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return 'Date invalide'
    }
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Date invalide'
  }
}

/**
 * Formate une date relative (ex: "Il y a 2 heures", "Il y a 3 jours")
 * @param dateString - Date au format ISO string
 * @returns Date relative ou date complète si plus de 7 jours
 */
export function formatRelativeDateTime(
  dateString: string | null | undefined
): string {
  if (!dateString) return 'Non spécifié'
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 0) return 'Dans le futur'
    if (diffInSeconds < 60) return 'Il y a quelques secondes'
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} minutes`
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} heures`
    if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`
    
    // Si plus de 7 jours, afficher la date complète
    return formatDateTime(dateString, true)
  } catch (error) {
    return 'Date invalide'
  }
}

/**
 * Formate uniquement la date (sans l'heure)
 * @param dateString - Date au format ISO string
 * @returns Date formatée sans l'heure
 */
export function formatDate(
  dateString: string | null | undefined
): string {
  return formatDateTime(dateString, false)
}
