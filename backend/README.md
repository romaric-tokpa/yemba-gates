# Backend - API Recrutement

API FastAPI pour la gestion du recrutement en temps réel.

## 🚀 Installation

1. **Créer un environnement virtuel** (recommandé) :
```bash
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
```

2. **Installer les dépendances** :
```bash
pip install -r requirements.txt
```

3. **Configurer la base de données** :
   - Créer un fichier `.env` à partir de `.env.example`
   - Modifier `DATABASE_URL` avec vos identifiants PostgreSQL
   - Créer la base de données PostgreSQL :
   ```bash
   createdb recrutement_db
   ```
   - Appliquer le schéma SQL :
   ```bash
   psql -U postgres -d recrutement_db -f ../schema.sql
   ```

## 🏃 Lancer le serveur

**⚠️ IMPORTANT : Vous devez être dans le répertoire `backend/` pour lancer le serveur !**

```bash
# Se déplacer dans le répertoire backend
cd backend

# Lancer le serveur
uvicorn main:app --reload
```

**Ou depuis la racine du projet :**

```bash
# Option 1 : Utiliser le script de démarrage
./start_backend.sh

# Option 2 : Utiliser le chemin complet
uvicorn backend.main:app --reload --app-dir backend

# Option 3 : Se déplacer puis lancer
cd backend && uvicorn main:app --reload
```

## 📚 Documentation API

Une fois le serveur lancé, accédez à :
- **Documentation interactive (Swagger)** : http://localhost:8000/docs
- **Documentation alternative (ReDoc)** : http://localhost:8000/redoc

## 📋 Endpoints disponibles

### Besoins de recrutement (US01)

- `POST /jobs/` - Créer un nouveau besoin de recrutement
- `GET /jobs/` - Lister tous les besoins
- `GET /jobs/{job_id}` - Récupérer un besoin par ID
- `PATCH /jobs/{job_id}` - Mettre à jour un besoin (sauvegarde en brouillon)
- `POST /jobs/{job_id}/submit` - Soumettre un besoin pour validation

## 🏗️ Structure du projet

```
backend/
├── main.py              # Point d'entrée FastAPI
├── database.py          # Configuration de la base de données
├── models.py            # Modèles SQLModel
├── schemas.py           # Schémas Pydantic pour validation
├── routers/
│   └── jobs.py         # Routes pour les besoins de recrutement
├── requirements.txt     # Dépendances Python
└── .env.example        # Exemple de configuration
```

## 🔧 Technologies utilisées

- **FastAPI** : Framework web moderne et rapide
- **SQLModel** : ORM basé sur SQLAlchemy et Pydantic
- **PostgreSQL** : Base de données relationnelle
- **Uvicorn** : Serveur ASGI

## 📝 Notes

- L'authentification n'est pas encore implémentée. Le champ `created_by` doit être passé manuellement pour l'instant.
- Les fichiers uploadés (fiche de poste) seront gérés dans une prochaine version.

