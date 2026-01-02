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
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import init_db
from routers import jobs, candidates, auth, kpi, shortlists, notifications, interviews, offers, onboarding, history, admin, applications, teams

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
import os

# En développement, accepter toutes les origines pour permettre l'accès depuis n'importe quel réseau
# (y compris via tunnel cloudflare, localtunnel, etc.)
# En production, utilisez une liste spécifique d'origines autorisées
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    # En production, liste spécifique d'origines autorisées
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Ajoutez ici vos domaines de production
    ]
else:
    # En développement, accepter toutes les origines pour faciliter le développement
    # et permettre l'accès depuis n'importe quel réseau (mobile, tunnel, etc.)
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
app.include_router(applications.router)
app.include_router(teams.router)
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
    # S'assurer que error_message est toujours une chaîne de caractères (JSON serializable)
    try:
        error_message = str(exc) if exc else "Erreur inconnue"
    except Exception:
        error_message = f"Erreur de type {type(exc).__name__}"
    
    error_type = type(exc).__name__
    
    # Détecter les erreurs de base de données courantes
    if "does not exist" in error_message or "UndefinedColumn" in error_message:
        logger.error(f"🔍 ERREUR DE BASE DE DONNÉES: Colonne manquante détectée")
        logger.error(f"   Message: {error_message}")
        logger.error(f"   Type: {error_type}")
        logger.error(f"   Path: {request.url.path}")
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": error_message,
                "error_type": error_type,
                "path": request.url.path,
                "hint": "Vérifiez les logs du serveur pour plus de détails. Il s'agit probablement d'une colonne manquante dans la base de données."
            }
        )
        # S'assurer que les headers CORS sont présents même en cas d'erreur
        origin = request.headers.get("origin", "*")
        if ENVIRONMENT == "production":
            # En production, vérifier l'origine
            allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            ]
            if origin in allowed_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        else:
            # En développement, accepter toutes les origines
            response.headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    
    # Détecter les erreurs ValueError (doivent être converties en HTTPException)
    if error_type == "ValueError":
        logger.error(f"🔍 ERREUR ValueError détectée (doit être convertie en HTTPException)")
        logger.error(f"   Message: {error_message}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": error_message,
                "error_type": error_type,
                "path": request.url.path,
                "hint": "Cette erreur devrait être gérée par une HTTPException dans le code."
            }
        )
    
    # Détecter les erreurs ValueError (doivent être converties en HTTPException)
    if error_type == "ValueError":
        logger.error(f"🔍 ERREUR ValueError détectée (doit être convertie en HTTPException)")
        logger.error(f"   Message: {error_message}")
        response = JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": error_message,
                "error_type": error_type,
                "path": request.url.path,
                "hint": "Cette erreur devrait être gérée par une HTTPException dans le code."
            }
        )
        # S'assurer que les headers CORS sont présents
        origin = request.headers.get("origin", "*")
        if ENVIRONMENT == "production":
            allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            ]
            if origin in allowed_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        else:
            response.headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    
    # Détecter les erreurs de validation
    if "validation" in error_message.lower() or "ValidationError" in error_type:
        logger.error(f"🔍 ERREUR DE VALIDATION détectée")
        logger.error(f"   Message: {error_message}")
        response = JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": error_message,
                "error_type": error_type,
                "path": request.url.path
            }
        )
        # S'assurer que les headers CORS sont présents
        origin = request.headers.get("origin", "*")
        if ENVIRONMENT == "production":
            allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            ]
            if origin in allowed_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        else:
            response.headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    
    # Pour toutes les autres erreurs, retourner un message générique mais logger les détails
    # S'assurer que error_message est une chaîne de caractères (pas un objet)
    error_detail = str(error_message) if error_message else "Erreur interne du serveur"
    
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": f"Erreur interne du serveur: {error_detail}",
            "error_type": error_type,
            "path": request.url.path,
            "hint": "Consultez les logs du serveur pour plus de détails."
        }
    )
    # S'assurer que les headers CORS sont présents même en cas d'erreur
    origin = request.headers.get("origin", "*")
    if ENVIRONMENT == "production":
        # En production, vérifier l'origine
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    else:
        # En développement, accepter toutes les origines
        response.headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


# Gestionnaire spécifique pour ValueError (doit être avant le gestionnaire global)
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Gestionnaire spécifique pour ValueError"""
    logger.error(f"🔍 ValueError intercepté: {str(exc)}")
    error_message = str(exc) if exc else "Erreur de validation"
    
    response = JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": error_message,
            "error_type": "ValueError",
            "path": request.url.path,
            "hint": "Cette erreur devrait être gérée par une HTTPException dans le code."
        }
    )
    # S'assurer que les headers CORS sont présents
    origin = request.headers.get("origin", "*")
    if ENVIRONMENT == "production":
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    else:
        response.headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


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
    errors = exc.errors()
    logger.warning(
        f"⚠️  Erreur de validation de requête",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": errors,
        }
    )
    # Logger les détails des erreurs pour le débogage
    for error in errors:
        logger.error(f"Erreur de validation: {error}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors, "path": request.url.path}
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

