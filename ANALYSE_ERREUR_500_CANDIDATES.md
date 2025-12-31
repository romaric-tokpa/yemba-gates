# Analyse de l'erreur 500 - GET /candidates/

## 🔍 Problème identifié

**Erreur** : `INFO: 127.0.0.1:50067 - "GET /candidates/ HTTP/1.1" 500 Internal Server Error`

## 📋 Causes probables

### 1. **Incompatibilité de type pour le champ `skills`**

**Problème** :
- Le modèle `Candidate` définit `skills: List[str] = Field(default=[])`
- Mais dans la base de données PostgreSQL, la colonne `skills` (type `TEXT[]`) peut contenir des valeurs `NULL`
- SQLAlchemy/SQLModel ne peut pas convertir automatiquement `NULL` en liste vide `[]`

**Solution appliquée** :
```python
# Avant (problématique)
skills: List[str] = Field(default=[], sa_column=Column(ARRAY(String)))

# Après (corrigé)
skills: List[str] | None = Field(default=None, sa_column=Column(ARRAY(String)))
```

### 2. **Sérialisation vers CandidateResponse**

**Problème** :
- Lors de la conversion du modèle SQLModel vers le schéma Pydantic `CandidateResponse`
- Si `skills` est `NULL` dans la base de données, la conversion échoue

**Solution appliquée** :
- Normalisation des données avant de retourner les candidats
- Conversion explicite de `None` en `[]` pour le champ `skills`
- Gestion d'erreur avec fallback pour chaque candidat

### 3. **Colonnes manquantes dans la base de données**

**Problème possible** :
- Les colonnes `profile_picture_url` ou `skills` n'existent pas dans la table `candidates`
- La requête SQL échoue car elle essaie de sélectionner des colonnes inexistantes

**Vérification** :
```sql
-- Vérifier si les colonnes existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
AND column_name IN ('profile_picture_url', 'skills', 'photo_url');
```

**Solution** :
- Migration SQL déjà prévue dans le code avec fallback
- Si les colonnes manquent, exécuter :
```sql
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS skills TEXT[];
```

## 🔧 Corrections appliquées

### 1. Modèle Candidate (`backend/models.py`)

```python
# Changé de List[str] = Field(default=[]) 
# à List[str] | None = Field(default=None)
skills: List[str] | None = Field(default=None, sa_column=Column(ARRAY(String)))
```

### 2. Endpoint list_candidates (`backend/routers/candidates.py`)

**Ajout de normalisation des données** :
```python
# Normaliser les données avant de retourner (gérer les cas où skills est NULL)
normalized_candidates = []
for candidate in candidates:
    try:
        candidate_dict = {
            # ... tous les champs ...
            "skills": candidate.skills if candidate.skills else [],  # Convertir None en []
        }
        normalized_candidate = CandidateResponse.model_validate(candidate_dict)
        normalized_candidates.append(normalized_candidate)
    except Exception as candidate_error:
        # Gestion d'erreur avec fallback
        logger.warning(f"Erreur lors de la normalisation: {str(candidate_error)}")
        # Créer une réponse minimale avec skills = []
```

**Amélioration des logs d'erreur** :
```python
logger.error(f"❌ [ERREUR 500] Erreur lors de la récupération: {error_type}: {error_msg}", exc_info=True)
```

## 🧪 Tests à effectuer

### 1. Vérifier les logs du backend

Regarder les logs du serveur FastAPI pour voir l'erreur exacte :
```bash
# Dans le terminal où le backend tourne
# Chercher les lignes avec "❌ [ERREUR 500]" ou "Erreur lors de la récupération"
```

### 2. Vérifier la structure de la base de données

```sql
-- Se connecter à PostgreSQL
psql -U postgres -d recrutement_db

-- Vérifier les colonnes
\d candidates

-- Vérifier les données
SELECT id, first_name, last_name, skills, profile_picture_url, photo_url 
FROM candidates 
LIMIT 5;
```

### 3. Tester l'endpoint directement

```bash
# Avec curl (remplacer TOKEN par votre token JWT)
curl -X GET "http://localhost:8000/candidates/" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
```

## 📊 Diagnostic étape par étape

### Étape 1 : Vérifier les logs
- ✅ Les logs de debug affichent maintenant le type et la valeur de `skills`
- ✅ Les erreurs sont loggées avec plus de détails

### Étape 2 : Vérifier la base de données
- ⚠️ Vérifier que la colonne `skills` existe et accepte `NULL`
- ⚠️ Vérifier que les données existantes sont compatibles

### Étape 3 : Tester la normalisation
- ✅ Le code normalise maintenant `None` en `[]` pour `skills`
- ✅ Gestion d'erreur avec fallback pour chaque candidat

## 🎯 Prochaines étapes

1. **Redémarrer le backend** pour appliquer les changements
2. **Vérifier les logs** lors de la prochaine requête GET /candidates/
3. **Si l'erreur persiste**, vérifier :
   - Les logs détaillés dans le terminal du backend
   - La structure de la base de données avec `\d candidates`
   - Les données existantes avec `SELECT * FROM candidates LIMIT 1;`

## 💡 Notes importantes

- Le champ `skills` peut maintenant être `None` dans le modèle, ce qui correspond à la réalité de PostgreSQL
- La normalisation convertit automatiquement `None` en `[]` pour le schéma de réponse
- Chaque candidat est traité individuellement avec gestion d'erreur, donc un candidat problématique ne bloque pas les autres

