"""
Routes pour les KPI et statistiques (réservées aux Managers et Recruteurs)
Implémente toutes les formules mathématiques du specs.md
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func, and_, or_
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from sqlalchemy import case, cast, Date

from database import get_session
from models import User, UserRole, Candidate, Job, Application, Interview
from auth import get_current_active_user, require_manager, require_recruteur

router = APIRouter(prefix="/kpi", tags=["kpi"])


# ==================== SCHÉMAS DE RÉPONSE ====================

class KPIFilters(BaseModel):
    """Filtres pour les KPI"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    recruiter_id: Optional[UUID] = None
    client_id: Optional[UUID] = None  # À adapter selon votre modèle
    job_id: Optional[UUID] = None
    source: Optional[str] = None
    status: Optional[str] = None


class TimeProcessKPIs(BaseModel):
    """KPI Temps & Process"""
    time_to_hire: Optional[float]  # En jours
    time_to_fill: Optional[float]  # En jours
    average_cycle_per_stage: Optional[float]  # En jours
    average_feedback_delay: Optional[float]  # En jours
    percentage_jobs_on_time: Optional[float]  # Pourcentage


class QualitySelectionKPIs(BaseModel):
    """KPI Qualité & Sélection"""
    qualified_candidates_rate: Optional[float]  # Pourcentage
    rejection_rate_per_stage: Optional[float]  # Pourcentage
    shortlist_acceptance_rate: Optional[float]  # Pourcentage
    average_candidate_score: Optional[float]
    no_show_rate: Optional[float]  # Pourcentage
    turnover_rate_post_onboarding: Optional[float]  # Pourcentage


class VolumeProductivityKPIs(BaseModel):
    """KPI Volume & Productivité"""
    total_candidates_sourced: int
    total_cvs_processed: int
    closed_vs_open_recruitments: Optional[float]
    total_interviews_conducted: int


class CostBudgetKPIs(BaseModel):
    """KPI Coût / Budget"""
    average_recruitment_cost: Optional[float]
    cost_per_source: Optional[float]
    budget_spent_vs_planned: Optional[float]  # Pourcentage


class EngagementSatisfactionKPIs(BaseModel):
    """KPI Engagement & Satisfaction"""
    offer_acceptance_rate: Optional[float]  # Pourcentage
    offer_rejection_rate: Optional[float]  # Pourcentage
    candidate_response_rate: Optional[float]  # Pourcentage


class RecruiterPerformanceKPIs(BaseModel):
    """KPI Recruteur / Performance"""
    jobs_managed: int
    success_rate: Optional[float]  # Pourcentage
    average_time_per_stage: Optional[float]  # En jours
    feedbacks_on_time_rate: Optional[float]  # Pourcentage


class SourceChannelKPIs(BaseModel):
    """KPI Source & Canal"""
    performance_per_source: Optional[float]  # Pourcentage
    conversion_rate_per_source: Optional[float]  # Pourcentage
    average_sourcing_time: Optional[float]  # En jours


class OnboardingKPIs(BaseModel):
    """KPI Onboarding"""
    onboarding_success_rate: Optional[float]  # Pourcentage
    average_onboarding_delay: Optional[float]  # En jours
    post_integration_issues_count: int


class ManagerKPIs(BaseModel):
    """Tous les KPI Manager"""
    time_process: TimeProcessKPIs
    quality_selection: QualitySelectionKPIs
    volume_productivity: VolumeProductivityKPIs
    cost_budget: CostBudgetKPIs
    engagement_satisfaction: EngagementSatisfactionKPIs
    recruiter_performance: RecruiterPerformanceKPIs
    source_channel: SourceChannelKPIs
    onboarding: OnboardingKPIs


class RecruiterKPIs(BaseModel):
    """Tous les KPI Recruteur"""
    volume_productivity: VolumeProductivityKPIs
    quality_selection: QualitySelectionKPIs
    time_process: TimeProcessKPIs
    engagement_conversion: EngagementSatisfactionKPIs
    source_channel: SourceChannelKPIs
    onboarding: OnboardingKPIs


# ==================== FONCTIONS HELPER ====================

