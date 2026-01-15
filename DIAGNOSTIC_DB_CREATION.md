# 🔍 Diagnostic - Création de Base de Données

## ❌ Erreur Rencontrée

```
"detail": "Impossible de créer la base de données: yemmagates_604e66ac421d"
```

## 🔧 Corrections Apportées

1. ✅ **Gestion d'erreur améliorée** : La fonction `create_tenant_database` retourne maintenant un tuple `(success, error_message)` pour plus de détails
2. ✅ **Correction AUTOCOMMIT** : Suppression de `commit()` inutile avec `isolation_level="AUTOCOMMIT"`
3. ✅ **Messages d'erreur détaillés** : L'erreur exacte est maintenant retournée dans la réponse HTTP

## 🧪 Diagnostic

### Étape 1: Tester la création de base de données

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/scripts/test_db_creation.py
```

Ce script va vérifier :
- ✅ Connexion à PostgreSQL
- ✅ Droits de création de base
- ✅ Création d'une base de test

### Étape 2: Vérifier les permissions PostgreSQL

Si le test échoue sur les droits, exécutez :

```sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Vérifier les droits de l'utilisateur
SELECT rolname, rolcreatedb FROM pg_roles WHERE rolname = 'postgres';

-- Si rolcreatedb = false, donner les droits
ALTER USER postgres CREATEDB;
```

### Étape 3: Vérifier les variables d'environnement

Vérifiez que les variables suivantes sont correctement configurées :

```bash
echo $POSTGRES_USER      # Devrait être "postgres" (ou votre utilisateur)
echo $POSTGRES_PASSWORD  # Votre mot de passe PostgreSQL
echo $POSTGRES_HOST      # Devrait être "localhost" (ou votre host)
echo $POSTGRES_PORT      # Devrait être "5432" (ou votre port)
```

### Étape 4: Test manuel de création

```sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Tester la création d'une base
CREATE DATABASE yemmagates_test_123;

-- Si ça fonctionne, supprimer la base
DROP DATABASE yemmagates_test_123;
```

## 🐛 Causes Possibles

### 1. Droits PostgreSQL insuffisants
**Symptôme** : `permission denied to create database`
**Solution** :
```sql
ALTER USER postgres CREATEDB;
```

### 2. Connexion échoue
**Symptôme** : `connection refused` ou `authentication failed`
**Solution** :
- Vérifier que PostgreSQL est démarré
- Vérifier les credentials dans les variables d'environnement
- Vérifier que le serveur accepte les connexions

### 3. Base existe déjà
**Symptôme** : `database already exists`
**Solution** : Le code devrait gérer cela, mais vérifiez dans PostgreSQL :
```sql
SELECT datname FROM pg_database WHERE datname LIKE 'yemmagates_%';
```

### 4. Problème de nom de base
**Symptôme** : Erreur de syntaxe SQL
**Solution** : Le nom est automatiquement nettoyé par `sanitize_db_name()`

## 📋 Après Correction

Une fois le problème résolu, relancez les tests :

```bash
# Test de création de base
python3 backend/scripts/test_db_creation.py

# Test d'inscription d'entreprise
python3 backend/scripts/test_register_simple.py
```

## 🔍 Logs Détaillés

Pour voir les logs détaillés du serveur lors de l'inscription :

```bash
# Vérifiez les logs du serveur FastAPI
# Les erreurs détaillées devraient maintenant apparaître dans la réponse HTTP
```

---

**Exécutez d'abord `python3 backend/scripts/test_db_creation.py` pour identifier le problème exact! 🔍**
