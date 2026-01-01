"""
Routes pour la gestion des besoins de recrutement (US01)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from database import get_session, engine
from models import Job, JobStatus, UrgencyLevel, User, UserRole, JobHistory
from schemas import JobCreate, JobUpdate, JobResponse, JobSubmitForValidation
from auth import get_current_active_user, require_recruteur, require_manager
from datetime import datetime, date
from sqlalchemy import text, inspect
import logging
from fastapi import UploadFile, File
from pathlib import Path
import tempfile
import shutil
import os
import json

# Imports pour l'extraction de texte
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    from docx import Document
except ImportError:
    Document = None

# Import pour OpenAI
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}


def is_allowed_file(filename: str) -> bool:
    """Vérifie si le fichier a une extension autorisée"""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def extract_text_from_pdf(file_path: str) -> str:
    """Extrait le texte d'un fichier PDF"""
    if fitz is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PyMuPDF n'est pas installé. Installez-le avec: pip install pymupdf"
        )
    
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'extraction du PDF: {str(e)}"
        )


def extract_text_from_docx(file_path: str) -> str:
    """Extrait le texte d'un fichier Word (.docx)"""
    if Document is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="python-docx n'est pas installé. Installez-le avec: pip install python-docx"
        )
    
    try:
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de l'extraction du document Word: {str(e)}"
        )


async def extract_text_from_job_description(file: UploadFile) -> tuple[str, str]:
    """Extrait le texte brut d'une fiche de poste (PDF ou Word) et retourne aussi le chemin temporaire"""
    file_extension = Path(file.filename).suffix.lower()
    
    # Créer un fichier temporaire
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
        tmp_path = tmp_file.name
        try:
            # Réinitialiser le pointeur du fichier
            await file.seek(0)
            # Lire le contenu du fichier uploadé
            content = await file.read()
            tmp_file.write(content)
            tmp_file.flush()
            
            # Extraire le texte selon le type de fichier
            if file_extension == ".pdf":
                text = extract_text_from_pdf(tmp_path)
            elif file_extension in {".doc", ".docx"}:
                text = extract_text_from_docx(tmp_path)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Format de fichier non supporté: {file_extension}"
                )
            
            return text, tmp_path
        except HTTPException:
            # Nettoyer le fichier temporaire en cas d'erreur
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise


