'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, Users, BarChart3, Shield, ArrowRight, Check, 
  TrendingUp, Clock, Target, Zap, Star, Menu, X,
  Briefcase, FileText, MessageSquare, PieChart, 
  Award, Globe, Lock, Smartphone, ChevronDown, Play,
  CheckCircle2, Rocket, Sparkles, Trophy, Heart,
  ArrowUpRight, BarChart, Calendar, UserCheck, 
  ThumbsUp, Award as AwardIcon, Timer, DollarSign
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [counters, setCounters] = useState({ candidates: 0, jobs: 0, satisfaction: 0, time: 0 })
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const userInfo = typeof window !== 'undefined' ? localStorage.getItem('user_info') : null
    
    if (token && userInfo) {
      try {
        const user = JSON.parse(userInfo)
        const userRole = user.user_role?.toLowerCase()
        const tokenParts = token.split('.')
        if (tokenParts.length === 3 && userRole) {
          let dashboardPath = '/auth/choice'
          if (userRole === 'admin' || userRole === 'administrateur') {
            dashboardPath = '/admin'
          } else if (userRole === 'manager') {
            dashboardPath = '/manager'
          } else if (userRole === 'recruteur' || userRole === 'recruiter') {
            dashboardPath = '/recruiter'
          } else if (userRole === 'client') {
            dashboardPath = '/client'
          }
          router.push(dashboardPath)
        }
      } catch (e) {
        console.error('Erreur lors de la vérification de l\'utilisateur:', e)
      }
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    
    // Observer pour les animations au scroll - créé une seule fois
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id || entry.target.getAttribute('data-animate-id')
            if (id) {
              setVisibleSections((prev) => {
                const newSet = new Set(prev)
                newSet.add(id)
                return newSet
              })
            }
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    // Observer tous les éléments avec data-animate après un court délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      const animateElements = document.querySelectorAll('[data-animate]')
      animateElements.forEach((el) => {
        observer.observe(el)
        // Afficher immédiatement les éléments qui sont déjà visibles
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const id = el.id || el.getAttribute('data-animate-id')
          if (id) {
            setVisibleSections((prev) => {
              const newSet = new Set(prev)
              newSet.add(id)
              return newSet
            })
          }
        }
      })
    }, 100)
    
    // Animation des compteurs
    const animateCounters = () => {
      const duration = 2000
      const steps = 60
      const stepDuration = duration / steps
      
      const animate = (key: keyof typeof counters, target: number) => {
        let current = 0
        const increment = target / steps
        const timer = setInterval(() => {
          current += increment
          if (current >= target) {
            current = target
            clearInterval(timer)
          }
          setCounters((prev) => ({ ...prev, [key]: Math.floor(current) }))
        }, stepDuration)
      }

      animate('candidates', 1000)
      animate('jobs', 500)
      animate('satisfaction', 95)
      animate('time', 40)
    }

    // Démarrer l'animation des compteurs après un délai
    const timer = setTimeout(animateCounters, 500)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timer)
    }
  }, [router])

  const features = [
    {
      icon: Briefcase,
      title: 'Gestion Intelligente des Besoins',
      description: 'Créez, suivez et optimisez vos besoins de recrutement avec une interface intuitive et puissante. Gérez les statuts, les priorités et les délais en temps réel.',
      details: [
        'Création de besoins en quelques clics',
        'Gestion multi-statuts (brouillon, validé, urgent, etc.)',
        'Suivi des délais et alertes automatiques',
        'Historique complet des modifications'
      ],
      color: 'from-blue-500 to-cyan-500',
      delay: '0'
    },
    {
      icon: Users,
      title: 'Pipeline de Candidats Avancé',
      description: 'Visualisez et gérez vos candidats à travers toutes les étapes avec des vues Kanban et liste. Suivez chaque candidat de la sourcing à l\'embauche.',
      details: [
        'Vue Kanban interactive et personnalisable',
        'Filtres avancés par compétences, expérience, statut',
        'Recherche intelligente dans la base de candidats',
        'Export des données en un clic'
      ],
      color: 'from-green-500 to-emerald-500',
      delay: '100'
    },
    {
      icon: MessageSquare,
      title: 'Entretiens Automatisés',
      description: 'Planifiez, gérez et suivez vos entretiens avec des rappels automatiques et des notifications. Optimisez votre planning et réduisez les no-shows.',
      details: [
        'Planification avec synchronisation calendrier',
        'Rappels automatiques par email et SMS',
        'Feedback structuré après chaque entretien',
        'Statistiques de taux de présence'
      ],
      color: 'from-purple-500 to-pink-500',
      delay: '200'
    },
    {
      icon: PieChart,
      title: 'Analytics & KPI en Temps Réel',
      description: 'Analysez vos performances avec des tableaux de bord interactifs et des rapports détaillés. Prenez des décisions basées sur des données réelles.',
      details: [
        'Time-to-hire et time-to-fill en temps réel',
        'Taux de conversion par source et par étape',
        'Performance des recruteurs individuels',
        'Rapports personnalisables et exportables'
      ],
      color: 'from-orange-500 to-red-500',
      delay: '300'
    },
    {
      icon: FileText,
      title: 'Shortlists Collaboratives',
      description: 'Créez et partagez des shortlists avec vos clients pour une validation rapide et efficace. Collaborez en temps réel sur les sélections.',
      details: [
        'Création de shortlists en quelques secondes',
        'Partage sécurisé avec les clients',
        'Validation et feedback en ligne',
        'Historique des shortlists partagées'
      ],
      color: 'from-indigo-500 to-blue-500',
      delay: '400'
    },
    {
      icon: Award,
      title: 'Onboarding Intégré',
      description: 'Accompagnez vos nouveaux recrutés dès leur intégration avec un processus structuré. Assurez une transition fluide vers leur nouveau poste.',
      details: [
        'Checklist d\'onboarding personnalisable',
        'Suivi des étapes d\'intégration',
        'Documentation centralisée',
        'Évaluation post-intégration'
      ],
      color: 'from-pink-500 to-rose-500',
      delay: '500'
    },
    {
      icon: BarChart,
      title: 'Tableaux de Bord Personnalisés',
      description: 'Créez des tableaux de bord adaptés à votre rôle avec les métriques qui comptent pour vous. Visualisez vos données importantes en un coup d\'œil.',
      details: [
        'Widgets personnalisables par rôle',
        'Graphiques interactifs et filtrables',
        'Vue d\'ensemble en temps réel',
        'Alertes et notifications intelligentes'
      ],
      color: 'from-teal-500 to-cyan-500',
      delay: '600'
    },
    {
      icon: Calendar,
      title: 'Gestion de Planning Avancée',
      description: 'Optimisez votre planning avec un système intelligent qui évite les conflits et maximise votre productivité. Gérez plusieurs recruteurs simultanément.',
      details: [
        'Vue calendrier multi-utilisateurs',
        'Détection automatique des conflits',
        'Optimisation automatique des créneaux',
        'Synchronisation avec calendriers externes'
      ],
      color: 'from-amber-500 to-orange-500',
      delay: '700'
    },
    {
      icon: UserCheck,
      title: 'Évaluation et Scoring',
      description: 'Évaluez vos candidats avec un système de scoring personnalisable. Comparez les profils et identifiez rapidement les meilleurs talents.',
      details: [
        'Grilles d\'évaluation personnalisables',
        'Scoring automatique basé sur les critères',
        'Comparaison côte à côte des candidats',
        'Historique des évaluations'
      ],
      color: 'from-violet-500 to-purple-500',
      delay: '800'
    },
  ]

  const benefits = [
    {
      icon: Timer,
      title: 'Gain de Temps Exceptionnel',
      description: 'Automatisez vos processus et économisez jusqu\'à 40% de votre temps de recrutement. Concentrez-vous sur ce qui compte vraiment : trouver les meilleurs talents.',
      stat: '40%',
      color: 'from-blue-500 to-cyan-500',
      details: [
        'Automatisation des tâches répétitives',
        'Templates de communication pré-remplis',
        'Workflows automatisés par étape',
        'Rapports générés automatiquement'
      ]
    },
    {
      icon: TrendingUp,
      title: 'Qualité Améliorée',
      description: 'Améliorez significativement la qualité de vos recrutements grâce à un suivi détaillé et des outils d\'évaluation avancés. Recrutez les bons profils dès le premier essai.',
      stat: '+25%',
      color: 'from-green-500 to-emerald-500',
      details: [
        'Meilleure adéquation candidat-poste',
        'Réduction du taux de turnover',
        'Amélioration de la satisfaction client',
        'Augmentation de la rétention'
      ]
    },
    {
      icon: Target,
      title: 'Précision Maximale',
      description: 'Ciblez les meilleurs candidats avec des outils d\'analyse avancés et des filtres intelligents. Ne perdez plus de temps avec des profils non pertinents.',
      stat: '95%',
      color: 'from-purple-500 to-pink-500',
      details: [
        'Matching intelligent candidat-poste',
        'Filtres multicritères avancés',
        'Scoring automatique des profils',
        'Recommandations personnalisées'
      ]
    },
    {
      icon: Zap,
      title: 'Rapidité Accrue',
      description: 'Réduisez votre time-to-hire de manière drastique et recrutez les talents plus rapidement. Ne laissez pas passer les meilleurs candidats à vos concurrents.',
      stat: '-30%',
      color: 'from-orange-500 to-red-500',
      details: [
        'Processus optimisés et accélérés',
        'Notifications en temps réel',
        'Validation rapide des décisions',
        'Pipeline fluide et sans friction'
      ]
    },
    {
      icon: DollarSign,
      title: 'Réduction des Coûts',
      description: 'Optimisez vos dépenses de recrutement en réduisant les coûts par embauche et en maximisant le ROI de vos investissements.',
      stat: '-35%',
      color: 'from-emerald-500 to-teal-500',
      details: [
        'Réduction des coûts par recrutement',
        'Optimisation des sources de candidats',
        'Diminution des frais d\'agences',
        'ROI mesurable et traçable'
      ]
    },
    {
      icon: ThumbsUp,
      title: 'Satisfaction Client',
      description: 'Améliorez la satisfaction de vos clients internes et externes avec un service de recrutement plus rapide, plus transparent et plus efficace.',
      stat: '98%',
      color: 'from-pink-500 to-rose-500',
      details: [
        'Feedback client en temps réel',
        'Transparence totale du processus',
        'Communication fluide et régulière',
        'Résultats mesurables et visibles'
      ]
    },
    {
      icon: AwardIcon,
      title: 'Excellence Opérationnelle',
      description: 'Atteignez l\'excellence opérationnelle avec des processus standardisés, des meilleures pratiques intégrées et une qualité constante.',
      stat: '99%',
      color: 'from-indigo-500 to-blue-500',
      details: [
        'Processus standardisés et reproductibles',
        'Meilleures pratiques intégrées',
        'Qualité constante et traçable',
        'Amélioration continue'
      ]
    },
    {
      icon: Globe,
      title: 'Accessibilité Totale',
      description: 'Accédez à votre plateforme depuis n\'importe où, à tout moment, sur tous vos appareils. Travaillez efficacement en mobilité.',
      stat: '24/7',
      color: 'from-cyan-500 to-blue-500',
      details: [
        'Accès multi-appareils (mobile, tablette, desktop)',
        'Synchronisation en temps réel',
        'Mode hors-ligne disponible',
        'Interface responsive et optimisée'
      ]
    },
  ]

  const testimonials = [
    {
      name: 'Sophie Martin',
      role: 'Directrice RH',
      company: 'TechCorp',
      content: 'RecruitPro a transformé notre processus de recrutement. Nous avons réduit notre temps de recrutement de 35% et amélioré la qualité de nos embauches. L\'interface est intuitive et les fonctionnalités répondent parfaitement à nos besoins.',
      rating: 5,
      image: 'SM'
    },
    {
      name: 'Jean Dupont',
      role: 'Manager Recrutement',
      company: 'InnovateLab',
      content: 'L\'interface est intuitive, les fonctionnalités sont complètes. C\'est exactement ce dont nous avions besoin pour gérer nos recrutements efficacement. Le support client est également excellent et très réactif.',
      rating: 5,
      image: 'JD'
    },
    {
      name: 'Marie Leclerc',
      role: 'CEO',
      company: 'StartupHub',
      content: 'Les KPI en temps réel nous permettent de prendre des décisions éclairées. Un outil indispensable pour notre croissance. Nous avons multiplié nos recrutements par 3 sans augmenter notre équipe.',
      rating: 5,
      image: 'ML'
    },
    {
      name: 'Pierre Dubois',
      role: 'Directeur des Talents',
      company: 'GrowthCo',
      content: 'La plateforme nous a permis d\'automatiser 60% de nos processus de recrutement. Nos recruteurs peuvent maintenant se concentrer sur ce qui compte vraiment : rencontrer et évaluer les candidats.',
      rating: 5,
      image: 'PD'
    },
    {
      name: 'Camille Bernard',
      role: 'Responsable Recrutement',
      company: 'DigitalAgency',
      content: 'Les tableaux de bord personnalisés sont un vrai plus. Nous avons une vision claire de nos performances et pouvons ajuster notre stratégie en temps réel. Un gain de productivité énorme !',
      rating: 5,
      image: 'CB'
    },
    {
      name: 'Thomas Moreau',
      role: 'VP People',
      company: 'ScaleUp',
      content: 'RecruitPro a révolutionné notre façon de recruter. Le pipeline de candidats est visuel et efficace, les entretiens sont mieux organisés, et nos managers sont ravis de la qualité des shortlists.',
      rating: 5,
      image: 'TM'
    },
  ]

  const roles = [
    {
      id: 'recruteur',
      title: 'Recruteur',
      description: 'L\'outil complet pour gérer tous vos besoins de recrutement',
      icon: Users,
      color: 'from-blue-500 via-cyan-500 to-blue-600',
      features: ['Gestion des besoins', 'Pipeline candidats', 'Entretiens', 'Shortlists'],
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #2563eb 100%)'
    },
    {
      id: 'manager',
      title: 'Manager',
      description: 'Pilotez votre équipe avec des données en temps réel',
      icon: BarChart3,
      color: 'from-purple-500 via-pink-500 to-purple-600',
      features: ['Tableaux de bord KPI', 'Validation besoins', 'Suivi équipe', 'Rapports'],
      gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #9333ea 100%)'
    },
    {
      id: 'client',
      title: 'Client',
      description: 'Validez vos candidats en toute simplicité',
      icon: Building2,
      color: 'from-green-500 via-emerald-500 to-green-600',
      features: ['Consultation shortlists', 'Validation candidats', 'Feedback', 'Suivi'],
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)'
    },
    {
      id: 'administrateur',
      title: 'Administrateur',
      description: 'Gérez votre plateforme en toute sécurité',
      icon: Shield,
      color: 'from-red-500 via-rose-500 to-red-600',
      features: ['Gestion utilisateurs', 'Paramètres', 'Logs sécurité', 'Configuration'],
      gradient: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 50%, #dc2626 100%)'
    },
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header / Navigation */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                </div>
                <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  RecruitPro
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium relative group">
                Fonctionnalités
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-600 transition-colors font-medium relative group">
                Avantages
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors font-medium relative group">
                Témoignages
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </a>
              <Link 
                href="/auth/login" 
                className="px-4 py-2 text-blue-600 font-medium hover:text-blue-700 transition-colors"
              >
                Connexion
              </Link>
              <Link 
                href="/auth/choice" 
                className="px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center">
                  Commencer
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 space-y-4 animate-in slide-in-from-top-5 duration-300">
              <a href="#features" className="block text-gray-700 hover:text-blue-600 transition-colors py-2">
                Fonctionnalités
              </a>
              <a href="#benefits" className="block text-gray-700 hover:text-blue-600 transition-colors py-2">
                Avantages
              </a>
              <a href="#testimonials" className="block text-gray-700 hover:text-blue-600 transition-colors py-2">
                Témoignages
              </a>
              <Link href="/auth/login" className="block text-blue-600 font-medium py-2">
                Connexion
              </Link>
              <Link 
                href="/auth/choice" 
                className="block px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-center"
              >
                Commencer
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto" data-animate id="hero">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium mb-6 animate-fade-in-up">
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              Plateforme de recrutement nouvelle génération
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-fade-in-up animation-delay-200">
              Recrutez plus vite,
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                recrutez mieux
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed animate-fade-in-up animation-delay-400 max-w-3xl mx-auto">
              La solution tout-en-un pour transformer votre processus de recrutement. 
              <span className="font-semibold text-gray-700"> Gagnez du temps, améliorez la qualité, recrutez les meilleurs talents.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up animation-delay-600">
              <Link
                href="/auth/choice"
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105 overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  <Rocket className="w-5 h-5 mr-2" />
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <a
                href="#features"
                className="group px-8 py-4 bg-white text-gray-700 rounded-2xl font-semibold text-lg border-2 border-gray-200 hover:border-blue-300 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <Play className="w-5 h-5 text-blue-600" />
                <span>Voir la démo</span>
              </a>
            </div>

            {/* Stats avec animations */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in-up animation-delay-800">
              <div className="text-center transform hover:scale-110 transition-transform">
                <div className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  {counters.candidates}+
                </div>
                <div className="text-gray-600 font-medium">Candidats gérés</div>
              </div>
              <div className="text-center transform hover:scale-110 transition-transform">
                <div className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {counters.jobs}+
                </div>
                <div className="text-gray-600 font-medium">Besoins traités</div>
              </div>
              <div className="text-center transform hover:scale-110 transition-transform">
                <div className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  {counters.satisfaction}%
                </div>
                <div className="text-gray-600 font-medium">Satisfaction</div>
              </div>
              <div className="text-center transform hover:scale-110 transition-transform">
                <div className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                  {counters.time}%
                </div>
                <div className="text-gray-600 font-medium">Gain de temps</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" data-animate id="features-header">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              Fonctionnalités
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Des outils puissants pour transformer votre processus de recrutement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const elementId = `feature-${index}`
              const isVisible = visibleSections.has(elementId) || visibleSections.has('features-header')
              return (
                <div
                  key={index}
                  data-animate
                  data-animate-id={elementId}
                  id={elementId}
                  className={`p-8 rounded-3xl border-2 border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 bg-white group ${
                    isVisible ? 'animate-fade-in-up' : 'opacity-100'
                  }`}
                  style={{ animationDelay: `${feature.delay}ms` }}
                >
                  <div className={`bg-gradient-to-br ${feature.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  <div className="mt-6 flex items-center text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    En savoir plus
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16" data-animate data-animate-id="benefits-header" id="benefits-header">
            <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              Résultats Mesurables
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Pourquoi choisir RecruitPro ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Des résultats concrets et mesurables pour votre équipe
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              const elementId = `benefit-${index}`
              const isVisible = visibleSections.has(elementId) || visibleSections.has('benefits-header')
              return (
                <div
                  key={index}
                  data-animate
                  data-animate-id={elementId}
                  id={elementId}
                  className={`bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 group ${
                    isVisible ? 'animate-fade-in-up' : 'opacity-100'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-center mb-6">
                    <div className={`bg-gradient-to-br ${benefit.color} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <div className={`text-5xl font-extrabold bg-gradient-to-r ${benefit.color} bg-clip-text text-transparent mb-3`}>
                      {benefit.stat}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">{benefit.description}</p>
                  </div>
                  {benefit.details && (
                    <ul className="space-y-2 border-t border-gray-100 pt-4">
                      {benefit.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" data-animate data-animate-id="testimonials-header" id="testimonials-header">
            <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
              Témoignages
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Découvrez ce que nos clients disent de RecruitPro
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => {
              const elementId = `testimonial-${index}`
              const isVisible = visibleSections.has(elementId) || visibleSections.has('testimonials-header')
              return (
                <div
                  key={index}
                  data-animate
                  data-animate-id={elementId}
                  id={elementId}
                  className={`bg-gradient-to-br from-gray-50 to-white p-8 rounded-3xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 group ${
                    isVisible ? 'animate-fade-in-up' : 'opacity-100'
                  }`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed italic text-lg mb-4">
                      "{testimonial.content}"
                    </p>
                  </div>
                  <div className="flex items-center pt-4 border-t border-gray-200">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4 shadow-lg transform group-hover:scale-110 transition-transform">
                      {testimonial.image}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                      <div className="text-sm font-semibold text-blue-600">{testimonial.company}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16" data-animate id="roles-header">
            <div className="inline-block px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium mb-4">
              Espaces Dédiés
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Une interface pour chaque rôle
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Des espaces personnalisés adaptés à vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {roles.map((role, index) => {
              const Icon = role.icon
              const isVisible = visibleSections.has('roles')
              return (
                <div
                  key={role.id}
                  data-animate
                  id={`role-${index}`}
                  className={`relative p-8 rounded-3xl text-white overflow-hidden group hover:shadow-2xl transition-all duration-500 transform hover:scale-105 ${
                    isVisible ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{
                    background: role.gradient,
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  <div className="relative z-10">
                    <div className="bg-white/20 backdrop-blur-sm w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                      <Icon className="w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-bold mb-3">{role.title}</h3>
                    <p className="text-white/90 mb-6 text-lg">{role.description}</p>
                    <ul className="space-y-3 mb-8">
                      {role.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-white/90">
                          <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/auth/login?role=${encodeURIComponent(role.id)}`}
                      className="inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                    >
                      Accéder à l'espace
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 group-hover:scale-125 transition-transform duration-700"></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10" data-animate id="cta">
          <Trophy className="w-16 h-16 text-white mx-auto mb-6 animate-bounce" />
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">
            Prêt à transformer votre recrutement ?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Rejoignez des centaines d'entreprises qui font confiance à RecruitPro pour recruter les meilleurs talents
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/choice"
              className="group px-10 py-5 bg-white text-blue-600 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-white/50 transition-all transform hover:scale-105 flex items-center space-x-2"
            >
              <Rocket className="w-6 h-6" />
              <span>Commencer gratuitement</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-semibold text-lg border-2 border-white/30 hover:bg-white/20 transition-all"
            >
              Voir les fonctionnalités
            </a>
          </div>
          <div className="mt-12 flex items-center justify-center space-x-8 text-white/80">
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>Sans engagement</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>Essai gratuit</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>Support 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">RecruitPro</span>
              </div>
              <p className="text-gray-400 mb-4">
                La plateforme de recrutement nouvelle génération pour transformer votre processus d'embauche.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <Building2 className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <MessageSquare className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Produit</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#benefits" className="hover:text-white transition-colors">Avantages</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Témoignages</a></li>
                <li><a href="#roles" className="hover:text-white transition-colors">Espaces</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Entreprise</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Sécurité & Conformité</h4>
              <ul className="space-y-2">
                <li className="flex items-center"><Lock className="w-4 h-4 mr-2" />Données sécurisées</li>
                <li className="flex items-center"><Shield className="w-4 h-4 mr-2" />Conforme RGPD</li>
                <li className="flex items-center"><Globe className="w-4 h-4 mr-2" />Disponible partout</li>
                <li className="flex items-center"><Smartphone className="w-4 h-4 mr-2" />Mobile-friendly</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} RecruitPro. Tous droits réservés.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Mentions légales</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">CGU</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
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
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  )
}
