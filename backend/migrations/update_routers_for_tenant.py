"""
Script pour mettre à jour tous les routers pour utiliser database_tenant
Remplace les imports de 'database' par 'database_tenant'
"""
import os
import re
from pathlib import Path

# Liste des fichiers routers à mettre à jour
ROUTER_FILES = [
    "backend/routers/jobs.py",
    "backend/routers/candidates.py",
    "backend/routers/kpi.py",
    "backend/routers/interviews.py",
    "backend/routers/offers.py",
    "backend/routers/notifications.py",
    "backend/routers/onboarding.py",
    "backend/routers/history.py",
    "backend/routers/admin.py",
    "backend/routers/applications.py",
    "backend/routers/teams.py",
    "backend/routers/shortlists.py",
    "backend/routers/client_interview_requests.py",
    "backend/routers/kpi_client_endpoint.py",
]


def update_imports(file_path: str) -> bool:
    """Met à jour les imports dans un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remplacer l'import de database par database_tenant
        content = re.sub(
            r'from database import get_session',
            'from database_tenant import get_session',
            content
        )
        
        # Remplacer aussi les imports multiples
        content = re.sub(
            r'from database import (.*)get_session(.*)',
            lambda m: f'from database_tenant import {m.group(1)}get_session{m.group(2)}',
            content
        )
        
        # Si le contenu a changé, sauvegarder
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Mis à jour: {file_path}")
            return True
        else:
            print(f"⏭️  Aucun changement: {file_path}")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour de {file_path}: {str(e)}")
        return False


def main():
    """Fonction principale"""
    print("🔄 Mise à jour des routers pour le support multi-tenant...")
    print("=" * 60)
    
    updated_count = 0
    for router_file in ROUTER_FILES:
        if os.path.exists(router_file):
            if update_imports(router_file):
                updated_count += 1
        else:
            print(f"⚠️  Fichier non trouvé: {router_file}")
    
    print("=" * 60)
    print(f"✅ {updated_count} fichier(s) mis à jour")
    print("\n💡 Vérifiez manuellement les fichiers pour vous assurer que tous les imports sont corrects")


if __name__ == "__main__":
    main()