def apply_filters(statement, filters: KPIFilters, model):
    """Applique les filtres à une requête"""
    if filters.recruiter_id:
        if hasattr(model, 'created_by'):
            statement = statement.where(model.created_by == filters.recruiter_id)
    if filters.job_id:
        if hasattr(model, 'job_id'):
            statement = statement.where(model.job_id == filters.job_id)
    if filters.source:
        if hasattr(model, 'source'):
            statement = statement.where(model.source == filters.source)
    if filters.status:
        if hasattr(model, 'status'):
            statement = statement.where(model.status == filters.status)
    if filters.start_date:
        if hasattr(model, 'created_at'):
            statement = statement.where(model.created_at >= filters.start_date)
    if filters.end_date:
        if hasattr(model, 'created_at'):
            statement = statement.where(model.created_at <= filters.end_date)
    return statement


def calculate_time_to_hire(session: Session, filters: KPIFilters) -> Optional[float]:
    """Time to Hire: Date embauche - Date recueil besoin"""
    statement = select(
        func.avg(
            func.extract('epoch', Application.onboarding_completed_at - Job.created_at) / 86400
        )
    ).select_from(Application).join(Job, Application.job_id == Job.id).where(
        Application.onboarding_completed == True,
        Application.onboarding_completed_at.isnot(None),
        Job.created_at.isnot(None)
    )
    
    if filters.recruiter_id:
        statement = statement.where(Job.created_by == filters.recruiter_id)
    if filters.job_id:
        statement = statement.where(Job.id == filters.job_id)
    
    result = session.exec(statement).one()
    return float(result) if result else None


def calculate_time_to_fill(session: Session, filters: KPIFilters) -> Optional[float]:
    """Time to Fill: Date acceptation offre - Date ouverture poste"""
    statement = select(
        func.avg(
            func.extract('epoch', Application.offer_accepted_at - Job.validated_at) / 86400
        )
    ).select_from(Application).join(Job, Application.job_id == Job.id).where(
        Application.offer_accepted == True,
        Application.offer_accepted_at.isnot(None),
        Job.validated_at.isnot(None)
    )
    
    if filters.recruiter_id:
        statement = statement.where(Job.created_by == filters.recruiter_id)
    if filters.job_id:
        statement = statement.where(Job.id == filters.job_id)
    
    result = session.exec(statement).one()
    return float(result) if result else None


# ==================== ENDPOINTS KPI MANAGER ====================

