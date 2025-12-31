"""
Routes pour l'administration (gestion des utilisateurs, paramétrage, logs)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr

from database import get_session
from models import User, UserRole, SecurityLog, Setting
from auth import get_current_active_user, require_role, get_password_hash

router = APIRouter(prefix="/admin", tags=["admin"])

# Dépendance pour vérifier que l'utilisateur est administrateur
require_admin = require_role([UserRole.ADMINISTRATEUR])


# ===== SCHÉMAS PYDANTIC =====

class UserResponse(BaseModel):
    """Schéma de réponse pour un utilisateur"""
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    phone: str | None
    department: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    """Schéma pour créer un utilisateur"""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str
    phone: Optional[str] = None
    department: Optional[str] = None


class UserUpdate(BaseModel):
    """Schéma pour mettre à jour un utilisateur"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# ===== GESTION DES UTILISATEURS =====

@router.get("/users", response_model=List[UserResponse])
def list_users(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Liste tous les utilisateurs (réservé aux administrateurs)
    """
    statement = select(User).order_by(User.created_at.desc())
    users = session.exec(statement).all()
    
    return [
        UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            phone=user.phone,
            department=user.department,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        for user in users
    ]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Créer un nouvel utilisateur (réservé aux administrateurs)
    """
    # Vérifier si l'utilisateur existe déjà
    from auth import get_user_by_email
    existing_user = get_user_by_email(user_data.email, session)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Valider le rôle
    role_lower = user_data.role.lower() if user_data.role else "recruteur"
    valid_roles = ["recruteur", "manager", "client", "administrateur"]
    if role_lower not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rôle invalide. Rôles valides: {', '.join(valid_roles)}"
        )
    
    # Créer le nouvel utilisateur
    hashed_password = get_password_hash(user_data.password)
    
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=role_lower,
        phone=user_data.phone,
        department=user_data.department,
        is_active=True
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return UserResponse(
        id=str(new_user.id),
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        role=new_user.role,
        phone=new_user.phone,
        department=new_user.department,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at
    )


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Récupérer un utilisateur par son ID (réservé aux administrateurs)
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        department=user.department,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Mettre à jour un utilisateur (réservé aux administrateurs)
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Mettre à jour les champs fournis
    if user_data.email is not None:
        # Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
        from auth import get_user_by_email
        existing_user = get_user_by_email(user_data.email, session)
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = user_data.email
    
    if user_data.first_name is not None:
        user.first_name = user_data.first_name
    
    if user_data.last_name is not None:
        user.last_name = user_data.last_name
    
    if user_data.role is not None:
        role_lower = user_data.role.lower()
        valid_roles = ["recruteur", "manager", "client", "administrateur"]
        if role_lower not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Rôle invalide. Rôles valides: {', '.join(valid_roles)}"
            )
        user.role = role_lower
    
    if user_data.phone is not None:
        user.phone = user_data.phone
    
    if user_data.department is not None:
        user.department = user_data.department
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.password is not None:
        user.password_hash = get_password_hash(user_data.password)
    
    user.updated_at = datetime.utcnow()
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        department=user.department,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Désactiver un utilisateur (réservé aux administrateurs)
    Note: On ne supprime pas vraiment l'utilisateur, on le désactive
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Empêcher la suppression de soi-même
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Désactiver l'utilisateur au lieu de le supprimer
    user.is_active = False
    user.updated_at = datetime.utcnow()
    
    session.add(user)
    session.commit()
    
    return None


# ===== PARAMÉTRAGE =====

class SettingResponse(BaseModel):
    """Schéma de réponse pour un paramètre"""
    id: str
    key: str
    value: str
    category: str
    description: str | None
    updated_by: str | None
    created_at: datetime
    updated_at: datetime


class SettingCreate(BaseModel):
    """Schéma pour créer un paramètre"""
    key: str
    value: str
    category: str
    description: Optional[str] = None


class SettingUpdate(BaseModel):
    """Schéma pour mettre à jour un paramètre"""
    value: Optional[str] = None
    description: Optional[str] = None


