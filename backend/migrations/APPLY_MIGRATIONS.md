# 🔧 Application des Migrations

## ⚠️ IMPORTANT : Ces migrations sont OBLIGATOIRES

Quatre migrations doivent être appliquées pour que l'application fonctionne correctement :

### Migration 1: Ajouter `meeting_link` à la table `interviews`
Cette colonne est nécessaire pour stocker les liens de visioconférence.

### Migration 2: Ajouter `notes` à la table `interviews`
Cette colonne est nécessaire pour stocker les notes préparatoires des entretiens.

### Migration 3: Ajouter `decision` et `score` à la table `interviews`
Ces colonnes sont nécessaires pour stocker la décision et le score de l'entretien.

### Migration 4: Créer la table `candidate_job_comparisons`
Cette table est nécessaire pour sauvegarder les analyses IA.

## 🚀 Méthodes d'application

### Option 1: Script automatique (Recommandé)
```bash
cd backend/migrations
./apply_all_migrations.sh
```

### Option 2: Application manuelle avec psql

#### Migration 1: meeting_link
```bash
psql -h localhost -U postgres -d recrutement_db -f backend/migrations/add_meeting_link_to_interviews.sql
```

#### Migration 2: notes
```bash
psql -h localhost -U postgres -d recrutement_db -f backend/migrations/add_notes_to_interviews.sql
```

#### Migration 3: decision et score
```bash
psql -h localhost -U postgres -d recrutement_db -f backend/migrations/add_decision_score_to_interviews.sql
```

#### Migration 4: candidate_job_comparisons
```bash
psql -h localhost -U postgres -d recrutement_db -f backend/migrations/create_candidate_job_comparisons_table.sql
```

### Option 3: Exécution directe SQL

Connectez-vous à votre base de données PostgreSQL et exécutez :

```sql
-- Migration 1
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500) NULL;

-- Migration 2
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- Migration 3
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS decision VARCHAR(20) NULL;

ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS score INTEGER NULL;

-- Migration 4
CREATE TABLE IF NOT EXISTS candidate_job_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_data TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
    UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_job_comparisons_candidate ON candidate_job_comparisons(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_comparisons_job ON candidate_job_comparisons(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_comparisons_created_by ON candidate_job_comparisons(created_by);
```

## ✅ Vérification

Après avoir appliqué les migrations, vérifiez que tout est en place :

```sql
-- Vérifier que meeting_link existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' AND column_name = 'meeting_link';

-- Vérifier que notes existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' AND column_name = 'notes';

-- Vérifier que decision et score existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' AND column_name IN ('decision', 'score');

-- Vérifier que candidate_job_comparisons existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'candidate_job_comparisons';
```

## ⚠️ Erreurs possibles

Si vous voyez l'erreur :
- `column interviews.meeting_link does not exist` → La migration 1 n'a pas été appliquée
- `column interviews.notes does not exist` → La migration 2 n'a pas été appliquée
- `column interviews.decision does not exist` ou `column interviews.score does not exist` → La migration 3 n'a pas été appliquée
- `relation "candidate_job_comparisons" does not exist` → La migration 4 n'a pas été appliquée
- `'Interview' object has no attribute 'preparation_notes'` → Le code a été corrigé, mais vérifiez que toutes les migrations sont appliquées

Dans ce cas, appliquez les migrations manquantes.

