# Solution pour l'erreur 401 lors du login

## Problème

Vous recevez une erreur `401 Unauthorized` lors de la tentative de connexion à `/auth/login`.

## Solutions rapides

### 1. Créer un utilisateur de test

Si vous n'avez pas d'utilisateur dans la base de données, créez-en un :

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/create_test_user.py
```

Cela créera un utilisateur avec :
- **Email**: `test@example.com`
- **Mot de passe**: `password123`
- **Rôle**: `manager`

### 2. Vérifier les logs du serveur

Le serveur backend affiche maintenant des logs détaillés. Regardez dans votre terminal où le backend tourne pour voir :

```
🔐 [LOGIN] Tentative de connexion - Email: test@example.com, Password length: 12, Content-Type: application/x-www-form-urlencoded
🔐 Tentative d'authentification pour l'email: test@example.com
```

Les messages d'erreur vous indiqueront exactement le problème :
- `❌ Utilisateur non trouvé` → L'utilisateur n'existe pas
- `❌ Aucun hash de mot de passe` → Le mot de passe n'a pas été défini
- `❌ Mot de passe incorrect` → Le mot de passe fourni est incorrect
- `❌ Utilisateur inactif` → Le compte est désactivé

### 3. Vérifier la base de données

Connectez-vous à PostgreSQL et vérifiez les utilisateurs :

```sql
-- Lister tous les utilisateurs
SELECT id, email, is_active, role, created_at 
FROM users;

-- Vérifier un utilisateur spécifique
SELECT id, email, is_active, role, 
       CASE WHEN password_hash IS NULL THEN 'NULL' ELSE 'SET' END as password_status
FROM users 
WHERE email = 'test@example.com';
```

### 4. Réinitialiser le mot de passe d'un utilisateur existant

Si l'utilisateur existe mais que le mot de passe ne fonctionne pas :

```python
from backend.auth import get_password_hash
from sqlmodel import Session, select
from backend.database import engine
from backend.models import User

with Session(engine) as session:
    user = session.exec(
        select(User).where(User.email == "test@example.com")
    ).first()
    
    if user:
        user.password_hash = get_password_hash("nouveau_mot_de_passe")
        user.is_active = True
        session.add(user)
        session.commit()
        print("✅ Mot de passe mis à jour")
```

### 5. Tester avec curl

Testez directement l'API pour vérifier si le problème vient du frontend ou du backend :

```bash
# Test avec form data (comme le frontend)
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Test avec JSON
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Si curl fonctionne mais pas le frontend, le problème vient du frontend.
Si curl ne fonctionne pas, le problème vient du backend ou de la base de données.

## Corrections apportées

1. **Amélioration de l'extraction des données** : Le backend accepte maintenant correctement les données de formulaire et JSON
2. **Messages d'erreur plus précis** : Les erreurs indiquent maintenant la cause exacte (utilisateur non trouvé, mot de passe incorrect, compte inactif, etc.)
3. **Logging détaillé** : Tous les logs sont maintenant visibles dans le terminal du backend
4. **Script de création d'utilisateur** : `backend/create_test_user.py` pour créer facilement un utilisateur de test

## Prochaines étapes

1. **Créer un utilisateur de test** avec le script fourni
2. **Vérifier les logs** du serveur backend lors d'une tentative de connexion
3. **Tester avec curl** pour isoler le problème
4. **Vérifier la base de données** si nécessaire

Les logs du serveur vous donneront la cause exacte de l'erreur 401.

