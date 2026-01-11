"""
Routes pour les KPI et statistiques (réservées aux Managers et Recruteurs)
Implémente toutes les formules mathématiques du specs.md
"""
import os
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func, and_, or_
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from sqlalchemy import case, cast, Date

from database import get_session
from models import User, UserRole, Candidate, Job, Application, Interview, ApplicationHistory
from auth import get_current_active_user, require_manager, require_recruteur, require_client

# Import pour Google Gemini
try:
    import google.generativeai as genai
except ImportError:
    genai = None

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


class SourcingStatistics(BaseModel):
    """Statistiques de sourcing par période"""
    per_day: float  # Moyenne par jour
    per_month: float  # Moyenne par mois
    per_year: float  # Moyenne par an
    today_count: int  # Nombre aujourd'hui
    this_month_count: int  # Nombre ce mois
    this_year_count: int  # Nombre cette année


class CandidateStatusStatistics(BaseModel):
    """Statistiques par statut de candidat"""
    status: str  # Statut du candidat
    count: int  # Nombre de candidats avec ce statut
    percentage: float  # Pourcentage par rapport au total


class JobStatusStatistics(BaseModel):
    """Statistiques par statut de besoin"""
    status: str  # Statut du besoin
    count: int  # Nombre de besoins avec ce statut
    percentage: float  # Pourcentage par rapport au total


class RecruiterPerformanceStatistics(BaseModel):
    """Statistiques de performance par recruteur"""
    recruiter_id: UUID
    recruiter_name: str
    total_candidates_sourced: int
    candidates_by_status: List[CandidateStatusStatistics]  # Répartition par statut
    total_jobs_managed: int
    jobs_by_status: List[JobStatusStatistics]  # Répartition par statut de besoin
    sourcing_statistics: SourcingStatistics  # Statistiques de sourcing pour ce recruteur


class VolumeProductivityKPIs(BaseModel):
    """KPI Volume & Productivité"""
    total_candidates_sourced: int
    total_cvs_processed: int
    closed_vs_open_recruitments: Optional[float]
    total_interviews_conducted: int
    sourcing_statistics: Optional[SourcingStatistics] = None  # Statistiques par période


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


class DetailedStatistics(BaseModel):
    """Statistiques détaillées par étape et statut"""
    candidates_by_status: List[CandidateStatusStatistics]  # Répartition par statut de candidat
    jobs_by_status: List[JobStatusStatistics]  # Répartition par statut de besoin
    recruiters_performance: List[RecruiterPerformanceStatistics]  # Performance par recruteur


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
    detailed_statistics: Optional[DetailedStatistics] = None  # Statistiques détaillées


class RecruiterKPIs(BaseModel):
    """Tous les KPI Recruteur"""
    volume_productivity: VolumeProductivityKPIs
    quality_selection: QualitySelectionKPIs
    time_process: TimeProcessKPIs
    engagement_conversion: EngagementSatisfactionKPIs
    source_channel: SourceChannelKPIs
    onboarding: OnboardingKPIs
    detailed_statistics: Optional[DetailedStatistics] = None  # Statistiques détaillées


