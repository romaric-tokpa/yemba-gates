# Configuration Alembic pour le projet

## 1. Installer Alembic

```bash
cd backend
pip install alembic
```

Ou ajoutez `alembic` à votre `requirements.txt` et exécutez :
```bash
pip install -r requirements.txt
```

## 2. Initialiser Alembic (si pas déjà fait)

```bash
cd backend
alembic init alembic
```

## 3. Configurer Alembic

Éditez `backend/alembic/env.py` pour utiliser votre configuration de base de données.

Remplacez la section `target_metadata` par :

```python
from models import Base
target_metadata = Base.metadata
```

Et configurez la connexion à la base de données dans `alembic.ini` ou `alembic/env.py` en utilisant votre variable d'environnement `DATABASE_URL`.

## 4. Créer la migration

```bash
cd backend
alembic revision -m "add_profile_title_and_years_of_experience_to_candidates"
```

## 5. Éditer le fichier de migration

Ouvrez le fichier créé dans `backend/alembic/versions/` et remplacez les fonctions par :

```python
def upgrade():
    op.add_column('candidates', sa.Column('profile_title', sa.String(length=255), nullable=True))
    op.add_column('candidates', sa.Column('years_of_experience', sa.Integer(), nullable=True))

def downgrade():
    op.drop_column('candidates', 'years_of_experience')
    op.drop_column('candidates', 'profile_title')
```

## 6. Appliquer la migration

```bash
alembic upgrade head
```

