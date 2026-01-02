# 🔧 Correction de la contrainte CHECK sur le statut des jobs

## Problème
L'erreur `CheckViolation` se produit car la contrainte CHECK sur la colonne `status` de la table `jobs` n'inclut pas les nouveaux statuts (`archive`, `gagne`, `standby`, etc.).

## Solution

### Option 1 : Exécuter le script SQL directement

Exécutez le script SQL suivant dans votre base de données PostgreSQL :

```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Augmenter la taille du champ status
ALTER TABLE jobs ALTER COLUMN status TYPE VARCHAR(50);

-- Ajouter la nouvelle contrainte avec tous les statuts
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
CHECK (status IN (
    'brouillon',
    'a_valider',
    'urgent',
    'tres_urgent',
    'besoin_courant',
    'validé',
    'en_cours',
    'gagne',
    'standby',
    'archive',
    'clôturé',
    'en_attente',
    'en_attente_validation'
));
```

### Option 2 : Utiliser psql en ligne de commande

```bash
# Se connecter à PostgreSQL
psql -U postgres -d recrutement_db

# Puis exécuter le script
\i backend/fix_job_status_constraint.sql
```

### Option 3 : Utiliser un client PostgreSQL (pgAdmin, DBeaver, etc.)

1. Ouvrez votre client PostgreSQL
2. Connectez-vous à la base de données `recrutement_db`
3. Exécutez le contenu du fichier `backend/fix_job_status_constraint.sql`

### Option 4 : Via Python (si vous avez accès)

```bash
cd backend
python migrations/apply_job_status_fix.py
```

## Vérification

Après avoir appliqué la migration, vérifiez que la contrainte est bien mise à jour :

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'jobs'::regclass 
AND conname = 'jobs_status_check';
```

Vous devriez voir tous les nouveaux statuts dans la définition de la contrainte.

## Statuts disponibles

Après la migration, les statuts suivants sont autorisés :

- `brouillon` - Brouillon
- `a_valider` - À valider
- `urgent` - Urgent
- `tres_urgent` - Très urgent
- `besoin_courant` - Besoin courant
- `validé` - Validé
- `en_cours` - En cours
- `gagne` - Gagné
- `standby` - Standby
- `archive` - Archivé
- `clôturé` - Clôturé
- `en_attente` - En attente (pour compatibilité)
- `en_attente_validation` - En attente de validation (pour compatibilité)

## Notes

- La taille du champ `status` a été augmentée de `VARCHAR(20)` à `VARCHAR(50)` pour supporter les nouveaux statuts
- Les anciens statuts sont conservés pour la compatibilité avec les données existantes
- Cette migration est réversible (vous pouvez supprimer la contrainte et la recréer avec moins de statuts si nécessaire)

