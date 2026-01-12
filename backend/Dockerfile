# =============================================================================
# DOCKERFILE BACKEND - RECRUTEMENT APP
# =============================================================================
# Build: docker build -t recrutement-backend .
# Run: docker run -p 8000:8000 --env-file .env recrutement-backend

# -----------------------------------------------------------------------------
# Stage 1: Base Python
# -----------------------------------------------------------------------------
FROM python:3.12-slim as base

# Variables d'environnement
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Créer utilisateur non-root
RUN useradd --create-home --shell /bin/bash app

# -----------------------------------------------------------------------------
# Stage 2: Dependencies
# -----------------------------------------------------------------------------
FROM base as dependencies

WORKDIR /app

# Copier et installer les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# -----------------------------------------------------------------------------
# Stage 3: Production
# -----------------------------------------------------------------------------
FROM dependencies as production

WORKDIR /app

# Copier le code source
COPY --chown=app:app . .

# Créer les répertoires nécessaires
RUN mkdir -p uploads/cvs static/uploads \
    && chown -R app:app uploads static

# Changer vers l'utilisateur non-root
USER app

# Port exposé
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Commande de démarrage
CMD ["gunicorn", "-c", "gunicorn.conf.py", "main:app"]
