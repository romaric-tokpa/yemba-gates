"""
Gestionnaire de tenants et middleware pour l'isolation multi-tenant
"""
import os
import logging
from typing import Optional, Dict
from uuid import UUID
from sqlmodel import Session, create_engine
from sqlalchemy import Engine
from sqlalchemy.pool import QueuePool
from contextvars import ContextVar
from fastapi import Request, HTTPException, status
from jose import JWTError, jwt

from models_master import Company, TenantDatabase

logger = logging.getLogger(__name__)

# Context variable pour stocker le tenant actuel dans le contexte de la requête
current_tenant: ContextVar[Optional[UUID]] = ContextVar('current_tenant', default=None)
current_tenant_db: ContextVar[Optional[Engine]] = ContextVar('current_tenant_db', default=None)

# Cache des connexions DB par tenant (pour éviter de recréer les connexions)
_tenant_engines: Dict[UUID, Engine] = {}

# Connexion à la base MASTER
MASTER_DB_URL = os.getenv(
    "MASTER_DB_URL",
    "postgresql://postgres:postgres@localhost:5432/yemma_gates_master"
)
master_engine = create_engine(MASTER_DB_URL, poolclass=QueuePool, pool_size=5, max_overflow=10)


def get_master_session() -> Session:
    """Retourne une session pour la base MASTER"""
    return Session(master_engine)


def get_tenant_by_id(company_id: UUID) -> Optional[Company]:
    """Récupère une entreprise depuis la base MASTER"""
    try:
        with get_master_session() as session:
            company = session.get(Company, company_id)
            if company and company.status == "active":
                return company
            return None
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du tenant {company_id}: {str(e)}")
        return None


def get_tenant_database(company_id: UUID) -> Optional[TenantDatabase]:
    """Récupère les informations de la base de données d'un tenant"""
    try:
        from sqlmodel import select
        with get_master_session() as session:
            statement = select(TenantDatabase).where(
                TenantDatabase.company_id == company_id,
                TenantDatabase.status == "active"
            )
            tenant_db = session.exec(statement).first()
            return tenant_db
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de la DB du tenant {company_id}: {str(e)}")
        return None


def get_tenant_engine(company_id: UUID) -> Optional[Engine]:
    """
    Retourne l'engine SQLAlchemy pour la base de données d'un tenant
    Utilise un cache pour éviter de recréer les connexions
    """
    # Vérifier le cache
    if company_id in _tenant_engines:
        return _tenant_engines[company_id]
    
    # Récupérer les informations de la base
    tenant_db = get_tenant_database(company_id)
    if not tenant_db:
        logger.error(f"Base de données non trouvée pour le tenant {company_id}")
        return None
    
    # Construire l'URL de connexion
    db_user = tenant_db.db_user or os.getenv("POSTGRES_USER", "postgres")
    db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
    
    db_url = f"postgresql://{db_user}:{db_password}@{tenant_db.db_host}:{tenant_db.db_port}/{tenant_db.db_name}"
    
    # Créer l'engine avec un pool de connexions
    engine = create_engine(
        db_url,
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        echo=False
    )
    
    # Mettre en cache
    _tenant_engines[company_id] = engine
    
    logger.info(f"Connexion créée pour le tenant {company_id} (DB: {tenant_db.db_name})")
    return engine


def get_tenant_session() -> Session:
    """
    Retourne une session pour la base de données du tenant actuel
    Doit être appelé après que le middleware ait défini current_tenant
    """
    tenant_id = current_tenant.get()
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant non identifié. Veuillez vous reconnecter."
        )
    
    engine = current_tenant_db.get()
    if not engine:
        engine = get_tenant_engine(tenant_id)
        if not engine:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Impossible de se connecter à la base de données du tenant"
            )
        current_tenant_db.set(engine)
    
    return Session(engine)


def identify_tenant_from_token(token: str) -> Optional[UUID]:
    """
    Identifie le tenant depuis le token JWT
    Le token doit contenir 'company_id' dans le payload
    """
    # Import local pour éviter la dépendance circulaire
    from auth import SECRET_KEY, ALGORITHM
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        company_id_str = payload.get("company_id")
        if not company_id_str:
            logger.warning("Token JWT sans company_id")
            return None
        
        return UUID(company_id_str)
    except JWTError as e:
        logger.warning(f"Erreur de décodage JWT: {str(e)}")
        return None
    except ValueError as e:
        logger.error(f"Erreur de format UUID pour company_id: {str(e)}")
        return None


def identify_tenant_from_domain(request: Request) -> Optional[UUID]:
    """
    Identifie le tenant depuis le domaine de la requête
    Exemple: entreprise.yemma-gates.com -> entreprise
    """
    host = request.headers.get("host", "")
    
    # Extraire le sous-domaine
    if "." in host:
        subdomain = host.split(".")[0]
        
        # Chercher l'entreprise par sous-domaine
        try:
            from sqlmodel import select
            with get_master_session() as session:
                statement = select(Company).where(
                    Company.subdomain == subdomain,
                    Company.status == "active"
                )
                company = session.exec(statement).first()
                return company.id if company else None
        except Exception as e:
            logger.error(f"Erreur lors de l'identification par domaine: {str(e)}")
            return None
    
    return None


