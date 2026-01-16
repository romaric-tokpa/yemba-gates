"""
Routes d'authentification
"""
from datetime import timedelta
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlmodel import Session
from pydantic import BaseModel, EmailStr

from database_tenant import get_session
from models import User, UserRole, SecurityLog
from tenant_manager import identify_tenant_from_domain, get_tenant_engine, get_current_tenant_id
from sqlmodel import Session as SQLSession
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


class CompanyRegister(BaseModel):
    """Schéma pour l'inscription d'une entreprise"""
    # Informations entreprise
    company_name: str
    company_email: EmailStr  # Email de contact de l'entreprise
    company_phone: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None  # small, medium, large, enterprise
    
    # Informations administrateur
    admin_first_name: str
    admin_last_name: str
    admin_email: EmailStr
    admin_password: str
    
    # Sous-domaine optionnel (généré si non fourni)
    subdomain: Optional[str] = None


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    subdomain: Optional[str] = None  # Paramètre optionnel pour identifier le tenant
):
    """
    Connexion d'un utilisateur
    
    Accepte à la fois JSON et Form data pour plus de flexibilité.
    Le tenant peut être identifié via:
    - Le domaine (ex: entreprise.yemma-gates.com)
    - Le paramètre 'subdomain' dans la requête
    - Le header 'X-Tenant-Subdomain'
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Identifier le tenant AVANT de chercher l'utilisateur
        tenant_id = None
        
        # 1. Essayer depuis le domaine
        tenant_id = identify_tenant_from_domain(request)
        
        # 2. Essayer depuis le paramètre subdomain
        if not tenant_id and subdomain:
            from tenant_manager import get_master_session
            from sqlmodel import select
            from models_master import Company
            with get_master_session() as master_session:
                statement = select(Company).where(
                    Company.subdomain == subdomain,
                    Company.status == "active"
                )
                company = master_session.exec(statement).first()
                if company:
                    tenant_id = company.id
        
        # 3. Essayer depuis le header
        if not tenant_id:
            subdomain_header = request.headers.get("X-Tenant-Subdomain")
            if subdomain_header:
                from tenant_manager import get_master_session
                from sqlmodel import select
                from models_master import Company
                with get_master_session() as master_session:
                    statement = select(Company).where(
                        Company.subdomain == subdomain_header,
                        Company.status == "active"
                    )
                    company = master_session.exec(statement).first()
                    if company:
                        tenant_id = company.id
        
        # 4. Si toujours pas de tenant, utiliser l'entreprise par défaut
        if not tenant_id:
            from tenant_manager import get_master_session
            from sqlmodel import select
            from models_master import Company
            with get_master_session() as master_session:
                statement = select(Company).where(Company.subdomain == "default")
                company = master_session.exec(statement).first()
                if company:
                    tenant_id = company.id
                    logger.info(f"🔐 [LOGIN] Utilisation de l'entreprise par défaut: {company.name}")
        
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant non identifié. Spécifiez le subdomain ou utilisez un domaine personnalisé."
            )
        
        # Obtenir la session du tenant
        from tenant_manager import get_tenant_engine
        engine = get_tenant_engine(tenant_id)
        if not engine:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Base de données du tenant non disponible"
            )
        session = SQLSession(engine)
        
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
                # Vérifier si subdomain est dans le body
                if not subdomain and "subdomain" in body:
                    subdomain = body.get("subdomain")
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
            logger.info(f"🔐 [LOGIN] Tentative de connexion - Email: {username}, Tenant: {tenant_id}, Content-Type: {content_type}")
            
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
            
            # Créer le token avec company_id pour le multi-tenant
            try:
                access_token = create_access_token(
                    data={
                        "sub": str(user.id),
                        "role": user_role,
                        "company_id": str(user.company_id)  # ✅ Ajout pour multi-tenant
                    },
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
                log = SecurityLog(
                    user_id=user.id,
                    action="login",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=True,
                    company_id=tenant_id  # Ajouter company_id au log
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
        finally:
            session.close()
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
            data={
                "sub": str(new_user.id),
                "role": new_user.role,
                "company_id": str(new_user.company_id)  # ✅ Ajout pour multi-tenant
            },
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


class ChangePasswordRequest(BaseModel):
    """Schéma pour changer le mot de passe"""
    current_password: str
    new_password: str


class ChangePasswordResponse(BaseModel):
    """Réponse après changement de mot de passe"""
    message: str
    success: bool


@router.patch("/me/password", response_model=ChangePasswordResponse)
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Permet à l'utilisateur connecté de changer son mot de passe
    """
    import logging
    from auth import verify_password
    logger = logging.getLogger(__name__)
    
    # Vérifier que l'utilisateur a un mot de passe actuel
    if not current_user.password_hash:
        logger.warning(f"❌ [CHANGE_PASSWORD] Aucun mot de passe défini pour l'utilisateur: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun mot de passe actuel défini. Contactez un administrateur."
        )
    
    # Vérifier le mot de passe actuel
    if not verify_password(password_data.current_password, current_user.password_hash):
        logger.warning(f"❌ [CHANGE_PASSWORD] Mot de passe actuel incorrect pour l'utilisateur: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect"
        )
    
    # Vérifier que le nouveau mot de passe est différent de l'ancien
    if verify_password(password_data.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit être différent de l'ancien"
        )
    
    # Vérifier la longueur minimale du nouveau mot de passe
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit contenir au moins 6 caractères"
        )
    
    # Mettre à jour le mot de passe
    try:
        current_user.password_hash = get_password_hash(password_data.new_password)
        current_user.updated_at = datetime.utcnow()
        session.add(current_user)
        session.commit()
        session.refresh(current_user)
        
        logger.info(f"✅ [CHANGE_PASSWORD] Mot de passe changé avec succès pour l'utilisateur: {current_user.email}")
        
        return ChangePasswordResponse(
            message="Mot de passe changé avec succès",
            success=True
        )
    except Exception as e:
        session.rollback()
        logger.error(f"❌ [CHANGE_PASSWORD] Erreur lors du changement de mot de passe pour {current_user.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du changement de mot de passe"
        )