class ClientKPIs(BaseModel):
    """Tous les KPI Client"""
    total_jobs_created: int  # Nombre total de besoins créés
    jobs_by_status: List[JobStatusStatistics]  # Répartition par statut
    total_candidates_in_shortlist: int  # Candidats en shortlist
    total_candidates_validated: int  # Candidats validés
    total_candidates_rejected: int  # Candidats rejetés
    validation_rate: Optional[float]  # Taux de validation (validés / total shortlist)
    total_interviews_scheduled: int  # Entretiens planifiés
    average_time_to_hire: Optional[float]  # Temps moyen de recrutement (jours)
    average_time_to_fill: Optional[float]  # Temps moyen de pourvoir un poste (jours)
    jobs_on_time_rate: Optional[float]  # % de postes respectant le délai
    sourcing_statistics: Optional[SourcingStatistics] = None  # Statistiques de sourcing pour leurs besoins


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
    # Utiliser le statut "embauché" et updated_at comme date d'embauche
    statement = select(
        func.avg(
            func.extract('epoch', Application.updated_at - Job.created_at) / 86400
        )
    ).select_from(Application).join(Job, Application.job_id == Job.id).where(
        Application.status == "embauché",
        Application.updated_at.isnot(None),
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
    # Utiliser offer_sent_at et updated_at comme approximation, ou le statut "offre"
    statement = select(
        func.avg(
            func.extract('epoch', Application.updated_at - Job.validated_at) / 86400
        )
    ).select_from(Application).join(Job, Application.job_id == Job.id).where(
        Application.status == "offre",
        Application.updated_at.isnot(None),
        Job.validated_at.isnot(None)
    )
    
    if filters.recruiter_id:
        statement = statement.where(Job.created_by == filters.recruiter_id)
    if filters.job_id:
        statement = statement.where(Job.id == filters.job_id)
    
    result = session.exec(statement).one()
    return float(result) if result else None


def calculate_average_cycle_per_stage(session: Session, filters: KPIFilters) -> Optional[float]:
    """Cycle moyen par étape: Durée moyenne passée par les candidats à chaque étape"""
    # Calculer manuellement la moyenne des durées entre changements de statut
    all_history = session.exec(
        select(ApplicationHistory)
        .order_by(ApplicationHistory.application_id, ApplicationHistory.created_at)
    ).all()
    
    if not all_history:
        return None
    
    # Grouper par application et calculer les durées
    durations = []
    current_app = None
    prev_date = None
    
    for hist in all_history:
        if current_app != hist.application_id:
            current_app = hist.application_id
            prev_date = hist.created_at
        else:
            if prev_date:
                duration = (hist.created_at - prev_date).total_seconds() / 86400
                if duration > 0:
                    durations.append(duration)
            prev_date = hist.created_at
    
    return sum(durations) / len(durations) if durations else None


def calculate_average_feedback_delay(session: Session, filters: KPIFilters) -> Optional[float]:
    """Délai moyen feedback: Temps moyen de retour du manager/client après sollicitation"""
    # Utiliser Interview.feedback_provided_at - Interview.scheduled_at
    statement = select(
        func.avg(
            func.extract('epoch', Interview.feedback_provided_at - Interview.scheduled_at) / 86400
        )
    ).where(
        Interview.feedback_provided_at.isnot(None),
        Interview.scheduled_at.isnot(None)
    )
    
    if filters.recruiter_id:
        statement = statement.where(Interview.created_by == filters.recruiter_id)
    
    result = session.exec(statement).one()
    return float(result) if result else None


def calculate_percentage_jobs_on_time(session: Session, filters: KPIFilters) -> Optional[float]:
    """% de postes respectant le délai: Pourcentage de postes clôturés dans le délai cible"""
    # Pour simplifier, on considère un délai cible de 60 jours (configurable)
    TARGET_DAYS = 60
    
    statement = select(Job).where(
        Job.status == "clôturé",
        Job.closed_at.isnot(None),
        Job.validated_at.isnot(None)
    )
    
    if filters.recruiter_id:
        statement = statement.where(Job.created_by == filters.recruiter_id)
    if filters.job_id:
        statement = statement.where(Job.id == filters.job_id)
    
    jobs = session.exec(statement).all()
    
    if not jobs:
        return None
    
    on_time = 0
    for job in jobs:
        if job.closed_at and job.validated_at:
            duration = (job.closed_at - job.validated_at).total_seconds() / 86400
            if duration <= TARGET_DAYS:
                on_time += 1
    
    return (on_time / len(jobs) * 100) if jobs else None


def calculate_rejection_rate_per_stage(session: Session, filters: KPIFilters) -> Optional[float]:
    """Taux de rejet par étape: Pourcentage de candidats rejetés à chaque étape"""
    # Compter les candidats rejetés vs total candidats
    total_applications = session.exec(
        select(func.count(Application.id))
    ).one()
    
    rejected_applications = session.exec(
        select(func.count(Application.id)).where(Application.status == "rejeté")
    ).one()
    
    return (rejected_applications / total_applications * 100) if total_applications > 0 else None


def calculate_no_show_rate(session: Session, filters: KPIFilters) -> Optional[float]:
    """Taux de no-show entretien: Pourcentage de candidats absents aux entretiens"""
    # Approximation: entretiens sans feedback = no-show potentiel
    total_interviews = session.exec(
        select(func.count(Interview.id)).where(Interview.scheduled_at.isnot(None))
    ).one()
    
    interviews_with_feedback = session.exec(
        select(func.count(Interview.id)).where(
            Interview.feedback.isnot(None),
            Interview.feedback_provided_at.isnot(None)
        )
    ).one()
    
    # Approximation: si un entretien est passé et n'a pas de feedback, c'est peut-être un no-show
    # On considère les entretiens planifiés dans le passé sans feedback comme no-show
    from datetime import datetime
    now = datetime.utcnow()
    no_show_interviews = session.exec(
        select(func.count(Interview.id)).where(
            Interview.scheduled_at < now,
            Interview.feedback.is_(None)
        )
    ).one()
    
    return (no_show_interviews / total_interviews * 100) if total_interviews > 0 else None


def calculate_turnover_rate(session: Session, filters: KPIFilters) -> Optional[float]:
    """Taux de turnover post-onboarding: Pourcentage de candidats quittant le poste"""
    # Approximation: candidats embauchés qui sont ensuite rejetés ou dont le statut change
    # Pour l'instant, on retourne None car cela nécessite un suivi post-embauche
    return None


def calculate_average_recruitment_cost(session: Session, filters: KPIFilters) -> Optional[float]:
    """Coût moyen par recrutement"""
    # Utiliser Job.budget comme approximation
    statement = select(func.avg(Job.budget)).where(Job.budget.isnot(None))
    
    if filters.recruiter_id:
        statement = statement.where(Job.created_by == filters.recruiter_id)
    if filters.job_id:
        statement = statement.where(Job.id == filters.job_id)
    
    result = session.exec(statement).one()
    return float(result) if result else None


def calculate_cost_per_source(session: Session, filters: KPIFilters) -> Optional[float]:
    """Coût par source"""
    # Approximation basée sur le budget des jobs liés aux candidats d'une source
    if not filters.source:
        return None
    
    # Trouver les candidats de cette source
    candidates = session.exec(
        select(Candidate.id).where(Candidate.source == filters.source)
    ).all()
    
    if not candidates:
        return None
    
    # Trouver les applications de ces candidats
    applications = session.exec(
        select(Application.job_id).where(Application.candidate_id.in_(candidates))
    ).all()
    
    if not applications:
        return None
    
    # Calculer le budget moyen des jobs
    avg_budget = session.exec(
        select(func.avg(Job.budget)).where(
            Job.id.in_(applications),
            Job.budget.isnot(None)
        )
    ).one()
    
    return float(avg_budget) if avg_budget else None


def calculate_budget_spent_vs_planned(session: Session, filters: KPIFilters) -> Optional[float]:
    """Budget dépensé vs prévu"""
    # Somme des budgets des jobs clôturés vs total budget
    total_budget = session.exec(
        select(func.sum(Job.budget)).where(Job.budget.isnot(None))
    ).one() or 0
    
    spent_budget = session.exec(
        select(func.sum(Job.budget)).where(
            Job.status == "clôturé",
            Job.budget.isnot(None)
        )
    ).one() or 0
    
    return (spent_budget / total_budget * 100) if total_budget > 0 else None


def calculate_candidate_response_rate(session: Session, filters: KPIFilters) -> Optional[float]:
    """Taux de réponse candidat: Pourcentage de réponses aux messages envoyés"""
    # Approximation: offres envoyées avec réponse (acceptée ou refusée) vs total offres
    total_offers = session.exec(
        select(func.count(Application.id)).where(Application.offer_sent_at.isnot(None))
    ).one()
    
    # Utiliser le statut "offre" ou "embauché" comme indicateur de réponse
    responded_offers = session.exec(
        select(func.count(Application.id)).where(
            Application.offer_sent_at.isnot(None),
            Application.status.in_(["offre", "embauché"])
        )
    ).one()
    
    return (responded_offers / total_offers * 100) if total_offers > 0 else None


def calculate_recruiter_success_rate(session: Session, recruiter_id: UUID) -> Optional[float]:
    """Taux de réussite recruteur: (Nb embauches / Nb shortlists) x100"""
    total_shortlists = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == recruiter_id,
            Application.is_in_shortlist == True
        )
    ).one()
    
    total_hired = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == recruiter_id,
            Application.status == "embauché"
        )
    ).one()
    
    return (total_hired / total_shortlists * 100) if total_shortlists > 0 else None


def calculate_feedbacks_on_time_rate(session: Session, filters: KPIFilters) -> Optional[float]:
    """Feedbacks fournis à temps: Pourcentage de feedbacks transmis dans les délais"""
    # Délai cible: 2 jours après l'entretien
    TARGET_DAYS = 2
    
    total_feedbacks = session.exec(
        select(func.count(Interview.id)).where(
            Interview.feedback_provided_at.isnot(None),
            Interview.scheduled_at.isnot(None)
        )
    ).one()
    
    if total_feedbacks == 0:
        return None
    
    on_time_count = 0
    interviews = session.exec(
        select(Interview).where(
            Interview.feedback_provided_at.isnot(None),
            Interview.scheduled_at.isnot(None)
        )
    ).all()
    
    for interview in interviews:
        delay = (interview.feedback_provided_at - interview.scheduled_at).total_seconds() / 86400
        if delay <= TARGET_DAYS:
            on_time_count += 1
    
    return (on_time_count / total_feedbacks * 100) if total_feedbacks > 0 else None


