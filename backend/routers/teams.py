"""
Router pour la gestion des équipes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID
import secrets
import string

from models import Team, TeamMember, User
from schemas import TeamCreate, TeamUpdate, TeamResponse, TeamMemberResponse
from database import get_session
from auth import get_current_active_user, get_password_hash
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/teams", tags=["teams"])


def generate_password(length: int = 12) -> str:
    """Génère un mot de passe sécurisé"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password


class UserCreateByManager(BaseModel):
    """Schéma pour créer un utilisateur par un manager"""
    email: EmailStr
    first_name: str
    last_name: str
    role: str  # 'recruteur' ou 'client'
    phone: Optional[str] = None
    department: Optional[str] = None
    generate_password: bool = True  # Si True, génère un mot de passe, sinon attend un password
    password: Optional[str] = None  # Utilisé si generate_password est False
    is_active: Optional[bool] = None  # Permet de réactiver un utilisateur désactivé


class UserCreateResponse(BaseModel):
    """Réponse après création d'un utilisateur"""
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: bool
    created_at: str
    generated_password: Optional[str] = None  # Le mot de passe généré (à afficher une seule fois)


# ===== GESTION DES UTILISATEURS PAR LE MANAGER (doit être avant les routes avec {team_id}) =====

@router.post("/users", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user_by_manager(
    user_data: UserCreateByManager,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Créer un utilisateur (recruteur ou client) - Accessible aux managers"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent créer des utilisateurs"
        )
    
    # Vérifier que le rôle est valide (recruteur ou client)
    if user_data.role not in ["recruteur", "client"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le rôle doit être 'recruteur' ou 'client'"
        )
    
    # Vérifier si l'utilisateur existe déjà
    from auth import get_user_by_email
    existing_user = get_user_by_email(user_data.email, session)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà"
        )
    
    # Générer ou utiliser le mot de passe fourni
    if user_data.generate_password:
        generated_password = generate_password()
        password_hash = get_password_hash(generated_password)
    else:
        if not user_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un mot de passe doit être fourni si generate_password est False"
            )
        generated_password = None
        password_hash = get_password_hash(user_data.password)
    
    # Créer l'utilisateur
    from datetime import datetime
    new_user = User(
        email=user_data.email,
        password_hash=password_hash,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        phone=user_data.phone,
        department=user_data.department,
        is_active=True
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return UserCreateResponse(
        id=str(new_user.id),
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        role=new_user.role,
        phone=new_user.phone,
        department=new_user.department,
        is_active=new_user.is_active,
        created_at=new_user.created_at.isoformat(),
        generated_password=generated_password
    )


@router.get("/users", response_model=List[UserCreateResponse])
def list_users_by_manager(
    role: Optional[str] = Query(None, description="Filtrer par rôle (recruteur ou client)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Lister les utilisateurs (recruteurs et clients) - Accessible aux managers"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent lister les utilisateurs"
        )
    
    # Construire la requête
    statement = select(User)
    if role:
        statement = statement.where(User.role == role)
    else:
        # Par défaut, ne montrer que les recruteurs et clients
        statement = statement.where(
            or_(User.role == "recruteur", User.role == "client")
        )
    
    statement = statement.order_by(User.created_at.desc())
    users = session.exec(statement).all()
    
    return [
        UserCreateResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            phone=user.phone,
            department=user.department,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            generated_password=None  # Ne jamais renvoyer le mot de passe dans la liste
        )
        for user in users
    ]


@router.get("/users/{user_id}", response_model=UserCreateResponse)
def get_user_by_manager(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer un utilisateur par son ID - Accessible aux managers"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent voir les utilisateurs"
        )
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")
    
    # Vérifier que c'est un recruteur ou client
    if user.role not in ["recruteur", "client"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cet utilisateur n'est pas un recruteur ou un client"
        )
    
    return UserCreateResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        department=user.department,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        generated_password=None
    )


