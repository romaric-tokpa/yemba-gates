"""
Router pour la gestion des équipes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID

from models import Team, TeamMember, User
from schemas import TeamCreate, TeamUpdate, TeamResponse, TeamMemberResponse
from database import get_session
from auth import get_current_active_user

router = APIRouter(prefix="/teams", tags=["teams"])


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
        
        # Récupérer les membres
        members_statement = select(TeamMember, User).join(User, TeamMember.user_id == User.id).where(TeamMember.team_id == team.id)
        members_data = session.exec(members_statement).all()
        
        members = []
        for member_data in members_data:
            if isinstance(member_data, tuple):
                member, user = member_data
            else:
                member = member_data
                user = session.get(User, member.user_id)
            
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

