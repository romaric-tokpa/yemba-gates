"""
Modèles SQLModel pour la base de données
"""
from __future__ import annotations

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy import Column, ForeignKey, String, Text
from typing import TYPE_CHECKING, List
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

# Import conditionnel pour le type checking uniquement
if TYPE_CHECKING:
    from typing import Optional
    Optional = Optional
else:
    Optional = None


class JobStatus(str, Enum):
    """Statut d'un besoin de recrutement"""
    BROUILLON = "brouillon"
    VALIDE = "validé"
    EN_COURS = "en_cours"
    CLOTURE = "clôturé"


class UrgencyLevel(str, Enum):
    """Niveau d'urgence d'un besoin"""
    FAIBLE = "faible"
    MOYENNE = "moyenne"
    HAUTE = "haute"
    CRITIQUE = "critique"


class UserRole(str, Enum):
    """Rôle d'un utilisateur"""
    RECRUTEUR = "recruteur"
    MANAGER = "manager"
    CLIENT = "client"
    ADMINISTRATEUR = "administrateur"


class User(SQLModel, table=True):
    """Modèle utilisateur"""
    __tablename__ = "users"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    email: str = Field(unique=True, index=True)
    password_hash: str
    first_name: str
    last_name: str
    role: str = Field(max_length=20)  # Stocker directement la string pour éviter les problèmes de sérialisation
    phone: str | None = None
    department: str | None = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships - SQLModel infère automatiquement les types via back_populates
    jobs_created: Job = Relationship(back_populates="creator", sa_relationship_kwargs={"lazy": "select", "foreign_keys": "Job.created_by"})
    jobs_validated: Job = Relationship(back_populates="validator", sa_relationship_kwargs={"lazy": "select", "foreign_keys": "Job.validated_by"})
    candidates_created: Candidate = Relationship(back_populates="creator", sa_relationship_kwargs={"lazy": "select"})
    applications_created: Application = Relationship(back_populates="creator_user", sa_relationship_kwargs={"lazy": "select"})
    interviews_created: Interview = Relationship(back_populates="creator_user", sa_relationship_kwargs={"lazy": "select", "foreign_keys": "Interview.created_by"})
    interviews_conducted: Interview = Relationship(back_populates="interviewer", sa_relationship_kwargs={"lazy": "select", "foreign_keys": "Interview.interviewer_id"})
    notifications: Notification = Relationship(back_populates="user", sa_relationship_kwargs={"lazy": "select"})

class Job(SQLModel, table=True):
    """Modèle besoin de recrutement"""
    __tablename__ = "jobs"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    title: str = Field(max_length=255)
    department: str | None = Field(default=None, max_length=100)
    contract_type: str | None = Field(default=None, max_length=50)
    budget: float | None = Field(default=None)
    urgency: str | None = Field(default=None)  # Stocker directement la string pour éviter les problèmes de sérialisation
    status: str = Field(default="brouillon")  # Stocker directement la string
    job_description_file_path: str | None = Field(default=None, max_length=500)
    
    created_by: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id"))) 
    validated_by: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    
    validated_at: datetime | None = None
    closed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    creator: User = Relationship(back_populates="jobs_created", sa_relationship_kwargs={"lazy": "select", "foreign_keys": "[Job.created_by]"})
    validator: User = Relationship(back_populates="jobs_validated", sa_relationship_kwargs={"lazy": "select", "foreign_keys": "[Job.validated_by]"})
    applications: Application = Relationship(back_populates="job", sa_relationship_kwargs={"lazy": "select"})
    history: JobHistory = Relationship(back_populates="job", sa_relationship_kwargs={"lazy": "select"})
    notifications: Notification = Relationship(back_populates="related_job", sa_relationship_kwargs={"lazy": "select"})


class CandidateStatus(str, Enum):
    """Statut d'un candidat"""
    NOUVEAU = "Nouveau"
    ENTRETIEN = "Entretien"
    OFFRE = "Offre"
    REFUSE = "Refusé"


