# 🔧 Fix: Erreur security_logs.company_id

## ❌ Problème

L'erreur suivante se produit lors de l'accès à `/api/admin/security-logs`:

```
psycopg2.errors.UndefinedColumn: column security_logs.company_id does not exist
```

## 🔍 Cause

Le modèle Python `SecurityLog` dans `backend/models.py` inclut le champ `company_id` (ligne 370), mais la table `security_logs` dans la base de données n'a pas cette colonne. Cela peut arriver si :

1. La table `security_logs` n'existe pas encore (créée via SQLModel)
2. La colonne `company_id` a été ajoutée au modèle mais pas à la base de données

## ✅ Solution

Deux scripts de migration sont disponibles pour corriger ce problème :

### Option 1: Script Shell (Recommandé)

```bash
cd /Users/tokpa/Documents/recrutement-app
./backend/scripts/apply_security_logs_migration.sh
```

Le script vous demandera :
1. D'appliquer à une base spécifique (option 1)
2. D'appliquer à toutes les bases tenant (option 2)

### Option 2: Script Python

```bash
cd /Users/tokpa/Documents/recrutement-app
python backend/scripts/apply_security_logs_migration.py
```

### Option 3: Migration Manuelle SQL

Si vous préférez appliquer manuellement :

```bash
# Pour une base spécifique
psql -U postgres -d <nom_base_tenant> -f backend/migrations/create_security_logs_table_if_missing.sql

# Ou pour toutes les bases tenant (exemple)
psql -U postgres -d yemmagates_<company_id> -f backend/migrations/create_security_logs_table_if_missing.sql
```

## 📋 Migration SQL

La migration fait ce qui suit :

1. **Crée la table `security_logs` si elle n'existe pas** avec toutes les colonnes nécessaires, y compris `company_id`
2. **Ajoute la colonne `company_id`** si la table existe mais sans cette colonne
3. **Crée les index** pour améliorer les performances :
   - `idx_security_logs_user_id`
   - `idx_security_logs_action`
   - `idx_security_logs_created_at`
   - `idx_security_logs_company_id`
   - `idx_security_logs_success`
4. **Met à jour les logs existants** avec le `company_id` de l'utilisateur associé (si `user_id` existe)

## 🔄 Appliquer à toutes les bases tenant

Pour appliquer automatiquement à toutes les bases tenant :

1. Utiliser le script shell ou Python avec l'option 2
2. Les scripts récupèrent automatiquement la liste des bases depuis `MASTER_DB` (table `tenant_databases`)
3. Appliquent la migration à chaque base

## ✅ Vérification

Après avoir appliqué la migration, vérifiez que la colonne existe :

```sql
-- Se connecter à une base tenant
psql -U postgres -d <nom_base_tenant>

-- Vérifier la structure de la table
\d security_logs

-- Ou vérifier la colonne spécifique
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'security_logs' 
AND column_name = 'company_id';
```

## 🚨 Notes importantes

- La migration est **idempotente** : elle peut être exécutée plusieurs fois sans problème
- Les logs existants sans `company_id` seront mis à jour avec le `company_id` de l'utilisateur associé (si `user_id` existe)
- Si `user_id` est NULL et qu'il n'y a pas de `company_id`, la valeur restera NULL (ce qui est acceptable)

## 📝 Fichiers créés

- `backend/migrations/create_security_logs_table_if_missing.sql` - Migration SQL complète
- `backend/migrations/add_company_id_to_security_logs.sql` - Migration pour ajouter uniquement company_id (si table existe)
- `backend/scripts/apply_security_logs_migration.sh` - Script shell pour appliquer la migration
- `backend/scripts/apply_security_logs_migration.py` - Script Python pour appliquer la migration

---

**Après avoir appliqué la migration, l'erreur devrait être résolue !** ✅
