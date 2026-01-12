# Instructions pour appliquer la migration SQL de la colonne status

## Problème
La colonne `status` n'existe pas dans la table `interviews` de la base de données, ce qui provoque une erreur 500 lors de l'accès aux entretiens.

## Solution
Exécuter la migration SQL pour ajouter la colonne `status` et les autres colonnes nécessaires.

## Option 1 : Utiliser le script Python existant

```bash
cd backend
python migrations/apply_interview_status_migration.py
```

## Option 2 : Utiliser psql directement

```bash
cd backend
psql postgresql://postgres:postgres@localhost:5432/recrutement_db -f migrations/add_interview_status_fields.sql
```

## Option 3 : Exécuter manuellement dans psql

1. Connectez-vous à PostgreSQL :
```bash
psql postgresql://postgres:postgres@localhost:5432/recrutement_db
```

2. Copiez et exécutez le contenu du fichier `backend/migrations/add_interview_status_fields.sql` :

```sql
-- Ajouter la colonne status si elle n'existe pas
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planifié';

-- Ajouter les autres colonnes si elles n'existent pas
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rescheduling_reason TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Mettre à jour les entretiens existants
UPDATE interviews SET status = 'planifié' WHERE status IS NULL;

-- Ajouter la contrainte CHECK
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_status_check 
CHECK (status IN ('planifié', 'réalisé', 'reporté', 'annulé'));
```

## Vérification

Après avoir appliqué la migration, vérifiez que la colonne existe :

```sql
\d interviews
```

Vous devriez voir la colonne `status` dans la liste des colonnes.

## Redémarrer le serveur backend

Après avoir appliqué la migration, **redémarrez le serveur backend** pour que les changements prennent effet :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
cd backend
uvicorn main:app --reload
```