async def tenant_middleware(request: Request, call_next):
    """
    Middleware FastAPI pour identifier et isoler les tenants
    """
    # IMPORTANT: Laisser passer les requêtes OPTIONS (preflight CORS) sans traitement
    # Le middleware CORS gérera ces requêtes avant que ce middleware ne soit appelé
    # Mais on s'assure quand même de ne pas bloquer les requêtes OPTIONS
    if request.method == "OPTIONS":
        # Laisser le middleware CORS gérer cette requête
        response = await call_next(request)
        # S'assurer que les headers CORS sont présents
        # Note: On ne peut pas utiliser "*" avec allow_credentials=True, il faut spécifier explicitement
        origin = request.headers.get("origin")
        if origin:
            # Vérifier si l'origine est autorisée (liste des origines autorisées)
            allowed_origins = [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "http://0.0.0.0:3000",
                "http://0.0.0.0:3001",
            ]
            # Ajouter les origines depuis la variable d'environnement
            import os
            allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
            if allowed_origins_env:
                allowed_origins.extend([o.strip() for o in allowed_origins_env.split(",") if o.strip()])
            
            if origin in allowed_origins or os.getenv("ENVIRONMENT", "development") == "development":
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                # Spécifier explicitement les headers autorisés (ne pas utiliser "*" avec credentials)
                response.headers["Access-Control-Allow-Headers"] = "authorization, content-type, x-tenant-subdomain, x-requested-with"
                response.headers["Access-Control-Expose-Headers"] = "*"
        return response
    
    tenant_id = None
    
    # 1. Essayer d'identifier le tenant depuis le token JWT (si authentifié)
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        tenant_id = identify_tenant_from_token(token)
    
    # 2. Si pas de token, essayer depuis le domaine (pour les routes publiques)
    # Note: Pour le login, on peut identifier le tenant depuis le domaine ou un paramètre
    if not tenant_id:
        tenant_id = identify_tenant_from_domain(request)
        
        # Pour la route de login, permettre l'identification depuis un paramètre
        if not tenant_id and request.url.path == "/auth/login":
            # Essayer de récupérer depuis un paramètre de requête ou header
            subdomain = request.headers.get("X-Tenant-Subdomain") or request.query_params.get("subdomain")
            if subdomain:
                try:
                    from sqlmodel import select
                    with get_master_session() as session:
                        statement = select(Company).where(
                            Company.subdomain == subdomain,
                            Company.status == "active"
                        )
                        company = session.exec(statement).first()
                        if company:
                            tenant_id = company.id
                except Exception as e:
                    logger.debug(f"Impossible d'identifier le tenant depuis le subdomain: {str(e)}")
    
    # 3. Si toujours pas de tenant, vérifier si c'est une route publique
    if not tenant_id:
        # Normaliser le chemin en enlevant le préfixe /api s'il est présent
        path = request.url.path
        if path.startswith("/api"):
            path = path[4:]  # Enlever "/api"
        
        # Routes publiques qui n'ont pas besoin de tenant
        public_routes = ["/docs", "/openapi.json", "/health", "/auth/login", "/auth/register", "/auth/register-company"]
        if any(path.startswith(route) for route in public_routes):
            # Pour les routes publiques, on continue sans tenant
            logger.info(f"✅ [TENANT] Route publique détectée: {request.url.path} (normalisé: {path})")
            response = await call_next(request)
            return response
        else:
            # Pour les autres routes, un tenant est requis
            logger.warning(f"⚠️ [TENANT] Route protégée sans tenant: {request.url.path} (normalisé: {path})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tenant non identifié. Veuillez vous connecter."
            )
    
    # 4. Vérifier que le tenant existe et est actif
    company = get_tenant_by_id(tenant_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant non trouvé ou inactif"
        )
    
    # 5. Vérifier que la base de données du tenant est disponible
    tenant_db = get_tenant_database(tenant_id)
    if not tenant_db or tenant_db.status != "active":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de données du tenant non disponible"
        )
    
    # 6. Définir le tenant dans le contexte
    current_tenant.set(tenant_id)
    
    # 7. Obtenir l'engine de la base du tenant
    engine = get_tenant_engine(tenant_id)
    if engine:
        current_tenant_db.set(engine)
    
    # 8. Logger l'accès (pour audit)
    logger.info(f"Requête pour le tenant {tenant_id} ({company.name}): {request.method} {request.url.path}")
    
    # 9. Continuer avec la requête
    try:
        response = await call_next(request)
        return response
    finally:
        # Nettoyer le contexte après la requête
        current_tenant.set(None)
        current_tenant_db.set(None)


def require_tenant_access(tenant_id: UUID):
    """
    Vérifie que l'utilisateur actuel a accès au tenant spécifié
    À utiliser dans les endpoints pour vérifier l'accès cross-tenant
    """
    current = current_tenant.get()
    if current != tenant_id:
        logger.warning(f"Tentative d'accès cross-tenant: utilisateur {current} essaie d'accéder à {tenant_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à ce tenant"
        )


def get_current_tenant_id() -> UUID:
    """
    Retourne l'ID du tenant actuel
    """
    tenant_id = current_tenant.get()
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant non identifié"
        )
    return tenant_id
