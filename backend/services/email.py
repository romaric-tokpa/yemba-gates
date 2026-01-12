"""
Service d'envoi d'emails via SMTP
"""
from typing import Optional
from datetime import datetime
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from email.header import Header
import logging
import uuid

# Charger les variables d'environnement depuis .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv n'est pas installé, continuer sans
    pass

logger = logging.getLogger(__name__)

# Configuration SMTP depuis les variables d'environnement
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

# Adresse email de l'expéditeur (par défaut)
DEFAULT_FROM_EMAIL = os.getenv("FROM_EMAIL", "yemma.gates@gmail.com")

# Mode simulation si SMTP n'est pas configuré
SMTP_ENABLED = bool(SMTP_USER and SMTP_PASSWORD)

# Logger la configuration SMTP au démarrage (sans afficher le mot de passe)
if SMTP_ENABLED:
    logger.info(f"✅ SMTP configuré - Host: {SMTP_HOST}:{SMTP_PORT}, User: {SMTP_USER}, TLS: {SMTP_USE_TLS}")
else:
    logger.warning("⚠️ SMTP non configuré - Les emails seront affichés dans la console (mode simulation)")
    logger.warning(f"   Pour activer SMTP, configurez SMTP_USER et SMTP_PASSWORD dans le fichier .env")