class Candidate(SQLModel, table=True):
    """Modèle candidat"""
    __tablename__ = "candidates"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    profile_title: str | None = Field(default=None, max_length=255)  # Titre du profil (ex: Développeur Fullstack)
    years_of_experience: int | None = Field(default=None)  # Nombre d'années d'expérience
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=30)
    cv_file_path: str | None = Field(default=None, max_length=500)
    profile_picture_url: str | None = Field(default=None, max_length=500)  # URL de la photo de profil
    # photo_url n'est pas mappé à la base de données, on utilise seulement profile_picture_url
    tags: list[str] | None = Field(default=None, sa_column=Column(ARRAY(Text)))  # PostgreSQL array (TEXT[])
    skills: List[str] | None = Field(default=None, sa_column=Column(ARRAY(String)))  # Compétences stockées comme PostgreSQL array (TEXT[])
    source: str | None = Field(default=None, max_length=50)
    status: str = Field(default="sourcé", max_length=50)  # Valeurs possibles selon CHECK: 'sourcé', 'qualifié', 'entretien_rh', 'entretien_client', 'shortlist', 'offre', 'rejeté', 'embauché'
    notes: str | None = Field(default=None)
    created_by: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    creator: User = Relationship(back_populates="candidates_created", sa_relationship_kwargs={"lazy": "select"})
    applications: Application = Relationship(back_populates="candidate", sa_relationship_kwargs={"lazy": "select"})


class Interview(SQLModel, table=True):
    """Modèle entretien"""
    __tablename__ = "interviews"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    application_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE")))
    interview_type: str = Field(max_length=50)  # 'rh', 'technique', 'client'
    scheduled_at: datetime
    location: str | None = Field(default=None, max_length=255)
    interviewer_id: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    preparation_notes: str | None = Field(default=None)
    feedback: str | None = Field(default=None)  # Feedback post-entretien (obligatoire pour passer à shortlist)
    feedback_provided_at: datetime | None = None
    decision: str | None = Field(default=None, max_length=20)  # 'positif', 'négatif', 'en_attente'
    score: int | None = Field(default=None)  # Score sur 10
    created_by: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    application: Application = Relationship(back_populates="interviews", sa_relationship_kwargs={"lazy": "select"})
    interviewer: User = Relationship(back_populates="interviews_conducted", sa_relationship_kwargs={"lazy": "select", "foreign_keys": "[Interview.interviewer_id]"})
    creator_user: User = Relationship(back_populates="interviews_created", sa_relationship_kwargs={"lazy": "select", "foreign_keys": "[Interview.created_by]"})


class Application(SQLModel, table=True):
    """Modèle candidature (liaison candidat-job)"""
    __tablename__ = "applications"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    candidate_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE")))
    job_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE")))
    created_by: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    status: str = Field(default="sourcé")
    is_in_shortlist: bool = Field(default=False)
    client_feedback: str | None = Field(default=None)
    client_validated: bool | None = None
    client_validated_at: datetime | None = None
    offer_sent_at: datetime | None = None
    offer_accepted: bool | None = None
    offer_accepted_at: datetime | None = None
    onboarding_completed: bool = Field(default=False)
    onboarding_completed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="applications", sa_relationship_kwargs={"lazy": "select"})
    job: Job = Relationship(back_populates="applications", sa_relationship_kwargs={"lazy": "select"})
    creator_user: User = Relationship(back_populates="applications_created", sa_relationship_kwargs={"lazy": "select"})
    interviews: Interview = Relationship(back_populates="application", sa_relationship_kwargs={"lazy": "select"})
    offers: Offer = Relationship(back_populates="application", sa_relationship_kwargs={"lazy": "select"})
    onboarding_checklist: OnboardingChecklist = Relationship(back_populates="application", sa_relationship_kwargs={"uselist": False, "lazy": "select"})
    history: ApplicationHistory = Relationship(back_populates="application", sa_relationship_kwargs={"lazy": "select"})
    notifications: Notification = Relationship(back_populates="related_application", sa_relationship_kwargs={"lazy": "select"})


class Notification(SQLModel, table=True):
    """Modèle notification"""
    __tablename__ = "notifications"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    user_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))  # Destinataire
    title: str = Field(max_length=255)
    message: str
    notification_type: str = Field(max_length=50)  # 'offer_accepted', 'job_pending_validation', 'feedback_received', etc.
    is_read: bool = Field(default=False)
    related_job_id: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE")))
    related_application_id: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE")))
    email_sent: bool = Field(default=False)
    email_sent_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: datetime | None = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="notifications", sa_relationship_kwargs={"lazy": "select"})
    related_job: Job = Relationship(back_populates="notifications", sa_relationship_kwargs={"lazy": "select"})
    related_application: Application = Relationship(back_populates="notifications", sa_relationship_kwargs={"lazy": "select"})


