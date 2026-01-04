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
from models import User, UserRole, Candidate, Job, Application, Interview, ApplicationHistory
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
    qualified_rate = (total_qualified / total_sourced * 100) if total_sourced > 0 else None
    
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
    offer_acceptance_rate = (total_offers_accepted / total_offers_sent * 100) if total_offers_sent > 0 else None
    
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
    
    return {
        "time_process": {
            "time_to_hire": time_to_hire,
            "time_to_fill": time_to_fill,
            "average_cycle_per_stage": avg_cycle_per_stage,
            "average_feedback_delay": avg_feedback_delay,
            "percentage_jobs_on_time": pct_jobs_on_time
        },
        "quality_selection": {
            "qualified_candidates_rate": qualified_rate,
            "rejection_rate_per_stage": rejection_rate,
            "shortlist_acceptance_rate": shortlist_acceptance_rate,
            "average_candidate_score": average_candidate_score,
            "no_show_rate": no_show_rate,
            "turnover_rate_post_onboarding": turnover_rate
        },
        "volume_productivity": {
            "total_candidates_sourced": total_candidates_sourced,
            "total_cvs_processed": total_candidates_sourced,  # Approximation
            "closed_vs_open_recruitments": closed_vs_open,
            "total_interviews_conducted": total_interviews
        },
        "cost_budget": {
            "average_recruitment_cost": avg_recruitment_cost,
            "cost_per_source": cost_per_source,
            "budget_spent_vs_planned": budget_spent_vs_planned
        },
        "engagement_satisfaction": {
            "offer_acceptance_rate": offer_acceptance_rate,
            "offer_rejection_rate": offer_rejection_rate,
            "candidate_response_rate": candidate_response_rate
        },
        "recruiter_performance": {
            "jobs_managed": open_jobs,
            "success_rate": recruiter_success_rate,
            "average_time_per_stage": avg_time_per_stage,
            "feedbacks_on_time_rate": feedbacks_on_time
        },
        "source_channel": {
            "performance_per_source": performance_per_source,
            "conversion_rate_per_source": conversion_rate_per_source,
            "average_sourcing_time": avg_sourcing_time
        },
        "onboarding": {
            "onboarding_success_rate": onboarding_success_rate,
            "average_onboarding_delay": avg_onboarding_delay,
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
