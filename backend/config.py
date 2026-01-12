"""
Configuration de l'application pour le déploiement production
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration centralisée de l'application"""

    # Environnement
    environment: str = "development"
    debug: bool = False

    # Base de données
    database_url: str = "postgresql://postgres:postgres@localhost:5432/recrutement_db"

    # Sécurité JWT
    secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 heures

    # Serveur
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # API Gemini
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None  # Compatibilité

    # Email SMTP
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    from_email: str = "noreply@example.com"
    login_url: str = "http://localhost:3000/auth/login"

    # Stockage
    upload_dir: str = "uploads"
    max_upload_size: int = 10485760  # 10MB

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        """Retourne la liste des origines CORS autorisées"""
        if self.is_production:
            return [origin.strip() for origin in self.allowed_origins.split(",")]
        # En développement, autoriser toutes les origines
        return ["*"]


@lru_cache()
def get_settings() -> Settings:
    """Singleton pour les paramètres de configuration"""
    return Settings()


# Instance globale
settings = get_settings()
