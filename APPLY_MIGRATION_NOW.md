# 🚀 Appliquer la Migration Security Logs - Instructions Rapides

## Méthode 1: Script Python (Recommandé)

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/scripts/apply_security_logs_migration.py
```

Ensuite, choisissez:
- **Option 2** : Appliquer à toutes les bases tenant (recommandé)
- Tapez **o** pour confirmer

## Méthode 2: Script Shell

```bash
cd /Users/tokpa/Documents/recrutement-app
./backend/scripts/apply_security_logs_migration.sh
```

## Méthode 3: Migration SQL Directe

Si vous connaissez le nom de votre base tenant:

```bash
cd /Users/tokpa/Documents/recrutement-app

# Remplacer <DB_NAME> par le nom de votre base tenant
psql -U postgres -h localhost -d <DB_NAME> -f backend/migrations/create_security_logs_table_if_missing.sql
```

Pour trouver les noms des bases tenant:
```sql
psql -U postgres -h localhost -d yemma_gates_master -c "SELECT database_name FROM tenant_databases;"
```

## Variables d'Environnement Nécessaires

Le script utilise ces variables (depuis `.env` ou variables système):
- `DB_USER` ou `POSTGRES_USER` (défaut: postgres)
- `DB_PASSWORD` ou `POSTGRES_PASSWORD`
- `DB_HOST` (défaut: localhost)
- `DB_PORT` (défaut: 5432)
- `MASTER_DB` (défaut: yemma_gates_master)

## Vérification

Après la migration, vérifiez que la colonne existe:

```bash
psql -U postgres -h localhost -d <DB_NAME> -c "\d security_logs"
```

Ou pour voir uniquement la colonne company_id:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'security_logs' 
AND column_name = 'company_id';
```