def parse_job_description_with_llm(job_text: str) -> dict:
    """Utilise un LLM pour parser le texte de la fiche de poste et extraire les informations structurées"""
    if OpenAI is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI n'est pas installé. Installez-le avec: pip install openai"
        )
    
    # Récupérer la clé API depuis les variables d'environnement
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY n'est pas configurée dans les variables d'environnement"
        )
    
    client = OpenAI(api_key=api_key)
    
    # Prompt pour extraire les informations de la fiche de poste
    prompt = f"""Tu es un assistant expert en recrutement. Analyse la fiche de poste suivante et extrais les informations pertinentes au format JSON.

FICHE DE POSTE:
{job_text}

Extrais les informations suivantes au format JSON strict (sans commentaires, sans markdown):
{{
  "title": "Intitulé du poste",
  "department": "Département / Direction",
  "manager_demandeur": "Nom du manager demandeur",
  "entreprise": "Nom de l'entreprise (si mentionné)",
  "contract_type": "Type de recrutement (CDI / CDD / Intérim / Stage / Freelance)",
  "motif_recrutement": "Motif du recrutement (Création de poste / Remplacement / Renfort temporaire)",
  "urgency": "Priorité du besoin (faible / moyenne / normale / élevée / critique)",
  "date_prise_poste": "Date souhaitée de prise de poste au format YYYY-MM-DD (ou null si non mentionné)",
  "missions_principales": "Description des missions principales (texte complet)",
  "missions_secondaires": "Description des missions secondaires (texte complet, ou null)",
  "kpi_poste": "Indicateurs de performance attendus (KPI du poste, ou null)",
  "niveau_formation": "Niveau de formation requis (Bac / Bac+2 / Bac+3 / Bac+4 / Bac+5 / Autre)",
  "experience_requise": nombre d'années d'expérience requise (entier, 0 si débutant),
  "competences_techniques_obligatoires": ["compétence1", "compétence2", ...],
  "competences_techniques_souhaitees": ["compétence1", "compétence2", ...],
  "competences_comportementales": ["compétence1", "compétence2", ...],
  "langues_requises": "Langues requises avec niveaux (ex: Français (natif), Anglais (niveau C1))",
  "certifications_requises": "Certifications / habilitations requises (ou null)",
  "localisation": "Localisation du poste",
  "mobilite_deplacements": "Mobilité / déplacements (Aucun / Occasionnels / Fréquents, ou null)",
  "teletravail": "Télétravail (Aucun / Partiel / Total, ou null)",
  "contraintes_horaires": "Contraintes horaires (ou null)",
  "criteres_eliminatoires": "Critères éliminatoires (texte)",
  "salaire_minimum": montant minimum en F CFA (nombre, ou null),
  "salaire_maximum": montant maximum en F CFA (nombre, ou null),
  "avantages": ["Prime", "Assurance", "Véhicule", "Logement", "Autres"] (liste, peut être vide),
  "evolution_poste": "Évolution possible du poste (ou null)"
}}

Règles importantes:
- Si une information n'est pas trouvée, utilise null pour les champs optionnels
- title est obligatoire
- Les listes (compétences, avantages) peuvent être vides []
- experience_requise doit être un nombre entier
- Les montants de salaire doivent être des nombres (en F CFA)
- Retourne UNIQUEMENT le JSON, sans texte avant ou après
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Modèle économique et rapide
            messages=[
                {"role": "system", "content": "Tu es un assistant expert en extraction de données de fiches de poste. Tu retournes uniquement du JSON valide."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Faible température pour plus de cohérence
            max_tokens=4000
        )
        
        # Extraire le JSON de la réponse
        response_text = response.choices[0].message.content.strip()
        
        # Nettoyer la réponse (enlever les markdown code blocks si présents)
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parser le JSON
        parsed_data = json.loads(response_text)
        
        # Valider que title est présent
        if not parsed_data.get("title"):
            raise ValueError("Le titre du poste est obligatoire")
        
        return parsed_data
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du parsing JSON de la réponse LLM: {str(e)}. Réponse reçue: {response_text[:200]}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'appel à l'API OpenAI: {str(e)}"
        )


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_data: JobCreate,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Créer un nouveau besoin de recrutement (US01)
    
    Permet de créer un besoin avec tous les champs obligatoires.
    Le besoin est créé en statut "brouillon" par défaut.
    """
    try:
        # Utiliser l'utilisateur connecté
        created_by = current_user.id
        
        # Création du job
        # Convertir les données
        job_data_dict = job_data.model_dump()
        
        # Préparer les données pour la création
        # Convertir l'urgence en string en minuscules si elle existe
        urgency_value = None
        if 'urgency' in job_data_dict and job_data_dict['urgency']:
            if isinstance(job_data_dict['urgency'], str):
                urgency_value = job_data_dict['urgency'].lower()
            elif hasattr(job_data_dict['urgency'], 'value'):
                urgency_value = job_data_dict['urgency'].value
            else:
                urgency_value = str(job_data_dict['urgency']).lower()
        
        # Créer le job avec tous les nouveaux champs
        job = Job(
            title=job_data_dict['title'],
            department=job_data_dict.get('department'),
            manager_demandeur=job_data_dict.get('manager_demandeur'),
            entreprise=job_data_dict.get('entreprise'),
            contract_type=job_data_dict.get('contract_type'),
            motif_recrutement=job_data_dict.get('motif_recrutement'),
            urgency=urgency_value,
            date_prise_poste=job_data_dict.get('date_prise_poste'),
            missions_principales=job_data_dict.get('missions_principales'),
            missions_secondaires=job_data_dict.get('missions_secondaires'),
            kpi_poste=job_data_dict.get('kpi_poste'),
            niveau_formation=job_data_dict.get('niveau_formation'),
            experience_requise=job_data_dict.get('experience_requise'),
            competences_techniques_obligatoires=job_data_dict.get('competences_techniques_obligatoires'),
            competences_techniques_souhaitees=job_data_dict.get('competences_techniques_souhaitees'),
            competences_comportementales=job_data_dict.get('competences_comportementales'),
            langues_requises=job_data_dict.get('langues_requises'),
            certifications_requises=job_data_dict.get('certifications_requises'),
            localisation=job_data_dict.get('localisation'),
            mobilite_deplacements=job_data_dict.get('mobilite_deplacements'),
            teletravail=job_data_dict.get('teletravail'),
            contraintes_horaires=job_data_dict.get('contraintes_horaires'),
            criteres_eliminatoires=job_data_dict.get('criteres_eliminatoires'),
            salaire_minimum=job_data_dict.get('salaire_minimum'),
            salaire_maximum=job_data_dict.get('salaire_maximum'),
            avantages=job_data_dict.get('avantages'),
            evolution_poste=job_data_dict.get('evolution_poste'),
            budget=job_data_dict.get('budget'),  # Conservé pour compatibilité
            status="brouillon",
            job_description_file_path=job_data_dict.get('job_description_file_path'),
            created_by=created_by
        )
        
        session.add(job)
        session.commit()
        session.refresh(job)
        
        return job
    except Exception as e:
        session.rollback()
        logger.error(f"Erreur lors de la création du job: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création du besoin: {str(e)}"
        )