def send_notification_email(
    recipient_email: str,
    subject: str,
    message: str,
    from_email: Optional[str] = None
) -> bool:
    """
    Envoie un email de notification via SMTP
    
    Si SMTP n'est pas configuré, affiche l'email dans la console (mode simulation)
    """
    try:
        # Utiliser l'adresse d'expéditeur configurée ou la valeur par défaut
        sender = from_email or DEFAULT_FROM_EMAIL
        
        # Si SMTP n'est pas configuré, utiliser le mode simulation
        if not SMTP_ENABLED:
            logger.warning("SMTP non configuré - Mode simulation activé")
            print("=" * 60)
            print("📧 EMAIL DE NOTIFICATION (SIMULATION)")
            print("=" * 60)
            print(f"De: {sender}")
            print(f"À: {recipient_email}")
            print(f"Objet: {subject}")
            print(f"Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
            print("-" * 60)
            print(f"Message:\n{message}")
            print("=" * 60)
            print("\n")
            print("⚠️  Pour envoyer de vrais emails, configurez SMTP_HOST, SMTP_USER et SMTP_PASSWORD")
            return True
        
        # Créer le message email avec format multipart (texte + HTML)
        msg = MIMEMultipart('alternative')
        
        # Headers standard pour améliorer la délivrabilité
        msg['From'] = sender
        msg['To'] = recipient_email
        msg['Subject'] = Header(subject, 'utf-8')
        msg['Date'] = formatdate(localtime=True)
        msg['Message-ID'] = make_msgid(domain='yemma-gates.com')
        msg['MIME-Version'] = '1.0'
        
        # Headers pour identification et anti-spam
        msg['X-Mailer'] = 'Recrutement App - yemma-gates.com'
        msg['X-Priority'] = '3'  # Priorité normale
        msg['X-Entity-Ref-ID'] = str(uuid.uuid4())
        
        # Convertir le message texte en HTML simple
        html_message = message.replace('\n\n', '</p><p>').replace('\n', '<br>')
        html_message = html_message.replace('  ', '&nbsp;&nbsp;')
        
        # Créer une version HTML propre
        html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    <div style="background-color: #ffffff; padding: 30px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 20px;">
            <p style="margin: 0; padding: 0; font-size: 16px; color: #333333;">
                {html_message}
            </p>
        </div>
    </div>
    <div style="text-align: center; margin-top: 20px; padding: 15px; font-size: 12px; color: #666666;">
        <p style="margin: 0;">
            Cet email a été envoyé automatiquement par l'application de Recrutement<br>
            yemma-gates.com
        </p>
    </div>
</body>
</html>"""
        
        # Ajouter les versions texte et HTML
        text_part = MIMEText(message, 'plain', 'utf-8')
        html_part = MIMEText(html_content, 'html', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Envoyer l'email via SMTP
        try:
            if SMTP_USE_TLS:
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
            
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"✅ Email envoyé avec succès à {recipient_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Erreur d'authentification SMTP: {e}")
            # Fallback vers simulation en cas d'erreur
            print("=" * 60)
            print("📧 EMAIL DE NOTIFICATION (ERREUR SMTP - SIMULATION)")
            print("=" * 60)
            print(f"Erreur SMTP: {e}")
            print(f"De: {sender}")
            print(f"À: {recipient_email}")
            print(f"Objet: {subject}")
            print("-" * 60)
            print(f"Message:\n{message}")
            print("=" * 60)
            return False
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'envoi SMTP: {e}")
            # Fallback vers simulation en cas d'erreur
            print("=" * 60)
            print("📧 EMAIL DE NOTIFICATION (ERREUR SMTP - SIMULATION)")
            print("=" * 60)
            print(f"Erreur SMTP: {e}")
            print(f"De: {sender}")
            print(f"À: {recipient_email}")
            print(f"Objet: {subject}")
            print("-" * 60)
            print(f"Message:\n{message}")
            print("=" * 60)
            return False
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'envoi de l'email: {e}")
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


def send_user_invitation_email(
    recipient_email: str,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    role: str,
    login_url: str = "http://localhost:3000/auth/login"
) -> bool:
    """
    Envoie un email de bienvenue avec les identifiants de connexion
    à un nouvel utilisateur créé par un administrateur ou manager
    """
    # Formater le rôle pour l'affichage
    role_display = {
        "recruteur": "Recruteur",
        "manager": "Manager",
        "client": "Client",
        "administrateur": "Administrateur"
    }.get(role.lower(), role)
    
    subject = "Bienvenue sur l'application de Recrutement - Vos identifiants de connexion"
    
    # Message en texte brut (version fallback)
    plain_text_message = f"""Bonjour {first_name} {last_name},

Bienvenue sur l'application de Recrutement !

Votre compte a été créé avec succès par un administrateur. Vous pouvez dès maintenant accéder à la plateforme.

VOS IDENTIFIANTS DE CONNEXION
-----------------------------

Adresse email : {email}
Mot de passe : {password}
Rôle attribué : {role_display}

POUR VOUS CONNECTER
-------------------

Cliquez sur le lien suivant ou copiez-le dans votre navigateur :
{login_url}

IMPORTANT - SECURITE
--------------------

Pour votre sécurité, nous vous recommandons fortement de :
- Changer votre mot de passe lors de votre première connexion
- Utiliser un mot de passe fort et unique
- Ne jamais partager vos identifiants

Si vous avez des questions ou besoin d'aide, n'hésitez pas à contacter l'administrateur.

Nous vous souhaitons une excellente expérience sur notre plateforme !

Cordialement,
L'équipe Recrutement
yemma.gates@gmail.com
    """
    
    # Template HTML professionnel
    html_template = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Bienvenue - Application de Recrutement</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                Bienvenue !
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px;">
                                Application de Recrutement
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Bonjour <strong style="color: #059669;">{first_name} {last_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                Votre compte a été créé avec succès par un administrateur. Vous pouvez dès maintenant accéder à la plateforme de recrutement.
                            </p>
                            
                            <!-- Identifiants Card -->
                            <div style="background-color: #f9fafb; border-left: 4px solid #059669; padding: 25px; margin: 30px 0; border-radius: 6px;">
                                <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600;">
                                    Vos identifiants de connexion
                                </h2>
                                
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Adresse email :</span>
                                            <span style="color: #111827; font-size: 14px; font-weight: 600;">{email}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Mot de passe :</span>
                                            <span style="color: #111827; font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace; letter-spacing: 1px;">{password}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0;">
                                            <span style="color: #6b7280; font-size: 14px; font-weight: 500; display: inline-block; width: 140px;">Rôle attribué :</span>
                                            <span style="color: #059669; font-size: 14px; font-weight: 600; text-transform: capitalize;">{role_display}</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <a href="{login_url}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.3);">
                                            Se connecter maintenant
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                                Ou copiez ce lien dans votre navigateur :<br>
                                <a href="{login_url}" style="color: #059669; text-decoration: underline; word-break: break-all;">{login_url}</a>
                            </p>
                            
                            <!-- Security Notice -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 6px;">
                                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">
                                    Important - Sécurité
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
                                    <li>Changez votre mot de passe lors de votre première connexion</li>
                                    <li>Utilisez un mot de passe fort et unique</li>
                                    <li>Ne partagez jamais vos identifiants</li>
                                </ul>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                Si vous avez des questions ou besoin d'aide, n'hésitez pas à contacter l'administrateur.
                            </p>
                            
                            <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                Nous vous souhaitons une excellente expérience sur notre plateforme !
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                <strong style="color: #374151;">Équipe Recrutement</strong><br>
                                <a href="mailto:yemma.gates@gmail.com" style="color: #059669; text-decoration: none;">yemma.gates@gmail.com</a>
                            </p>
                            <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 12px;">
                                Cet email a été envoyé automatiquement par l'application de Recrutement<br>
                                yemma-gates.com
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
    
    # Utiliser l'adresse d'expéditeur configurée ou la valeur par défaut
    sender = DEFAULT_FROM_EMAIL
    
    # Si SMTP n'est pas configuré, utiliser le mode simulation
    if not SMTP_ENABLED:
        logger.warning("SMTP non configuré - Mode simulation activé")
        print("=" * 60)
        print("📧 EMAIL D'INVITATION (SIMULATION)")
        print("=" * 60)
        print(f"De: {sender}")
        print(f"À: {recipient_email}")
        print(f"Objet: {subject}")
        print(f"Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print("-" * 60)
        print(f"Message:\n{plain_text_message}")
        print("=" * 60)
        print("\n")
        print("⚠️  Pour envoyer de vrais emails, configurez SMTP_USER et SMTP_PASSWORD dans le fichier .env")
        return True
    
    # Créer le message email avec format multipart (texte + HTML)
    msg = MIMEMultipart('alternative')
    
    # Headers standard pour améliorer la délivrabilité
    msg['From'] = sender
    msg['To'] = recipient_email
    msg['Subject'] = Header(subject, 'utf-8')
    msg['Date'] = formatdate(localtime=True)
    msg['Message-ID'] = make_msgid(domain='yemma-gates.com')
    msg['MIME-Version'] = '1.0'
    
    # Headers pour identification et anti-spam
    msg['X-Mailer'] = 'Recrutement App - yemma-gates.com'
    msg['X-Priority'] = '3'  # Priorité normale
    msg['X-Entity-Ref-ID'] = str(uuid.uuid4())
    
    # Ajouter les versions texte et HTML
    text_part = MIMEText(plain_text_message, 'plain', 'utf-8')
    html_part = MIMEText(html_template, 'html', 'utf-8')
    
    msg.attach(text_part)
    msg.attach(html_part)
    
    # Envoyer l'email via SMTP
    try:
        if SMTP_USE_TLS:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"✅ Email d'invitation envoyé avec succès à {recipient_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ Erreur d'authentification SMTP: {e}")
        # Fallback vers simulation en cas d'erreur
        print("=" * 60)
        print("📧 EMAIL D'INVITATION (ERREUR SMTP - SIMULATION)")
        print("=" * 60)
        print(f"Erreur SMTP: {e}")
        print(f"De: {sender}")
        print(f"À: {recipient_email}")
        print(f"Objet: {subject}")
        print("-" * 60)
        print(f"Message:\n{plain_text_message}")
        print("=" * 60)
        return False
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'envoi SMTP: {e}")
        # Fallback vers simulation en cas d'erreur
        print("=" * 60)
        print("📧 EMAIL D'INVITATION (ERREUR SMTP - SIMULATION)")
        print("=" * 60)
        print(f"Erreur SMTP: {e}")
        print(f"De: {sender}")
        print(f"À: {recipient_email}")
        print(f"Objet: {subject}")
        print("-" * 60)
        print(f"Message:\n{plain_text_message}")
        print("=" * 60)
        return False







