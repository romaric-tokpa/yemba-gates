"""
Script pour créer un utilisateur de test
Usage: python backend/create_test_user.py
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from database import engine
from models import User
from auth import get_password_hash

def create_test_user():
    """Crée un utilisateur de test"""
    
    email = "test@example.com"
    password = "password123"
    first_name = "Test"
    last_name = "User"
    role = "manager"  # ou "recruteur", "client", "administrateur"
    
    with Session(engine) as session:
        # Vérifier si l'utilisateur existe déjà
        existing_user = session.exec(
            select(User).where(User.email == email)
        ).first()
        
        if existing_user:
            print(f"⚠️  L'utilisateur {email} existe déjà.")
            response = input("Voulez-vous réinitialiser son mot de passe? (o/n): ")
            if response.lower() == 'o':
                existing_user.password_hash = get_password_hash(password)
                existing_user.is_active = True
                session.add(existing_user)
                session.commit()
                print(f"✅ Mot de passe réinitialisé pour {email}")
                print(f"   Email: {email}")
                print(f"   Mot de passe: {password}")
                return
            else:
                print("❌ Opération annulée.")
                return
        
        # Créer le nouvel utilisateur
        hashed_password = get_password_hash(password)
        
        new_user = User(
            email=email,
            password_hash=hashed_password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            is_active=True
        )
        
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        print("✅ Utilisateur de test créé avec succès!")
        print(f"   Email: {email}")
        print(f"   Mot de passe: {password}")
        print(f"   Rôle: {role}")
        print(f"   ID: {new_user.id}")

if __name__ == "__main__":
    try:
        create_test_user()
    except Exception as e:
        print(f"❌ Erreur lors de la création de l'utilisateur: {e}")
        import traceback
        traceback.print_exc()