def calculate_performance_per_source(session: Session, filters: KPIFilters) -> Optional[float]:
    """Performance par source: Pourcentage d'embauches générées par chaque source"""
    if not filters.source:
        return None
    
    # Candidats de cette source
    candidates = session.exec(
        select(Candidate.id).where(Candidate.source == filters.source)
    ).all()
    
    if not candidates:
        return None
    
    # Applications de ces candidats
    applications = session.exec(
        select(Application.id).where(Application.candidate_id.in_(candidates))
    ).all()
    
    if not applications:
        return None
    
    # Embauchés parmi ces applications
    hired = session.exec(
        select(func.count(Application.id)).where(
            Application.id.in_(applications),
            Application.status == "embauché"
        )
    ).one()
    
    return (hired / len(applications) * 100) if applications else None


def calculate_conversion_rate_per_source(session: Session, filters: KPIFilters) -> Optional[float]:
    """Taux de conversion par source: Conversion candidats sourcés vers embauche"""
    if not filters.source:
        return None
    
    total_sourced = session.exec(
        select(func.count(Candidate.id)).where(Candidate.source == filters.source)
    ).one()
    
    if total_sourced == 0:
        return None
    
    # Candidats de cette source embauchés
    candidates = session.exec(
        select(Candidate.id).where(Candidate.source == filters.source)
    ).all()
    
    hired = session.exec(
        select(func.count(Application.id)).where(
            Application.candidate_id.in_(candidates),
            Application.status == "embauché"
        )
    ).one()
    
    return (hired / total_sourced * 100) if total_sourced > 0 else None


def calculate_average_sourcing_time(session: Session, filters: KPIFilters) -> Optional[float]:
    """Temps moyen de sourcing: Durée moyenne de la phase de sourcing"""
    # Approximation: temps entre création du candidat et première application
    statement = select(
        func.avg(
            func.extract('epoch', Application.created_at - Candidate.created_at) / 86400
        )
    ).select_from(Application).join(Candidate, Application.candidate_id == Candidate.id)
    
    if filters.source:
        statement = statement.where(Candidate.source == filters.source)
    if filters.recruiter_id:
        statement = statement.where(Candidate.created_by == filters.recruiter_id)
    
    result = session.exec(statement).one()
    return float(result) if result else None


def calculate_average_onboarding_delay(session: Session, filters: KPIFilters) -> Optional[float]:
    """Délai moyen d'onboarding: Durée entre début onboarding et prise de poste"""
    # Utiliser updated_at - offer_sent_at comme approximation pour les candidats embauchés
    statement = select(
        func.avg(
            func.extract('epoch', Application.updated_at - Application.offer_sent_at) / 86400
        )
    ).where(
        Application.status == "embauché",
        Application.offer_sent_at.isnot(None),
        Application.updated_at.isnot(None)
    )
    
    if filters.recruiter_id:
        statement = statement.where(Application.created_by == filters.recruiter_id)
    if filters.job_id:
        statement = statement.where(Application.job_id == filters.job_id)
    
    result = session.exec(statement).one()
    return float(result) if result else None


def calculate_sourcing_statistics(session: Session, filters: KPIFilters) -> Optional[SourcingStatistics]:
    """Calcule les statistiques de sourcing par jour, mois et année"""
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    year_start = datetime(now.year, 1, 1)
    
    # Nombre aujourd'hui
    today_query = select(func.count(Candidate.id)).where(
        Candidate.status == "sourcé",
        Candidate.created_at >= today_start
    )
    if filters.recruiter_id:
        today_query = today_query.where(Candidate.created_by == filters.recruiter_id)
    if filters.source:
        today_query = today_query.where(Candidate.source == filters.source)
    today_count = session.exec(today_query).one()
    
    # Nombre ce mois
    this_month_query = select(func.count(Candidate.id)).where(
        Candidate.status == "sourcé",
        Candidate.created_at >= month_start
    )
    if filters.recruiter_id:
        this_month_query = this_month_query.where(Candidate.created_by == filters.recruiter_id)
    if filters.source:
        this_month_query = this_month_query.where(Candidate.source == filters.source)
    this_month_count = session.exec(this_month_query).one()
    
    # Nombre cette année
    this_year_query = select(func.count(Candidate.id)).where(
        Candidate.status == "sourcé",
        Candidate.created_at >= year_start
    )
    if filters.recruiter_id:
        this_year_query = this_year_query.where(Candidate.created_by == filters.recruiter_id)
    if filters.source:
        this_year_query = this_year_query.where(Candidate.source == filters.source)
    this_year_count = session.exec(this_year_query).one()
    
    # Calculer les moyennes
    # Pour la moyenne par jour : nombre total / nombre de jours depuis le début
    all_candidates_query = select(func.count(Candidate.id)).where(Candidate.status == "sourcé")
    if filters.recruiter_id:
        all_candidates_query = all_candidates_query.where(Candidate.created_by == filters.recruiter_id)
    if filters.source:
        all_candidates_query = all_candidates_query.where(Candidate.source == filters.source)
    
    if filters.start_date:
        all_candidates_query = all_candidates_query.where(Candidate.created_at >= filters.start_date)
    if filters.end_date:
        all_candidates_query = all_candidates_query.where(Candidate.created_at <= filters.end_date)
    
    total_candidates = session.exec(all_candidates_query).one()
    
    # Calculer le nombre de jours
    if filters.start_date:
        start_date = filters.start_date
    else:
        # Trouver la date du premier candidat sourcé
        first_candidate_query = select(func.min(Candidate.created_at)).where(Candidate.status == "sourcé")
        if filters.recruiter_id:
            first_candidate_query = first_candidate_query.where(Candidate.created_by == filters.recruiter_id)
        if filters.source:
            first_candidate_query = first_candidate_query.where(Candidate.source == filters.source)
        first_candidate_date = session.exec(first_candidate_query).one()
        start_date = first_candidate_date if first_candidate_date else now - timedelta(days=30)
    
    if filters.end_date:
        end_date = filters.end_date
    else:
        end_date = now
    
    days_diff = (end_date - start_date).days
    if days_diff <= 0:
        days_diff = 1
    
    # Moyennes
    per_day = total_candidates / days_diff if days_diff > 0 else 0
    per_month = per_day * 30  # Approximation : 30 jours par mois
    per_year = per_day * 365  # Approximation : 365 jours par an
    
    return SourcingStatistics(
        per_day=round(per_day, 2),
        per_month=round(per_month, 2),
        per_year=round(per_year, 2),
        today_count=today_count,
        this_month_count=this_month_count,
        this_year_count=this_year_count
    )


