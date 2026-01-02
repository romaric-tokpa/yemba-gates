"""
Script pour créer des utilisateurs de test pour tous les rôles
Usage: python3 backend/create_all_test_users.py
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from database import engine
from models import User
from auth import get_password_hash

def create_test_users():
    """Crée des utilisateurs de test pour tous les rôles"""
    
    test_users = [
        {
            "email": "recruteur@test.com",
            "password": "password123",
            "first_name": "Jean",
            "last_name": "Recruteur",
            "role": "recruteur"
        },
        {
            "email": "manager@test.com",
            "password": "password123",
            "first_name": "Marie",
            "last_name": "Manager",
            "role": "manager"
        },
        {
            "email": "client@test.com",
            "password": "password123",
            "first_name": "Pierre",
            "last_name": "Client",
            "role": "client"
        },
        {
            "email": "admin@test.com",
            "password": "password123",
            "first_name": "Admin",
            "last_name": "System",
            "role": "administrateur"
        }
    ]
    
    with Session(engine) as session:
        created_count = 0
        updated_count = 0
        
        for user_data in test_users:
            email = user_data["email"]
            password = user_data["password"]
            
            # Vérifier si l'utilisateur existe déjà
            existing_user = session.exec(
                select(User).where(User.email == email)
            ).first()
            
            if existing_user:
                # Mettre à jour le mot de passe et activer le compte
                existing_user.password_hash = get_password_hash(password)
                existing_user.is_active = True
                existing_user.first_name = user_data["first_name"]
                existing_user.last_name = user_data["last_name"]
                existing_user.role = user_data["role"]
                session.add(existing_user)
                updated_count += 1
                print(f"✅ Utilisateur mis à jour: {email} ({user_data['role']})")
            else:
                # Créer le nouvel utilisateur
                hashed_password = get_password_hash(password)
                
                new_user = User(
                    email=email,
                    password_hash=hashed_password,
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    role=user_data["role"],
                    is_active=True
                )
                
                session.add(new_user)
                created_count += 1
                print(f"✅ Utilisateur créé: {email} ({user_data['role']})")
        
        session.commit()
        
        print("\n" + "="*60)
        print(f"✅ Résumé: {created_count} utilisateur(s) créé(s), {updated_count} utilisateur(s) mis à jour")
        print("="*60)
        print("\n📋 Identifiants de connexion:")
        print("-" * 60)
        for user_data in test_users:
            print(f"  {user_data['role'].upper():15} | Email: {user_data['email']:25} | Password: {user_data['password']}")
        print("-" * 60)

if __name__ == "__main__":
    try:
        create_test_users()
    except Exception as e:
        print(f"❌ Erreur lors de la création des utilisateurs: {e}")
        import traceback
        traceback.print_exc()

