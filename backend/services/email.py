"""
Service de simulation d'envoi d'emails
"""
from typing import Optional
from datetime import datetime


def send_notification_email(
    recipient_email: str,
    subject: str,
    message: str
) -> bool:
    """
    Simule l'envoi d'un email de notification
    
    Dans un environnement de production, cette fonction utiliserait
    un service d'email réel (SendGrid, AWS SES, etc.)
    """
    try:
        # Simulation de l'envoi d'email
        print("=" * 60)
        print("📧 EMAIL DE NOTIFICATION")
        print("=" * 60)
        print(f"À: {recipient_email}")
        print(f"Objet: {subject}")
        print(f"Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print("-" * 60)
        print(f"Message:\n{message}")
        print("=" * 60)
        print("\n")
        
        # Dans un environnement réel, on ferait :
        # - Connexion au service d'email
        # - Envoi de l'email avec template HTML
        # - Gestion des erreurs et retry logic
        # - Logging des envois
        
        return True
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email: {e}")
        return False


def send_daily_summary_email(
    recipient_email: str,
    summary_data: dict
) -> bool:
    """
    Envoie un email récapitulatif quotidien
    """
    subject = "Récapitulatif quotidien - Application de Recrutement"
    
    message = f"""
Récapitulatif du {datetime.utcnow().strftime('%d/%m/%Y')}

📊 Statistiques:
- Nouveaux candidats: {summary_data.get('new_candidates', 0)}
- Offres acceptées: {summary_data.get('offers_accepted', 0)}
- Besoins en attente: {summary_data.get('pending_jobs', 0)}
- Entretiens planifiés: {summary_data.get('scheduled_interviews', 0)}

Cordialement,
L'équipe Recrutement
    """
    
    return send_notification_email(recipient_email, subject, message)







