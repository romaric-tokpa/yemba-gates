# 🔧 Correction de l'Erreur de Migration

## ❌ Erreur Rencontrée

```
column companies.country does not exist
```

## 🔍 Cause

Le modèle Python `Company` inclut les champs `country`, `industry`, et `size`, mais le schéma SQL de la base MASTER ne les contient pas encore.

## ✅ Solution

### Option 1: Script Automatisé (Recommandé)

```bash
cd /Users/tokpa/Documents/recrutement-app
./backend/scripts/apply_company_fields_migration.sh
```

### Option 2: Migration Manuelle

```bash
cd /Users/tokpa/Documents/recrutement-app

# Appliquer la migration
psql -U postgres -d yemma_gates_master -f backend/migrations/add_company_fields_migration.sql
```

### Option 3: Commandes SQL Directes

```sql
-- Se connecter à la base MASTER
psql -U postgres -d yemma_gates_master

-- Ajouter les colonnes
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS size VARCHAR(50);

-- Vérifier
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'companies' 
AND column_name IN ('country', 'industry', 'size');
```

## ✅ Vérification

Après avoir appliqué la migration, vérifiez que les colonnes existent :

```sql
\d companies
```

Vous devriez voir :
- `country` (varchar(100))
- `industry` (varchar(100))
- `size` (varchar(50))

## 🧪 Re-test

Une fois la migration appliquée, relancez les tests :

```bash
python3 backend/scripts/test_register_simple.py
```

---

**Après avoir appliqué cette migration, l'inscription d'entreprise devrait fonctionner correctement! 🚀**
