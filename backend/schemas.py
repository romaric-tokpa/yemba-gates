"""
Schémas Pydantic pour la validation des données d'entrée/sortie
"""
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID
from models import JobStatus, UrgencyLevel


class JobCreate(BaseModel):
    """Schéma pour créer un besoin de recrutement"""
    title: str = Field(..., min_length=1, max_length=255, description="Intitulé du poste")
    department: Optional[str] = Field(None, max_length=100, description="Département / Client")
    contract_type: Optional[str] = Field(None, max_length=50, description="Type de contrat (CDI, CDD, etc.)")
    budget: Optional[float] = Field(None, ge=0, description="Budget")
    urgency: Optional[str] = Field(None, description="Niveau d'urgence")
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
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    contract_type: Optional[str] = Field(None, max_length=50)
    budget: Optional[float] = Field(None, ge=0)
    urgency: Optional[str] = None  # String au lieu d'enum
    job_description_file_path: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = None  # String au lieu d'enum


class JobResponse(BaseModel):
    """Schéma de réponse pour un besoin de recrutement"""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[UUID]
    title: str
    department: Optional[str]
    contract_type: Optional[str]
    budget: Optional[float]
    urgency: Optional[str]  # String au lieu d'enum pour correspondre au modèle
    status: str  # String au lieu d'enum
    job_description_file_path: Optional[str]
    created_by: UUID
    validated_by: Optional[UUID]
    validated_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


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