def calculate_candidates_by_status(session: Session, filters: KPIFilters) -> List[CandidateStatusStatistics]:
    """Calcule les statistiques par statut de candidat"""
    # Statuts possibles
    statuses = ['sourcé', 'qualifié', 'entretien_rh', 'entretien_client', 'shortlist', 'offre', 'rejeté', 'embauché']
    
    # Base query pour compter tous les candidats
    base_query = select(func.count(Candidate.id))
    if filters.recruiter_id:
        base_query = base_query.where(Candidate.created_by == filters.recruiter_id)
    if filters.source:
        base_query = base_query.where(Candidate.source == filters.source)
    if filters.start_date:
        base_query = base_query.where(Candidate.created_at >= filters.start_date)
    if filters.end_date:
        base_query = base_query.where(Candidate.created_at <= filters.end_date)
    
    total_candidates = session.exec(base_query).one()
    
    if total_candidates == 0:
        return []
    
    statistics = []
    for status in statuses:
        status_query = select(func.count(Candidate.id)).where(Candidate.status == status)
        if filters.recruiter_id:
            status_query = status_query.where(Candidate.created_by == filters.recruiter_id)
        if filters.source:
            status_query = status_query.where(Candidate.source == filters.source)
        if filters.start_date:
            status_query = status_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            status_query = status_query.where(Candidate.created_at <= filters.end_date)
        
        count = session.exec(status_query).one()
        percentage = (count / total_candidates * 100) if total_candidates > 0 else 0
        
        statistics.append(CandidateStatusStatistics(
            status=status,
            count=count,
            percentage=round(percentage, 2)
        ))
    
    return statistics


def calculate_jobs_by_status(session: Session, filters: KPIFilters) -> List[JobStatusStatistics]:
    """Calcule les statistiques par statut de besoin"""
    # Statuts possibles
    statuses = ['brouillon', 'a_valider', 'urgent', 'tres_urgent', 'besoin_courant', 'validé', 'en_cours', 'gagne', 'standby', 'archive', 'clôturé']
    
    # Base query pour compter tous les jobs
    base_query = select(func.count(Job.id))
    if filters.recruiter_id:
        base_query = base_query.where(Job.created_by == filters.recruiter_id)
    if filters.job_id:
        base_query = base_query.where(Job.id == filters.job_id)
    if filters.start_date:
        base_query = base_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        base_query = base_query.where(Job.created_at <= filters.end_date)
    
    total_jobs = session.exec(base_query).one()
    
    if total_jobs == 0:
        return []
    
    statistics = []
    for status in statuses:
        status_query = select(func.count(Job.id)).where(Job.status == status)
        if filters.recruiter_id:
            status_query = status_query.where(Job.created_by == filters.recruiter_id)
        if filters.job_id:
            status_query = status_query.where(Job.id == filters.job_id)
        if filters.start_date:
            status_query = status_query.where(Job.created_at >= filters.start_date)
        if filters.end_date:
            status_query = status_query.where(Job.created_at <= filters.end_date)
        
        count = session.exec(status_query).one()
        percentage = (count / total_jobs * 100) if total_jobs > 0 else 0
        
        statistics.append(JobStatusStatistics(
            status=status,
            count=count,
            percentage=round(percentage, 2)
        ))
    
    return statistics


