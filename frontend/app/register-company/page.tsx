'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerCompany } from '@/lib/auth'
import { useAuth } from '@/context/AuthContext'
import { 
  Building2, ArrowRight, CheckCircle2, Sparkles, 
  Mail, Phone, User, Lock, Briefcase, Globe, ArrowLeft,
  MapPin, Briefcase as BriefcaseIcon, Users
} from 'lucide-react'

export default function RegisterCompanyPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '',
    subdomain: '',
    company_email: '',
    company_phone: '',
    country: '',
    industry: '',
    company_size: '',
    admin_email: '',
    admin_password: '',
    admin_confirm_password: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_phone: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Effacer l'erreur quand l'utilisateur modifie le formulaire
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.company_name.trim()) {
      setError('Le nom de l\'entreprise est obligatoire')
      return
    }

    if (!formData.company_email.trim()) {
      setError('L\'email de contact est obligatoire')
      return
    }

    if (!formData.admin_email.trim()) {
      setError('L\'email de l\'administrateur est obligatoire')
      return
    }

    if (!formData.admin_password) {
      setError('Le mot de passe est obligatoire')
      return
    }

    if (formData.admin_password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (formData.admin_password !== formData.admin_confirm_password) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (!formData.admin_first_name.trim() || !formData.admin_last_name.trim()) {
      setError('Le prénom et le nom de l\'administrateur sont obligatoires')
      return
    }

    setIsLoading(true)

    try {
      const response = await registerCompany({
        company_name: formData.company_name.trim(),
        subdomain: formData.subdomain.trim() || undefined,
        company_email: formData.company_email.trim(),
        company_phone: formData.company_phone.trim() || undefined,
        country: formData.country.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        company_size: formData.company_size.trim() || undefined,
        admin_email: formData.admin_email.trim(),
        admin_password: formData.admin_password,
        admin_first_name: formData.admin_first_name.trim(),
        admin_last_name: formData.admin_last_name.trim(),
        admin_phone: formData.admin_phone.trim() || undefined,
      })

      // Utiliser le contexte d'authentification
      await login(response)

      // Rediriger vers le dashboard administrateur
      router.push('/dashboard/manager')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription')
    } finally {
      setIsLoading(false)
    }
  }

  // Générer un subdomain suggéré depuis le nom de l'entreprise
  const generateSubdomain = (companyName: string) => {
    const cleaned = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9-]/g, '-') // Remplacer les caractères spéciaux par des tirets
      .replace(/-+/g, '-') // Remplacer les tirets multiples par un seul
      .replace(/^-|-$/g, '') // Supprimer les tirets en début/fin
      .substring(0, 20) // Limiter à 20 caractères
    return cleaned
  }

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => {
      const newData = { ...prev, company_name: value }
      // Auto-générer le subdomain si vide
      if (!prev.subdomain && value) {
        newData.subdomain = generateSubdomain(value)
      }
      return newData
    })
  }

  return (
    <div className="min-h-screen bg-gray-50/30 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="text-lg lg:text-xl font-bold">
              <span className="text-emerald-600">Yemma</span>
              <span className="text-orange-500">-Gates</span>
            </span>
          </Link>
          <Link 
            href="/auth/login"
            className="flex items-center text-sm text-gray-700 hover:text-emerald-600 transition-colors font-medium group"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Retour à la connexion
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
              Créez votre compte entreprise
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-emerald-600 mb-4 leading-tight">
              Inscription Entreprise
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Rejoignez Yemma-Gates et transformez votre processus de recrutement en quelques minutes
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 border border-gray-200">
            <form className="space-y-8" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Informations de l'entreprise */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                  <div className="bg-emerald-500 p-2 rounded-lg">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Informations de l'entreprise</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label htmlFor="company_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom de l'entreprise <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="company_name"
                        name="company_name"
                        type="text"
                        required
                        value={formData.company_name}
                        onChange={handleCompanyNameChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="Ex: Ma Société SARL"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="subdomain" className="block text-sm font-semibold text-gray-700 mb-2">
                      Sous-domaine <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="subdomain"
                        name="subdomain"
                        type="text"
                        value={formData.subdomain}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="Ex: ma-societe"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 flex items-center">
                      <Globe className="w-3 h-3 mr-1" />
                      Votre espace sera accessible via: <span className="font-semibold text-emerald-600 ml-1">{formData.subdomain || 'votre-sous-domaine'}.yemma-gates.com</span>
                    </p>
                  </div>

                  <div>
                    <label htmlFor="company_email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email de contact <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="company_email"
                        name="company_email"
                        type="email"
                        required
                        value={formData.company_email}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="contact@entreprise.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company_phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Téléphone de contact <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="company_phone"
                        name="company_phone"
                        type="tel"
                        value={formData.company_phone}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="+225 XX XX XX XX XX"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                      Pays <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="country"
                        name="country"
                        type="text"
                        value={formData.country}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="Ex: Sénégal"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="industry" className="block text-sm font-semibold text-gray-700 mb-2">
                      Secteur d'activité <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BriefcaseIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="industry"
                        name="industry"
                        type="text"
                        value={formData.industry}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="Ex: Technologie, Finance, Santé..."
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company_size" className="block text-sm font-semibold text-gray-700 mb-2">
                      Taille de l'entreprise <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        id="company_size"
                        name="company_size"
                        value={formData.company_size}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 bg-white"
                      >
                        <option value="">Sélectionner...</option>
                        <option value="small">1-10 employés</option>
                        <option value="medium">11-50 employés</option>
                        <option value="large">51-200 employés</option>
                        <option value="enterprise">200+ employés</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations de l'administrateur */}
              <div className="space-y-6 pt-8 border-t border-gray-200">
                <div className="flex items-center space-x-3 pb-4">
                  <div className="bg-emerald-500 p-2 rounded-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Compte administrateur</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="admin_first_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Prénom <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin_first_name"
                        name="admin_first_name"
                        type="text"
                        required
                        value={formData.admin_first_name}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="Prénom"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin_last_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin_last_name"
                        name="admin_last_name"
                        type="text"
                        required
                        value={formData.admin_last_name}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="Nom"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin_email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin_email"
                        name="admin_email"
                        type="email"
                        required
                        value={formData.admin_email}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="admin@entreprise.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin_phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Téléphone <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin_phone"
                        name="admin_phone"
                        type="tel"
                        value={formData.admin_phone}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="+225 XX XX XX XX XX"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin_password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Mot de passe <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin_password"
                        name="admin_password"
                        type="password"
                        required
                        value={formData.admin_password}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="Minimum 6 caractères"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin_confirm_password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirmer le mot de passe <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin_confirm_password"
                        name="admin_confirm_password"
                        type="password"
                        required
                        value={formData.admin_confirm_password}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-400"
                        placeholder="Répétez le mot de passe"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2" />
                  Ce que vous obtenez
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Accès immédiat</p>
                      <p className="text-xs text-gray-600">Commencer à recruter dès aujourd'hui</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Support dédié</p>
                      <p className="text-xs text-gray-600">Assistance 24/7 pour votre équipe</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Sécurité garantie</p>
                      <p className="text-xs text-gray-600">Vos données sont protégées</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full flex justify-center items-center py-4 px-6 bg-emerald-600 text-white rounded-xl font-bold text-base shadow-xl hover:bg-emerald-700 hover:shadow-emerald-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Inscription en cours...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-5 h-5 mr-2" />
                      Créer mon compte entreprise
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  Vous avez déjà un compte ?{' '}
                  <Link href="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                    Se connecter
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob-float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob-float {
          animation: blob-float 8s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
