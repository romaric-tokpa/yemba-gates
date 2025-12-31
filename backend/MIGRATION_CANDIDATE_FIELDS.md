# Migration : Ajout des champs profile_picture_url et skills

## Problème
L'erreur suivante apparaît :
```
column candidates.profile_picture_url does not exist
column candidates.skills does not exist
```

## Solution

### Option 1 : Exécuter le script SQL directement

```bash
# Se connecter à PostgreSQL
psql -U postgres -d recrutement_db

# Puis exécuter ces commandes SQL :
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS skills TEXT[];

-- Quitter psql
\q
```

### Option 2 : Utiliser le fichier SQL

```bash
psql -U postgres -d recrutement_db -f migrations/add_candidate_fields.sql
```

### Option 3 : Utiliser le script Python

```bash
cd backend
python3 migrate_candidate_fields.py
```

## Vérification

Après avoir exécuté la migration, vérifiez que les colonnes existent :

```sql
\d candidates
```

Vous devriez voir `profile_picture_url` et `skills` dans la liste des colonnes.

## Redémarrer le serveur

Une fois la migration effectuée, redémarrez le serveur backend :

```bash
cd backend
uvicorn main:app --reload
```