class RegisterCompanyResponse(BaseModel):
    """Réponse pour l'inscription d'entreprise"""
    success: bool
    message: str
    company_id: Optional[str] = None
    subdomain: Optional[str] = None
    redirect: str = "/login"
    access_token: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/register-company", response_model=RegisterCompanyResponse, status_code=status.HTTP_201_CREATED)
async def register_company(company_data: CompanyRegister):
    """
    Inscription d'une nouvelle entreprise avec création du premier administrateur
    
    Processus complet:
    1. Validation des données
    2. Création de l'entreprise dans MASTER_DB
    3. Création d'une base de données PostgreSQL dédiée
    4. Application du schéma dans la nouvelle base
    5. Création d'une subscription avec plan par défaut
    6. Création de l'utilisateur administrateur
    7. Rollback complet en cas d'erreur
    """
    import logging
    import re
    from datetime import datetime, timedelta
    from tenant_manager import get_master_session
    from models_master import Company, TenantDatabase, Plan, Subscription
    from sqlmodel import select, Session as SQLSession, create_engine
    from sqlalchemy.pool import QueuePool
    from utils.db_creator import (
        create_tenant_database,
        apply_schema_to_database,
        drop_tenant_database,
        sanitize_db_name
    )
    import os
    
    logger = logging.getLogger(__name__)
    logger.info(f"🚀 [REGISTER_COMPANY] Début de l'inscription pour: {company_data.company_name}")
    
    # Variables pour rollback
    created_company_id = None
    created_db_name = None
    master_session = None
    tenant_engine = None
    
    try:
        # ====================================================================
        # ÉTAPE 0: VALIDATION INITIALE
        # ====================================================================
        
        # 0.1 Valider la robustesse du mot de passe
        if len(company_data.admin_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le mot de passe doit contenir au moins 8 caractères"
            )
        
        # 0.2 Vérifier l'unicité de company_email dans MASTER_DB
        with get_master_session() as session:
            existing_company = session.exec(
                select(Company).where(Company.contact_email == company_data.company_email)
            ).first()
            if existing_company:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Une entreprise avec cet email existe déjà"
                )
        
        # 0.3 S'assurer que la base MASTER est initialisée
        try:
            with get_master_session() as test_session:
                test_session.exec(select(Company).limit(1))
                logger.info("✅ [REGISTER_COMPANY] Base MASTER accessible")
        except Exception as e:
            logger.warning(f"⚠️ [REGISTER_COMPANY] Problème d'accès à la base MASTER: {str(e)}")
        
        # ====================================================================
        # ÉTAPE 1: VALIDATION ET GÉNÉRATION SUBDOMAIN
        # ====================================================================
        
        # 1.1 Générer et normaliser le subdomain
        subdomain = company_data.subdomain
        if subdomain:
            # Nettoyer le subdomain (minuscules, alphanumériques et tirets uniquement)
            subdomain = re.sub(r'[^a-z0-9-]', '', subdomain.lower())
            subdomain = re.sub(r'-+', '-', subdomain)  # Remplacer les tirets multiples par un seul
            subdomain = subdomain.strip('-')  # Supprimer les tirets en début/fin
            if not subdomain or len(subdomain) < 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Le sous-domaine doit contenir au moins 3 caractères alphanumériques"
                )
        else:
            # Générer un subdomain depuis le nom de l'entreprise
            subdomain = re.sub(r'[^a-z0-9-]', '', company_data.company_name.lower()[:20])
            subdomain = re.sub(r'-+', '-', subdomain)  # Remplacer les tirets multiples par un seul
            subdomain = subdomain.strip('-')  # Supprimer les tirets en début/fin
            if not subdomain:
                subdomain = f"company_{uuid4().hex[:8]}"
        
        # 1.2 Vérifier que le subdomain n'existe pas déjà
        with get_master_session() as session:
            existing_company = session.exec(
                select(Company).where(Company.subdomain == subdomain)
            ).first()
            if existing_company:
                # Générer un subdomain unique
                subdomain = f"{subdomain}_{uuid4().hex[:6]}"
                logger.info(f"ℹ️ [REGISTER_COMPANY] Subdomain modifié pour garantir l'unicité: {subdomain}")
        
        logger.info(f"✅ [REGISTER_COMPANY] Validation OK - Subdomain: {subdomain}")
        
        # ====================================================================
        # ÉTAPE 2: CRÉATION ENTREPRISE (MASTER_DB)
        # ====================================================================
        
        master_session = get_master_session().__enter__()
        created_company_id = None
        
        try:
            # Récupérer le plan par défaut (FREE ou TRIAL)
            default_plan = master_session.exec(
                select(Plan).where(Plan.plan_type == "free").limit(1)
            ).first()
            
            if not default_plan:
                # Créer un plan FREE par défaut si nécessaire
                default_plan = Plan(
                    name="Free Plan",
                    plan_type="free",
                    max_users=5,
                    price_monthly=0.0,
                    features='{"basic_features": true}',
                    is_active=True
                )
                master_session.add(default_plan)
                master_session.commit()
                master_session.refresh(default_plan)
            
            # Créer l'entreprise
            new_company = Company(
                name=company_data.company_name,
                subdomain=subdomain,
                contact_email=company_data.company_email,
                contact_phone=company_data.company_phone,
                country=company_data.country,
                industry=company_data.industry,
                size=company_data.company_size,
                status="active",
                activated_at=datetime.utcnow(),
                trial_ends_at=datetime.utcnow() + timedelta(days=30)
            )
            master_session.add(new_company)
            master_session.commit()
            master_session.refresh(new_company)
            created_company_id = new_company.id
            
            logger.info(f"✅ [REGISTER_COMPANY] Entreprise créée: {new_company.id}")
            
            # ====================================================================
            # ÉTAPE 3: CRÉER LA BASE DE DONNÉES DÉDIÉE
            # ====================================================================
            
            db_name = f"yemmagates_{new_company.id.hex[:12]}"
            db_name = sanitize_db_name(db_name)
            created_db_name = db_name
            
            logger.info(f"🔄 [REGISTER_COMPANY] Création de la base de données: {db_name}")
            
            # Récupérer les credentials PostgreSQL
            db_user = os.getenv("POSTGRES_USER", "postgres")
            db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
            db_host = os.getenv("POSTGRES_HOST", "localhost")
            db_port = os.getenv("POSTGRES_PORT", "5432")
            
            # Créer la base de données
            db_created, db_error = create_tenant_database(db_name)
            if not db_created:
                error_detail = f"Impossible de créer la base de données: {db_name}"
                if db_error:
                    error_detail += f" - {db_error}"
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=error_detail
                )
            
            logger.info(f"✅ [REGISTER_COMPANY] Base de données créée: {db_name}")
            
            # ====================================================================
            # ÉTAPE 4: ENREGISTRER LE MAPPING TENANT
            # ====================================================================
            
            tenant_db = TenantDatabase(
                company_id=new_company.id,
                db_name=db_name,
                db_host=db_host,
                db_port=int(db_port),
                db_user=db_user,
                status="active",
                provisioned_at=datetime.utcnow()
            )
            master_session.add(tenant_db)
            master_session.commit()
            
            logger.info(f"✅ [REGISTER_COMPANY] Mapping tenant créé")
            
            # ====================================================================
            # ÉTAPE 5: CRÉER LA SUBSCRIPTION
            # ====================================================================
            
            subscription = Subscription(
                company_id=new_company.id,
                plan_id=default_plan.id,
                status="trial",
                start_date=datetime.utcnow(),
                trial_ends_at=datetime.utcnow() + timedelta(days=30)
            )
            master_session.add(subscription)
            master_session.commit()
            
            logger.info(f"✅ [REGISTER_COMPANY] Subscription créée (Plan: {default_plan.name})")
            
            # ====================================================================
            # ÉTAPE 6: APPLIQUER LE SCHÉMA DANS LA NOUVELLE BASE
            # ====================================================================
            
            tenant_db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
            
            logger.info(f"🔄 [REGISTER_COMPANY] Application du schéma...")
            if not apply_schema_to_database(tenant_db_url):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Impossible d'appliquer le schéma à la base de données"
                )
            
            logger.info(f"✅ [REGISTER_COMPANY] Schéma appliqué")
            
            # ====================================================================
            # ÉTAPE 7: CRÉER L'UTILISATEUR ADMIN
            # ====================================================================
            
            tenant_engine = create_engine(tenant_db_url, poolclass=QueuePool, pool_size=5, max_overflow=10, echo=False)
            tenant_session = SQLSession(tenant_engine)
            
            try:
                # Vérifier l'unicité de l'email admin dans la base tenant
                existing_user = get_user_by_email(company_data.admin_email, tenant_session)
                if existing_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Un utilisateur avec cet email existe déjà"
                    )
                
                # Créer l'administrateur
                hashed_password = get_password_hash(company_data.admin_password)
                
                new_admin = User(
                    email=company_data.admin_email,
                    password_hash=hashed_password,
                    first_name=company_data.admin_first_name,
                    last_name=company_data.admin_last_name,
                    role="administrateur",
                    phone=company_data.company_phone,
                    is_active=True,
                    company_id=new_company.id
                )
                
                tenant_session.add(new_admin)
                tenant_session.commit()
                tenant_session.refresh(new_admin)
                
                if not new_admin.id:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Erreur lors de la création de l'administrateur: ID non généré"
                    )
                
                logger.info(f"✅ [REGISTER_COMPANY] Administrateur créé: {new_admin.email}")
                
                # ====================================================================
                # ÉTAPE 8: CRÉER LE TOKEN ET RETOURNER LA RÉPONSE
                # ====================================================================
                
                access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                access_token = create_access_token(
                    data={
                        "sub": str(new_admin.id),
                        "role": new_admin.role,
                        "company_id": str(new_company.id)
                    },
                    expires_delta=access_token_expires
                )
                
                master_session.__exit__(None, None, None)
                master_session = None
                tenant_session.close()
                tenant_engine.dispose()
                tenant_engine = None
                
                logger.info(f"✅ [REGISTER_COMPANY] Inscription terminée avec succès!")
                
                return RegisterCompanyResponse(
                    success=True,
                    message="Entreprise créée avec succès",
                    company_id=str(new_company.id),
                    subdomain=subdomain,
                    redirect="/login",
                    access_token=access_token,
                    user_id=str(new_admin.id)
                )
            except Exception as e:
                tenant_session.rollback()
                tenant_session.close()
                raise
        except Exception as e:
            if master_session:
                try:
                    master_session.rollback()
                    master_session.__exit__(type(e), e, e.__traceback__)
                except:
                    pass
            
            # ROLLBACK: Supprimer la base de données si créée
            if created_db_name:
                logger.warning(f"🗑️ [REGISTER_COMPANY] Rollback: Suppression de la base {created_db_name}")
                try:
                    drop_tenant_database(created_db_name)
                except Exception as drop_error:
                    logger.error(f"❌ [REGISTER_COMPANY] Erreur lors de la suppression: {str(drop_error)}")
            
            raise
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"❌ [REGISTER_COMPANY] Erreur: {str(e)}")
        logger.error(f"❌ [REGISTER_COMPANY] Traceback:\n{traceback.format_exc()}")
        
        # ROLLBACK final
        if created_db_name:
            try:
                drop_tenant_database(created_db_name)
            except:
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'inscription: {str(e)}"
        )
    finally:
        # Nettoyage
        if master_session:
            try:
                master_session.__exit__(None, None, None)
            except:
                pass
        if tenant_engine:
            try:
                tenant_engine.dispose()
            except:
                pass


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

