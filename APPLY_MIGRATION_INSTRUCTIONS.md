# Instructions pour appliquer la migration des statuts d'entretiens

## Problème
L'erreur indique que les colonnes `status`, `rescheduled_at`, `rescheduling_reason`, `cancellation_reason`, `cancelled_at`, et `completed_at` n'existent pas dans la table `interviews`.

## Solution

Exécutez le script SQL suivant dans votre base de données PostgreSQL :

### Option 1 : Via psql (recommandé)

```bash
psql -U postgres -d recrutement_db -f backend/migrations/add_interview_status_fields.sql
```

### Option 2 : Via un client PostgreSQL (pgAdmin, DBeaver, etc.)

Copiez et exécutez le contenu du fichier `backend/migrations/add_interview_status_fields.sql`

### Option 3 : Via Python (si le backend est en cours d'exécution)

```bash
cd /Users/tokpa/Documents/recrutement-app
source .venv/bin/activate
python backend/migrations/apply_interview_status_migration.py
```

### Option 4 : SQL direct

Si vous avez accès à psql ou à un client SQL, exécutez directement :

```sql
-- Ajouter la colonne status
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planifié';

-- Ajouter la colonne rescheduled_at
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP;

-- Ajouter la colonne rescheduling_reason
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rescheduling_reason TEXT;

-- Ajouter la colonne cancellation_reason
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Ajouter la colonne cancelled_at
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Ajouter la colonne completed_at
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Mettre à jour les entretiens existants
UPDATE interviews SET status = 'planifié' WHERE status IS NULL;

-- Ajouter la contrainte CHECK (si elle n'existe pas déjà)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'interviews_status_check'
    ) THEN
        ALTER TABLE interviews ADD CONSTRAINT interviews_status_check 
        CHECK (status IN ('planifié', 'réalisé', 'reporté', 'annulé'));
    END IF;
END $$;
```

## Vérification

Après avoir exécuté la migration, vérifiez que les colonnes existent :

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name IN ('status', 'rescheduled_at', 'rescheduling_reason', 'cancellation_reason', 'cancelled_at', 'completed_at');
```

Vous devriez voir les 6 colonnes listées.