@router.put("/users/{user_id}", response_model=UserCreateResponse)
def update_user_by_manager(
    user_id: UUID,
    user_data: UserCreateByManager,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Mettre à jour un utilisateur - Accessible aux managers"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent modifier les utilisateurs"
        )
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")
    
    # Vérifier que c'est un recruteur ou client
    if user.role not in ["recruteur", "client"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cet utilisateur n'est pas un recruteur ou un client"
        )
    
    # Vérifier l'email unique si modifié
    if user_data.email != user.email:
        from auth import get_user_by_email
        existing_user = get_user_by_email(user_data.email, session)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un utilisateur avec cet email existe déjà"
            )
    
    # Mettre à jour les champs
    user.email = user_data.email
    user.first_name = user_data.first_name
    user.last_name = user_data.last_name
    user.role = user_data.role
    user.phone = user_data.phone
    user.department = user_data.department
    
    # Mettre à jour is_active si fourni (permet la réactivation)
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    # Mettre à jour le mot de passe si fourni
    generated_password = None
    if user_data.password:
        user.password_hash = get_password_hash(user_data.password)
    elif user_data.generate_password:
        generated_password = generate_password()
        user.password_hash = get_password_hash(generated_password)
    
    from datetime import datetime
    user.updated_at = datetime.utcnow()
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return UserCreateResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        department=user.department,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        generated_password=generated_password
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_by_manager(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Désactiver un utilisateur - Accessible aux managers"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent désactiver les utilisateurs"
        )
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")
    
    # Soft delete
    user.is_active = False
    from datetime import datetime
    user.updated_at = datetime.utcnow()
    
    session.add(user)
    session.commit()
    
    return None


# ===== GESTION DES ÉQUIPES =====

