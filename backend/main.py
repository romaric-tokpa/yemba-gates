"""
Application FastAPI principale
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pathlib import Path
import logging
import traceback

from database import init_db
from routers import jobs, candidates, auth, kpi, shortlists, notifications, interviews, offers, onboarding, history, admin

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application"""
    # Startup
    try:
        init_db()
    except Exception as e:
        # Ne pas faire échouer le démarrage si la base n'existe pas encore
        print(f"⚠️  Avertissement: {e}")
        print("💡 Créez la base de données avec: createdb recrutement_db")

    # Note: La vérification des jobs en attente peut être faite via une tâche cron
    # ou un endpoint dédié appelé périodiquement. Pour l'instant, elle sera déclenchée
    # manuellement ou via un endpoint dédié.

    yield

    # Shutdown (si nécessaire)
    # Ajoutez ici du code de nettoyage si besoin


# Création de l'application FastAPI
app = FastAPI(
    title="API Recrutement",
    description="API pour la gestion du recrutement en temps réel",
    version="1.0.0",
    lifespan=lifespan
)

# Configuration CORS (pour permettre les requêtes depuis le frontend)
# IMPORTANT: Le middleware CORS doit être ajouté AVANT les routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache les pré-requêtes OPTIONS pendant 1 heure
)

# Inclusion des routers
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(kpi.router)
app.include_router(shortlists.router)
app.include_router(notifications.router)
app.include_router(interviews.router)
app.include_router(offers.router)
app.include_router(onboarding.router)
app.include_router(history.router)
app.include_router(admin.router)

# Servir les fichiers statiques (photos, CVs, etc.)
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)

# Créer le dossier uploads s'il n'existe pas
uploads_dir = static_dir / "uploads"
uploads_dir.mkdir(exist_ok=True)

# Créer le dossier uploads à la racine pour les CVs
root_uploads_dir = Path("uploads")
root_uploads_dir.mkdir(exist_ok=True)
(root_uploads_dir / "cvs").mkdir(exist_ok=True)

# Servir les fichiers statiques
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
# Servir aussi le dossier uploads à la racine
app.mount("/uploads", StaticFiles(directory=str(root_uploads_dir)), name="uploads")


# Middleware global pour capturer toutes les exceptions non gérées
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Gestionnaire d'exceptions global pour capturer toutes les erreurs 500
    et logger les détails pour le débogage
    """
    # Logger l'erreur complète avec la stack trace
    logger.error(
        f"❌ ERREUR 500 - Exception non gérée: {type(exc).__name__}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "query_params": dict(request.query_params),
            "client": request.client.host if request.client else None,
        }
    )
    
    # Logger la stack trace complète
    logger.error(f"Stack trace complète:\n{traceback.format_exc()}")
    
    # Essayer d'identifier le champ ou la cause de l'erreur
    error_message = str(exc)
    error_type = type(exc).__name__
    
    # Détecter les erreurs de base de données courantes
    if "does not exist" in error_message or "UndefinedColumn" in error_message:
        logger.error(f"🔍 ERREUR DE BASE DE DONNÉES: Colonne manquante détectée")
        logger.error(f"   Message: {error_message}")
        logger.error(f"   Type: {error_type}")
        logger.error(f"   Path: {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": error_message,
                "error_type": error_type,
                "path": request.url.path,
                "hint": "Vérifiez les logs du serveur pour plus de détails. Il s'agit probablement d'une colonne manquante dans la base de données."
            }
        )
    
    # Détecter les erreurs de validation
    if "validation" in error_message.lower() or "ValidationError" in error_type:
        logger.error(f"🔍 ERREUR DE VALIDATION détectée")
        logger.error(f"   Message: {error_message}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": error_message,
                "error_type": error_type,
                "path": request.url.path
            }
        )
    
    # Pour toutes les autres erreurs, retourner un message générique mais logger les détails
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": f"Erreur interne du serveur: {error_message}",
            "error_type": error_type,
            "path": request.url.path,
            "hint": "Consultez les logs du serveur pour plus de détails."
        }
    )


# Gestionnaire pour les erreurs HTTP explicites (404, 401, etc.)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Gestionnaire pour les erreurs HTTP explicites"""
    if exc.status_code >= 500:
        logger.error(
            f"❌ ERREUR HTTP {exc.status_code}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "detail": exc.detail,
            }
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "path": request.url.path}
    )


# Gestionnaire pour les erreurs de validation Pydantic
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Gestionnaire pour les erreurs de validation des requêtes"""
    logger.warning(
        f"⚠️  Erreur de validation de requête",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": exc.errors(),
        }
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "path": request.url.path}
    )


@app.get("/")
def root():
    """Point d'entrée de l'API"""
    return {
        "message": "API Recrutement - Bienvenue !",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    """Vérification de l'état de l'API"""
    return {"status": "healthy"}

