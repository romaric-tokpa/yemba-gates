# Configuration de l'extraction automatique de CV

## 📦 Installation des dépendances

Installez les dépendances Python nécessaires :

```bash
cd backend
pip install -r requirements.txt
```

Les nouvelles dépendances incluent :
- `pymupdf>=1.23.0` - Pour l'extraction de texte depuis les PDF
- `python-docx>=1.1.0` - Pour l'extraction de texte depuis les fichiers Word
- `openai>=1.12.0` - Pour l'analyse du CV avec un LLM

## 🔑 Configuration de la clé API OpenAI

1. **Obtenez une clé API OpenAI** :
   - Créez un compte sur [OpenAI Platform](https://platform.openai.com/)
   - Allez dans "API Keys" et créez une nouvelle clé
   - Copiez la clé (elle commence par `sk-...`)

2. **Ajoutez la clé dans votre fichier `.env`** :
   ```bash
   # Dans backend/.env ou à la racine du projet
   OPENAI_API_KEY=sk-votre-cle-api-ici
   ```

3. **Alternative : Variable d'environnement système** :
   ```bash
   export OPENAI_API_KEY=sk-votre-cle-api-ici
   ```

## 🚀 Utilisation

### Backend

L'endpoint est disponible à :
```
POST /candidates/parse-cv
```

**Paramètres** :
- `cv_file` (file): Fichier CV (PDF ou Word)

**Réponse** :
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "profile_title": "Développeur Fullstack",
  "years_of_experience": 5,
  "email": "jean.dupont@example.com",
  "phone": "+33 6 12 34 56 78",
  "skills": ["Python", "React", "PostgreSQL"],
  "source": "LinkedIn",
  "notes": "Expérience en startup..."
}
```

### Frontend

Dans le formulaire "Ajouter un candidat", vous pouvez :
1. **Glisser-déposer** un fichier CV dans la zone dédiée
2. **Cliquer** sur "Importer un CV" pour sélectionner un fichier
3. Attendre l'analyse (indicateur de chargement)
4. Vérifier et corriger les informations pré-remplies
5. Cliquer sur "Créer la fiche"

## ⚙️ Modèle LLM utilisé

Par défaut, le système utilise `gpt-4o-mini` qui est :
- ✅ Économique
- ✅ Rapide
- ✅ Suffisamment performant pour l'extraction de données structurées

Pour changer le modèle, modifiez la ligne dans `backend/routers/candidates.py` :
```python
model="gpt-4o-mini"  # Changez ici pour gpt-4, gpt-3.5-turbo, etc.
```

## 🔧 Dépannage

### Erreur : "OPENAI_API_KEY n'est pas configurée"
- Vérifiez que la variable d'environnement est bien définie
- Redémarrez le serveur backend après avoir ajouté la clé

### Erreur : "PyMuPDF n'est pas installé"
```bash
pip install pymupdf
```

### Erreur : "python-docx n'est pas installé"
```bash
pip install python-docx
```

### Le CV n'est pas correctement analysé
- Vérifiez que le CV contient du texte (pas seulement des images)
- Les PDF scannés (images) ne fonctionnent pas sans OCR
- Essayez avec un CV en format texte ou Word

## 💡 Alternatives

Si vous préférez utiliser un autre LLM (Gemini, Claude, etc.), modifiez la fonction `parse_cv_with_llm` dans `backend/routers/candidates.py` pour utiliser l'API de votre choix.

