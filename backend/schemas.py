"""
Schémas Pydantic pour la validation des données d'entrée/sortie
"""
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from models import JobStatus, UrgencyLevel


class JobCreate(BaseModel):
    """Schéma pour créer un besoin de recrutement"""
    # INFORMATIONS GÉNÉRALES
    title: str = Field(..., min_length=1, max_length=255, description="Intitulé du poste")
    department: Optional[str] = Field(None, max_length=100, description="Département / Direction")
    manager_demandeur: Optional[str] = Field(None, max_length=255, description="Manager demandeur")
    entreprise: Optional[str] = Field(None, max_length=255, description="Entreprise")
    contract_type: Optional[str] = Field(None, max_length=50, description="Type de recrutement (CDI / CDD / Intérim / Stage / Freelance)")
    motif_recrutement: Optional[str] = Field(None, max_length=50, description="Motif du recrutement (Création de poste / Remplacement / Renfort temporaire)")
    urgency: Optional[str] = Field(None, max_length=20, description="Priorité du besoin (Faible/Moyenne/Élevée/Critique/Normale)")
    date_prise_poste: Optional[date] = Field(None, description="Date souhaitée de prise de poste")
    
    # MISSIONS ET RESPONSABILITÉS
    missions_principales: Optional[str] = Field(None, description="Missions principales")
    missions_secondaires: Optional[str] = Field(None, description="Missions secondaires")
    kpi_poste: Optional[str] = Field(None, description="Indicateurs de performance attendus (KPI du poste)")
    
    # PROFIL RECHERCHÉ
    niveau_formation: Optional[str] = Field(None, max_length=20, description="Niveau de formation requis (Bac / Bac+2 / Bac+3 / Bac+4 / Bac+5 / Autre)")
    experience_requise: Optional[int] = Field(None, ge=0, description="Expérience requise (en années)")
    competences_techniques_obligatoires: Optional[list[str]] = Field(None, description="Compétences techniques obligatoires")
    competences_techniques_souhaitees: Optional[list[str]] = Field(None, description="Compétences techniques souhaitées")
    competences_comportementales: Optional[list[str]] = Field(None, description="Compétences comportementales (soft skills)")
    langues_requises: Optional[str] = Field(None, description="Langues requises (Langue + niveau attendu)")
    certifications_requises: Optional[str] = Field(None, description="Certifications / habilitations requises")
    
    # CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
    localisation: Optional[str] = Field(None, max_length=255, description="Localisation du poste")
    mobilite_deplacements: Optional[str] = Field(None, max_length=20, description="Mobilité / déplacements (Aucun / Occasionnels / Fréquents)")
    teletravail: Optional[str] = Field(None, max_length=20, description="Télétravail (Aucun / Partiel / Total)")
    contraintes_horaires: Optional[str] = Field(None, description="Contraintes horaires")
    criteres_eliminatoires: Optional[str] = Field(None, description="Critères éliminatoires")
    
    # RÉMUNÉRATION ET CONDITIONS
    salaire_minimum: Optional[float] = Field(None, ge=0, description="Fourchette salariale minimum (en F CFA)")
    salaire_maximum: Optional[float] = Field(None, ge=0, description="Fourchette salariale maximum (en F CFA)")
    avantages: Optional[list[str]] = Field(None, description="Avantages (Prime / Assurance / Véhicule / Logement / Autres)")
    evolution_poste: Optional[str] = Field(None, description="Évolution possible du poste")
    
    # Champs existants conservés pour compatibilité
    budget: Optional[float] = Field(None, ge=0, description="Budget")
    job_description_file_path: Optional[str] = Field(None, max_length=500, description="Chemin vers la fiche de poste")
    
    @field_validator('urgency')
    @classmethod
    def validate_urgency(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        # Convertir en minuscules et valider
        v_lower = v.lower()
        # Valider que c'est une valeur valide
        valid_values = [e.value for e in UrgencyLevel]
        if v_lower not in valid_values:
            raise ValueError(f"Urgence doit être l'un de: {', '.join(valid_values)}")
        return v_lower  # Retourner la string en minuscules
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Le titre du poste est obligatoire")
        return v.strip()


class JobUpdate(BaseModel):
    """Schéma pour mettre à jour un besoin de recrutement"""
    # INFORMATIONS GÉNÉRALES
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    manager_demandeur: Optional[str] = Field(None, max_length=255)
    entreprise: Optional[str] = Field(None, max_length=255)
    contract_type: Optional[str] = Field(None, max_length=50)
    motif_recrutement: Optional[str] = Field(None, max_length=50)
    urgency: Optional[str] = Field(None, max_length=20)
    date_prise_poste: Optional[date] = None
    
    # MISSIONS ET RESPONSABILITÉS
    missions_principales: Optional[str] = None
    missions_secondaires: Optional[str] = None
    kpi_poste: Optional[str] = None
    
    # PROFIL RECHERCHÉ
    niveau_formation: Optional[str] = Field(None, max_length=20)
    experience_requise: Optional[int] = Field(None, ge=0)
    competences_techniques_obligatoires: Optional[list[str]] = None
    competences_techniques_souhaitees: Optional[list[str]] = None
    competences_comportementales: Optional[list[str]] = None
    langues_requises: Optional[str] = None
    certifications_requises: Optional[str] = None
    
    # CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
    localisation: Optional[str] = Field(None, max_length=255)
    mobilite_deplacements: Optional[str] = Field(None, max_length=20)
    teletravail: Optional[str] = Field(None, max_length=20)
    contraintes_horaires: Optional[str] = None
    criteres_eliminatoires: Optional[str] = None
    
    # RÉMUNÉRATION ET CONDITIONS
    salaire_minimum: Optional[float] = Field(None, ge=0)
    salaire_maximum: Optional[float] = Field(None, ge=0)
    avantages: Optional[list[str]] = None
    evolution_poste: Optional[str] = None
    
    # Champs existants conservés pour compatibilité
    budget: Optional[float] = Field(None, ge=0)
    job_description_file_path: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = None  # String au lieu d'enum


class JobResponse(BaseModel):
    """Schéma de réponse pour un besoin de recrutement"""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[UUID]
    # INFORMATIONS GÉNÉRALES
    title: str
    department: Optional[str]
    manager_demandeur: Optional[str]
    entreprise: Optional[str]
    contract_type: Optional[str]
    motif_recrutement: Optional[str]
    urgency: Optional[str]  # String au lieu d'enum pour correspondre au modèle
    date_prise_poste: Optional[date]
    
    # MISSIONS ET RESPONSABILITÉS
    missions_principales: Optional[str]
    missions_secondaires: Optional[str]
    kpi_poste: Optional[str]
    
    # PROFIL RECHERCHÉ
    niveau_formation: Optional[str]
    experience_requise: Optional[int]
    competences_techniques_obligatoires: Optional[list[str]]
    competences_techniques_souhaitees: Optional[list[str]]
    competences_comportementales: Optional[list[str]]
    langues_requises: Optional[str]
    certifications_requises: Optional[str]
    
    # CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
    localisation: Optional[str]
    mobilite_deplacements: Optional[str]
    teletravail: Optional[str]
    contraintes_horaires: Optional[str]
    criteres_eliminatoires: Optional[str]
    
    # RÉMUNÉRATION ET CONDITIONS
    salaire_minimum: Optional[float]
    salaire_maximum: Optional[float]
    avantages: Optional[list[str]]
    evolution_poste: Optional[str]
    
    # Champs existants
    budget: Optional[float]
    status: str  # String au lieu d'enum
    job_description_file_path: Optional[str]
    created_by: UUID
    validated_by: Optional[UUID]
    validated_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class JobResponseWithCreator(JobResponse):
    """Schéma de réponse pour un besoin de recrutement avec informations du créateur"""
    created_by_name: Optional[str] = None
    created_by_role: Optional[str] = None
    created_by_email: Optional[str] = None


class JobSubmitForValidation(BaseModel):
    """Schéma pour soumettre un besoin pour validation"""
    pass  # Pas de champs supplémentaires, juste une action


class CandidateCreate(BaseModel):
    """Schéma pour créer un candidat"""
    first_name: str = Field(..., min_length=1, max_length=100, description="Prénom")
    last_name: str = Field(..., min_length=1, max_length=100, description="Nom")
    profile_title: Optional[str] = Field(None, max_length=255, description="Titre du profil (ex: Développeur Fullstack)")
    years_of_experience: Optional[int] = Field(None, ge=0, description="Nombre d'années d'expérience")
    email: Optional[str] = Field(None, max_length=255, description="Email")
    phone: Optional[str] = Field(None, max_length=30, description="Téléphone")
    tags: Optional[list[str]] = Field(default=None, description="Tags et mots-clés")
    skills: Optional[list[str]] = Field(default=None, description="Compétences (liste de chaînes)")
    profile_picture_url: Optional[str] = Field(None, max_length=500, description="URL de la photo de profil")
    photo_url: Optional[str] = Field(None, max_length=500, description="URL de la photo de profil")
    source: Optional[str] = Field(None, max_length=50, description="Source (LinkedIn, cooptation, job board, etc.)")
    notes: Optional[str] = Field(None, description="Notes internes")
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Le nom est obligatoire")
        return v.strip()


class CandidateParseResponse(BaseModel):
    """Schéma de réponse pour le parsing de CV - inclut les données + l'image extraite"""
    first_name: str
    last_name: str
    profile_title: Optional[str] = None
    years_of_experience: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[list[str]] = None
    skills: Optional[list[str]] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    profile_picture_base64: Optional[str] = Field(None, description="Photo de profil extraite en base64 (format data URI)")


class CandidateUpdate(BaseModel):
    """Schéma pour mettre à jour un candidat"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    profile_title: Optional[str] = Field(None, max_length=255, description="Titre du profil")
    years_of_experience: Optional[int] = Field(None, ge=0, description="Nombre d'années d'expérience")
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    tags: Optional[list[str]] = None
    skills: Optional[list[str]] = None  # Compétences
    source: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = None
    notes: Optional[str] = None


class CandidateResponse(BaseModel):
    """Schéma de réponse pour un candidat"""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[UUID]
    first_name: str
    last_name: str
    profile_title: Optional[str]  # Titre du profil
    years_of_experience: Optional[int]  # Nombre d'années d'expérience
    email: Optional[str]
    phone: Optional[str]
    cv_file_path: Optional[str]
    profile_picture_url: Optional[str]  # URL de la photo (ancien nom, conservé pour compatibilité)
    photo_url: Optional[str]  # URL de la photo de profil
    tags: Optional[list[str]]
    skills: Optional[list[str]]  # Liste de compétences (PostgreSQL ARRAY)
    source: Optional[str]
    status: str
    notes: Optional[str]
    created_by: UUID
    created_at: datetime
    updated_at: datetime


# ========== SCHÉMAS ÉQUIPES ==========

class TeamCreate(BaseModel):
    """Schéma pour créer une équipe"""
    name: str = Field(..., min_length=1, max_length=255, description="Nom de l'équipe")
    description: Optional[str] = Field(None, description="Description de l'équipe")
    department: Optional[str] = Field(None, max_length=100, description="Département")
    manager_id: Optional[UUID] = Field(None, description="ID du manager de l'équipe")
    member_ids: Optional[list[UUID]] = Field(default=[], description="Liste des IDs des membres à ajouter")


class TeamUpdate(BaseModel):
    """Schéma pour mettre à jour une équipe"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    department: Optional[str] = Field(None, max_length=100)
    manager_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class TeamMemberResponse(BaseModel):
    """Schéma pour un membre d'équipe"""
    id: UUID
    user_id: UUID
    team_id: UUID
    role: Optional[str]
    joined_at: datetime
    user_first_name: str
    user_last_name: str
    user_email: str
    user_role: str


class TeamResponse(BaseModel):
    """Schéma pour une équipe"""
    id: UUID
    name: str
    description: Optional[str]
    department: Optional[str]
    manager_id: Optional[UUID]
    manager_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    members: Optional[list[TeamMemberResponse]] = []
    members_count: int = 0

