# Guide de débogage pour l'erreur 401 Unauthorized lors du login

## Problème

L'erreur `401 Unauthorized` lors de la connexion peut avoir plusieurs causes :

1. **L'utilisateur n'existe pas dans la base de données**
2. **Le mot de passe est incorrect**
3. **L'utilisateur est inactif (`is_active = False`)**
4. **Le hash du mot de passe est invalide ou manquant**
5. **Problème de format des données envoyées**

## Solutions

### 1. Vérifier les logs du serveur

Le serveur backend affiche maintenant des logs détaillés pour chaque tentative de connexion :

```
🔐 [LOGIN] Tentative de connexion - Email: user@example.com, Password length: 8, Content-Type: application/x-www-form-urlencoded
🔐 Tentative d'authentification pour l'email: user@example.com
✅ Utilisateur trouvé: user@example.com (ID: xxx, Actif: True)
✅ Mot de passe valide pour l'utilisateur: user@example.com
✅ Authentification réussie pour l'utilisateur: user@example.com
```

Si vous voyez :
- `❌ Utilisateur non trouvé` : L'utilisateur n'existe pas dans la base de données
- `❌ Aucun hash de mot de passe` : Le mot de passe n'a pas été hashé lors de la création
- `❌ Mot de passe incorrect` : Le mot de passe fourni ne correspond pas au hash
- `❌ Utilisateur inactif` : L'utilisateur existe mais est désactivé

### 2. Créer un utilisateur de test

Si vous n'avez pas d'utilisateur dans la base de données, vous pouvez en créer un via l'endpoint `/auth/register` :

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "role": "manager"
  }'
```

Ou via Python :

```python
from backend.routers.auth import register
from backend.models import UserRegister

user_data = UserRegister(
    email="test@example.com",
    password="password123",
    first_name="Test",
    last_name="User",
    role="manager"
)

# Appeler la fonction register
```

### 3. Vérifier la base de données

Connectez-vous à PostgreSQL et vérifiez les utilisateurs :

```sql
SELECT id, email, is_active, role, created_at 
FROM users 
WHERE email = 'votre-email@example.com';
```

Vérifiez que :
- L'utilisateur existe
- `is_active = true`
- `password_hash` n'est pas NULL

### 4. Réinitialiser le mot de passe d'un utilisateur

Si vous avez besoin de réinitialiser le mot de passe d'un utilisateur existant :

```python
from backend.auth import get_password_hash
from sqlmodel import Session, select
from backend.database import engine
from backend.models import User

# Créer une session
with Session(engine) as session:
    # Trouver l'utilisateur
    user = session.exec(select(User).where(User.email == "test@example.com")).first()
    
    if user:
        # Hasher le nouveau mot de passe
        new_password = "nouveau_mot_de_passe"
        user.password_hash = get_password_hash(new_password)
        user.is_active = True
        
        session.add(user)
        session.commit()
        print(f"✅ Mot de passe mis à jour pour {user.email}")
    else:
        print("❌ Utilisateur non trouvé")
```

### 5. Vérifier le format des données

Le frontend envoie les données au format `application/x-www-form-urlencoded` :

```javascript
const formData = new URLSearchParams()
formData.append('username', email)
formData.append('password', password)

fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: formData.toString(),
})
```

Le backend accepte maintenant à la fois JSON et Form data, donc les deux formats fonctionnent.

### 6. Activer le logging détaillé

Pour voir plus de détails dans les logs, configurez le niveau de logging dans `backend/main.py` :

```python
import logging

logging.basicConfig(
    level=logging.INFO,  # ou logging.DEBUG pour plus de détails
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Test rapide

Pour tester rapidement si l'authentification fonctionne :

```bash
# Test avec curl (form data)
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Test avec curl (JSON)
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Si vous obtenez un token, l'authentification fonctionne correctement.

