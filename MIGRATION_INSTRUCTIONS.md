# Instructions pour créer la migration Alembic

Pour ajouter les colonnes `profile_title` et `years_of_experience` à la table `candidates`, suivez ces étapes :

## 1. Créer la migration

Depuis le répertoire `backend/`, exécutez :

```bash
alembic revision -m "add_profile_title_and_years_of_experience_to_candidates"
```

## 2. Éditer le fichier de migration

Ouvrez le fichier créé dans `backend/alembic/versions/` (nommé quelque chose comme `XXXX_add_profile_title_and_years_of_experience_to_candidates.py`).

Remplacez les fonctions `upgrade()` et `downgrade()` par :

```python
def upgrade():
    op.add_column('candidates', sa.Column('profile_title', sa.String(length=255), nullable=True))
    op.add_column('candidates', sa.Column('years_of_experience', sa.Integer(), nullable=True))

def downgrade():
    op.drop_column('candidates', 'years_of_experience')
    op.drop_column('candidates', 'profile_title')
```

## 3. Appliquer la migration

```bash
alembic upgrade head
```

## 4. Vérifier

Vérifiez que les colonnes ont bien été ajoutées :

```bash
psql -U postgres -d recrutement_db -c "\d candidates"
```

Vous devriez voir les nouvelles colonnes `profile_title` (varchar(255)) et `years_of_experience` (integer).

