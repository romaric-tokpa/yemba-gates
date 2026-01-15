#!/usr/bin/env python3
"""
Script Python pour appliquer la migration security_logs
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from pathlib import Path

# Charger les variables d'environnement depuis .env si disponible
try:
    from dotenv import load_dotenv
    # Charger depuis le répertoire racine du projet
    project_root = Path(__file__).parent.parent.parent
    env_file = project_root / '.env'
    if env_file.exists():
        load_dotenv(env_file)
    else:
        load_dotenv()  # Essayer depuis le répertoire courant
except ImportError:
    pass  # python-dotenv n'est pas installé, continuer sans

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_tenant_databases():
    """Récupère la liste des bases de données tenant depuis MASTER_DB"""
    master_db_url = os.getenv(
        'MASTER_DB_URL',
        f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('MASTER_DB', 'yemma_gates_master')}"
    )
    
    try:
        conn = psycopg2.connect(master_db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        cursor.execute("SELECT db_name FROM tenant_databases;")
        tenant_dbs = [row[0] for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return tenant_dbs
    except Exception as e:
        print(f"Erreur lors de la récupération des bases tenant: {e}")
        return []

def apply_migration(db_name, migration_file):
    """Applique la migration à une base de données"""
    # Utiliser postgres par défaut (pas recrutement) pour les migrations
    db_user = os.getenv('DB_USER') or os.getenv('POSTGRES_USER') or 'postgres'
    # Si l'utilisateur est "recrutement", utiliser postgres à la place (pour migrations)
    if db_user == 'recrutement':
        db_user = 'postgres'
    
    db_password = os.getenv('DB_PASSWORD') or os.getenv('POSTGRES_PASSWORD') or ''
    # Si pas de mot de passe spécifié, essayer de demander ou utiliser vide
    db_host = os.getenv('DB_HOST') or 'localhost'
    db_port = os.getenv('DB_PORT') or '5432'
    
    db_url = os.getenv(
        'TENANT_DB_URL',
        f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    )
    
    # Remplacer le nom de la base dans l'URL si nécessaire
    if not db_url.endswith(f'/{db_name}'):
        db_url = db_url.rsplit('/', 1)[0] + f'/{db_name}'
    
    try:
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Lire et exécuter le fichier de migration
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
            # Exécuter chaque commande SQL séparément pour mieux gérer les erreurs
            # Séparer par les points-virgules (en ignorant ceux dans les blocs DO)
            try:
                # Exécuter tout le SQL d'un coup (les blocs DO sont gérés par PostgreSQL)
                cursor.execute(migration_sql)
            except Exception as e:
                # Si erreur, essayer d'exécuter seulement la création de table et l'ajout de colonne
                # sans la mise à jour des données existantes
                error_msg = str(e)
                if 'column "company_id" does not exist' in error_msg:
                    # Créer/ajouter company_id sans mettre à jour depuis users
                    simplified_sql = """
                    CREATE TABLE IF NOT EXISTS security_logs (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                        action VARCHAR(100) NOT NULL,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        success BOOLEAN DEFAULT TRUE,
                        details TEXT,
                        company_id UUID,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
                    CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
                    CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
                    CREATE INDEX IF NOT EXISTS idx_security_logs_company_id ON security_logs(company_id);
                    CREATE INDEX IF NOT EXISTS idx_security_logs_success ON security_logs(success);
                    
                    DO $$ 
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.tables WHERE table_name = 'security_logs'
                        ) AND NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'security_logs' AND column_name = 'company_id'
                        ) THEN
                            ALTER TABLE security_logs ADD COLUMN company_id UUID;
                            CREATE INDEX IF NOT EXISTS idx_security_logs_company_id ON security_logs(company_id);
                            RAISE NOTICE 'Colonne company_id ajoutée (mise à jour depuis users ignorée)';
                        END IF;
                    END $$;
                    """
                    cursor.execute(simplified_sql)
                else:
                    raise  # Relancer l'erreur originale
        
        cursor.close()
        conn.close()
        
        print(f"✓ Migration appliquée avec succès à {db_name}")
        return True
    except Exception as e:
        print(f"✗ Erreur lors de l'application de la migration à {db_name}: {e}")
        return False

def main():
    migration_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'migrations',
        'create_security_logs_table_if_missing.sql'
    )
    
    if not os.path.exists(migration_file):
        print(f"✗ Fichier de migration non trouvé: {migration_file}")
        sys.exit(1)
    
    print("Migration: Création/mise à jour de security_logs")
    print("=" * 50)
    
    # Mode non-interactif si des arguments sont fournis
    if len(sys.argv) > 1:
        choice = sys.argv[1]
        if len(sys.argv) > 2:
            db_name = sys.argv[2]
    else:
        # Mode interactif
        print("\nOptions:")
        print("1. Appliquer à une base de données spécifique")
        print("2. Appliquer à toutes les bases de données tenant")
        choice = input("\nChoisir une option (1 ou 2): ").strip()
    
    if choice == "1":
        if 'db_name' not in locals():
            if len(sys.argv) > 2:
                db_name = sys.argv[2]
            else:
                db_name = input("Nom de la base de données: ").strip()
        if apply_migration(db_name, migration_file):
            sys.exit(0)
        else:
            sys.exit(1)
    
    elif choice == "2":
        print("\nRécupération de la liste des bases de données tenant...")
        tenant_dbs = get_tenant_databases()
        
        if not tenant_dbs:
            print("Aucune base de données tenant trouvée")
            sys.exit(0)
        
        print(f"\nBases de données trouvées ({len(tenant_dbs)}):")
        for db in tenant_dbs:
            print(f"  - {db}")
        
        # Mode non-interactif : auto-confirmer si argument --yes
        if len(sys.argv) > 2 and sys.argv[2] == '--yes':
            confirm = 'o'
        else:
            confirm = input("\nAppliquer la migration à toutes ces bases? (o/n): ").strip().lower()
        
        if confirm != 'o':
            print("Annulé")
            sys.exit(0)
        
        success_count = 0
        error_count = 0
        
        for db in tenant_dbs:
            if apply_migration(db, migration_file):
                success_count += 1
            else:
                error_count += 1
        
        print("\n" + "=" * 50)
        print(f"Résultat:")
        print(f"  Succès: {success_count}")
        print(f"  Erreurs: {error_count}")
        
        sys.exit(0 if error_count == 0 else 1)
    
    else:
        print("Option invalide")
        sys.exit(1)

if __name__ == "__main__":
    main()
