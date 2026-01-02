# 🔧 Correction : Colonne updated_at manquante dans notifications

## Problème
L'erreur `column notifications.updated_at does not exist` se produit car le modèle SQLModel `Notification` définit un champ `updated_at`, mais la table dans la base de données ne contient pas cette colonne.

## Solution

### Option 1 : Exécuter le script SQL directement

Exécutez le script SQL suivant dans votre base de données PostgreSQL :

```sql
-- Ajouter la colonne updated_at si elle n'existe pas déjà
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Mettre à jour les valeurs existantes avec la valeur de created_at
UPDATE notifications 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;

-- Créer le trigger
CREATE TRIGGER update_notifications_updated_at 
BEFORE UPDATE ON notifications
FOR EACH ROW 
EXECUTE FUNCTION update_notifications_updated_at();
```

### Option 2 : Utiliser psql en ligne de commande

```bash
# Se connecter à PostgreSQL
psql -U postgres -d recrutement_db

# Puis exécuter le script
\i backend/migrations/add_notifications_updated_at.sql
```

### Option 3 : Utiliser un client PostgreSQL (pgAdmin, DBeaver, etc.)

1. Ouvrez votre client PostgreSQL
2. Connectez-vous à la base de données `recrutement_db`
3. Exécutez le contenu du fichier `backend/migrations/add_notifications_updated_at.sql`

### Option 4 : Via Python (si vous avez accès)

```bash
cd backend
python migrations/add_notifications_updated_at.py
```

## Vérification

Après avoir appliqué la migration, vérifiez que la colonne existe :

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name = 'updated_at';
```

Vous devriez voir la colonne `updated_at` de type `timestamp without time zone`.

## Notes

- La colonne `updated_at` sera automatiquement mise à jour lors de chaque modification d'une notification grâce au trigger
- Les notifications existantes auront leur `updated_at` initialisé avec la valeur de `created_at`
- Cette migration est idempotente (peut être exécutée plusieurs fois sans erreur grâce à `IF NOT EXISTS`)

