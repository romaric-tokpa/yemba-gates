"""
Modèles SQLModel pour la base de données
"""
from __future__ import annotations

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy import Column, ForeignKey, String, Text
from typing import TYPE_CHECKING, List, Optional
from datetime import datetime, date
from enum import Enum
from uuid import UUID, uuid4


class JobStatus(str, Enum):
    """Statut d'un besoin de recrutement"""
    BROUILLON = "brouillon"
    A_VALIDER = "a_valider"
    URGENT = "urgent"
    TRES_URGENT = "tres_urgent"
    BESOIN_COURANT = "besoin_courant"
    VALIDE = "validé"
    EN_COURS = "en_cours"
    GAGNE = "gagne"
    STANDBY = "standby"
    ARCHIVE = "archive"
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
    
    # INFORMATIONS GÉNÉRALES
    title: str = Field(max_length=255)  # Intitulé du poste
    department: str | None = Field(default=None, max_length=100)  # Département / Direction (optionnel pour compatibilité)
    manager_demandeur: str | None = Field(default=None, max_length=255)  # Manager demandeur
    entreprise: str | None = Field(default=None, max_length=255)  # Entreprise
    contract_type: str | None = Field(default=None, max_length=50)  # Type de recrutement (CDI / CDD / Intérim / Stage / Freelance)
    motif_recrutement: str | None = Field(default=None, max_length=50)  # Motif du recrutement (Création de poste / Remplacement / Renfort temporaire)
    urgency: str | None = Field(default=None, max_length=20)  # Priorité du besoin (Faible/Moyenne/Élevée/Critique/Normale)
    date_prise_poste: date | None = Field(default=None)  # Date souhaitée de prise de poste
    
    # MISSIONS ET RESPONSABILITÉS
    missions_principales: str | None = Field(default=None, sa_column=Column(Text))  # Missions principales (TEXT pour long texte)
    missions_secondaires: str | None = Field(default=None, sa_column=Column(Text))  # Missions secondaires
    kpi_poste: str | None = Field(default=None, sa_column=Column(Text))  # Indicateurs de performance attendus (KPI du poste)
    
    # PROFIL RECHERCHÉ
    niveau_formation: str | None = Field(default=None, max_length=20)  # Niveau de formation requis (Bac / Bac+2 / Bac+3 / Bac+4 / Bac+5 / Autre)
    experience_requise: int | None = Field(default=None)  # Expérience requise (en années)
    competences_techniques_obligatoires: list[str] | None = Field(default=None, sa_column=Column(ARRAY(Text)))  # Compétences techniques obligatoires
    competences_techniques_souhaitees: list[str] | None = Field(default=None, sa_column=Column(ARRAY(Text)))  # Compétences techniques souhaitées
    competences_comportementales: list[str] | None = Field(default=None, sa_column=Column(ARRAY(Text)))  # Compétences comportementales (soft skills)
    langues_requises: str | None = Field(default=None, sa_column=Column(Text))  # Langues requises (Langue + niveau attendu)
    certifications_requises: str | None = Field(default=None, sa_column=Column(Text))  # Certifications / habilitations requises
    
    # CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
    localisation: str | None = Field(default=None, max_length=255)  # Localisation du poste
    mobilite_deplacements: str | None = Field(default=None, max_length=20)  # Mobilité / déplacements (Aucun / Occasionnels / Fréquents)
    teletravail: str | None = Field(default=None, max_length=20)  # Télétravail (Aucun / Partiel / Total)
    contraintes_horaires: str | None = Field(default=None, sa_column=Column(Text))  # Contraintes horaires
    criteres_eliminatoires: str | None = Field(default=None, sa_column=Column(Text))  # Critères éliminatoires
    
    # RÉMUNÉRATION ET CONDITIONS
    salaire_minimum: float | None = Field(default=None)  # Fourchette salariale minimum (en F CFA)
    salaire_maximum: float | None = Field(default=None)  # Fourchette salariale maximum (en F CFA)
    avantages: list[str] | None = Field(default=None, sa_column=Column(ARRAY(Text)))  # Avantages (Prime / Assurance / Véhicule / Logement / Autres)
    evolution_poste: str | None = Field(default=None, sa_column=Column(Text))  # Évolution possible du poste
    
    # Champs existants conservés pour compatibilité
    budget: float | None = Field(default=None)  # Budget (conservé pour compatibilité)
    status: str = Field(default="brouillon")  # Statut du besoin
    job_description_file_path: str | None = Field(default=None, max_length=500)  # Fiche de poste
    
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
    # Note: La relation history est supprimée pour éviter les problèmes de référence forward
    # L'historique peut être accédé via JobHistory.job_id directement
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
    phone: str | None = Field(default=None, max_length=100)
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
    interview_type: str = Field(max_length=50)  # 'rh', 'technique', 'client', 'prequalification', 'qualification', 'autre'
    scheduled_at: datetime
    scheduled_end_at: datetime | None = None
    location: str | None = Field(default=None, max_length=255)
    interviewer_id: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    preparation_notes: str | None = Field(default=None)
    feedback: str | None = Field(default=None)  # Feedback post-entretien (obligatoire pour passer à shortlist)
    feedback_provided_at: datetime | None = None
    decision: str | None = Field(default=None, max_length=20)  # 'positif', 'négatif', 'en_attente'
    score: int | None = Field(default=None)  # Score sur 10
    status: str = Field(default="planifié", max_length=20)  # 'planifié', 'réalisé', 'reporté', 'annulé'
    rescheduled_at: datetime | None = None  # Nouvelle date si reporté
    rescheduling_reason: str | None = Field(default=None, sa_column=Column(Text))  # Motif du report
    cancellation_reason: str | None = Field(default=None, sa_column=Column(Text))  # Motif de l'annulation
    cancelled_at: datetime | None = None  # Date d'annulation
    completed_at: datetime | None = None  # Date de réalisation
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
    job_id: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL")))
    modified_by: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id")))
    field_name: str | None = Field(default=None, max_length=100)  # Champ modifié
    old_value: str | None = Field(default=None)  # Ancienne valeur
    new_value: str | None = Field(default=None)  # Nouvelle valeur
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    # Note: On ne définit pas la relation vers Job pour éviter les problèmes de référence forward
    # Le job peut être accédé via job_id si nécessaire
    # job_id peut être None si le job a été supprimé (ON DELETE SET NULL)
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


