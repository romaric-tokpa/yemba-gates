#!/usr/bin/env python3
"""
Script de test pour vérifier l'envoi d'emails
Usage: python test_email.py recipient@example.com
"""
import sys
import os
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

from services.email import send_user_invitation_email

def send_test_email(recipient_email: str):
    """Teste l'envoi d'un email d'invitation"""
    
    print("=" * 60)
    print("TEST D'ENVOI D'EMAIL")
    print("=" * 60)
    print(f"\nConfiguration SMTP:")
    print(f"  SMTP_HOST: {os.getenv('SMTP_HOST', 'NOT SET')}")
    print(f"  SMTP_PORT: {os.getenv('SMTP_PORT', 'NOT SET')}")
    print(f"  SMTP_USER: {os.getenv('SMTP_USER', 'NOT SET')}")
    print(f"  SMTP_PASSWORD: {'SET' if os.getenv('SMTP_PASSWORD') else 'NOT SET'}")
    print(f"  FROM_EMAIL: {os.getenv('FROM_EMAIL', 'NOT SET')}")
    print(f"\nEnvoi d'un email de test à: {recipient_email}")
    print("=" * 60)
    print()
    
    try:
        login_url = os.getenv("LOGIN_URL", "http://localhost:3000/auth/login")
        
        result = send_user_invitation_email(
            recipient_email=recipient_email,
            first_name="Test",
            last_name="User",
            email=recipient_email,
            password="TestPassword123",
            role="recruteur",
            login_url=login_url
        )
        
        if result:
            print("\n✅ Email envoyé avec succès !")
            print(f"   Vérifiez la boîte de réception de {recipient_email}")
            print("   (y compris le dossier spam/indésirables)")
        else:
            print("\n❌ Échec de l'envoi de l'email")
            print("   Vérifiez les logs ci-dessus pour plus de détails")
            
    except Exception as e:
        print(f"\n❌ Erreur lors de l'envoi de l'email: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_email.py recipient@example.com")
        sys.exit(1)
    
    recipient = sys.argv[1]
    success = send_test_email(recipient)
    sys.exit(0 if success else 1)