@router.get("/", response_model=List[TeamResponse])
def get_teams(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer toutes les équipes"""
    statement = select(Team).where(Team.is_active == True).offset(skip).limit(limit)
    teams = session.exec(statement).all()
    
    result = []
    for team in teams:
        # Récupérer le manager
        manager_name = None
        if team.manager_id:
            manager = session.get(User, team.manager_id)
            if manager:
                manager_name = f"{manager.first_name} {manager.last_name}"
        
        # Récupérer les membres avec leurs informations utilisateur
        # Utiliser une approche plus simple : récupérer les membres puis les utilisateurs
        members_statement = select(TeamMember).where(TeamMember.team_id == team.id)
        team_members = session.exec(members_statement).all()
        
        members = []
        for member in team_members:
            # Récupérer l'utilisateur associé
            user = session.get(User, member.user_id) if member.user_id else None
            
            members.append(TeamMemberResponse(
                id=member.id,
                user_id=member.user_id,
                team_id=member.team_id,
                role=member.role,
                joined_at=member.joined_at,
                user_first_name=user.first_name if user else "",
                user_last_name=user.last_name if user else "",
                user_email=user.email if user else "",
                user_role=user.role if user else ""
            ))
        
        result.append(TeamResponse(
            id=team.id,
            name=team.name,
            description=team.description,
            department=team.department,
            manager_id=team.manager_id,
            manager_name=manager_name,
            is_active=team.is_active,
            created_at=team.created_at,
            updated_at=team.updated_at,
            members=members,
            members_count=len(members)
        ))
    
    return result


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer une équipe par son ID"""
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Équipe non trouvée")
    
    # Récupérer le manager
    manager_name = None
    if team.manager_id:
        manager = session.get(User, team.manager_id)
        if manager:
            manager_name = f"{manager.first_name} {manager.last_name}"
    
    # Récupérer les membres
    members_statement = select(TeamMember).where(TeamMember.team_id == team.id)
    members_data = session.exec(members_statement).all()
    
    members = []
    for member in members_data:
        user = session.get(User, member.user_id)
        if user:
            members.append(TeamMemberResponse(
                id=member.id,
                user_id=member.user_id,
                team_id=member.team_id,
                role=member.role,
                joined_at=member.joined_at,
                user_first_name=user.first_name,
                user_last_name=user.last_name,
                user_email=user.email,
                user_role=user.role
            ))
    
    return TeamResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        department=team.department,
        manager_id=team.manager_id,
        manager_name=manager_name,
        is_active=team.is_active,
        created_at=team.created_at,
        updated_at=team.updated_at,
        members=members,
        members_count=len(members)
    )


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    team_data: TeamCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Créer une nouvelle équipe"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent créer des équipes"
        )
    
    # Vérifier que le nom est unique
    existing_team = session.exec(select(Team).where(Team.name == team_data.name)).first()
    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une équipe avec ce nom existe déjà"
        )
    
    # Vérifier le manager si fourni
    if team_data.manager_id:
        manager = session.get(User, team_data.manager_id)
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager non trouvé"
            )
    
    # Créer l'équipe
    new_team = Team(
        name=team_data.name,
        description=team_data.description,
        department=team_data.department,
        manager_id=team_data.manager_id
    )
    session.add(new_team)
    session.commit()
    session.refresh(new_team)
    
    # Ajouter les membres si fournis
    if team_data.member_ids:
        for user_id in team_data.member_ids:
            user = session.get(User, user_id)
            if user:
                member = TeamMember(
                    team_id=new_team.id,
                    user_id=user_id,
                    role="membre"
                )
                session.add(member)
        session.commit()
    
    # Récupérer l'équipe complète avec les membres
    return get_team(new_team.id, session, current_user)


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: UUID,
    team_data: TeamUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Mettre à jour une équipe"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent modifier des équipes"
        )
    
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Équipe non trouvée")
    
    # Vérifier le nom unique si modifié
    if team_data.name and team_data.name != team.name:
        existing_team = session.exec(select(Team).where(Team.name == team_data.name)).first()
        if existing_team:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une équipe avec ce nom existe déjà"
            )
    
    # Vérifier le manager si modifié
    if team_data.manager_id and team_data.manager_id != team.manager_id:
        manager = session.get(User, team_data.manager_id)
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager non trouvé"
            )
    
    # Mettre à jour les champs
    if team_data.name is not None:
        team.name = team_data.name
    if team_data.description is not None:
        team.description = team_data.description
    if team_data.department is not None:
        team.department = team_data.department
    if team_data.manager_id is not None:
        team.manager_id = team_data.manager_id
    if team_data.is_active is not None:
        team.is_active = team_data.is_active
    
    from datetime import datetime
    team.updated_at = datetime.utcnow()
    
    session.add(team)
    session.commit()
    session.refresh(team)
    
    return get_team(team_id, session, current_user)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Supprimer une équipe (soft delete)"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent supprimer des équipes"
        )
    
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Équipe non trouvée")
    
    # Soft delete
    team.is_active = False
    from datetime import datetime
    team.updated_at = datetime.utcnow()
    
    session.add(team)
    session.commit()
    
    return None


@router.post("/{team_id}/members", response_model=TeamResponse)
def add_team_member(
    team_id: UUID,
    user_id: UUID,
    role: str = "membre",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Ajouter un membre à une équipe"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent ajouter des membres"
        )
    
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Équipe non trouvée")
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")
    
    # Vérifier si le membre n'est pas déjà dans l'équipe
    existing_member = session.exec(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id
        )
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet utilisateur est déjà membre de cette équipe"
        )
    
    # Ajouter le membre
    member = TeamMember(
        team_id=team_id,
        user_id=user_id,
        role=role
    )
    session.add(member)
    session.commit()
    
    return get_team(team_id, session, current_user)


@router.delete("/{team_id}/members/{user_id}", response_model=TeamResponse)
def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Retirer un membre d'une équipe"""
    # Vérifier que l'utilisateur est manager ou admin
    if current_user.role not in ["manager", "administrateur", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les managers et administrateurs peuvent retirer des membres"
        )
    
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Équipe non trouvée")
    
    member = session.exec(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id
        )
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membre non trouvé dans cette équipe"
        )
    
    session.delete(member)
    session.commit()
    
    return get_team(team_id, session, current_user)