class Team(SQLModel, table=True):
    """Modèle équipe"""
    __tablename__ = "teams"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    name: str = Field(max_length=255, index=True)  # Nom de l'équipe
    description: str | None = Field(default=None, sa_column=Column(Text))  # Description de l'équipe
    department: str | None = Field(default=None, max_length=100)  # Département
    manager_id: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")))  # Manager de l'équipe
    is_active: bool = Field(default=True)  # Équipe active ou non
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    manager: User = Relationship(sa_relationship_kwargs={"lazy": "select", "foreign_keys": "[Team.manager_id]"})


class TeamMember(SQLModel, table=True):
    """Modèle membre d'équipe (table de liaison many-to-many entre User et Team)"""
    __tablename__ = "team_members"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    team_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=False))
    user_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=False))
    role: str | None = Field(default=None, max_length=50)  # Rôle dans l'équipe (membre, lead, etc.)
    joined_at: datetime = Field(default_factory=datetime.utcnow)  # Date d'ajout à l'équipe
    
    # Relationships
    team: Team = Relationship(sa_relationship_kwargs={"lazy": "select"})
    user: User = Relationship(sa_relationship_kwargs={"lazy": "select"})


class ClientInterviewRequest(SQLModel, table=True):
    """Modèle pour les demandes d'entretien client avec disponibilités"""
    __tablename__ = "client_interview_requests"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    application_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE")))
    client_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")))
    availability_slots: str = Field(sa_column=Column(Text))  # JSON string avec les créneaux de disponibilité
    notes: str | None = Field(default=None, sa_column=Column(Text))  # Notes additionnelles du client
    status: str = Field(default="pending", max_length=20)  # 'pending', 'scheduled', 'cancelled'
    scheduled_interview_id: UUID | None = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="SET NULL")))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships - définies sans type annotation pour éviter les problèmes de résolution
    # Les relations peuvent être accédées via les IDs (application_id, client_id, scheduled_interview_id)
    # et chargées manuellement si nécessaire dans les routers
