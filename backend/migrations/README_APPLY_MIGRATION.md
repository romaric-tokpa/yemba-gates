# Migration: Table candidate_job_comparisons

## Description
Cette migration crée la table `candidate_job_comparisons` pour stocker les analyses IA de correspondance entre candidats et besoins de recrutement.

## Application de la migration

### Option 1: Via psql (Recommandé)
```bash
psql -h localhost -U postgres -d recrutement_db -f backend/migrations/create_candidate_job_comparisons_table.sql
```

### Option 2: Via le script Python
```bash
cd backend
python3 migrations/apply_candidate_job_comparisons_migration.py
```

### Option 3: Exécution manuelle dans psql
Connectez-vous à votre base de données PostgreSQL et exécutez le contenu du fichier `create_candidate_job_comparisons_table.sql`

## Vérification
Après avoir appliqué la migration, vérifiez que la table existe :
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'candidate_job_comparisons';
```

Si la table existe, vous devriez voir `candidate_job_comparisons` dans les résultats.

## Important
⚠️ **Cette migration est OBLIGATOIRE** pour que la sauvegarde des analyses IA fonctionne. Sans cette table, les analyses ne seront pas sauvegardées et une erreur sera levée lors de la génération d'une analyse.

