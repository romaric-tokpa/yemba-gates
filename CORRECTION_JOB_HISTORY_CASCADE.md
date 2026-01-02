# Correction de l'erreur de suppression d'un besoin

## Problème

Lors de la suppression d'un besoin, une erreur se produisait :
```
(psycopg2.errors.NotNullViolation) null value in column "job_id" of relation "job_history" violates not-null constraint
```

## Cause

La contrainte de clé étrangère `job_history.job_id` était définie avec `ON DELETE CASCADE`, ce qui supprimait automatiquement l'historique lors de la suppression d'un job. Cependant, le code tentait de créer une entrée d'historique avant la suppression, et SQLAlchemy essayait de mettre à jour l'historique avec `job_id=None` après la suppression.

## Solution

Pour conserver l'historique même après suppression d'un job, nous avons modifié :

1. **Le modèle SQLModel** (`backend/models.py`) :
   - `job_id` peut maintenant être `None` : `job_id: UUID | None`
   - La contrainte de clé étrangère utilise `ON DELETE SET NULL` au lieu de `CASCADE`

2. **Le schéma SQL** (`schema.sql`) :
   - `job_id UUID REFERENCES jobs(id) ON DELETE SET NULL` (sans `NOT NULL`)

3. **La fonction de suppression** (`backend/routers/jobs.py`) :
   - Stocke le `job_id` dans une variable avant la suppression
   - Utilise `session.flush()` pour sauvegarder l'historique avant de supprimer le job

4. **L'endpoint d'historique** (`backend/routers/history.py`) :
   - Gère les cas où `job_id` peut être `None`

## Migration à appliquer

Pour appliquer cette correction à une base de données existante, exécutez :

```bash
cd backend
python migrations/apply_job_history_fix.py
```

Ou manuellement avec SQL :

```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE job_history 
DROP CONSTRAINT IF EXISTS job_history_job_id_fkey;

-- Permettre NULL
ALTER TABLE job_history 
ALTER COLUMN job_id DROP NOT NULL;

-- Recréer la contrainte avec SET NULL
ALTER TABLE job_history 
ADD CONSTRAINT job_history_job_id_fkey 
FOREIGN KEY (job_id) 
REFERENCES jobs(id) 
ON DELETE SET NULL;
```

## Résultat

Maintenant, lors de la suppression d'un besoin :
- L'historique est conservé avec toutes les informations
- Le `job_id` est mis à `NULL` dans l'historique (mais l'historique reste)
- L'historique des besoins supprimés peut être consulté via `/history/deleted-jobs`

