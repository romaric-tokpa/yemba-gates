"""
Script pour créer un utilisateur administrateur
Usage: python create_admin.py
"""
import requests
import sys

API_URL = "http://localhost:8000"

def create_admin_user():
    """Crée un utilisateur administrateur"""
    
    print("=" * 50)
    print("Création d'un utilisateur administrateur")
    print("=" * 50)
    
    # Demander les informations
    email = input("Email: ").strip()
    if not email:
        print("❌ L'email est obligatoire")
        return
    
    password = input("Mot de passe (min 6 caractères): ").strip()
    if len(password) < 6:
        print("❌ Le mot de passe doit contenir au moins 6 caractères")
        return
    
    first_name = input("Prénom: ").strip() or "Admin"
    last_name = input("Nom: ").strip() or "User"
    phone = input("Téléphone (optionnel): ").strip() or None
    department = input("Département (optionnel): ").strip() or None
    
    # Préparer les données
    user_data = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
        "role": "administrateur",
        "phone": phone,
        "department": department
    }
    
    try:
        # Appeler l'endpoint de registration
        response = requests.post(
            f"{API_URL}/auth/register",
            json=user_data
        )
        
        if response.status_code == 201:
            data = response.json()
            print("\n✅ Utilisateur administrateur créé avec succès !")
            print(f"   Email: {data.get('user_email')}")
            print(f"   Rôle: {data.get('user_role')}")
            print(f"   Token: {data.get('access_token')[:20]}...")
            print("\n💡 Vous pouvez maintenant vous connecter avec cet email et ce mot de passe.")
        else:
            error = response.json()
            print(f"\n❌ Erreur: {error.get('detail', 'Erreur inconnue')}")
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Erreur: Impossible de se connecter au serveur.")
        print("   Assurez-vous que le serveur backend est lancé (uvicorn main:app --reload)")
    except Exception as e:
        print(f"\n❌ Erreur: {str(e)}")

if __name__ == "__main__":
    create_admin_user()

