# 🚀 GUIDE DE DÉMARRAGE RAPIDE - Migration Multi-Tenant

Guide rapide pour démarrer la migration vers l'architecture multi-tenant.

---

## ⚡ DÉMARRAGE RAPIDE (5 étapes)

### 1. Créer la base MASTER

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base
CREATE DATABASE yemma_gates_master;
\c yemma_gates_master

# Exécuter le schéma
\i backend/schema_master.sql
```

### 2. Configurer les variables d'environnement

Ajouter dans `.env`:
```env
MASTER_DB_URL=postgresql://postgres:postgres@localhost:5432/yemma_gates_master
```

### 3. Créer l'entreprise par défaut

```bash
cd backend
python migrations/create_default_company.py
```

**Noter l'ID de l'entreprise affiché** (nécessaire pour l'étape suivante).

### 4. Migrer les données existantes

```bash
# Éditer backend/migrations/add_company_id_migration.sql
# Remplacer 'COMPANY_ID_DEFAULT' par l'ID réel de l'entreprise

# Exécuter la migration
psql -U postgres -d recrutement_db -f backend/migrations/add_company_id_migration.sql
```

### 5. Mettre à jour les routers

```bash
python backend/migrations/update_routers_for_tenant.py
```

---

## ✅ VÉRIFICATION

```bash
# Démarrer le serveur
cd backend
python -m uvicorn main:app --reload

# Tester
curl http://localhost:8000/health
```

---

## 📚 DOCUMENTATION COMPLÈTE

- **AUDIT_REPORT.md** - Rapport d'audit détaillé
- **IMPLEMENTATION_GUIDE.md** - Guide d'implémentation complet
- **MIGRATION_CHECKLIST.md** - Checklist détaillée
- **REFACTORING_SUMMARY.md** - Résumé de la refactorisation

---

## 🆘 EN CAS DE PROBLÈME

Voir la section "Dépannage" dans `IMPLEMENTATION_GUIDE.md`.
