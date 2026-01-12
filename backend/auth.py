"""
Système d'authentification JWT
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from uuid import UUID

from database import get_session
from models import User, UserRole

# Configuration JWT
SECRET_KEY = "your-secret-key-change-in-production"  # TODO: Utiliser une variable d'environnement
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme pour extraire le token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe en utilisant bcrypt directement"""
    try:
        # Vérifier que les paramètres ne sont pas None ou vides
        if not plain_password or not hashed_password:
            return False
        
        # Convertir le mot de passe en bytes si nécessaire
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        
        # Vérifier le mot de passe
        return bcrypt.checkpw(plain_password, hashed_password)
    except (ValueError, TypeError, AttributeError) as e:
        # Logger les erreurs de format
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Erreur lors de la vérification du mot de passe: {str(e)}")
        return False
    except Exception as e:
        # Logger les autres erreurs
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur inattendue lors de la vérification du mot de passe: {str(e)}", exc_info=True)
        return False


def get_password_hash(password: str) -> str:
    """Hash un mot de passe en utilisant bcrypt directement"""
    # Convertir le mot de passe en bytes si nécessaire
    if isinstance(password, str):
        password = password.encode('utf-8')
    # Générer un salt et hasher le mot de passe
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password, salt)
    # Retourner le hash en string
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crée un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_user_by_email(email: str, session: Session) -> Optional[User]:
    """Récupère un utilisateur par son email"""
    statement = select(User).where(User.email == email)
    return session.exec(statement).first()


def authenticate_user(email: str, password: str, session: Session) -> Optional[User]:
    """Authentifie un utilisateur"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"🔐 Tentative d'authentification pour l'email: {email}")
        
        user = get_user_by_email(email, session)
        if not user:
            logger.warning(f"❌ Utilisateur non trouvé pour l'email: {email}")
            return None
        
        logger.info(f"✅ Utilisateur trouvé: {user.email} (ID: {user.id}, Actif: {user.is_active})")
        
        # Vérifier que le password_hash existe
        if not user.password_hash:
            logger.warning(f"❌ Aucun hash de mot de passe pour l'utilisateur: {email}")
            return None
        
        # Vérifier le mot de passe
        password_valid = verify_password(password, user.password_hash)
        if not password_valid:
            logger.warning(f"❌ Mot de passe incorrect pour l'utilisateur: {email}")
            return None
        
        logger.info(f"✅ Mot de passe valide pour l'utilisateur: {email}")
        
        if not user.is_active:
            logger.warning(f"❌ Utilisateur inactif: {email}")
            return None
        
        logger.info(f"✅ Authentification réussie pour l'utilisateur: {email}")
        return user
    except Exception as e:
        # Logger l'erreur pour le débogage
        logger.error(f"❌ Erreur lors de l'authentification pour {email}: {str(e)}", exc_info=True)
        # Retourner None en cas d'erreur pour ne pas exposer les détails
        return None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> User:
    """Récupère l'utilisateur actuel depuis le token JWT"""
    import logging
    logger = logging.getLogger(__name__)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Log de debug pour voir si le token est reçu
    if not token:
        logger.warning("🔐 [AUTH] Aucun token fourni dans la requête")
        raise credentials_exception
    
    logger.debug(f"🔐 [AUTH] Token reçu (premiers 20 chars): {token[:20] if len(token) > 20 else token}...")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("🔐 [AUTH] Token invalide: 'sub' manquant dans le payload")
            raise credentials_exception
        logger.debug(f"🔐 [AUTH] User ID extrait du token: {user_id}")
    except JWTError as e:
        logger.warning(f"🔐 [AUTH] Erreur de décodage JWT: {str(e)}")
        raise credentials_exception
    
    try:
        user = session.get(User, UUID(user_id))
        if user is None:
            logger.warning(f"🔐 [AUTH] Utilisateur non trouvé avec l'ID: {user_id}")
            raise credentials_exception
        if not user.is_active:
            logger.warning(f"🔐 [AUTH] Utilisateur inactif: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is inactive"
            )
        logger.debug(f"🔐 [AUTH] Utilisateur authentifié: {user.email} (role: {user.role})")
        return user
    except ValueError as e:
        logger.error(f"🔐 [AUTH] Erreur de format UUID: {str(e)}")
        raise credentials_exception


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Vérifie que l'utilisateur est actif"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )
    return current_user


# Dépendances pour vérifier les rôles
def require_role(allowed_roles: list[UserRole]):
    """Crée une dépendance pour vérifier un rôle spécifique"""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        # Convertir les enums en valeurs string pour la comparaison
        allowed_role_values = [role.value if isinstance(role, UserRole) else role for role in allowed_roles]
        user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
        
        # Normaliser les rôles pour la comparaison (gérer les variantes)
        user_role_normalized = user_role.lower() if user_role else ""
        allowed_role_values_normalized = [r.lower() if isinstance(r, str) else r for r in allowed_role_values]
        
        # Pour les administrateurs, accepter à la fois "admin" et "administrateur"
        if UserRole.ADMINISTRATEUR in allowed_roles or "administrateur" in allowed_role_values_normalized:
            if user_role_normalized in ["admin", "administrateur"]:
                return current_user
        
        # Vérification standard
        if user_role_normalized not in allowed_role_values_normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not allowed for role: {user_role}"
            )
        return current_user
    return role_checker


# Dépendances prédéfinies pour chaque rôle
require_manager = require_role([UserRole.MANAGER, UserRole.ADMINISTRATEUR])
require_recruteur = require_role([UserRole.RECRUTEUR, UserRole.MANAGER, UserRole.ADMINISTRATEUR])
require_client = require_role([UserRole.CLIENT, UserRole.ADMINISTRATEUR])
require_admin = require_role([UserRole.ADMINISTRATEUR])

