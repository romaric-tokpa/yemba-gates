# Correction Rapide - Erreur 500 sur /candidates/

## Problème
```
column candidates.profile_picture_url does not exist
column candidates.skills does not exist
```

## Solution Rapide (3 étapes)

### Étape 1 : Vérifier si la base de données existe

```bash
psql -U postgres -l | grep recrutement_db
```

Si elle n'existe pas, créez-la :
```bash
createdb -U postgres recrutement_db
```

### Étape 2 : Vérifier si la table candidates existe

```bash
psql -U postgres -d recrutement_db -c "\dt candidates"
```

Si la table n'existe pas, appliquez le schéma complet :
```bash
cd /Users/tokpa/Documents/recrutement-app
psql -U postgres -d recrutement_db -f schema.sql
```

### Étape 3 : Ajouter les colonnes manquantes

```bash
cd backend
psql -U postgres -d recrutement_db << EOF
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills TEXT[];
EOF
```

Ou en une seule commande :
```bash
psql -U postgres -d recrutement_db -c "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500); ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills TEXT[];"
```

## Vérification

```bash
psql -U postgres -d recrutement_db -c "\d candidates" | grep -E "profile_picture_url|skills"
```

Vous devriez voir les deux colonnes listées.

## Redémarrer le serveur

```bash
cd backend
uvicorn main:app --reload
```

