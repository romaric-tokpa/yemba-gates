"""
Routes d'authentification
"""
from datetime import timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlmodel import Session
from pydantic import BaseModel, EmailStr

from database import get_session
from models import User, UserRole, SecurityLog
from auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    get_user_by_email,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from fastapi import Request

router = APIRouter(prefix="/auth", tags=["auth"])
from datetime import datetime


class Token(BaseModel):
    """Schéma de réponse pour le token"""
    access_token: str
    token_type: str
    user_id: str
    user_role: str
    user_email: str
    user_name: str


class UserLogin(BaseModel):
    """Schéma pour la connexion"""
    email: EmailStr
    password: str


class UserRegister(BaseModel):
    """Schéma pour l'inscription"""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str  # Accepter une string directement
    phone: Optional[str] = None
    department: Optional[str] = None


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Connexion d'un utilisateur
    
    Accepte à la fois JSON et Form data pour plus de flexibilité
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Détecter le type de contenu
        content_type = request.headers.get("content-type", "")
        
        # Extraire username et password selon le type de contenu
        username = None
        password = None
        
        if "application/json" in content_type:
            # JSON body
            body = await request.json()
            username = body.get("email") or body.get("username")
            password = body.get("password")
        elif "application/x-www-form-urlencoded" in content_type:
            # Form data
            form_data = await request.form()
            username_val = form_data.get("username") or form_data.get("email")
            password_val = form_data.get("password")
            
            # Extraire la valeur si c'est un UploadFile ou autre objet
            if username_val:
                username = username_val if isinstance(username_val, str) else str(username_val)
            if password_val:
                password = password_val if isinstance(password_val, str) else str(password_val)
        else:
            # Essayer Form() en fallback
            try:
                form_data = await request.form()
                username_val = form_data.get("username") or form_data.get("email")
                password_val = form_data.get("password")
                
                if username_val:
                    username = username_val if isinstance(username_val, str) else str(username_val)
                if password_val:
                    password = password_val if isinstance(password_val, str) else str(password_val)
            except Exception as e:
                logger.warning(f"⚠️ [LOGIN] Erreur lors de l'extraction du formulaire: {str(e)}")
                # Dernier recours: essayer JSON
                try:
                    body = await request.json()
                    username = body.get("email") or body.get("username")
                    password = body.get("password")
                except Exception as e2:
                    logger.error(f"❌ [LOGIN] Impossible d'extraire les données: {str(e2)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid request format. Use JSON or form data."
                    )
        
        # Logger les paramètres reçus (sans le mot de passe complet pour la sécurité)
        logger.info(f"🔐 [LOGIN] Tentative de connexion - Email: {username}, Password length: {len(password) if password else 0}, Content-Type: {content_type}")
        
        # Valider les paramètres d'entrée
        if not username or not password:
            logger.warning(f"❌ [LOGIN] Paramètres manquants - Username: {bool(username)}, Password: {bool(password)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )
        
        # Récupérer l'IP et le user agent
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", None)
        logger.info(f"🔐 [LOGIN] IP: {ip_address}, User-Agent: {user_agent}")
        
        # Authentifier l'utilisateur
        logger.info(f"🔐 [LOGIN] Appel de authenticate_user pour: {username}")
        user = authenticate_user(username, password, session)
        if not user:
            # Vérifier pourquoi l'authentification a échoué pour donner un message plus précis
            failed_user = get_user_by_email(username, session)
            
            error_detail = "Incorrect email or password"
            if not failed_user:
                error_detail = "User not found"
                logger.warning(f"❌ [LOGIN] Utilisateur non trouvé: {username}")
            elif not failed_user.is_active:
                error_detail = "User account is inactive"
                logger.warning(f"❌ [LOGIN] Compte inactif: {username}")
            elif not failed_user.password_hash:
                error_detail = "User account has no password set"
                logger.warning(f"❌ [LOGIN] Aucun mot de passe défini pour: {username}")
            else:
                logger.warning(f"❌ [LOGIN] Mot de passe incorrect pour: {username}")
            
            # Enregistrer la tentative de connexion échouée (non bloquant)
            try:
                log = SecurityLog(
                    user_id=failed_user.id if failed_user else None,
                    action="failed_login",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    details=error_detail
                )
                session.add(log)
                session.commit()
            except Exception as e:
                # Ne pas faire échouer la connexion si l'enregistrement du log échoue
                logger.warning(f"⚠️ [LOGIN] Impossible d'enregistrer le log de sécurité (non bloquant): {str(e)}")
                try:
                    session.rollback()
                except:
                    pass
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_detail,
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Vérifier que l'utilisateur a tous les champs requis
        if not user.id:
            logger.error(f"User {username} has no ID")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User data is incomplete"
            )
        
        if not user.email:
            logger.error(f"User {user.id} has no email")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User data is incomplete"
            )
        
        # Préparer les données pour le token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        # user.role est maintenant une string, pas un enum
        user_role = user.role if isinstance(user.role, str) else (user.role.value if hasattr(user.role, 'value') else str(user.role))
        
        # Créer le token
        try:
            access_token = create_access_token(
                data={"sub": str(user.id), "role": user_role},
                expires_delta=access_token_expires
            )
        except Exception as e:
            logger.error(f"Erreur lors de la création du token: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error creating access token"
            )
        
        # Construire le nom de l'utilisateur (gérer les cas None)
        first_name = user.first_name or ""
        last_name = user.last_name or ""
        user_name = f"{first_name} {last_name}".strip() or user.email
        
        # Enregistrer la connexion réussie (non bloquant)
        try:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent", None)
            log = SecurityLog(
                user_id=user.id,
                action="login",
                ip_address=ip_address,
                user_agent=user_agent,
                success=True
            )
            session.add(log)
            session.commit()
        except Exception as e:
            # Ne pas faire échouer la connexion si l'enregistrement du log échoue
            logger.warning(f"⚠️ [LOGIN] Impossible d'enregistrer le log de sécurité (non bloquant): {str(e)}")
            try:
                session.rollback()
            except:
                pass
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "user_role": user_role,
            "user_email": user.email,
            "user_name": user_name
        }
    except HTTPException:
        # Relancer les HTTPException telles quelles
        raise
    except Exception as e:
        # Logger l'erreur pour le débogage avec plus de détails
        username_received = username if 'username' in locals() else 'N/A'
        logger.error(f"❌ [LOGIN] Erreur lors de la connexion pour {username_received}: {str(e)}", exc_info=True)
        logger.error(f"❌ [LOGIN] Type d'erreur: {type(e).__name__}")
        
        # Donner un message d'erreur plus informatif
        error_detail = f"Internal server error during login: {str(e)}"
        if "SecurityLog" in str(e) or "security_log" in str(e).lower():
            error_detail = "Error logging security event (login may still succeed)"
        elif "password" in str(e).lower() or "hash" in str(e).lower():
            error_detail = "Error during password verification"
        elif "session" in str(e).lower() or "database" in str(e).lower():
            error_detail = "Database connection error"
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserRegister,
    session: Session = Depends(get_session)
):
    """
    Inscription d'un nouvel utilisateur (pour le développement)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Vérifier si l'utilisateur existe déjà
        existing_user = get_user_by_email(user_data.email, session)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Créer le nouvel utilisateur
        hashed_password = get_password_hash(user_data.password)
        
        # Valider et normaliser le rôle
        role_lower = user_data.role.lower() if user_data.role else "recruteur"
        valid_roles = ["recruteur", "manager", "client", "administrateur"]
        if role_lower not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Rôle invalide. Rôles valides: {', '.join(valid_roles)}"
            )
        
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=role_lower,  # Stocker directement la valeur string en minuscules
            phone=user_data.phone,
            department=user_data.department,
            is_active=True
        )
        
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        # Vérifier que l'utilisateur a été créé avec succès
        if not new_user.id:
            logger.error("L'utilisateur n'a pas d'ID après création")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la création de l'utilisateur"
            )
        
        # Créer le token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(new_user.id), "role": new_user.role},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(new_user.id),
            "user_role": new_user.role,
            "user_email": new_user.email,
            "user_name": f"{new_user.first_name} {new_user.last_name}"
        }
    except HTTPException:
        # Relancer les HTTPException telles quelles
        raise
    except Exception as e:
        # Logger l'erreur pour le débogage
        logger.error(f"Erreur lors de l'inscription: {str(e)}", exc_info=True)
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur interne du serveur: {str(e)}"
        )


@router.get("/me")
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère les informations de l'utilisateur connecté
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role,  # Déjà une string
        "phone": current_user.phone,
        "department": current_user.department,
        "is_active": current_user.is_active
    }


@router.get("/users")
def list_users_for_interviews(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Liste les utilisateurs pour la sélection d'interviewers et participants
    Accessible aux recruteurs, managers et administrateurs
    """
    from sqlmodel import select
    
    # Vérifier que l'utilisateur a les permissions nécessaires
    if current_user.role not in [UserRole.RECRUTEUR.value, UserRole.MANAGER.value, UserRole.ADMINISTRATEUR.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas les permissions nécessaires pour accéder à cette ressource"
        )
    
    statement = select(User).where(User.is_active == True).order_by(User.first_name, User.last_name)
    users = session.exec(statement).all()
    
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "phone": user.phone,
            "department": user.department,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None
        }
        for user in users
    ]