@router.get("/settings", response_model=List[SettingResponse])
def list_settings(
    category: Optional[str] = None,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Liste tous les paramètres (réservé aux administrateurs)
    """
    if category:
        statement = select(Setting).where(Setting.category == category).order_by(Setting.key)
    else:
        statement = select(Setting).order_by(Setting.category, Setting.key)
    
    settings = session.exec(statement).all()
    
    return [
        SettingResponse(
            id=str(setting.id),
            key=setting.key,
            value=setting.value,
            category=setting.category,
            description=setting.description,
            updated_by=str(setting.updated_by) if setting.updated_by else None,
            created_at=setting.created_at,
            updated_at=setting.updated_at
        )
        for setting in settings
    ]


@router.post("/settings", response_model=SettingResponse, status_code=status.HTTP_201_CREATED)
def create_setting(
    setting_data: SettingCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Créer un nouveau paramètre (réservé aux administrateurs)
    """
    # Vérifier si le paramètre existe déjà
    statement = select(Setting).where(Setting.key == setting_data.key)
    existing_setting = session.exec(statement).first()
    if existing_setting:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setting key already exists"
        )
    
    new_setting = Setting(
        key=setting_data.key,
        value=setting_data.value,
        category=setting_data.category,
        description=setting_data.description,
        updated_by=current_user.id
    )
    
    session.add(new_setting)
    session.commit()
    session.refresh(new_setting)
    
    return SettingResponse(
        id=str(new_setting.id),
        key=new_setting.key,
        value=new_setting.value,
        category=new_setting.category,
        description=new_setting.description,
        updated_by=str(new_setting.updated_by) if new_setting.updated_by else None,
        created_at=new_setting.created_at,
        updated_at=new_setting.updated_at
    )


@router.patch("/settings/{setting_key}", response_model=SettingResponse)
def update_setting(
    setting_key: str,
    setting_data: SettingUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Mettre à jour un paramètre (réservé aux administrateurs)
    """
    statement = select(Setting).where(Setting.key == setting_key)
    setting = session.exec(statement).first()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setting not found"
        )
    
    if setting_data.value is not None:
        setting.value = setting_data.value
    
    if setting_data.description is not None:
        setting.description = setting_data.description
    
    setting.updated_by = current_user.id
    setting.updated_at = datetime.utcnow()
    
    session.add(setting)
    session.commit()
    session.refresh(setting)
    
    return SettingResponse(
        id=str(setting.id),
        key=setting.key,
        value=setting.value,
        category=setting.category,
        description=setting.description,
        updated_by=str(setting.updated_by) if setting.updated_by else None,
        created_at=setting.created_at,
        updated_at=setting.updated_at
    )


@router.delete("/settings/{setting_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_setting(
    setting_key: str,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Supprimer un paramètre (réservé aux administrateurs)
    """
    statement = select(Setting).where(Setting.key == setting_key)
    setting = session.exec(statement).first()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setting not found"
        )
    
    session.delete(setting)
    session.commit()
    
    return None


# ===== LOGS DE SÉCURITÉ =====

class SecurityLogResponse(BaseModel):
    """Schéma de réponse pour un log de sécurité"""
    id: str
    user_id: str | None
    user_email: str | None
    user_name: str | None
    action: str
    ip_address: str | None
    user_agent: str | None
    success: bool
    details: str | None
    created_at: datetime


@router.get("/security-logs", response_model=List[SecurityLogResponse])
def list_security_logs(
    user_id: Optional[UUID] = None,
    action: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Liste les logs de sécurité (réservé aux administrateurs)
    """
    statement = select(SecurityLog)
    
    if user_id:
        statement = statement.where(SecurityLog.user_id == user_id)
    
    if action:
        statement = statement.where(SecurityLog.action == action)
    
    statement = statement.order_by(SecurityLog.created_at.desc()).offset(skip).limit(limit)
    logs = session.exec(statement).all()
    
    results = []
    for log in logs:
        user = None
        if log.user_id:
            user = session.get(User, log.user_id)
        
        results.append(SecurityLogResponse(
            id=str(log.id),
            user_id=str(log.user_id) if log.user_id else None,
            user_email=user.email if user else None,
            user_name=f"{user.first_name} {user.last_name}".strip() if user else None,
            action=log.action,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            success=log.success,
            details=log.details,
            created_at=log.created_at
        ))
    
    return results