def calculate_recruiters_performance_statistics(session: Session, filters: KPIFilters) -> List[RecruiterPerformanceStatistics]:
    """Calcule les statistiques de performance pour chaque recruteur"""
    # Trouver tous les recruteurs
    recruiters_statement = select(User).where(User.role == UserRole.RECRUTEUR.value)
    recruiters = session.exec(recruiters_statement).all()
    
    performances = []
    for recruiter in recruiters:
        # Créer un filtre spécifique pour ce recruteur
        recruiter_filters = KPIFilters(
            start_date=filters.start_date,
            end_date=filters.end_date,
            recruiter_id=recruiter.id,
            source=filters.source,
            job_id=filters.job_id
        )
        
        # Statistiques de candidats par statut pour ce recruteur
        candidates_by_status = calculate_candidates_by_status(session, recruiter_filters)
        
        # Statistiques de jobs par statut pour ce recruteur
        jobs_by_status = calculate_jobs_by_status(session, recruiter_filters)
        
        # Statistiques de sourcing pour ce recruteur
        sourcing_stats = calculate_sourcing_statistics(session, recruiter_filters)
        
        if not sourcing_stats:
            continue
        
        # Total candidats sourcés
        total_candidates_query = select(func.count(Candidate.id)).where(
            Candidate.created_by == recruiter.id,
            Candidate.status == "sourcé"
        )
        if filters.start_date:
            total_candidates_query = total_candidates_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            total_candidates_query = total_candidates_query.where(Candidate.created_at <= filters.end_date)
        total_candidates_sourced = session.exec(total_candidates_query).one()
        
        # Total jobs gérés
        total_jobs_query = select(func.count(Job.id)).where(Job.created_by == recruiter.id)
        if filters.start_date:
            total_jobs_query = total_jobs_query.where(Job.created_at >= filters.start_date)
        if filters.end_date:
            total_jobs_query = total_jobs_query.where(Job.created_at <= filters.end_date)
        total_jobs_managed = session.exec(total_jobs_query).one()
        
        performances.append(RecruiterPerformanceStatistics(
            recruiter_id=recruiter.id,
            recruiter_name=f"{recruiter.first_name} {recruiter.last_name}",
            total_candidates_sourced=total_candidates_sourced,
            candidates_by_status=candidates_by_status,
            total_jobs_managed=total_jobs_managed,
            jobs_by_status=jobs_by_status,
            sourcing_statistics=sourcing_stats
        ))
    
    return performances


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
    sourced_query = select(func.count(Candidate.id)).where(Candidate.status == "sourcé")
    qualified_query = select(func.count(Candidate.id)).where(Candidate.status == "qualifié")
    
    if filters.recruiter_id:
        sourced_query = sourced_query.where(Candidate.created_by == filters.recruiter_id)
        qualified_query = qualified_query.where(Candidate.created_by == filters.recruiter_id)
    if filters.source:
        sourced_query = sourced_query.where(Candidate.source == filters.source)
        qualified_query = qualified_query.where(Candidate.source == filters.source)
    if filters.start_date:
        sourced_query = sourced_query.where(Candidate.created_at >= filters.start_date)
        qualified_query = qualified_query.where(Candidate.created_at >= filters.start_date)
    if filters.end_date:
        sourced_query = sourced_query.where(Candidate.created_at <= filters.end_date)
        qualified_query = qualified_query.where(Candidate.created_at <= filters.end_date)
    
    total_sourced = session.exec(sourced_query).one()
    total_qualified = session.exec(qualified_query).one()
    qualified_rate = (total_qualified / total_sourced * 100) if total_sourced > 0 else 0.0
    
    # Taux acceptation offre: (Nb acceptations / Nb offres envoyées) x100
    # Utiliser le statut "embauché" comme indicateur d'acceptation
    total_offers_sent = session.exec(
        select(func.count(Application.id)).where(Application.offer_sent_at.isnot(None))
    ).one()
    total_offers_accepted = session.exec(
        select(func.count(Application.id)).where(
            Application.offer_sent_at.isnot(None),
            Application.status == "embauché"
        )
    ).one()
    offer_acceptance_rate = (total_offers_accepted / total_offers_sent * 100) if total_offers_sent > 0 else 0.0
    
    # Taux refus offre: utiliser le statut "rejeté" après envoi d'offre
    total_offers_rejected = session.exec(
        select(func.count(Application.id)).where(
            Application.offer_sent_at.isnot(None),
            Application.status == "rejeté"
        )
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
    shortlist_acceptance_rate = (total_validated_shortlists / total_shortlists * 100) if total_shortlists > 0 else 0.0
    
    # Score moyen candidat
    avg_score = session.exec(
        select(func.avg(Interview.score)).where(Interview.score.isnot(None))
    ).one()
    average_candidate_score = float(avg_score) if avg_score else 0.0
    
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
    closed_vs_open = (closed_jobs / open_jobs) if open_jobs > 0 else 0.0
    
    # Taux réussite onboarding: (Nb onboardings complets / Nb embauches) x100
    # Pour simplifier, on considère que tous les embauchés ont complété l'onboarding
    total_hired = session.exec(
        select(func.count(Application.id)).where(Application.status == "embauché")
    ).one()
    # Utiliser le même nombre car on n'a pas de champ onboarding_completed
    total_onboarded = total_hired
    onboarding_success_rate = 100.0 if total_hired > 0 else None
    
    # Calculer tous les KPIs supplémentaires
    avg_cycle_per_stage = calculate_average_cycle_per_stage(session, filters)
    avg_feedback_delay = calculate_average_feedback_delay(session, filters)
    pct_jobs_on_time = calculate_percentage_jobs_on_time(session, filters)
    rejection_rate = calculate_rejection_rate_per_stage(session, filters)
    no_show_rate = calculate_no_show_rate(session, filters)
    turnover_rate = calculate_turnover_rate(session, filters)
    avg_recruitment_cost = calculate_average_recruitment_cost(session, filters)
    cost_per_source = calculate_cost_per_source(session, filters)
    budget_spent_vs_planned = calculate_budget_spent_vs_planned(session, filters)
    candidate_response_rate = calculate_candidate_response_rate(session, filters)
    recruiter_success_rate = calculate_recruiter_success_rate(session, filters.recruiter_id) if filters.recruiter_id else None
    avg_time_per_stage = calculate_average_cycle_per_stage(session, filters)  # Même calcul
    feedbacks_on_time = calculate_feedbacks_on_time_rate(session, filters)
    performance_per_source = calculate_performance_per_source(session, filters)
    conversion_rate_per_source = calculate_conversion_rate_per_source(session, filters)
    avg_sourcing_time = calculate_average_sourcing_time(session, filters)
    avg_onboarding_delay = calculate_average_onboarding_delay(session, filters)
    
    # Calculer les statistiques de sourcing
    sourcing_stats = calculate_sourcing_statistics(session, filters)
    
    # Appliquer les filtres aux comptages de base
    candidate_query = select(func.count(Candidate.id))
    if filters.recruiter_id:
        candidate_query = candidate_query.where(Candidate.created_by == filters.recruiter_id)
    if filters.source:
        candidate_query = candidate_query.where(Candidate.source == filters.source)
    if filters.start_date:
        candidate_query = candidate_query.where(Candidate.created_at >= filters.start_date)
    if filters.end_date:
        candidate_query = candidate_query.where(Candidate.created_at <= filters.end_date)
    total_candidates_sourced = session.exec(candidate_query).one()
    
    interview_query = select(func.count(Interview.id))
    if filters.recruiter_id:
        interview_query = interview_query.where(Interview.created_by == filters.recruiter_id)
    if filters.start_date:
        interview_query = interview_query.where(Interview.created_at >= filters.start_date)
    if filters.end_date:
        interview_query = interview_query.where(Interview.created_at <= filters.end_date)
    total_interviews = session.exec(interview_query).one()
    
    # Construire detailed_statistics
    candidates_stats = calculate_candidates_by_status(session, filters)
    jobs_stats = calculate_jobs_by_status(session, filters)
    recruiters_perf = calculate_recruiters_performance_statistics(session, filters)
    
    detailed_stats = None
    if candidates_stats or jobs_stats or recruiters_perf:
        detailed_stats = DetailedStatistics(
            candidates_by_status=candidates_stats,
            jobs_by_status=jobs_stats,
            recruiters_performance=recruiters_perf
        )
    
    return ManagerKPIs(
        time_process=TimeProcessKPIs(
            time_to_hire=time_to_hire,
            time_to_fill=time_to_fill,
            average_cycle_per_stage=avg_cycle_per_stage,
            average_feedback_delay=avg_feedback_delay,
            percentage_jobs_on_time=pct_jobs_on_time
        ),
        quality_selection=QualitySelectionKPIs(
            qualified_candidates_rate=qualified_rate,
            rejection_rate_per_stage=rejection_rate,
            shortlist_acceptance_rate=shortlist_acceptance_rate,
            average_candidate_score=average_candidate_score,
            no_show_rate=no_show_rate,
            turnover_rate_post_onboarding=turnover_rate
        ),
        volume_productivity=VolumeProductivityKPIs(
            total_candidates_sourced=total_candidates_sourced,
            total_cvs_processed=total_candidates_sourced,
            closed_vs_open_recruitments=closed_vs_open,
            total_interviews_conducted=total_interviews,
            sourcing_statistics=sourcing_stats
        ),
        cost_budget=CostBudgetKPIs(
            average_recruitment_cost=avg_recruitment_cost,
            cost_per_source=cost_per_source,
            budget_spent_vs_planned=budget_spent_vs_planned
        ),
        engagement_satisfaction=EngagementSatisfactionKPIs(
            offer_acceptance_rate=offer_acceptance_rate,
            offer_rejection_rate=offer_rejection_rate,
            candidate_response_rate=candidate_response_rate
        ),
        recruiter_performance=RecruiterPerformanceKPIs(
            jobs_managed=open_jobs,
            success_rate=recruiter_success_rate,
            average_time_per_stage=avg_time_per_stage,
            feedbacks_on_time_rate=feedbacks_on_time
        ),
        source_channel=SourceChannelKPIs(
            performance_per_source=performance_per_source,
            conversion_rate_per_source=conversion_rate_per_source,
            average_sourcing_time=avg_sourcing_time
        ),
        onboarding=OnboardingKPIs(
            onboarding_success_rate=onboarding_success_rate,
            average_onboarding_delay=avg_onboarding_delay,
            post_integration_issues_count=0
        ),
        detailed_statistics=detailed_stats
    )


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
            Application.offer_sent_at.isnot(None),
            Application.status == "embauché"
        )
    ).one()
    offer_acceptance_rate = (total_offers_accepted / total_offers_sent * 100) if total_offers_sent > 0 else None
    
    # Taux refus offre
    total_offers_rejected = session.exec(
        select(func.count(Application.id)).where(
            Application.created_by == current_user.id,
            Application.offer_sent_at.isnot(None),
            Application.status == "rejeté"
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
    # Utiliser le même nombre car on n'a pas de champ onboarding_completed
    total_onboarded = total_hired
    onboarding_success_rate = 100.0 if total_hired > 0 else None
    
    # Calculer les statistiques de sourcing
    sourcing_stats = calculate_sourcing_statistics(session, filters)
    
    # Construire detailed_statistics
    candidates_stats = calculate_candidates_by_status(session, filters)
    jobs_stats = calculate_jobs_by_status(session, filters)
    recruiters_perf = calculate_recruiters_performance_statistics(session, filters)
    
    detailed_stats = None
    if candidates_stats or jobs_stats or recruiters_perf:
        detailed_stats = DetailedStatistics(
            candidates_by_status=candidates_stats,
            jobs_by_status=jobs_stats,
            recruiters_performance=recruiters_perf
        )
    
    return RecruiterKPIs(
        volume_productivity=VolumeProductivityKPIs(
            total_candidates_sourced=candidates_sourced,
            total_cvs_processed=candidates_sourced,
            closed_vs_open_recruitments=None,
            total_interviews_conducted=interviews_count,
            sourcing_statistics=sourcing_stats
        ),
        quality_selection=QualitySelectionKPIs(
            qualified_candidates_rate=qualified_rate,
            rejection_rate_per_stage=None,
            shortlist_acceptance_rate=shortlist_acceptance_rate,
            average_candidate_score=average_candidate_score,
            no_show_rate=None,
            turnover_rate_post_onboarding=None
        ),
        time_process=TimeProcessKPIs(
            time_to_hire=time_to_hire,
            time_to_fill=None,
            average_cycle_per_stage=None,
            average_feedback_delay=None,
            percentage_jobs_on_time=None
        ),
        engagement_conversion=EngagementSatisfactionKPIs(
            offer_acceptance_rate=offer_acceptance_rate,
            offer_rejection_rate=offer_rejection_rate,
            candidate_response_rate=None
        ),
        source_channel=SourceChannelKPIs(
            performance_per_source=None,
            conversion_rate_per_source=None,
            average_sourcing_time=None
        ),
        onboarding=OnboardingKPIs(
            onboarding_success_rate=onboarding_success_rate,
            average_onboarding_delay=None,
            post_integration_issues_count=0
        ),
        recruiter_performance=RecruiterPerformanceKPIs(
            jobs_managed=jobs_managed,
            success_rate=None,
            average_time_per_stage=None,
            feedbacks_on_time_rate=None
        ),
        detailed_statistics=detailed_stats
    )


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
    
    # Convertir explicitement en KPISummary pour éviter les problèmes de sérialisation
    return KPISummary(
        total_candidates=total_candidates,
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        candidates_in_shortlist=candidates_in_shortlist,
        candidates_hired=candidates_hired,
        average_time_to_hire=average_time_to_hire
    )


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


# ==================== ANALYSE IA DES KPIs ====================

class KPIInsight(BaseModel):
    """Insight généré par l'IA pour un KPI"""
    kpi_name: str
    current_value: Optional[float]
    trend: str  # 'improving', 'declining', 'stable'
    insight: str  # Analyse du KPI
    recommendation: str  # Recommandation d'action
    priority: str  # 'high', 'medium', 'low'


class KPIAnalysis(BaseModel):
    """Analyse IA complète des KPIs"""
    overall_summary: str  # Résumé global
    key_insights: List[KPIInsight]  # Insights par KPI
    top_recommendations: List[str]  # Top 3 recommandations
    predicted_trends: str  # Tendances prédites
    risk_alerts: List[str]  # Alertes de risques
    opportunities: List[str]  # Opportunités identifiées


def analyze_kpis_with_ai(kpis_data: dict, role: str = "manager") -> KPIAnalysis:
    """
    Analyse les KPIs avec l'IA pour générer des insights structurés
    """
    if genai is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="google-generativeai n'est pas installé. Installez-le avec: pip install google-generativeai"
        )
    
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")  # Compatibilité avec ancienne variable
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY n'est pas configurée dans les variables d'environnement"
        )
    
    # Configurer Gemini
    genai.configure(api_key=api_key)
    # Utiliser gemini-1.5-pro (modèle stable et disponible)
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    # Préparer les données KPIs pour l'analyse
    kpis_json = json.dumps(kpis_data, default=str, indent=2)
    
    prompt = f"""Tu es un expert en analyse de performance de recrutement. Analyse les KPIs suivants pour un {role} et génère une analyse structurée et actionnable.

KPIs à analyser:
{kpis_json}

Génère une analyse complète au format JSON strict (sans markdown, sans commentaires):
{{
  "overall_summary": "Résumé global de la performance en 2-3 phrases",
  "key_insights": [
    {{
      "kpi_name": "Nom du KPI (ex: Time to Hire)",
      "current_value": valeur actuelle ou null,
      "trend": "improving" | "declining" | "stable",
      "insight": "Analyse détaillée du KPI en 1-2 phrases",
      "recommendation": "Recommandation d'action concrète en 1 phrase",
      "priority": "high" | "medium" | "low"
    }}
  ],
  "top_recommendations": [
    "Recommandation 1 (la plus prioritaire)",
    "Recommandation 2",
    "Recommandation 3"
  ],
  "predicted_trends": "Prédiction des tendances futures en 2-3 phrases",
  "risk_alerts": [
    "Alerte de risque 1 si applicable",
    "Alerte de risque 2 si applicable"
  ],
  "opportunities": [
    "Opportunité d'amélioration 1",
    "Opportunité d'amélioration 2"
  ]
}}

Règles importantes:
- Analyse les KPIs en profondeur et identifie les points forts et faibles
- Fournis des recommandations actionnables et concrètes
- Identifie les tendances et patterns
- Priorise les insights par importance
- Sois factuel et basé sur les données
- Retourne UNIQUEMENT le JSON, sans texte avant ou après
- Si un KPI est null, indique-le dans l'insight mais ne le saute pas
"""
    
    try:
        # Construire le prompt complet pour Gemini
        full_prompt = f"""Tu es un expert en analyse de performance de recrutement. Tu retournes uniquement du JSON valide.

{prompt}"""
        
        # Configuration pour la génération
        generation_config = {
            "temperature": 0.3,
            "max_output_tokens": 3000,
        }
        
        response = model.generate_content(
            full_prompt,
            generation_config=generation_config
        )
        
        response_text = response.text.strip()
        
        # Nettoyer la réponse
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parser le JSON
        parsed_data = json.loads(response_text)
        
        # Valider et créer l'objet KPIAnalysis
        return KPIAnalysis(
            overall_summary=parsed_data.get("overall_summary", ""),
            key_insights=[
                KPIInsight(**insight) for insight in parsed_data.get("key_insights", [])
            ],
            top_recommendations=parsed_data.get("top_recommendations", []),
            predicted_trends=parsed_data.get("predicted_trends", ""),
            risk_alerts=parsed_data.get("risk_alerts", []),
            opportunities=parsed_data.get("opportunities", [])
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du parsing JSON de la réponse IA: {str(e)}. Réponse: {response_text[:200]}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'analyse IA des KPIs: {str(e)}"
        )


