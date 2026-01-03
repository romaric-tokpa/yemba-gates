# Instructions pour appliquer la migration du champ phone

## Problème
Le champ `phone` dans la table `candidates` est limité à 30 caractères, mais certains numéros de téléphone peuvent être plus longs (ex: `+225 0160 6369 11 / +225 0789 8279 60` = 43 caractères).

## Solution
Une migration SQL a été créée pour augmenter la taille du champ `phone` de VARCHAR(30) à VARCHAR(100).

## Méthode 1 : Via psql (recommandé)

```bash
# Remplacez les valeurs suivantes par vos propres identifiants
psql -U votre_utilisateur -d votre_base_de_donnees -f backend/migrations/increase_candidate_phone_length.sql
```

Exemple :
```bash
psql -U postgres -d recrutement_db -f backend/migrations/increase_candidate_phone_length.sql
```

## Méthode 2 : Via Python (si vous avez accès à la base de données)

```bash
cd backend
python migrations/apply_phone_length_fix.py
```

## Méthode 3 : Exécution manuelle SQL

Connectez-vous à votre base de données PostgreSQL et exécutez :

```sql
ALTER TABLE candidates 
ALTER COLUMN phone TYPE VARCHAR(100);
```

## Vérification

Pour vérifier que la migration a été appliquée avec succès :

```sql
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'candidates' AND column_name = 'phone';
```

Vous devriez voir `character_maximum_length = 100`.

## Après la migration

Une fois la migration appliquée, redémarrez le serveur backend et réessayez de créer le candidat.

