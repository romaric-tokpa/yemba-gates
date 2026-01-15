# ✅ Résultat de la Migration Security Logs

## Statut

La migration a été appliquée avec succès à **1 base de données** :
- ✅ `yemmagates_a657804b98f4` - Migration appliquée avec succès

## Bases avec erreurs (3 bases)

Les bases suivantes ont des erreurs car la table `users` n'a pas encore la colonne `company_id` :
- ❌ `recrutement_db` (x3) - Erreur: `column "company_id" does not exist` dans users

## Cause des erreurs

Les bases `recrutement_db` sont des bases existantes qui n'ont pas encore été migrées vers le système multi-tenant. La table `users` dans ces bases n'a pas encore la colonne `company_id`.

## Solution

Pour corriger les erreurs, vous avez deux options :

### Option 1: Ajouter company_id à users dans ces bases

Si ces bases doivent rester en mono-tenant, ajoutez une colonne `company_id` avec une valeur par défaut :

```sql
-- Pour chaque base recrutement_db
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID;
-- Optionnel: Définir une valeur par défaut pour les utilisateurs existants
-- UPDATE users SET company_id = '<un-uuid-par-defaut>' WHERE company_id IS NULL;
```

### Option 2: Ignorer ces bases

Si ces bases sont obsolètes ou seront migrées plus tard, vous pouvez :
- Les supprimer de la table `tenant_databases` dans `MASTER_DB`
- Ou simplement les ignorer pour l'instant

## Vérification

Pour vérifier que la migration a bien fonctionné sur `yemmagates_a657804b98f4` :

```sql
psql -U postgres -d yemmagates_a657804b98f4 -c "\d security_logs"
```

Vous devriez voir la colonne `company_id` dans la liste des colonnes.

## Test de l'endpoint

Après la migration, l'endpoint `/api/admin/security-logs` devrait fonctionner sans erreur pour la base `yemmagates_a657804b98f4`.

## Note

La migration est **idempotente** - vous pouvez la réexécuter sans problème. Une fois que vous aurez ajouté `company_id` à la table `users` dans les bases `recrutement_db`, vous pouvez relancer la migration pour les mettre à jour.