@router.get("/manager/ai-analysis", response_model=KPIAnalysis)
def get_manager_kpis_ai_analysis(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    recruiter_id: Optional[UUID] = Query(None),
    job_id: Optional[UUID] = Query(None),
    source: Optional[str] = Query(None),
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_session)
):
    """
    Récupère l'analyse IA des KPIs Manager
    
    Accès réservé aux Managers et Administrateurs
    """
    # Récupérer les KPIs
    filters = KPIFilters(
        start_date=start_date,
        end_date=end_date,
        recruiter_id=recruiter_id,
        job_id=job_id,
        source=source
    )
    
    # Appeler la fonction existante pour obtenir les KPIs
    kpis_dict = get_manager_kpis(
        start_date=start_date,
        end_date=end_date,
        recruiter_id=recruiter_id,
        job_id=job_id,
        source=source,
        current_user=current_user,
        session=session
    )
    
    # Analyser avec l'IA (kpis_dict est déjà un dictionnaire)
    return analyze_kpis_with_ai(kpis_dict, role="manager")


@router.get("/recruiter/ai-analysis", response_model=KPIAnalysis)
def get_recruiter_kpis_ai_analysis(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    job_id: Optional[UUID] = Query(None),
    source: Optional[str] = Query(None),
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Récupère l'analyse IA des KPIs Recruteur
    
    Accès réservé aux Recruteurs, Managers et Administrateurs
    """
    # Récupérer les KPIs
    filters = KPIFilters(
        start_date=start_date,
        end_date=end_date,
        recruiter_id=current_user.id,
        job_id=job_id,
        source=source
    )
    
    # Appeler la fonction existante pour obtenir les KPIs
    kpis_dict = get_recruiter_kpis(
        start_date=start_date,
        end_date=end_date,
        job_id=job_id,
        source=source,
        current_user=current_user,
        session=session
    )
    
    # Analyser avec l'IA (kpis_dict est déjà un dictionnaire)
    return analyze_kpis_with_ai(kpis_dict, role="recruteur")


# ==================== ENDPOINTS KPI CLIENT ====================

@router.get("/client", response_model=ClientKPIs)
def get_client_kpis(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    job_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require_client),
    session: Session = Depends(get_session)
):
    """
    Récupère tous les KPI Client
    
    Accès réservé aux Clients et Administrateurs
    Les KPIs sont calculés uniquement pour les besoins créés par le client
    """
    filters = KPIFilters(
        start_date=start_date,
        end_date=end_date,
        job_id=job_id,
        recruiter_id=None,
        source=None
    )
    
    # Nombre total de besoins créés par le client
    jobs_query = select(func.count(Job.id)).where(Job.created_by == current_user.id)
    if filters.start_date:
        jobs_query = jobs_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        jobs_query = jobs_query.where(Job.created_at <= filters.end_date)
    if filters.job_id:
        jobs_query = jobs_query.where(Job.id == filters.job_id)
    total_jobs_created = session.exec(jobs_query).one()
    
    # Statistiques par statut de besoin
    statuses = ['brouillon', 'a_valider', 'urgent', 'tres_urgent', 'besoin_courant', 'validé', 'en_cours', 'gagne', 'standby', 'archive', 'clôturé']
    client_jobs_by_status = []
    for status in statuses:
        status_query = select(func.count(Job.id)).where(
            Job.status == status,
            Job.created_by == current_user.id
        )
        if filters.start_date:
            status_query = status_query.where(Job.created_at >= filters.start_date)
        if filters.end_date:
            status_query = status_query.where(Job.created_at <= filters.end_date)
        if filters.job_id:
            status_query = status_query.where(Job.id == filters.job_id)
        
        count = session.exec(status_query).one()
        percentage = (count / total_jobs_created * 100) if total_jobs_created > 0 else 0
        
        client_jobs_by_status.append(JobStatusStatistics(
            status=status,
            count=count,
            percentage=round(percentage, 2)
        ))
    
    # Candidats en shortlist pour les besoins du client
    shortlist_query = select(func.count(Application.id)).join(
        Job, Application.job_id == Job.id
    ).where(
        Job.created_by == current_user.id,
        Application.is_in_shortlist == True
    )
    if filters.start_date:
        shortlist_query = shortlist_query.where(Application.created_at >= filters.start_date)
    if filters.end_date:
        shortlist_query = shortlist_query.where(Application.created_at <= filters.end_date)
    if filters.job_id:
        shortlist_query = shortlist_query.where(Application.job_id == filters.job_id)
    total_candidates_in_shortlist = session.exec(shortlist_query).one()
    
    # Candidats validés
    validated_query = select(func.count(Application.id)).join(
        Job, Application.job_id == Job.id
    ).where(
        Job.created_by == current_user.id,
        Application.is_in_shortlist == True,
        Application.client_validated == True
    )
    if filters.start_date:
        validated_query = validated_query.where(Application.created_at >= filters.start_date)
    if filters.end_date:
        validated_query = validated_query.where(Application.created_at <= filters.end_date)
    if filters.job_id:
        validated_query = validated_query.where(Application.job_id == filters.job_id)
    total_candidates_validated = session.exec(validated_query).one()
    
    # Candidats rejetés
    rejected_query = select(func.count(Application.id)).join(
        Job, Application.job_id == Job.id
    ).where(
        Job.created_by == current_user.id,
        Application.is_in_shortlist == True,
        Application.client_validated == False,
        Application.client_validated_at.isnot(None)
    )
    if filters.start_date:
        rejected_query = rejected_query.where(Application.created_at >= filters.start_date)
    if filters.end_date:
        rejected_query = rejected_query.where(Application.created_at <= filters.end_date)
    if filters.job_id:
        rejected_query = rejected_query.where(Application.job_id == filters.job_id)
    total_candidates_rejected = session.exec(rejected_query).one()
    
    # Taux de validation
    validation_rate = (total_candidates_validated / total_candidates_in_shortlist * 100) if total_candidates_in_shortlist > 0 else None
    
    # Entretiens planifiés pour les besoins du client
    interviews_query = select(func.count(Interview.id)).join(
        Application, Interview.application_id == Application.id
    ).join(
        Job, Application.job_id == Job.id
    ).where(
        Job.created_by == current_user.id
    )
    if filters.start_date:
        interviews_query = interviews_query.where(Interview.created_at >= filters.start_date)
    if filters.end_date:
        interviews_query = interviews_query.where(Interview.created_at <= filters.end_date)
    if filters.job_id:
        interviews_query = interviews_query.join(Application).where(Application.job_id == filters.job_id)
    total_interviews_scheduled = session.exec(interviews_query).one()
    
    # Temps moyen de recrutement (Time to Hire)
    time_to_hire_query = select(
        func.avg(
            func.extract('epoch', Application.updated_at - Job.created_at) / 86400
        )
    ).select_from(Application).join(Job, Application.job_id == Job.id).where(
        Job.created_by == current_user.id,
        Application.status == "embauché",
        Application.updated_at.isnot(None),
        Job.created_at.isnot(None)
    )
    if filters.start_date:
        time_to_hire_query = time_to_hire_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        time_to_hire_query = time_to_hire_query.where(Job.created_at <= filters.end_date)
    if filters.job_id:
        time_to_hire_query = time_to_hire_query.where(Job.id == filters.job_id)
    avg_time_to_hire = session.exec(time_to_hire_query).one()
    average_time_to_hire = float(avg_time_to_hire) if avg_time_to_hire else None
    
    # Temps moyen de pourvoir un poste (Time to Fill)
    time_to_fill_query = select(
        func.avg(
            func.extract('epoch', Application.updated_at - Job.validated_at) / 86400
        )
    ).select_from(Application).join(Job, Application.job_id == Job.id).where(
        Job.created_by == current_user.id,
        Application.status == "offre",
        Application.updated_at.isnot(None),
        Job.validated_at.isnot(None)
    )
    if filters.start_date:
        time_to_fill_query = time_to_fill_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        time_to_fill_query = time_to_fill_query.where(Job.created_at <= filters.end_date)
    if filters.job_id:
        time_to_fill_query = time_to_fill_query.where(Job.id == filters.job_id)
    avg_time_to_fill = session.exec(time_to_fill_query).one()
    average_time_to_fill = float(avg_time_to_fill) if avg_time_to_fill else None
    
    # % de postes respectant le délai
    TARGET_DAYS = 60
    closed_jobs_query = select(Job).where(
        Job.created_by == current_user.id,
        Job.status == "clôturé",
        Job.closed_at.isnot(None),
        Job.validated_at.isnot(None)
    )
    if filters.start_date:
        closed_jobs_query = closed_jobs_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        closed_jobs_query = closed_jobs_query.where(Job.created_at <= filters.end_date)
    if filters.job_id:
        closed_jobs_query = closed_jobs_query.where(Job.id == filters.job_id)
    closed_jobs = session.exec(closed_jobs_query).all()
    
    on_time_count = 0
    for job in closed_jobs:
        if job.closed_at and job.validated_at:
            duration = (job.closed_at - job.validated_at).total_seconds() / 86400
            if duration <= TARGET_DAYS:
                on_time_count += 1
    
    jobs_on_time_rate = (on_time_count / len(closed_jobs) * 100) if closed_jobs else None
    
    # Statistiques de sourcing pour les besoins du client
    sourcing_stats = None
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    year_start = datetime(now.year, 1, 1)
    
    # Récupérer les IDs des jobs du client
    client_jobs_ids_query = select(Job.id).where(Job.created_by == current_user.id)
    if filters.job_id:
        client_jobs_ids_query = client_jobs_ids_query.where(Job.id == filters.job_id)
    client_job_ids = session.exec(client_jobs_ids_query).all()
    
    if client_job_ids:
        # Candidats sourcés via les applications des jobs du client
        today_count_query = select(func.count(Application.id)).join(
            Candidate, Application.candidate_id == Candidate.id
        ).where(
            Application.job_id.in_(client_job_ids),
            Candidate.status == "sourcé",
            Candidate.created_at >= today_start
        )
        if filters.start_date:
            today_count_query = today_count_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            today_count_query = today_count_query.where(Candidate.created_at <= filters.end_date)
        today_count = session.exec(today_count_query).one()
        
        this_month_count_query = select(func.count(Application.id)).join(
            Candidate, Application.candidate_id == Candidate.id
        ).where(
            Application.job_id.in_(client_job_ids),
            Candidate.status == "sourcé",
            Candidate.created_at >= month_start
        )
        if filters.start_date:
            this_month_count_query = this_month_count_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            this_month_count_query = this_month_count_query.where(Candidate.created_at <= filters.end_date)
        this_month_count = session.exec(this_month_count_query).one()
        
        this_year_count_query = select(func.count(Application.id)).join(
            Candidate, Application.candidate_id == Candidate.id
        ).where(
            Application.job_id.in_(client_job_ids),
            Candidate.status == "sourcé",
            Candidate.created_at >= year_start
        )
        if filters.start_date:
            this_year_count_query = this_year_count_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            this_year_count_query = this_year_count_query.where(Candidate.created_at <= filters.end_date)
        this_year_count = session.exec(this_year_count_query).one()
        
        # Total candidats sourcés
        all_candidates_query = select(func.count(Application.id)).join(
            Candidate, Application.candidate_id == Candidate.id
        ).where(
            Application.job_id.in_(client_job_ids),
            Candidate.status == "sourcé"
        )
        if filters.start_date:
            all_candidates_query = all_candidates_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            all_candidates_query = all_candidates_query.where(Candidate.created_at <= filters.end_date)
        total_candidates = session.exec(all_candidates_query).one()
        
        # Calculer les moyennes
        if filters.start_date:
            start_date = filters.start_date
        else:
            first_candidate_query = select(func.min(Candidate.created_at)).join(
                Application, Candidate.id == Application.candidate_id
            ).where(
                Application.job_id.in_(client_job_ids),
                Candidate.status == "sourcé"
            )
            first_candidate_date = session.exec(first_candidate_query).one()
            start_date = first_candidate_date if first_candidate_date else now - timedelta(days=30)
        
        end_date = filters.end_date if filters.end_date else now
        days_diff = (end_date - start_date).days
        if days_diff <= 0:
            days_diff = 1
        
        per_day = total_candidates / days_diff if days_diff > 0 else 0
        per_month = per_day * 30
        per_year = per_day * 365
        
        sourcing_stats = SourcingStatistics(
            per_day=round(per_day, 2),
            per_month=round(per_month, 2),
            per_year=round(per_year, 2),
            today_count=today_count,
            this_month_count=this_month_count,
            this_year_count=this_year_count
        )
    
    return ClientKPIs(
        total_jobs_created=total_jobs_created,
        jobs_by_status=client_jobs_by_status,
        total_candidates_in_shortlist=total_candidates_in_shortlist,
        total_candidates_validated=total_candidates_validated,
        total_candidates_rejected=total_candidates_rejected,
        validation_rate=validation_rate,
        total_interviews_scheduled=total_interviews_scheduled,
        average_time_to_hire=average_time_to_hire,
        average_time_to_fill=average_time_to_fill,
        jobs_on_time_rate=jobs_on_time_rate,
        sourcing_statistics=sourcing_stats
    )

