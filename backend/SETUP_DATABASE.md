# Configuration de la Base de Données

## Étape 1 : Créer la base de données (si elle n'existe pas)

### Option A : Via psql

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE recrutement_db;

# Quitter psql
\q
```

### Option B : Via la ligne de commande

```bash
createdb -U postgres recrutement_db
```

## Étape 2 : Appliquer le schéma initial (si la table candidates n'existe pas)

```bash
# Depuis le répertoire racine du projet
psql -U postgres -d recrutement_db -f ../schema.sql
```

## Étape 3 : Exécuter la migration pour ajouter les colonnes manquantes

### Option A : Utiliser le script SQL complet (crée la DB si nécessaire)

```bash
cd backend
psql -U postgres -f check_and_create_db.sql
```

### Option B : Si la base existe déjà, utiliser la migration simple

```bash
cd backend
psql -U postgres -d recrutement_db -f migrations/add_candidate_fields.sql
```

### Option C : Exécuter directement les commandes SQL

```bash
psql -U postgres -d recrutement_db
```

Puis dans psql :
```sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills TEXT[];
\q
```

## Vérification

Pour vérifier que les colonnes ont été ajoutées :

```bash
psql -U postgres -d recrutement_db -c "\d candidates"
```

Vous devriez voir `profile_picture_url` et `skills` dans la liste des colonnes.

## Dépannage

### Si la base de données n'existe pas

1. Créez-la d'abord :
   ```bash
   createdb -U postgres recrutement_db
   ```

2. Appliquez le schéma initial :
   ```bash
   psql -U postgres -d recrutement_db -f schema.sql
   ```

3. Exécutez la migration :
   ```bash
   psql -U postgres -d recrutement_db -f backend/migrations/add_candidate_fields.sql
   ```

### Si la table candidates n'existe pas

Appliquez d'abord le schéma complet :
```bash
psql -U postgres -d recrutement_db -f schema.sql
```

Puis exécutez la migration.
