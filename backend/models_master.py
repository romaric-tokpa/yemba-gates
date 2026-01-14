"""
Modèles SQLModel pour la base de données MASTER (gestion multi-tenant)
Cette base contient les informations sur les entreprises et leurs bases de données dédiées
"""
from __future__ import annotations

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import Column, ForeignKey, String, Text, Enum as SQLEnum
from typing import TYPE_CHECKING, Optional, List
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

if TYPE_CHECKING:
    from typing import TYPE_CHECKING as _TYPE_CHECKING


class CompanyStatus(str, Enum):
    """Statut d'une entreprise"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"
    TRIAL = "trial"


class SubscriptionStatus(str, Enum):
    """Statut d'un abonnement"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"
    PENDING = "pending"


class DatabaseStatus(str, Enum):
    """Statut d'une base de données tenant"""
    ACTIVE = "active"
    PROVISIONING = "provisioning"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class PlanType(str, Enum):
    """Type de plan d'abonnement"""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Company(SQLModel, table=True):
    """Modèle entreprise (tenant)"""
    __tablename__ = "companies"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    name: str = Field(max_length=255, index=True)
    domain: str | None = Field(default=None, max_length=255, unique=True, index=True)  # Domaine personnalisé (ex: entreprise.yemma-gates.com)
    subdomain: str | None = Field(default=None, max_length=100, unique=True, index=True)  # Sous-domaine (ex: entreprise)
    status: str = Field(default=CompanyStatus.ACTIVE.value, max_length=20, index=True)
    
    # Informations de contact
    contact_email: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=50)
    
    # Métadonnées
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    trial_ends_at: datetime | None = None
    activated_at: datetime | None = None
    
    # Relationships - Désactivées temporairement pour éviter les problèmes de résolution
    # tenant_database: Optional["TenantDatabase"] = Relationship(sa_relationship_kwargs={"lazy": "select", "uselist": False})
    # subscriptions: List["Subscription"] = Relationship(back_populates="company", sa_relationship_kwargs={"lazy": "select"})
    # billing_records: List["BillingRecord"] = Relationship(back_populates="company", sa_relationship_kwargs={"lazy": "select"})


class TenantDatabase(SQLModel, table=True):
    """Modèle base de données dédiée à un tenant"""
    __tablename__ = "tenant_databases"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    company_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), unique=True, index=True))
    
    # Informations de connexion
    db_name: str = Field(max_length=100, unique=True, index=True)  # Nom de la base (ex: tenant_abc123)
    db_host: str = Field(default="localhost", max_length=255)  # Host de la base
    db_port: int = Field(default=5432)
    db_user: str | None = Field(default=None, max_length=100)
    # Note: Le mot de passe ne doit JAMAIS être stocké en clair, utiliser un secret manager
    
    # Statut
    status: str = Field(default=DatabaseStatus.PROVISIONING.value, max_length=20, index=True)
    
    # Métadonnées
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    provisioned_at: datetime | None = None
    
    # Relationships - Désactivées temporairement
    # company: "Company" = Relationship(sa_relationship_kwargs={"lazy": "select"})


class Plan(SQLModel, table=True):
    """Modèle plan d'abonnement"""
    __tablename__ = "plans"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    name: str = Field(max_length=100, unique=True, index=True)
    plan_type: str = Field(max_length=50, index=True)  # FREE, BASIC, PROFESSIONAL, ENTERPRISE
    
    # Limites
    max_users: int | None = Field(default=None)  # None = illimité
    max_jobs: int | None = Field(default=None)
    max_candidates: int | None = Field(default=None)
    max_storage_gb: int | None = Field(default=None)
    
    # Fonctionnalités (JSON string)
    features: str = Field(sa_column=Column(Text))  # JSON string avec les fonctionnalités activées
    
    # Prix
    price_monthly: float | None = Field(default=None)  # Prix mensuel en F CFA
    price_yearly: float | None = Field(default=None)  # Prix annuel en F CFA
    
    # Statut
    is_active: bool = Field(default=True, index=True)
    
    # Métadonnées
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships - Désactivées temporairement
    # subscriptions: List["Subscription"] = Relationship(back_populates="plan", sa_relationship_kwargs={"lazy": "select"})


class Subscription(SQLModel, table=True):
    """Modèle abonnement d'une entreprise"""
    __tablename__ = "subscriptions"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    company_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True))
    plan_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("plans.id"), index=True))
    
    # Statut
    status: str = Field(default=SubscriptionStatus.TRIAL.value, max_length=20, index=True)
    
    # Dates
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: datetime | None = None
    trial_ends_at: datetime | None = None
    cancelled_at: datetime | None = None
    
    # Métadonnées
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships - Désactivées temporairement
    # company: Company = Relationship(back_populates="subscriptions", sa_relationship_kwargs={"lazy": "select"})
    # plan: Plan = Relationship(back_populates="subscriptions", sa_relationship_kwargs={"lazy": "select"})
    # billing_records: List["BillingRecord"] = Relationship(back_populates="subscription", sa_relationship_kwargs={"lazy": "select"})


class BillingRecord(SQLModel, table=True):
    """Modèle enregistrement de facturation"""
    __tablename__ = "billing_records"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    company_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True))
    subscription_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("subscriptions.id"), index=True))
    
    # Informations de facturation
    amount: float = Field()  # Montant en F CFA
    currency: str = Field(default="XOF", max_length=3)
    invoice_number: str | None = Field(default=None, max_length=100, unique=True, index=True)
    
    # Dates
    billing_period_start: datetime
    billing_period_end: datetime
    paid_at: datetime | None = None
    
    # Statut
    status: str = Field(default="pending", max_length=20, index=True)  # pending, paid, failed, refunded
    
    # Métadonnées
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlatformAdmin(SQLModel, table=True):
    """Modèle administrateur de la plateforme (super admin)"""
    __tablename__ = "platform_admins"
    
    id: UUID | None = Field(default_factory=uuid4, sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    email: str = Field(unique=True, index=True, max_length=255)
    password_hash: str
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    
    # Rôle (super_admin, support, billing)
    role: str = Field(default="super_admin", max_length=50, index=True)
    
    # Statut
    is_active: bool = Field(default=True, index=True)
    
    # Métadonnées
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: datetime | None = None
