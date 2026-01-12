#!/usr/bin/env python3
"""Script pour mettre à jour le fichier .env avec la configuration Gmail"""
import os
import re
from pathlib import Path

def update_env_file():
    env_path = Path(__file__).parent / '.env'
    
    # Lire le contenu actuel
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    else:
        # Créer depuis env.example
        example_path = Path(__file__).parent / 'env.example'
        if example_path.exists():
            with open(example_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        else:
            lines = []
    
    # Mettre à jour les variables
    updated_lines = []
    smtp_password_found = False
    
    for line in lines:
        if line.startswith('FROM_EMAIL='):
            updated_lines.append('FROM_EMAIL=yemma.gates@gmail.com\n')
        elif line.startswith('SMTP_HOST='):
            updated_lines.append('SMTP_HOST=smtp.gmail.com\n')
        elif line.startswith('SMTP_PORT='):
            updated_lines.append('SMTP_PORT=587\n')
        elif line.startswith('SMTP_USER='):
            updated_lines.append('SMTP_USER=yemma.gates@gmail.com\n')
        elif line.startswith('SMTP_USE_TLS='):
            updated_lines.append('SMTP_USE_TLS=true\n')
        elif line.startswith('SMTP_PASSWORD='):
            smtp_password_found = True
            # Garder le mot de passe existant s'il n'est pas un placeholder
            current = line.split('=', 1)[1].strip()
            if current in ['your-email-password', '18-19Th022611', 'votre-mot-de-passe-d-application-gmail']:
                updated_lines.append('SMTP_PASSWORD=votre-mot-de-passe-d-application-gmail\n')
            else:
                updated_lines.append(line)  # Garder le mot de passe existant
        else:
            updated_lines.append(line)
    
    # Ajouter SMTP_PASSWORD si absent
    if not smtp_password_found:
        # Chercher où l'insérer (après SMTP_USER)
        inserted = False
        final_lines = []
        for i, line in enumerate(updated_lines):
            final_lines.append(line)
            if line.startswith('SMTP_USER=') and not inserted:
                final_lines.append('SMTP_PASSWORD=votre-mot-de-passe-d-application-gmail\n')
                inserted = True
        if not inserted:
            final_lines.append('SMTP_PASSWORD=votre-mot-de-passe-d-application-gmail\n')
        updated_lines = final_lines
    
    # Écrire le fichier
    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(updated_lines)
    
    print(f"✅ Fichier .env mis à jour avec succès dans {env_path}")
    print("\n⚠️  IMPORTANT : Vous devez maintenant :")
    print("   1. Remplacer 'votre-mot-de-passe-d-application-gmail' par votre mot de passe d'application Gmail")
    print("   2. Obtenir un mot de passe d'application sur : https://myaccount.google.com/apppasswords")
    print("   3. Redémarrer le serveur backend pour appliquer les changements")

if __name__ == '__main__':
    update_env_file()