@router.get("/manager", response_model=ManagerKPIs)
def get_manager_kpis(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    recruiter_id: Optional[UUID] = Query(None),
    job_id: Optional[UUID] = Query(None),
    source: Optional[str] = Query(None),
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_session)
):
    """
    Récupère tous les KPI Manager avec filtres
    
    Accès réservé aux Managers et Administrateurs
    """
    filters = KPIFilters(
        start_date=start_date,
        end_date=end_date,
        recruiter_id=recruiter_id,
        job_id=job_id,
        source=source
    )
    
    # Time to Hire
    time_to_hire = calculate_time_to_hire(session, filters)
    
    # Time to Fill
    time_to_fill = calculate_time_to_fill(session, filters)
    
    # Taux candidats qualifiés: (Nb qualifiés / Nb candidats sourcés) x100
    total_sourced = session.exec(
        select(func.count(Candidate.id)).where(Candidate.status == "sourcé")
    ).one()
    total_qualified = session.exec(
        select(func.count(Candidate.id)).where(Candidate.status == "qualifié")
    ).one()
    qualified_rate = (total_qualified / total_sourced * 100) if total_sourced > 0 else None
    
    # Taux acceptation offre: (Nb acceptations / Nb offres envoyées) x100
    total_offers_sent = session.exec(
        select(func.count(Application.id)).where(Application.offer_sent_at.isnot(None))
    ).one()
    total_offers_accepted = session.exec(
        select(func.count(Application.id)).where(Application.offer_accepted == True)
    ).one()
    offer_acceptance_rate = (total_offers_accepted / total_offers_sent * 100) if total_offers_sent > 0 else None
    
    # Taux refus offre
    total_offers_rejected = session.exec(
        select(func.count(Application.id)).where(Application.offer_accepted == False)
    ).one()
    offer_rejection_rate = (total_offers_rejected / total_offers_sent * 100) if total_offers_sent > 0 else None
    
    # % shortlist acceptée: (Nb shortlist validée / Nb shortlist envoyée) x100
    total_shortlists = session.exec(
        select(func.count(Application.id)).where(Application.is_in_shortlist == True)
    ).one()
    total_validated_shortlists = session.exec(
        select(func.count(Application.id)).where(
            Application.is_in_shortlist == True,
            Application.client_validated == True
        )
    ).one()
    shortlist_acceptance_rate = (total_validated_shortlists / total_shortlists * 100) if total_shortlists > 0 else None
    
    # Score moyen candidat
    avg_score = session.exec(
        select(func.avg(Interview.score)).where(Interview.score.isnot(None))
    ).one()
    average_candidate_score = float(avg_score) if avg_score else None
    
    # Nb candidats sourcés
    total_candidates_sourced = session.exec(select(func.count(Candidate.id))).one()
    
    # Nb entretiens réalisés
    total_interviews = session.exec(select(func.count(Interview.id))).one()
    
    # Nb recrutements clos vs ouverts
    closed_jobs = session.exec(
        select(func.count(Job.id)).where(Job.status == "clôturé")
    ).one()
    open_jobs = session.exec(
        select(func.count(Job.id)).where(Job.status != "clôturé")
    ).one()
    closed_vs_open = (closed_jobs / open_jobs) if open_jobs > 0 else None
    
    # Taux réussite onboarding: (Nb onboardings complets / Nb embauches) x100
    total_hired = session.exec(
        select(func.count(Application.id)).where(Application.status == "embauché")
    ).one()
    total_onboarded = session.exec(
        select(func.count(Application.id)).where(Application.onboarding_completed == True)
    ).one()
    onboarding_success_rate = (total_onboarded / total_hired * 100) if total_hired > 0 else None
    
    return {
        "time_process": {
            "time_to_hire": time_to_hire,
            "time_to_fill": time_to_fill,
            "average_cycle_per_stage": None,  # Nécessite ApplicationHistory pour calculer
            "average_feedback_delay": None,  # Nécessite ApplicationHistory
            "percentage_jobs_on_time": None  # Nécessite un délai cible configuré
        },
        "quality_selection": {
            "qualified_candidates_rate": qualified_rate,
            "rejection_rate_per_stage": None,  # Nécessite ApplicationHistory
            "shortlist_acceptance_rate": shortlist_acceptance_rate,
            "average_candidate_score": average_candidate_score,
            "no_show_rate": None,  # Nécessite un champ dans Interview
            "turnover_rate_post_onboarding": None  # Nécessite un suivi post-embauche
        },
        "volume_productivity": {
            "total_candidates_sourced": total_candidates_sourced,
            "total_cvs_processed": total_candidates_sourced,  # Approximation
            "closed_vs_open_recruitments": closed_vs_open,
            "total_interviews_conducted": total_interviews
        },
        "cost_budget": {
            "average_recruitment_cost": None,  # Nécessite un champ coût
            "cost_per_source": None,  # Nécessite un champ coût
            "budget_spent_vs_planned": None  # Nécessite budget prévu vs dépensé
        },
        "engagement_satisfaction": {
            "offer_acceptance_rate": offer_acceptance_rate,
            "offer_rejection_rate": offer_rejection_rate,
            "candidate_response_rate": None  # Nécessite un suivi des messages
        },
        "recruiter_performance": {
            "jobs_managed": open_jobs,
            "success_rate": None,  # (Nb embauches / Nb shortlist) x100
            "average_time_per_stage": None,  # Nécessite ApplicationHistory
            "feedbacks_on_time_rate": None  # Nécessite un délai cible
        },
        "source_channel": {
            "performance_per_source": None,  # Nécessite groupement par source
            "conversion_rate_per_source": None,  # Nécessite groupement par source
            "average_sourcing_time": None  # Nécessite ApplicationHistory
        },
        "onboarding": {
            "onboarding_success_rate": onboarding_success_rate,
            "average_onboarding_delay": None,  # Date prise poste - Date début onboarding
            "post_integration_issues_count": 0  # Nécessite un suivi des incidents
        }
    }


