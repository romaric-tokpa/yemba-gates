#!/usr/bin/env python3
"""
Script pour créer des utilisateurs de test
Usage: python scripts/create_test_users.py
"""
import sys
import os
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlmodel import Session, select
from database import engine
from models import User
from auth import get_password_hash

# Utilisateurs de test à créer
TEST_USERS = [
    {
        "email": "admin@test.com",
        "password": "admin123",
        "first_name": "Admin",
        "last_name": "Test",
        "role": "administrateur",
    },
    {
        "email": "manager@test.com",
        "password": "manager123",
        "first_name": "Manager",
        "last_name": "Test",
        "role": "manager",
    },
    {
        "email": "recruteur@test.com",
        "password": "recruteur123",
        "first_name": "Recruteur",
        "last_name": "Test",
        "role": "recruteur",
    },
    {
        "email": "client@test.com",
        "password": "client123",
        "first_name": "Client",
        "last_name": "Test",
        "role": "client",
    },
]


def create_test_users():
    """Crée les utilisateurs de test s'ils n'existent pas"""
    print("=" * 60)
    print("CRÉATION DES UTILISATEURS DE TEST")
    print("=" * 60)

    with Session(engine) as session:
        # Lister les utilisateurs existants
        existing_users = session.exec(select(User)).all()
        print(f"\nUtilisateurs existants: {len(existing_users)}")
        for user in existing_users:
            print(f"  - {user.email} ({user.role}) - Actif: {user.is_active}")

        print("\n" + "-" * 60)
        print("Création des utilisateurs de test...")
        print("-" * 60)

        created = 0
        for user_data in TEST_USERS:
            # Vérifier si l'utilisateur existe déjà
            existing = session.exec(
                select(User).where(User.email == user_data["email"])
            ).first()

            if existing:
                print(f"  ⏭️  {user_data['email']} existe déjà")
                # S'assurer que l'utilisateur est actif et a un mot de passe
                if not existing.is_active:
                    existing.is_active = True
                    session.add(existing)
                    print(f"     → Activé")
                if not existing.password_hash:
                    existing.password_hash = get_password_hash(user_data["password"])
                    session.add(existing)
                    print(f"     → Mot de passe défini")
                continue

            # Créer l'utilisateur
            new_user = User(
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                role=user_data["role"],
                is_active=True,
            )
            session.add(new_user)
            created += 1
            print(f"  ✅ {user_data['email']} créé (mot de passe: {user_data['password']})")

        session.commit()

        print("\n" + "=" * 60)
        print(f"Terminé! {created} utilisateur(s) créé(s)")
        print("=" * 60)
        print("\nIdentifiants de test:")
        print("-" * 40)
        for user_data in TEST_USERS:
            print(f"  {user_data['role'].upper()}")
            print(f"    Email: {user_data['email']}")
            print(f"    Mot de passe: {user_data['password']}")
            print()


if __name__ == "__main__":
    create_test_users()