@router.post("/parse-job-description", response_model=JobCreate)
async def parse_job_description(
    job_description_file: UploadFile = File(..., description="Fichier fiche de poste (PDF ou Word)"),
    current_user: User = Depends(get_current_active_user),
):
    """
    Parse une fiche de poste et extrait automatiquement les informations du besoin
    
    Accepte un fichier PDF ou Word, extrait le texte, et utilise un LLM
    pour structurer les données selon le modèle JobCreate.
    """
    tmp_path = None
    try:
        # Vérifier que le fichier est autorisé
        if not job_description_file.filename or not is_allowed_file(job_description_file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Format de fichier non supporté. Formats acceptés: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Réinitialiser le pointeur du fichier pour pouvoir le lire
        await job_description_file.seek(0)
        
        # Extraire le texte de la fiche de poste
        job_text, tmp_path = await extract_text_from_job_description(job_description_file)
        
        if not job_text or len(job_text.strip()) < 50:
            # Nettoyer le fichier temporaire
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fiche de poste semble vide ou le texte n'a pas pu être extrait correctement"
            )
        
        # Parser le texte avec le LLM
        parsed_data = parse_job_description_with_llm(job_text)
        
        # Convertir experience_requise en int si présent
        if "experience_requise" in parsed_data and parsed_data["experience_requise"] is not None:
            try:
                parsed_data["experience_requise"] = int(parsed_data["experience_requise"])
            except (ValueError, TypeError):
                parsed_data["experience_requise"] = None
        
        # S'assurer que les listes sont des listes
        for field in ["competences_techniques_obligatoires", "competences_techniques_souhaitees", 
                     "competences_comportementales", "avantages"]:
            if field in parsed_data and parsed_data[field] is None:
                parsed_data[field] = []
            elif field not in parsed_data:
                parsed_data[field] = []
        
        # Convertir les salaires en float si présents
        for field in ["salaire_minimum", "salaire_maximum"]:
            if field in parsed_data and parsed_data[field] is not None:
                try:
                    parsed_data[field] = float(parsed_data[field])
                except (ValueError, TypeError):
                    parsed_data[field] = None
        
        # Créer la réponse avec le schéma JobCreate
        response_data = JobCreate(
            title=parsed_data.get("title", ""),
            department=parsed_data.get("department"),
            manager_demandeur=parsed_data.get("manager_demandeur"),
            entreprise=parsed_data.get("entreprise"),
            contract_type=parsed_data.get("contract_type"),
            motif_recrutement=parsed_data.get("motif_recrutement"),
            urgency=parsed_data.get("urgency", "moyenne"),
            date_prise_poste=parsed_data.get("date_prise_poste"),
            missions_principales=parsed_data.get("missions_principales"),
            missions_secondaires=parsed_data.get("missions_secondaires"),
            kpi_poste=parsed_data.get("kpi_poste"),
            niveau_formation=parsed_data.get("niveau_formation"),
            experience_requise=parsed_data.get("experience_requise"),
            competences_techniques_obligatoires=parsed_data.get("competences_techniques_obligatoires", []),
            competences_techniques_souhaitees=parsed_data.get("competences_techniques_souhaitees", []),
            competences_comportementales=parsed_data.get("competences_comportementales", []),
            langues_requises=parsed_data.get("langues_requises"),
            certifications_requises=parsed_data.get("certifications_requises"),
            localisation=parsed_data.get("localisation"),
            mobilite_deplacements=parsed_data.get("mobilite_deplacements"),
            teletravail=parsed_data.get("teletravail"),
            contraintes_horaires=parsed_data.get("contraintes_horaires"),
            criteres_eliminatoires=parsed_data.get("criteres_eliminatoires"),
            salaire_minimum=parsed_data.get("salaire_minimum"),
            salaire_maximum=parsed_data.get("salaire_maximum"),
            avantages=parsed_data.get("avantages", []),
            evolution_poste=parsed_data.get("evolution_poste"),
        )
        
        return response_data
        
    except HTTPException:
        # Nettoyer le fichier temporaire en cas d'erreur HTTP
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise
    except Exception as e:
        # Nettoyer le fichier temporaire en cas d'erreur
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        logger.error(f"Erreur lors du parsing de la fiche de poste: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du parsing de la fiche de poste: {str(e)}"
        )
    finally:
        # S'assurer que le fichier temporaire est toujours nettoyé
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@router.get("/", response_model=List[JobResponse])
def list_jobs(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[JobStatus] = None,
    session: Session = Depends(get_session)
):
    """
    Lister tous les besoins de recrutement
    """
    try:
        statement = select(Job)
        
        if status_filter:
            status_value = status_filter.value if hasattr(status_filter, 'value') else str(status_filter)
            statement = statement.where(Job.status == status_value)
        
        statement = statement.offset(skip).limit(limit).order_by(Job.created_at.desc())
        
        jobs = session.exec(statement).all()
        return jobs
    except Exception as e:
        # Gérer les erreurs de colonnes manquantes
        error_message = str(e)
        if "does not exist" in error_message or "UndefinedColumn" in error_message:
            logger.warning(f"Colonnes manquantes détectées, utilisation de requête SQL de fallback: {error_message}")
            session.rollback()
            
            # Utiliser une requête SQL brute qui sélectionne uniquement les colonnes existantes
            # Liste des colonnes de base (celles qui existent probablement)
            base_columns = [
                "id", "title", "department", "contract_type", "budget", "urgency", "status",
                "job_description_file_path", "created_by", "validated_by", "validated_at",
                "closed_at", "created_at", "updated_at"
            ]
            
            # Construire la requête SQL avec des paramètres sécurisés
            columns_str = ", ".join(base_columns)
            sql_query = f"SELECT {columns_str} FROM jobs"
            params = {}
            
            if status_filter:
                status_value = status_filter.value if hasattr(status_filter, 'value') else str(status_filter)
                sql_query += " WHERE status = :status_filter"
                params["status_filter"] = status_value
            
            sql_query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
            params["limit"] = limit
            params["offset"] = skip
            
            result = session.execute(text(sql_query), params)
            rows = result.fetchall()
            
            # Construire les réponses avec seulement les colonnes de base
            jobs_list = []
            for row in rows:
                # Convertir la row en dictionnaire
                if hasattr(row, '_mapping'):
                    job_dict = dict(row._mapping)
                elif hasattr(row, '_asdict'):
                    job_dict = row._asdict()
                else:
                    # Fallback: construire manuellement
                    job_dict = {}
                    for i, col in enumerate(base_columns):
                        if i < len(row):
                            job_dict[col] = row[i]
                
                # Ajouter les champs None pour les nouveaux champs manquants
                job_dict.update({
                    "manager_demandeur": None,
                    "entreprise": None,
                    "motif_recrutement": None,
                    "date_prise_poste": None,
                    "missions_principales": None,
                    "missions_secondaires": None,
                    "kpi_poste": None,
                    "niveau_formation": None,
                    "experience_requise": None,
                    "competences_techniques_obligatoires": None,
                    "competences_techniques_souhaitees": None,
                    "competences_comportementales": None,
                    "langues_requises": None,
                    "certifications_requises": None,
                    "localisation": None,
                    "mobilite_deplacements": None,
                    "teletravail": None,
                    "contraintes_horaires": None,
                    "criteres_eliminatoires": None,
                    "salaire_minimum": None,
                    "salaire_maximum": None,
                    "avantages": None,
                    "evolution_poste": None,
                })
                # Valider avec le schéma
                try:
                    job_response = JobResponse.model_validate(job_dict)
                    jobs_list.append(job_response)
                except Exception as validation_error:
                    logger.warning(f"Erreur de validation pour un job: {validation_error}")
                    continue
            
            return jobs_list
        else:
            # Pour les autres erreurs, relancer l'exception
            session.rollback()
            logger.error(f"Erreur lors de la récupération des jobs: {error_message}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des jobs: {error_message}"
            )


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Récupérer un besoin de recrutement par son ID
    """
    try:
        job = session.get(Job, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Besoin de recrutement non trouvé"
            )
        return job
    except Exception as e:
        # Gérer les erreurs de colonnes manquantes
        error_message = str(e)
        if "does not exist" in error_message or "UndefinedColumn" in error_message:
            logger.warning(f"Colonnes manquantes détectées pour get_job, utilisation de requête SQL de fallback: {error_message}")
            session.rollback()
            
            # Requête SQL de fallback
            base_columns = [
                "id", "title", "department", "contract_type", "budget", "urgency", "status",
                "job_description_file_path", "created_by", "validated_by", "validated_at",
                "closed_at", "created_at", "updated_at"
            ]
            
            columns_str = ", ".join(base_columns)
            sql_query = f"SELECT {columns_str} FROM jobs WHERE id = :job_id"
            
            result = session.execute(text(sql_query), {"job_id": str(job_id)})
            row = result.first()
            
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Besoin de recrutement non trouvé"
                )
            
            # Convertir la row en dictionnaire
            if hasattr(row, '_mapping'):
                job_dict = dict(row._mapping)
            elif hasattr(row, '_asdict'):
                job_dict = row._asdict()
            else:
                job_dict = {}
                for i, col in enumerate(base_columns):
                    if i < len(row):
                        job_dict[col] = row[i]
            
            # Ajouter les champs None pour les nouveaux champs manquants
            job_dict.update({
                "manager_demandeur": None,
                "entreprise": None,
                "motif_recrutement": None,
                "date_prise_poste": None,
                "missions_principales": None,
                "missions_secondaires": None,
                "kpi_poste": None,
                "niveau_formation": None,
                "experience_requise": None,
                "competences_techniques_obligatoires": None,
                "competences_techniques_souhaitees": None,
                "competences_comportementales": None,
                "langues_requises": None,
                "certifications_requises": None,
                "localisation": None,
                "mobilite_deplacements": None,
                "teletravail": None,
                "contraintes_horaires": None,
                "criteres_eliminatoires": None,
                "salaire_minimum": None,
                "salaire_maximum": None,
                "avantages": None,
                "evolution_poste": None,
            })
            
            return JobResponse.model_validate(job_dict)
        else:
            session.rollback()
            logger.error(f"Erreur lors de la récupération du job {job_id}: {error_message}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération du job: {error_message}"
            )


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: UUID,
    job_update: JobUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Mettre à jour un besoin de recrutement (sauvegarde en brouillon)
    
    Permet de modifier un besoin avant de le soumettre pour validation.
    Enregistre automatiquement l'historique des modifications.
    """
    try:
        job = session.get(Job, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Besoin de recrutement non trouvé"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du job {job_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération du besoin: {str(e)}"
        )
    
    # Mise à jour uniquement des champs fournis et enregistrement de l'historique
    try:
        update_data = job_update.model_dump(exclude_unset=True)
    except Exception as e:
        logger.error(f"Erreur lors du parsing des données de mise à jour: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Données de mise à jour invalides: {str(e)}"
        )
    
    # Mapping des noms de champs pour l'affichage dans l'historique
    field_labels = {
        'title': 'Intitulé du poste',
        'department': 'Département / Direction',
        'manager_demandeur': 'Manager demandeur',
        'entreprise': 'Entreprise',
        'contract_type': 'Type de contrat',
        'motif_recrutement': 'Motif du recrutement',
        'urgency': 'Priorité',
        'date_prise_poste': 'Date de prise de poste',
        'missions_principales': 'Missions principales',
        'missions_secondaires': 'Missions secondaires',
        'kpi_poste': 'KPI du poste',
        'niveau_formation': 'Niveau de formation',
        'experience_requise': 'Expérience requise',
        'competences_techniques_obligatoires': 'Compétences techniques obligatoires',
        'competences_techniques_souhaitees': 'Compétences techniques souhaitées',
        'competences_comportementales': 'Compétences comportementales',
        'langues_requises': 'Langues requises',
        'certifications_requises': 'Certifications requises',
        'localisation': 'Localisation',
        'mobilite_deplacements': 'Mobilité / déplacements',
        'teletravail': 'Télétravail',
        'contraintes_horaires': 'Contraintes horaires',
        'criteres_eliminatoires': 'Critères éliminatoires',
        'salaire_minimum': 'Salaire minimum',
        'salaire_maximum': 'Salaire maximum',
        'avantages': 'Avantages',
        'evolution_poste': 'Évolution du poste',
        'budget': 'Budget',
        'status': 'Statut',
    }
    
    # Convertir les valeurs en string pour l'historique
    def format_value(val):
        try:
            if val is None:
                return None
            if isinstance(val, list):
                return ', '.join(str(v) for v in val) if val else None
            if isinstance(val, (datetime, date)):
                return val.isoformat()
            if isinstance(val, bool):
                return str(val)
            if isinstance(val, (int, float)):
                return str(val)
            if isinstance(val, str):
                return val if val.strip() else None
            return str(val) if val else None
        except Exception as e:
            logger.warning(f"Erreur lors du formatage de la valeur {val}: {str(e)}")
            return str(val) if val is not None else None
    
    for field, new_value in update_data.items():
        # Ignorer les champs système qui ne doivent pas être modifiés directement
        if field in ['created_by', 'validated_by', 'validated_at', 'closed_at', 'created_at', 'updated_at']:
            continue
        
        # Convertir les dates depuis les strings ISO (format YYYY-MM-DD)
        if field == 'date_prise_poste' and isinstance(new_value, str) and new_value:
            try:
                # Le schéma Pydantic devrait déjà gérer la conversion, mais on s'assure ici
                if isinstance(new_value, str):
                    from datetime import datetime as dt
                    # Parser la date au format ISO (YYYY-MM-DD)
                    parsed_date = dt.fromisoformat(new_value).date()
                    new_value = parsed_date
            except (ValueError, AttributeError, TypeError) as e:
                logger.warning(f"Erreur lors de la conversion de la date {new_value}: {str(e)}")
                # Si la conversion échoue, on ignore ce champ
                continue
            
        # Récupérer l'ancienne valeur
        try:
            old_value = getattr(job, field, None)
        except AttributeError:
            # Le champ n'existe pas dans le modèle, on l'ignore
            logger.warning(f"Champ {field} n'existe pas dans le modèle Job, ignoré")
            continue
        
        old_value_str = format_value(old_value)
        new_value_str = format_value(new_value)
        
        # Comparer les valeurs (gérer le cas où les deux sont None)
        values_different = False
        if old_value_str is None and new_value_str is None:
            values_different = False
        elif old_value_str is None or new_value_str is None:
            values_different = True
        else:
            values_different = str(old_value_str) != str(new_value_str)
        
        # Ne créer une entrée d'historique que si la valeur a réellement changé
        if values_different:
            try:
                # Mettre à jour le champ
                setattr(job, field, new_value)
                
                # Créer une entrée d'historique
                try:
                    field_label = field_labels.get(field, field)
                    # Limiter la longueur du field_name à 100 caractères (contrainte de la base)
                    if len(field_label) > 100:
                        field_label = field_label[:97] + "..."
                    
                    # Limiter la longueur des valeurs pour éviter les erreurs de base de données
                    old_val = old_value_str[:5000] if old_value_str and len(old_value_str) > 5000 else old_value_str
                    new_val = new_value_str[:5000] if new_value_str and len(new_value_str) > 5000 else new_value_str
                    
                    history_entry = JobHistory(
                        job_id=job.id,
                        modified_by=current_user.id,
                        field_name=field_label,
                        old_value=old_val,
                        new_value=new_val
                    )
                    session.add(history_entry)
                except Exception as hist_error:
                    # Si l'historique échoue, on continue quand même avec la mise à jour
                    logger.warning(f"Impossible de créer l'entrée d'historique pour {field}: {str(hist_error)}", exc_info=True)
            except Exception as e:
                # Logger l'erreur mais continuer avec les autres champs
                logger.error(f"Erreur lors de la mise à jour du champ {field}: {str(e)}", exc_info=True)
                # Ne pas faire de rollback ici, on continue avec les autres champs
                continue
    
    # Gestion spéciale du statut : permettre au manager de changer le statut
    # Si le statut est modifié et devient "validé", enregistrer validated_by et validated_at
    if 'status' in update_data:
        new_status = update_data['status']
        if new_status == "validé" and job.status != "validé":
            # Si le statut devient "validé", enregistrer qui a validé et quand
            job.validated_by = current_user.id
            job.validated_at = datetime.utcnow()
        elif new_status != "validé" and job.status == "validé":
            # Si le statut passe de "validé" à autre chose, réinitialiser validated_by et validated_at
            job.validated_by = None
            job.validated_at = None
    
    # Si le statut n'est pas modifié et que ce n'est pas un manager qui modifie,
    # on remet en brouillon si ce n'était pas déjà validé (comportement pour recruteur)
    if 'status' not in update_data:
        # Vérifier si l'utilisateur est manager
        is_manager = current_user.role == "Manager" or current_user.role == "manager"
        if not is_manager and job.status != "validé":
            job.status = "brouillon"
    
    job.updated_at = datetime.utcnow()
    session.add(job)
    
    try:
        session.commit()
        session.refresh(job)
    except Exception as e:
        session.rollback()
        logger.error(f"Erreur lors de la sauvegarde des modifications du job {job_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour du besoin: {str(e)}"
        )
    
    return job