@router.get("/recruiter", response_model=RecruiterKPIs)
def get_recruiter_kpis(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    job_id: Optional[UUID] = Query(None),
    source: Optional[str] = Query(None),
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Récupère tous les KPI Recruteur avec filtres
    
    Accès réservé aux Recruteurs, Managers et Administrateurs
    """
    filters = KPIFilters(
        start_date=start_date,
        end_date=end_date,
        recruiter_id=current_user.id,  # Le recruteur voit ses propres KPI
        job_id=job_id,
        source=source
    )
    
    # Nombre de postes gérés
    jobs_managed = session.exec(
        select(func.count(Job.id)).where(
            Job.created_by == current_user.id,
            Job.status != "clôturé"
        )
    ).one()
    
    # Nombre de candidats sourcés
    candidates_sourced = session.exec(
        select(func.count(Candidate.id)).where(Candidate.created_by == current_user.id)
    ).one()
    
    # Nombre d'entretiens planifiés et réalisés
    interviews_count = session.exec(
        select(func.count(Interview.id)).where(Interview.created_by == current_user.id)
    ).one()
    
    # Taux candidats qualifiés
    total_sourced = session.exec(
        select(func.count(Candidate.id)).where(
            Candidate.created_by == current_user.id,
            Candidate.status == "sourcé"
        )
    ).one()
    total_qualified = session.exec(
        select(func.count(Candidate.id)).where(
            Candidate.created_by == current_user.id,
            Candidate.status == "qualifié"
        )
    ).one()
    qualified_rate = (total_qualified / total_sourced * 100) if total_sourced > 0 else None
    
    # Taux shortlist acceptée
    total_shortlists = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == current_user.id,
            Application.is_in_shortlist == True
        )
    ).one()
    total_validated = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == current_user.id,
            Application.is_in_shortlist == True,
            Application.client_validated == True
        )
    ).one()
    shortlist_acceptance_rate = (total_validated / total_shortlists * 100) if total_shortlists > 0 else None
    
    # Score moyen candidat
    avg_score = session.exec(
        select(func.avg(Interview.score)).where(
            Interview.created_by == current_user.id,
            Interview.score.isnot(None)
        )
    ).one()
    average_candidate_score = float(avg_score) if avg_score else None
    
    # Time to Hire moyen
    time_to_hire = calculate_time_to_hire(session, filters)
    
    # Taux acceptation offre
    total_offers_sent = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == current_user.id,
            Application.offer_sent_at.isnot(None)
        )
    ).one()
    total_offers_accepted = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == current_user.id,
            Application.offer_accepted == True
        )
    ).one()
    offer_acceptance_rate = (total_offers_accepted / total_offers_sent * 100) if total_offers_sent > 0 else None
    
    # Taux refus offre
    total_offers_rejected = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == current_user.id,
            Application.offer_accepted == False
        )
    ).one()
    offer_rejection_rate = (total_offers_rejected / total_offers_sent * 100) if total_offers_sent > 0 else None
    
    # Taux réussite onboarding
    total_hired = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == current_user.id,
            Application.status == "embauché"
        )
    ).one()
    total_onboarded = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == current_user.id,
            Application.onboarding_completed == True
        )
    ).one()
    onboarding_success_rate = (total_onboarded / total_hired * 100) if total_hired > 0 else None
    
    return {
        "volume_productivity": {
            "total_candidates_sourced": candidates_sourced,
            "total_cvs_processed": candidates_sourced,
            "closed_vs_open_recruitments": None,
            "total_interviews_conducted": interviews_count
        },
        "quality_selection": {
            "qualified_candidates_rate": qualified_rate,
            "rejection_rate_per_stage": None,
            "shortlist_acceptance_rate": shortlist_acceptance_rate,
            "average_candidate_score": average_candidate_score,
            "no_show_rate": None,
            "turnover_rate_post_onboarding": None
        },
        "time_process": {
            "time_to_hire": time_to_hire,
            "time_to_fill": None,
            "average_cycle_per_stage": None,
            "average_feedback_delay": None,
            "percentage_jobs_on_time": None
        },
        "engagement_conversion": {
            "offer_acceptance_rate": offer_acceptance_rate,
            "offer_rejection_rate": offer_rejection_rate,
            "candidate_response_rate": None
        },
        "source_channel": {
            "performance_per_source": None,
            "conversion_rate_per_source": None,
            "average_sourcing_time": None
        },
        "onboarding": {
            "onboarding_success_rate": onboarding_success_rate,
            "average_onboarding_delay": None,
            "post_integration_issues_count": 0
        }
    }


# ==================== ENDPOINTS EXISTANTS (COMPATIBILITÉ) ====================

class RecruiterPerformance(BaseModel):
    """Performance d'un recruteur"""
    recruiter_id: str
    recruiter_name: str
    total_candidates: int
    total_jobs: int
    candidates_in_shortlist: int
    candidates_hired: int


class KPISummary(BaseModel):
    """Résumé des KPI"""
    total_candidates: int
    total_jobs: int
    active_jobs: int
    candidates_in_shortlist: int
    candidates_hired: int
    average_time_to_hire: float  # En jours


@router.get("/summary", response_model=KPISummary)
def get_kpi_summary(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupère un résumé des KPI globaux (endpoint de compatibilité)
    
    Accès autorisé aux Recruteurs (lecture), Managers et Administrateurs
    """
    filters = KPIFilters()
    
    # Total candidats
    total_candidates = session.exec(select(func.count(Candidate.id))).one()
    
    # Total jobs
    total_jobs = session.exec(select(func.count(Job.id))).one()
    
    # Jobs actifs (non clôturés)
    active_jobs = session.exec(
        select(func.count(Job.id)).where(Job.status != "clôturé")
    ).one()
    
    # Candidats en shortlist
    candidates_in_shortlist = session.exec(
        select(func.count(Candidate.id)).where(Candidate.status == "shortlist")
    ).one()
    
    # Candidats embauchés
    candidates_hired = session.exec(
        select(func.count(Candidate.id)).where(Candidate.status == "embauché")
    ).one()
    
    # Time to Hire moyen
    average_time_to_hire = calculate_time_to_hire(session, filters) or 0.0
    
    return {
        "total_candidates": total_candidates,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "candidates_in_shortlist": candidates_in_shortlist,
        "candidates_hired": candidates_hired,
        "average_time_to_hire": average_time_to_hire
    }


@router.get("/recruiters", response_model=List[RecruiterPerformance])
def get_recruiters_performance(
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_session)
):
    """
    Récupère les performances de tous les recruteurs
    
    Accès réservé aux Managers et Administrateurs
    """
    # Trouver tous les recruteurs
    recruiters_statement = select(User).where(User.role == UserRole.RECRUTEUR.value)
    recruiters = session.exec(recruiters_statement).all()
    
    performances = []
    for recruiter in recruiters:
        # Candidats créés par ce recruteur
        total_candidates = session.exec(
            select(func.count(Candidate.id)).where(Candidate.created_by == recruiter.id)
        ).one()
        
        # Jobs créés par ce recruteur
        total_jobs = session.exec(
            select(func.count(Job.id)).where(Job.created_by == recruiter.id)
        ).one()
        
        # Candidats en shortlist créés par ce recruteur
        candidates_in_shortlist = session.exec(
            select(func.count(Candidate.id))
            .where(Candidate.created_by == recruiter.id)
            .where(Candidate.status == "shortlist")
        ).one()
        
        # Candidats embauchés créés par ce recruteur
        candidates_hired = session.exec(
            select(func.count(Candidate.id))
            .where(Candidate.created_by == recruiter.id)
            .where(Candidate.status == "embauché")
        ).one()
        
        performances.append({
            "recruiter_id": str(recruiter.id),
            "recruiter_name": f"{recruiter.first_name} {recruiter.last_name}",
            "total_candidates": total_candidates,
            "total_jobs": total_jobs,
            "candidates_in_shortlist": candidates_in_shortlist,
            "candidates_hired": candidates_hired
        })
    
    return performances
