"""
Script pour migrer les données existantes avec company_id
Ce script met à jour toutes les tables avec l'ID de l'entreprise par défaut
"""
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from uuid import UUID
from sqlmodel import Session, text
from tenant_manager import get_master_session, get_tenant_database, get_tenant_engine
from sqlmodel import select
from models_master import Company


def get_default_company_id() -> UUID | None:
    """Récupère l'ID de l'entreprise par défaut"""
    try:
        with get_master_session() as session:
            statement = select(Company).where(Company.subdomain == "default")
            company = session.exec(statement).first()
            return company.id if company else None
    except Exception as e:
        print(f"❌ Erreur lors de la récupération de l'entreprise: {str(e)}")
        return None


def migrate_data(company_id: UUID, db_name: str = "recrutement_db"):
    """Migre les données existantes avec company_id"""
    print(f"🔄 Migration des données pour l'entreprise {company_id}...")
    
    # Récupérer les informations de la base de données
    tenant_db = get_tenant_database(company_id)
    if not tenant_db:
        print(f"❌ Base de données non trouvée pour l'entreprise {company_id}")
        return False
    
    # Obtenir l'engine
    engine = get_tenant_engine(company_id)
    if not engine:
        print(f"❌ Impossible de se connecter à la base {tenant_db.db_name}")
        return False
    
    try:
        with Session(engine) as session:
            print("\n📊 Mise à jour des données...")
            
            # 1. Mettre à jour users
            print("   → Mise à jour de la table users...")
            result = session.exec(text(f"""
                UPDATE users 
                SET company_id = '{company_id}'::uuid 
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Users mis à jour")
            
            # 2. Mettre à jour jobs (via created_by)
            print("   → Mise à jour de la table jobs...")
            result = session.exec(text(f"""
                UPDATE jobs 
                SET company_id = (
                    SELECT company_id FROM users 
                    WHERE users.id = jobs.created_by 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Jobs mis à jour")
            
            # 3. Mettre à jour candidates (via created_by)
            print("   → Mise à jour de la table candidates...")
            result = session.exec(text(f"""
                UPDATE candidates 
                SET company_id = (
                    SELECT company_id FROM users 
                    WHERE users.id = candidates.created_by 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Candidates mis à jour")
            
            # 4. Mettre à jour applications (via job_id)
            print("   → Mise à jour de la table applications...")
            result = session.exec(text(f"""
                UPDATE applications 
                SET company_id = (
                    SELECT company_id FROM jobs 
                    WHERE jobs.id = applications.job_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Applications mises à jour")
            
            # 5. Mettre à jour interviews (via application_id)
            print("   → Mise à jour de la table interviews...")
            result = session.exec(text(f"""
                UPDATE interviews 
                SET company_id = (
                    SELECT company_id FROM applications 
                    WHERE applications.id = interviews.application_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Interviews mises à jour")
            
            # 6. Mettre à jour notifications (via user_id)
            print("   → Mise à jour de la table notifications...")
            result = session.exec(text(f"""
                UPDATE notifications 
                SET company_id = (
                    SELECT company_id FROM users 
                    WHERE users.id = notifications.user_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Notifications mises à jour")
            
            # 7. Mettre à jour offers (via application_id)
            print("   → Mise à jour de la table offers...")
            result = session.exec(text(f"""
                UPDATE offers 
                SET company_id = (
                    SELECT company_id FROM applications 
                    WHERE applications.id = offers.application_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Offers mises à jour")
            
            # 8. Mettre à jour onboarding_checklists (via application_id)
            print("   → Mise à jour de la table onboarding_checklists...")
            result = session.exec(text(f"""
                UPDATE onboarding_checklists 
                SET company_id = (
                    SELECT company_id FROM applications 
                    WHERE applications.id = onboarding_checklists.application_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Onboarding checklists mises à jour")
            
            # 9. Mettre à jour job_history (via job_id)
            print("   → Mise à jour de la table job_history...")
            result = session.exec(text(f"""
                UPDATE job_history 
                SET company_id = (
                    SELECT company_id FROM jobs 
                    WHERE jobs.id = job_history.job_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Job history mise à jour")
            
            # 10. Mettre à jour application_history (via application_id)
            print("   → Mise à jour de la table application_history...")
            result = session.exec(text(f"""
                UPDATE application_history 
                SET company_id = (
                    SELECT company_id FROM applications 
                    WHERE applications.id = application_history.application_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Application history mise à jour")
            
            # 11. Mettre à jour security_logs (via user_id)
            print("   → Mise à jour de la table security_logs...")
            result = session.exec(text(f"""
                UPDATE security_logs 
                SET company_id = (
                    SELECT company_id FROM users 
                    WHERE users.id = security_logs.user_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Security logs mises à jour")
            
            # 12. Mettre à jour teams (via manager_id ou utiliser company_id des users)
            print("   → Mise à jour de la table teams...")
            result = session.exec(text(f"""
                UPDATE teams 
                SET company_id = (
                    SELECT company_id FROM users 
                    WHERE users.id = teams.manager_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Teams mises à jour")
            
            # 13. Mettre à jour team_members (via user_id)
            print("   → Mise à jour de la table team_members...")
            result = session.exec(text(f"""
                UPDATE team_members 
                SET company_id = (
                    SELECT company_id FROM users 
                    WHERE users.id = team_members.user_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Team members mis à jour")
            
            # 14. Mettre à jour job_recruiters (via recruiter_id)
            print("   → Mise à jour de la table job_recruiters...")
            result = session.exec(text(f"""
                UPDATE job_recruiters 
                SET company_id = (
                    SELECT company_id FROM users 
                    WHERE users.id = job_recruiters.recruiter_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Job recruiters mis à jour")
            
            # 15. Mettre à jour client_interview_requests (via application_id)
            print("   → Mise à jour de la table client_interview_requests...")
            result = session.exec(text(f"""
                UPDATE client_interview_requests 
                SET company_id = (
                    SELECT company_id FROM applications 
                    WHERE applications.id = client_interview_requests.application_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Client interview requests mises à jour")
            
            # 16. Mettre à jour candidate_job_comparisons (via job_id)
            print("   → Mise à jour de la table candidate_job_comparisons...")
            result = session.exec(text(f"""
                UPDATE candidate_job_comparisons 
                SET company_id = (
                    SELECT company_id FROM jobs 
                    WHERE jobs.id = candidate_job_comparisons.job_id 
                    LIMIT 1
                )
                WHERE company_id IS NULL
            """))
            session.commit()
            print(f"      ✅ Candidate job comparisons mises à jour")
            
            # Vérification finale
            print("\n🔍 Vérification finale...")
            null_counts = {}
            tables = [
                "users", "jobs", "candidates", "applications", "interviews",
                "notifications", "offers", "onboarding_checklists", "job_history",
                "application_history", "security_logs", "teams", "team_members",
                "job_recruiters", "client_interview_requests", "candidate_job_comparisons"
            ]
            
            for table in tables:
                result = session.exec(text(f"""
                    SELECT COUNT(*) FROM {table} WHERE company_id IS NULL
                """))
                count = result.one()
                null_counts[table] = count
                if count > 0:
                    print(f"   ⚠️  {table}: {count} enregistrements sans company_id")
                else:
                    print(f"   ✅ {table}: tous les enregistrements ont un company_id")
            
            total_null = sum(null_counts.values())
            if total_null == 0:
                print("\n✅ Toutes les données ont été migrées avec succès!")
                return True
            else:
                print(f"\n⚠️  {total_null} enregistrements n'ont pas de company_id")
                print("   Vous devrez peut-être les mettre à jour manuellement")
                return False
                
    except Exception as e:
        print(f"\n❌ Erreur lors de la migration: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Fonction principale"""
    print("=" * 60)
    print("🔄 Script de migration des données avec company_id")
    print("=" * 60)
    print()
    
    # Récupérer l'ID de l'entreprise par défaut
    company_id = get_default_company_id()
    if not company_id:
        print("❌ Impossible de trouver l'entreprise par défaut")
        print("   Exécutez d'abord: python backend/migrations/create_default_company.py")
        sys.exit(1)
    
    print(f"📋 Entreprise par défaut: {company_id}")
    print()
    
    # Demander confirmation
    print("⚠️  ATTENTION: Cette opération va modifier votre base de données")
    print("⚠️  Assurez-vous d'avoir fait un backup avant de continuer")
    response = input("\nContinuer? (o/N): ")
    
    if response.lower() != 'o':
        print("Migration annulée")
        sys.exit(0)
    
    # Exécuter la migration
    success = migrate_data(company_id)
    
    if success:
        print("\n✅ Migration terminée avec succès!")
        sys.exit(0)
    else:
        print("\n⚠️  Migration terminée avec des avertissements")
        sys.exit(1)


if __name__ == "__main__":
    main()