@router.post("/{job_id}/submit", response_model=JobResponse)
def submit_job_for_validation(
    job_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Soumettre un besoin pour validation (US01)
    
    Change le statut du besoin pour qu'il puisse être validé par un manager.
    Le besoin doit avoir tous les champs obligatoires remplis.
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Vérification des champs obligatoires
    if not job.title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le titre du poste est obligatoire"
        )
    
    # Le besoin reste en brouillon jusqu'à validation par un manager
    # Le statut sera changé à "validé" lors de la validation (US02)
    # Pour l'instant, on peut juste marquer qu'il est prêt pour validation
    # ou créer un nouveau statut "en_attente_validation"
    
    session.add(job)
    session.commit()
    session.refresh(job)
    
    return job


class JobValidation(BaseModel):
    """Schéma pour valider/rejeter un besoin"""
    validated: bool  # True = validé, False = rejeté
    feedback: Optional[str] = None  # Commentaire du manager


@router.post("/{job_id}/validate", response_model=JobResponse)
def validate_job(
    job_id: UUID,
    validation: JobValidation,
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_session)
):
    """
    Valider ou rejeter un besoin de recrutement (US02)
    
    Permet à un manager de valider ou rejeter un besoin soumis pour validation.
    Notification envoyée au recruteur.
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Enregistrer l'ancien statut pour l'historique
    old_status = job.status
    
    if validation.validated:
        # Valider le besoin
        job.status = "validé"
        job.validated_by = current_user.id
        job.validated_at = datetime.utcnow()
        
        # Enregistrer dans l'historique
        history_entry = JobHistory(
            job_id=job.id,
            modified_by=current_user.id,
            field_name="status",
            old_value=old_status,
            new_value="validé"
        )
        session.add(history_entry)
        
        # TODO: Envoyer une notification au recruteur
        # from services.notifications import create_notification
        # create_notification(...)
        
    else:
        # Rejeter le besoin (retour en brouillon)
        job.status = "brouillon"
        job.validated_by = None
        job.validated_at = None
        
        # Enregistrer dans l'historique
        history_entry = JobHistory(
            job_id=job.id,
            modified_by=current_user.id,
            field_name="status",
            old_value=old_status,
            new_value=f"Rejeté: {validation.feedback}" if validation.feedback else "Rejeté"
        )
        session.add(history_entry)
        
        # TODO: Envoyer une notification au recruteur avec le feedback
    
    job.updated_at = datetime.utcnow()
    session.add(job)
    session.commit()
    session.refresh(job)
    
    return job


@router.get("/pending-validation", response_model=List[JobResponse])
def get_pending_validation_jobs(
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_session)
):
    """
    Récupérer la liste des besoins en attente de validation (US02)
    
    Retourne les besoins qui ont été soumis mais pas encore validés/rejetés.
    """
    # Les besoins en brouillon qui ont été soumis (on peut ajouter un champ submitted_at si nécessaire)
    # Pour l'instant, on retourne les besoins en brouillon qui ne sont pas validés
    statement = select(Job).where(
        Job.status == "brouillon",
        Job.validated_by.is_(None)
    ).order_by(Job.created_at.desc())
    
    jobs = session.exec(statement).all()
    return jobs


@router.get("/{job_id}/history", response_model=List[dict])
def get_job_history(
    job_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupère l'historique des modifications d'un besoin de recrutement
    
    Retourne la liste des modifications apportées au besoin.
    """
    # Vérifier que le job existe
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Récupérer l'historique
    history_statement = select(JobHistory).where(
        JobHistory.job_id == job_id
    ).order_by(JobHistory.created_at.desc())
    
    history_entries = session.exec(history_statement).all()
    
    # Formater la réponse
    history_list = []
    for entry in history_entries:
        # Récupérer le nom du modificateur
        modifier = session.get(User, entry.modified_by)
        modifier_name = f"{modifier.first_name} {modifier.last_name}" if modifier else "Inconnu"
        
        history_list.append({
            "id": str(entry.id),
            "job_id": str(entry.job_id),
            "modified_by": str(entry.modified_by),
            "modifier_name": modifier_name,
            "field_name": entry.field_name,
            "old_value": entry.old_value,
            "new_value": entry.new_value,
            "created_at": entry.created_at.isoformat() if entry.created_at else None
        })
    
    return history_list

