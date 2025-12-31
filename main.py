"""
Point d'entrée pour lancer le serveur depuis la racine du projet

⚠️ RECOMMANDATION : Utilisez plutôt :
    cd backend && uvicorn main:app --reload

Ce fichier permet de lancer depuis la racine, mais il est préférable
de se déplacer dans backend/ pour éviter les problèmes d'imports.
"""
import sys
import os
from pathlib import Path

# Obtenir le chemin du répertoire backend
backend_dir = Path(__file__).parent / "backend"

# Vérifier que backend existe
if not backend_dir.exists():
    raise ImportError(f"Le répertoire backend n'existe pas: {backend_dir}")

# Ajouter backend au PYTHONPATH
backend_path = str(backend_dir.absolute())
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Sauvegarder le répertoire de travail actuel
original_cwd = os.getcwd()

# Changer vers backend pour que les imports relatifs fonctionnent
os.chdir(backend_path)

try:
    # Importer l'application depuis backend/main.py
    # On utilise importlib pour charger le module comme s'il était dans backend/
    import importlib.util
    
    main_file = backend_dir / "main.py"
    if not main_file.exists():
        raise ImportError(f"Le fichier main.py n'existe pas: {main_file}")
    
    # Charger le module
    spec = importlib.util.spec_from_file_location("backend_main", main_file)
    if spec is None or spec.loader is None:
        raise ImportError(f"Impossible de créer le spec pour {main_file}")
    
    backend_main = importlib.util.module_from_spec(spec)
    # Exécuter le module (charge tous les imports)
    spec.loader.exec_module(backend_main)
    
    # Récupérer l'application FastAPI
    if not hasattr(backend_main, 'app'):
        raise ImportError("Le module backend/main.py n'a pas d'attribut 'app'")
    
    app = backend_main.app
    
except Exception as e:
    # Restaurer le répertoire en cas d'erreur
    os.chdir(original_cwd)
    raise ImportError(
        f"Erreur lors du chargement de l'application depuis backend/main.py: {e}\n"
        f"Solution: cd backend && uvicorn main:app --reload"
    ) from e
finally:
    # Restaurer le répertoire de travail
    os.chdir(original_cwd)

# Exporter pour uvicorn
__all__ = ["app"]