class JobHistory(SQLModel, table=True):
    """Modèle historique des modifications de jobs"""
    __tablename__ = "job_history"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    job_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE")))
    modified_by: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    field_name: str | None = Field(default=None, max_length=100)  # Champ modifié
    old_value: str | None = Field(default=None)  # Ancienne valeur
    new_value: str | None = Field(default=None)  # Nouvelle valeur
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    job: Job = Relationship(back_populates="history", sa_relationship_kwargs={"lazy": "select"})
    modifier: User = Relationship(sa_relationship_kwargs={"lazy": "select"})


class ApplicationHistory(SQLModel, table=True):
    """Modèle historique des candidatures"""
    __tablename__ = "application_history"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    application_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE")))
    changed_by: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    old_status: str | None = Field(default=None, max_length=50)
    new_status: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    application: Application = Relationship(back_populates="history", sa_relationship_kwargs={"lazy": "select"})
    changer: User = Relationship(sa_relationship_kwargs={"lazy": "select"})


class Offer(SQLModel, table=True):
    """Modèle offre d'emploi"""
    __tablename__ = "offers"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    application_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE")))
    sent_by: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))  # Recruteur qui a envoyé l'offre
    salary: float | None = Field(default=None)  # Salaire proposé
    contract_type: str | None = Field(default=None, max_length=50)  # Type de contrat
    start_date: datetime | None = None  # Date de début prévue
    notes: str | None = Field(default=None)  # Notes additionnelles pour l'offre
    sent_at: datetime = Field(default_factory=datetime.utcnow)  # Date d'envoi de l'offre
    accepted: bool | None = None  # True = acceptée, False = refusée, None = en attente
    accepted_at: datetime | None = None  # Date d'acceptation/refus
    decision_notes: str | None = Field(default=None)  # Commentaires sur la décision
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    application: Application = Relationship(back_populates="offers", sa_relationship_kwargs={"lazy": "select"})
    sender: User = Relationship(sa_relationship_kwargs={"lazy": "select"})


class OnboardingChecklist(SQLModel, table=True):
    """Modèle checklist onboarding"""
    __tablename__ = "onboarding_checklists"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    application_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), unique=True))
    contract_signed: bool = Field(default=False)
    contract_signed_at: datetime | None = None
    equipment_ready: bool = Field(default=False)
    equipment_ready_at: datetime | None = None
    training_scheduled: bool = Field(default=False)
    training_scheduled_at: datetime | None = None
    access_granted: bool = Field(default=False)
    access_granted_at: datetime | None = None
    welcome_meeting_scheduled: bool = Field(default=False)
    welcome_meeting_scheduled_at: datetime | None = None
    onboarding_completed: bool = Field(default=False)
    onboarding_completed_at: datetime | None = None
    notes: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    application: Application = Relationship(back_populates="onboarding_checklist", sa_relationship_kwargs={"lazy": "select"})


class SecurityLog(SQLModel, table=True):
    """Modèle log de sécurité (connexions)"""
    __tablename__ = "security_logs"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    user_id: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")))
    action: str = Field(max_length=50)  # 'login', 'logout', 'failed_login', 'password_change', etc.
    ip_address: str | None = Field(default=None, max_length=45)  # IPv4 ou IPv6
    user_agent: str | None = Field(default=None, max_length=500)
    success: bool = Field(default=True)  # True si l'action a réussi, False sinon
    details: str | None = Field(default=None)  # Détails supplémentaires (message d'erreur, etc.)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(sa_relationship_kwargs={"lazy": "select"})


class Setting(SQLModel, table=True):
    """Modèle paramétrage système"""
    __tablename__ = "settings"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    key: str = Field(unique=True, index=True, max_length=100)  # Clé unique du paramètre
    value: str = Field(max_length=1000)  # Valeur du paramètre (JSON string si nécessaire)
    category: str = Field(max_length=50)  # 'department', 'contract_type', 'kpi_threshold', etc.
    description: str | None = Field(default=None, max_length=500)
    updated_by: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    updater: User = Relationship(sa_relationship_kwargs={"lazy": "select"})
