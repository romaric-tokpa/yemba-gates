'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, Users, BarChart3, Shield, ArrowRight, Check, 
  TrendingUp, Clock, Target, Zap, Menu, X,
  Briefcase, FileText, MessageSquare, PieChart, 
  Award, Globe, Lock, Smartphone, ChevronDown, Play,
  CheckCircle2, Rocket, Sparkles, Trophy, Heart,
  ArrowUpRight, BarChart, Calendar, UserCheck, 
  ThumbsUp, Award as AwardIcon, Timer, DollarSign, Eye, Settings
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
      color: 'from-emerald-500 to-teal-500',
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
      color: 'from-[#F7941D] to-[#FDBA4D]',
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
      color: 'from-emerald-600 to-teal-600',
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
      color: 'from-[#F7941D] to-[#FDBA4D]',
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
      color: 'from-[#F7941D] to-[#FDBA4D]',
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
      color: 'from-emerald-600 to-teal-600',
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
      color: 'from-[#F7941D] to-[#FDBA4D]',
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
      color: 'from-[#F7941D] to-[#FDBA4D]',
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
      color: 'from-emerald-600 to-teal-600',
      delay: '800'
    },
  ]

  const benefits = [
    {
      icon: Timer,
      title: 'Gain de Temps Exceptionnel',
      description: 'Automatisez vos processus et économisez jusqu\'à 40% de votre temps de recrutement. Concentrez-vous sur ce qui compte vraiment : trouver les meilleurs talents.',
      stat: '40%',
      color: 'from-[#F7941D] to-[#FDBA4D]',
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
      color: 'from-emerald-500 to-teal-500',
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
      color: 'from-emerald-600 to-teal-600',
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
      color: 'from-[#F7941D] to-[#FDBA4D]',
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
      color: 'from-[#F7941D] to-[#FDBA4D]',
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
      color: 'from-emerald-600 to-teal-600',
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
      color: 'from-teal-500 to-emerald-500',
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
      color: 'from-teal-500 to-emerald-500',
      details: [
        'Accès multi-appareils (mobile, tablette, desktop)',
        'Synchronisation en temps réel',
        'Mode hors-ligne disponible',
        'Interface responsive et optimisée'
      ]
    },
  ]

  const roles = [
    {
      id: 'recruteur',
      title: 'Recruteur',
      description: 'L\'outil complet pour gérer tous vos besoins de recrutement de A à Z',
      detailedDescription: 'Optimisez votre quotidien avec une interface pensée pour les recruteurs. Gérez vos besoins, suivez vos candidats, planifiez vos entretiens et créez des shortlists efficaces.',
      icon: Users,
      color: 'from-emerald-500 via-teal-500 to-emerald-600',
      features: [
        'Gestion complète des besoins de recrutement',
        'Pipeline de candidats avec vue Kanban interactive',
        'Planification et suivi des entretiens',
        'Création et partage de shortlists',
        'Analyse de CV avec intelligence artificielle',
        'Communication centralisée avec candidats',
        'Statistiques personnelles de performance',
        'Export de données et rapports'
      ],
      advantages: [
        { icon: Zap, text: 'Gain de temps jusqu\'à 40%' },
        { icon: Target, text: 'Taux de matching amélioré' },
        { icon: TrendingUp, text: 'Productivité accrue' }
      ],
      stats: [
        { label: 'Besoins gérés', value: '50+', icon: Briefcase },
        { label: 'Candidats suivis', value: '200+', icon: Users },
        { label: 'Temps économisé', value: '15h/sem', icon: Clock }
      ],
      useCases: [
        'Gérer plusieurs besoins simultanément sans confusion',
        'Suivre l\'avancement de chaque candidat en temps réel',
        'Créer des shortlists qualifiées en quelques minutes'
      ],
      gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #047857 100%)'
    },
    {
      id: 'manager',
      title: 'Manager',
      description: 'Pilotez votre équipe avec des données en temps réel et des insights actionnables',
      detailedDescription: 'Prenez des décisions éclairées grâce à des tableaux de bord complets. Suivez les performances de votre équipe, validez les besoins stratégiques et optimisez vos processus de recrutement.',
      icon: BarChart3,
      color: 'from-emerald-600 via-orange-500 to-teal-600',
      features: [
        'Tableaux de bord KPI en temps réel',
        'Validation et approbation des besoins',
        'Suivi détaillé de l\'équipe de recrutement',
        'Rapports analytiques personnalisables',
        'Gestion des utilisateurs et permissions',
        'Analyse comparative des performances',
        'Alertes et notifications intelligentes',
        'Export de données pour reporting'
      ],
      advantages: [
        { icon: BarChart3, text: 'Vision 360° de l\'activité' },
        { icon: Users, text: 'Optimisation des ressources' },
        { icon: TrendingUp, text: 'ROI mesurable' }
      ],
      stats: [
        { label: 'Équipe pilotée', value: '10+', icon: Users },
        { label: 'KPI suivis', value: '25+', icon: BarChart3 },
        { label: 'Décisions/jour', value: '50+', icon: Target }
      ],
      useCases: [
        'Identifier rapidement les goulots d\'étranglement',
        'Valider les besoins stratégiques en toute confiance',
        'Optimiser la répartition des ressources de recrutement'
      ],
      gradient: 'linear-gradient(135deg, #047857 0%, #0d9488 50%, #059669 100%)'
    },
    {
      id: 'client',
      title: 'Client',
      description: 'Validez vos candidats en toute simplicité et suivez vos recrutements en temps réel',
      detailedDescription: 'Accédez facilement aux shortlists partagées, consultez les profils détaillés, donnez votre feedback et suivez l\'avancement de vos recrutements. Une interface simple et intuitive pour une validation rapide.',
      icon: Building2,
      color: 'from-emerald-500 via-orange-500 to-teal-500',
      features: [
        'Consultation des shortlists partagées',
        'Validation rapide des candidats',
        'Feedback structuré et commentaires',
        'Suivi en temps réel des recrutements',
        'Prévisualisation des CV en un clic',
        'Historique des décisions prises',
        'Statistiques de vos besoins',
        'Notifications des nouvelles candidatures'
      ],
      advantages: [
        { icon: Clock, text: 'Décisions accélérées' },
        { icon: CheckCircle2, text: 'Processus simplifié' },
        { icon: Eye, text: 'Transparence totale' }
      ],
      stats: [
        { label: 'Shortlists consultées', value: '30+', icon: FileText },
        { label: 'Temps de réponse', value: '<24h', icon: Clock },
        { label: 'Taux de validation', value: '85%', icon: CheckCircle2 }
      ],
      useCases: [
        'Valider des candidats en quelques clics',
        'Suivre l\'avancement de vos recrutements en direct',
        'Donner un feedback structuré et actionnable'
      ],
      gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #047857 100%)'
    },
    {
      id: 'administrateur',
      title: 'Administrateur',
      description: 'Gérez votre plateforme en toute sécurité avec un contrôle total sur les configurations',
      detailedDescription: 'Administrez votre plateforme avec des outils puissants de gestion. Configurez les paramètres, gérez les utilisateurs, surveillez la sécurité et optimisez les performances de votre système.',
      icon: Shield,
      color: 'from-[#F7941D] via-[#FDBA4D] to-[#F7941D]',
      features: [
        'Gestion complète des utilisateurs et rôles',
        'Configuration des paramètres système',
        'Logs de sécurité et audit trail',
        'Gestion des permissions et accès',
        'Monitoring des performances',
        'Sauvegardes et restauration',
        'Intégrations et API management',
        'Support et maintenance avancée'
      ],
      advantages: [
        { icon: Shield, text: 'Sécurité renforcée' },
        { icon: Settings, text: 'Contrôle total' },
        { icon: Lock, text: 'Conformité garantie' }
      ],
      stats: [
        { label: 'Utilisateurs gérés', value: '100+', icon: Users },
        { label: 'Sécurité', value: '99.9%', icon: Shield },
        { label: 'Uptime', value: '99.9%', icon: Globe }
      ],
      useCases: [
        'Configurer et personnaliser la plateforme selon vos besoins',
        'Gérer les accès et permissions avec précision',
        'Surveiller la sécurité et la conformité en continu'
      ],
      gradient: 'linear-gradient(135deg, #F7941D 0%, #FDBA4D 50%, #F7941D 100%)'
    },
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header / Navigation */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2 group">
                <span className="text-lg lg:text-xl font-bold">
                  <span className="text-emerald-600">Yemma</span>
                  <span className="text-orange-500">-Gates</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-sm text-gray-700 hover:text-emerald-600 transition-colors font-medium relative group">
                Fonctionnalités
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#benefits" className="text-sm text-gray-700 hover:text-emerald-600 transition-colors font-medium relative group">
                Avantages
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
              </a>
              <Link 
                href="/auth/login" 
                className="px-3 py-1.5 text-sm text-gray-700 hover:text-emerald-600 transition-colors font-medium"
              >
                Connexion
              </Link>
              <Link 
                href="/register-company" 
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 hover:shadow-xl transition-all transform hover:scale-105 flex items-center group"
              >
                Inscription Entreprise
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-emerald-600 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-3 space-y-3 animate-in slide-in-from-top-5 duration-300">
              <a href="#features" className="block text-sm text-gray-700 hover:text-emerald-600 transition-colors py-1.5">
                Fonctionnalités
              </a>
              <a href="#benefits" className="block text-sm text-gray-700 hover:text-emerald-600 transition-colors py-1.5">
                Avantages
              </a>
              <Link href="/auth/login" className="block text-sm text-gray-700 hover:text-emerald-600 transition-colors font-medium py-1.5">
                Connexion
              </Link>
              <Link 
                href="/register-company" 
                className="block px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm text-center hover:bg-emerald-700 transition-colors"
              >
                Inscription Entreprise
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 pb-12 lg:pt-28 lg:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-orange-50 to-teal-50">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto" data-animate id="hero">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-emerald-100 via-orange-100 to-teal-100 text-emerald-700 rounded-full text-xs font-medium mb-4 animate-fade-in-up">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
              Plateforme de recrutement nouvelle génération
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight animate-fade-in-up animation-delay-200">
              Recrutez plus vite,
              <br />
              <span className="bg-gradient-to-r from-emerald-600 via-orange-500 to-teal-600 bg-clip-text text-transparent animate-gradient">
                recrutez mieux
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed animate-fade-in-up animation-delay-400 max-w-2xl mx-auto">
              La solution tout-en-un pour transformer votre processus de recrutement. 
              <span className="font-semibold text-gray-700"> Gagnez du temps, améliorez la qualité, recrutez les meilleurs talents.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-10 animate-fade-in-up animation-delay-600">
              <Link
                href="/auth/choice"
                className="group relative px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-base shadow-xl hover:bg-emerald-700 hover:shadow-emerald-500/50 transition-all transform hover:scale-105 flex items-center"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="group px-6 py-3 bg-white text-gray-700 rounded-xl font-semibold text-base border-2 border-gray-200 hover:border-orange-300 transition-all shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <Play className="w-4 h-4 text-[#F7941D]" />
                <span>Voir la démo</span>
              </a>
            </div>

            {/* Stats avec animations */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 animate-fade-in-up animation-delay-800">
              <div className="text-center transform hover:scale-110 transition-transform">
                <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
                  {counters.candidates}+
                </div>
                <div className="text-sm text-gray-600 font-medium">Candidats gérés</div>
              </div>
              <div className="text-center transform hover:scale-110 transition-transform">
                <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-[#F7941D] to-[#FDBA4D] bg-clip-text text-transparent mb-1">
                  {counters.jobs}+
                </div>
                <div className="text-sm text-gray-600 font-medium">Besoins traités</div>
              </div>
              <div className="text-center transform hover:scale-110 transition-transform">
                <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
                  {counters.satisfaction}%
                </div>
                <div className="text-sm text-gray-600 font-medium">Satisfaction</div>
              </div>
              <div className="text-center transform hover:scale-110 transition-transform">
                <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-[#F7941D] to-[#FDBA4D] bg-clip-text text-transparent mb-1">
                  {counters.time}%
                </div>
                <div className="text-sm text-gray-600 font-medium">Gain de temps</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10" data-animate id="features-header">
            <div className="inline-block px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mb-3">
              Fonctionnalités
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Des outils puissants pour transformer votre processus de recrutement
            </p>
          </div>

          {/* Scrolling Features Animation */}
          <div className="space-y-4">
            {/* First row: scroll from right to left */}
            <div className="overflow-hidden">
              <div className="flex animate-scroll-right">
                {/* Duplicate features for seamless loop */}
                {[...features, ...features].map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={`right-${index}`}
                      className={`flex-shrink-0 w-56 mx-2 p-4 rounded-xl border-2 border-gray-100 hover:shadow-lg transition-all duration-500 transform hover:-translate-y-1 bg-white group ${
                        feature.color.includes('emerald') ? 'hover:border-emerald-500 hover:bg-emerald-50' :
                        feature.color.includes('F7941D') || feature.color.includes('orange') ? 'hover:border-orange-500 hover:bg-orange-50' :
                        feature.color.includes('teal') ? 'hover:border-teal-500 hover:bg-teal-50' : 'hover:border-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md ${
                        feature.color.includes('emerald') ? 'bg-emerald-500' :
                        feature.color.includes('F7941D') || feature.color.includes('orange') ? 'bg-orange-500' :
                        feature.color.includes('teal') ? 'bg-teal-500' : 'bg-emerald-500'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className={`text-base font-bold text-gray-900 mb-1.5 transition-colors ${
                        feature.color.includes('emerald') ? 'group-hover:text-emerald-600' :
                        feature.color.includes('F7941D') || feature.color.includes('orange') ? 'group-hover:text-orange-600' :
                        feature.color.includes('teal') ? 'group-hover:text-teal-600' : 'group-hover:text-emerald-600'
                      }`}>
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{feature.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Second row: scroll from left to right */}
            <div className="overflow-hidden">
              <div className="flex animate-scroll-left">
                {/* Duplicate features in reverse for seamless loop */}
                {[...features].reverse().concat([...features].reverse()).map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={`left-${index}`}
                      className={`flex-shrink-0 w-56 mx-2 p-4 rounded-xl border-2 border-gray-100 hover:shadow-lg transition-all duration-500 transform hover:-translate-y-1 bg-white group ${
                        feature.color.includes('emerald') ? 'hover:border-emerald-500 hover:bg-emerald-50' :
                        feature.color.includes('F7941D') || feature.color.includes('orange') ? 'hover:border-orange-500 hover:bg-orange-50' :
                        feature.color.includes('teal') ? 'hover:border-teal-500 hover:bg-teal-50' : 'hover:border-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md ${
                        feature.color.includes('emerald') ? 'bg-emerald-500' :
                        feature.color.includes('F7941D') || feature.color.includes('orange') ? 'bg-orange-500' :
                        feature.color.includes('teal') ? 'bg-teal-500' : 'bg-emerald-500'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className={`text-base font-bold text-gray-900 mb-1.5 transition-colors ${
                        feature.color.includes('emerald') ? 'group-hover:text-emerald-600' :
                        feature.color.includes('F7941D') || feature.color.includes('orange') ? 'group-hover:text-orange-600' :
                        feature.color.includes('teal') ? 'group-hover:text-teal-600' : 'group-hover:text-emerald-600'
                      }`}>
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{feature.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-gray-50/30 relative overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob-float animation-delay-4000"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16 lg:mb-20" data-animate data-animate-id="benefits-header" id="benefits-header">
            <h2 className="text-4xl lg:text-5xl font-bold text-emerald-600 mb-4 tracking-tight transform transition-all duration-700 hover:scale-105">
              Pourquoi choisir Yemma-Gates ?
            </h2>
            <p className="text-lg lg:text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Des résultats concrets et mesurables pour votre équipe
            </p>
          </div>

          <div className="space-y-0">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              const elementId = `benefit-${index}`
              const isVisible = visibleSections.has(elementId) || visibleSections.has('benefits-header')
              
              // Map gradient colors to solid colors (sobre)
              const getSolidColor = (gradientColor: string) => {
                if (gradientColor.includes('F7941D') || gradientColor.includes('orange')) {
                  return 'orange-500'
                } else if (gradientColor.includes('emerald')) {
                  return 'emerald-500'
                } else if (gradientColor.includes('teal')) {
                  return 'teal-500'
                }
                return 'emerald-500'
              }
              
              const solidColor = getSolidColor(benefit.color)
              const colorClasses = {
                'orange-500': {
                  bg: 'bg-orange-500',
                  text: 'text-orange-500',
                  border: 'border-orange-500',
                  dot: 'bg-orange-400'
                },
                'emerald-500': {
                  bg: 'bg-emerald-500',
                  text: 'text-emerald-500',
                  border: 'border-emerald-500',
                  dot: 'bg-emerald-400'
                },
                'teal-500': {
                  bg: 'bg-teal-500',
                  text: 'text-teal-500',
                  border: 'border-teal-500',
                  dot: 'bg-teal-400'
                }
              }
              
              const colors = colorClasses[solidColor as keyof typeof colorClasses] || colorClasses['emerald-500']
              
              return (
                <div
                  key={index}
                  data-animate
                  data-animate-id={elementId}
                  id={elementId}
                  className={`group py-8 lg:py-12 border-b border-gray-200 last:border-b-0 transition-all duration-700 hover:bg-white/50 hover:border-l-4 ${colors.border} hover:pl-4 lg:hover:pl-6 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                  }`}
                  style={{ animationDelay: `${index * 100}ms`, transitionDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-12">
                    {/* Left: Icon and Stat */}
                    <div className="flex items-center gap-6 lg:gap-8 flex-shrink-0">
                      <div className={`${colors.bg} w-12 h-12 lg:w-14 lg:h-14 rounded-lg flex items-center justify-center transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg`}>
                        <Icon className="w-6 h-6 lg:w-7 lg:h-7 text-white transform transition-transform duration-500 group-hover:scale-110" />
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className={`${colors.text} text-4xl lg:text-5xl font-light transform transition-all duration-500 group-hover:scale-110`}>
                          {benefit.stat}
                        </span>
                      </div>
                    </div>

                    {/* Center: Title and Description */}
                    <div className="flex-1 lg:max-w-2xl">
                      <h3 
                        className={`text-xl lg:text-2xl font-medium mb-3 tracking-tight transform transition-all duration-500 group-hover:translate-x-2 ${
                          solidColor === 'orange-500' ? 'text-gray-900 group-hover:text-orange-500' :
                          solidColor === 'emerald-500' ? 'text-gray-900 group-hover:text-emerald-500' :
                          'text-gray-900 group-hover:text-teal-500'
                        }`}
                      >
                        {benefit.title}
                      </h3>
                      <p className="text-base lg:text-lg text-gray-600 leading-relaxed font-light transform transition-all duration-500 group-hover:text-gray-700">
                        {benefit.description}
                      </p>
                    </div>

                    {/* Right: Details (hidden on mobile, shown on desktop) */}
                    {benefit.details && (
                      <div className="hidden lg:block flex-shrink-0 w-64">
                        <ul className="space-y-2">
                          {benefit.details.slice(0, 2).map((detail, idx) => (
                            <li 
                              key={idx} 
                              className="flex items-start text-sm text-gray-500 transform transition-all duration-500 group-hover:translate-x-1"
                              style={{ transitionDelay: `${idx * 100}ms` }}
                            >
                              <span className={`${colors.dot} w-1.5 h-1.5 rounded-full mt-2 mr-3 flex-shrink-0 transform transition-all duration-500 group-hover:scale-150`}></span>
                              <span className="leading-relaxed group-hover:text-gray-600 transition-colors duration-300">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-8 lg:py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-200/40 rounded-full mix-blend-screen filter blur-3xl animate-blob-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-200/40 rounded-full mix-blend-screen filter blur-3xl animate-blob-float animation-delay-2000"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-6" data-animate id="roles-header">
            <div className="inline-block px-3 py-1.5 bg-emerald-100 text-gray-800 rounded-full text-xs font-medium mb-3 animate-fade-in-up animate-float-subtle">
              Espaces Dédiés
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-emerald-600 mb-2 animate-fade-in-up animation-delay-200">
              Une interface pour chaque rôle
            </h2>
            <p className="text-sm lg:text-base text-gray-700 max-w-2xl mx-auto animate-fade-in-up animation-delay-400">
              Des espaces personnalisés optimisés pour votre quotidien et vos objectifs spécifiques.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {roles.map((role, index) => {
              const Icon = role.icon
              const elementId = `role-${index}`
              const isVisible = visibleSections.has(elementId) || visibleSections.has('roles-header')
              return (
                <div
                  key={role.id}
                  data-animate
                  data-animate-id={elementId}
                  id={elementId}
                  className={`relative p-4 lg:p-5 rounded-xl text-white overflow-hidden group hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1 ${
                    isVisible ? 'animate-role-card-in' : 'opacity-0'
                  } ${
                    role.id === 'recruteur' ? 'bg-emerald-600' :
                    role.id === 'manager' ? 'bg-emerald-600' :
                    role.id === 'client' ? 'bg-emerald-500' :
                    role.id === 'administrateur' ? 'bg-orange-500' : 'bg-emerald-600'
                  }`}
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  {/* Animated background glow */}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                        <Icon className="w-6 h-6 transform group-hover:scale-110 transition-transform duration-300" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{role.title}</h3>
                    <p className="text-white/90 mb-3 text-xs leading-relaxed">{role.description}</p>
                    
                    <div className="mb-3">
                      <ul className="space-y-1">
                        {role.features.slice(0, 3).map((feature, idx) => (
                          <li 
                            key={idx} 
                            className="flex items-start text-white/90 text-[11px] leading-tight"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {role.features.length > 3 && (
                          <li className="text-white/70 text-[10px] mt-1">
                            +{role.features.length - 3} autres fonctionnalités
                          </li>
                        )}
                      </ul>
                    </div>

                    {role.advantages && role.advantages.length > 0 && (
                      <div className="mb-3 pt-2 border-t border-white/20">
                        <div className="flex flex-wrap gap-1.5">
                          {role.advantages.slice(0, 2).map((advantage, idx) => {
                            const AdvantageIcon = advantage.icon
                            return (
                              <div 
                                key={idx} 
                                className="flex items-center text-white/90 text-[10px] bg-white/10 rounded-md px-2 py-1 backdrop-blur-sm"
                              >
                                <AdvantageIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate max-w-[80px]">{advantage.text}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/auth/login?role=${encodeURIComponent(role.id)}`}
                      className="inline-flex items-center justify-center px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold text-xs hover:bg-gray-100 transition-all transform hover:scale-105 shadow-md w-full group/button"
                    >
                      Accéder
                      <ArrowRight className="w-3 h-3 ml-1.5 transform group-hover/button:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10" data-animate id="cta">
          <Trophy className="w-12 h-12 text-white mx-auto mb-4 animate-bounce" />
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
            Prêt à transformer votre recrutement ?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines d'entreprises qui font confiance à Yemma-Gates pour recruter les meilleurs talents
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/register-company"
              className="group px-8 py-4 bg-white text-emerald-600 rounded-xl font-bold text-base shadow-xl hover:shadow-white/50 transition-all transform hover:scale-105 flex items-center space-x-2 hover:text-orange-600"
            >
              <Building2 className="w-5 h-5" />
              <span>Inscription Entreprise</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/choice"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-base border-2 border-white/30 hover:bg-white/20 transition-all"
            >
              Se connecter
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-base border-2 border-white/30 hover:bg-white/20 transition-all"
            >
              Voir les fonctionnalités
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center space-x-6 text-white/80 text-sm">
            <div className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Sans engagement</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Essai gratuit</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Support 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 lg:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 lg:gap-6 mb-6">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-gradient-to-br from-emerald-600 via-orange-500 to-teal-600 p-1.5 rounded-lg">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Yemma-Gates</span>
              </div>
              <p className="text-sm text-gray-400 mb-3">
                La plateforme de recrutement nouvelle génération pour transformer votre processus d'embauche.
              </p>
              <div className="flex space-x-3">
                <a href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <Building2 className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Produit</h4>
              <ul className="space-y-1.5">
                <li><a href="#features" className="text-sm hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#benefits" className="text-sm hover:text-white transition-colors">Avantages</a></li>
                <li><a href="#roles" className="text-sm hover:text-white transition-colors">Espaces</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Entreprise</h4>
              <ul className="space-y-1.5">
                <li><a href="#" className="text-sm hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Sécurité & Conformité</h4>
              <ul className="space-y-1.5">
                <li className="flex items-center text-sm"><Lock className="w-3.5 h-3.5 mr-1.5" />Données sécurisées</li>
                <li className="flex items-center text-sm"><Shield className="w-3.5 h-3.5 mr-1.5" />Conforme RGPD</li>
                <li className="flex items-center text-sm"><Globe className="w-3.5 h-3.5 mr-1.5" />Disponible partout</li>
                <li className="flex items-center text-sm"><Smartphone className="w-3.5 h-3.5 mr-1.5" />Mobile-friendly</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-gray-400 mb-3 md:mb-0">
              &copy; {new Date().getFullYear()} Yemma-Gates. Tous droits réservés.
            </p>
            <div className="flex space-x-4 text-xs">
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
        @keyframes float-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-float-subtle {
          animation: float-subtle 3s ease-in-out infinite;
        }
        @keyframes role-card-in {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-role-card-in {
          animation: role-card-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes icon-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .animate-icon-float {
          animation: icon-float 4s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @keyframes scroll-right {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll-right {
          animation: scroll-right 40s linear infinite;
        }
        @keyframes scroll-left {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-scroll-left {
          animation: scroll-left 40s linear infinite;
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
