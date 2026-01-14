"""
Exemple de sécurisation d'endpoint avec vérification tenant
Ce fichier montre comment sécuriser correctement un endpoint pour le multi-tenant
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from uuid import UUID

from database_tenant import get_session
from models import Job, User
from auth import get_current_active_user
from tenant_manager import get_current_tenant_id, require_tenant_access

router = APIRouter(prefix="/example", tags=["example"])


# =============================================================================
# ❌ MAUVAIS EXEMPLE - NON SÉCURISÉ
# =============================================================================

@router.get("/jobs-unsafe")
def get_jobs_unsafe(session: Session = Depends(get_session)):
    """
    ❌ DANGEREUX: Retourne TOUS les jobs de TOUTES les entreprises
    """
    # ❌ Pas de vérification tenant
    jobs = session.exec(select(Job)).all()
    return jobs


# =============================================================================
# ✅ BON EXEMPLE 1 - Sécurisé avec middleware (recommandé)
# =============================================================================

@router.get("/jobs-safe")
def get_jobs_safe(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    ✅ SÉCURISÉ: Le middleware a déjà vérifié le tenant
    La session est automatiquement connectée à la bonne base de données
    """
    # ✅ La session est déjà isolée par le middleware tenant
    # Toutes les requêtes retournent uniquement les données du tenant actuel
    jobs = session.exec(select(Job)).all()
    return jobs


# =============================================================================
# ✅ BON EXEMPLE 2 - Sécurisé avec vérification explicite (si approche shared DB)
# =============================================================================

@router.get("/jobs-safe-explicit")
def get_jobs_safe_explicit(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    ✅ SÉCURISÉ: Vérification explicite du tenant
    Utile si vous utilisez l'approche "shared database" avec company_id
    """
    # ✅ Vérifier que l'utilisateur appartient au tenant actuel
    tenant_id = get_current_tenant_id()
    if current_user.company_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: user does not belong to current tenant"
        )
    
    # ✅ Filtrer explicitement par tenant (double sécurité)
    jobs = session.exec(
        select(Job).where(Job.company_id == tenant_id)
    ).all()
    
    return jobs


# =============================================================================
# ✅ BON EXEMPLE 3 - Accès à une ressource spécifique
# =============================================================================

@router.get("/jobs/{job_id}")
def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    ✅ SÉCURISÉ: Accès à une ressource spécifique
    """
    # Récupérer le job
    job = session.get(Job, job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # ✅ Vérification supplémentaire (si approche shared DB)
    # Avec l'approche "database per tenant", cette vérification est optionnelle
    # car le middleware garantit déjà l'isolation
    tenant_id = get_current_tenant_id()
    if hasattr(job, 'company_id') and job.company_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: job does not belong to current tenant"
        )
    
    return job


# =============================================================================
# ✅ BON EXEMPLE 4 - Création avec company_id automatique
# =============================================================================

@router.post("/jobs")
def create_job(
    job_data: dict,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    ✅ SÉCURISÉ: Création avec company_id automatique
    """
    tenant_id = get_current_tenant_id()
    
    # ✅ Créer le job avec le company_id du tenant actuel
    new_job = Job(
        **job_data,
        company_id=tenant_id,  # ✅ Assigner automatiquement
        created_by=current_user.id
    )
    
    session.add(new_job)
    session.commit()
    session.refresh(new_job)
    
    return new_job


# =============================================================================
# ✅ BON EXEMPLE 5 - Filtrage par utilisateur ET tenant
# =============================================================================

@router.get("/my-jobs")
def get_my_jobs(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    ✅ SÉCURISÉ: Filtrage par utilisateur ET tenant
    """
    tenant_id = get_current_tenant_id()
    
    # ✅ Filtrer par utilisateur ET tenant (double sécurité)
    jobs = session.exec(
        select(Job).where(
            Job.created_by == current_user.id,
            Job.company_id == tenant_id  # ✅ Vérification tenant explicite
        )
    ).all()
    
    return jobs


# =============================================================================
# ✅ BON EXEMPLE 6 - Vérification cross-tenant explicite
# =============================================================================

@router.get("/jobs/{job_id}/transfer")
def transfer_job_to_tenant(
    job_id: UUID,
    target_company_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    ✅ SÉCURISÉ: Opération nécessitant une vérification cross-tenant
    """
    # Récupérer le job
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # ✅ Vérifier que le job appartient au tenant actuel
    tenant_id = get_current_tenant_id()
    if job.company_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: job does not belong to current tenant"
        )
    
    # ✅ Vérifier que l'utilisateur a le droit de transférer
    # (ex: seulement les admins)
    if current_user.role != "administrateur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can transfer jobs"
        )
    
    # ✅ Vérifier que le tenant cible existe et est actif
    from tenant_manager import get_tenant_by_id
    target_company = get_tenant_by_id(target_company_id)
    if not target_company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target company not found"
        )
    
    # Effectuer le transfert
    job.company_id = target_company_id
    session.add(job)
    session.commit()
    
    return {"message": "Job transferred successfully"}


# =============================================================================
# 📝 RÈGLES À SUIVRE
# =============================================================================

"""
1. TOUJOURS utiliser get_session() de database_tenant
2. TOUJOURS utiliser get_current_active_user pour obtenir l'utilisateur
3. Le middleware garantit l'isolation, mais ajouter des vérifications explicites
   pour une sécurité renforcée (défense en profondeur)
4. Pour les créations, TOUJOURS assigner company_id automatiquement
5. Pour les lectures, le middleware garantit l'isolation, mais vérifier quand même
   si vous utilisez l'approche shared database
6. Logger toutes les tentatives d'accès cross-tenant pour audit
"""
