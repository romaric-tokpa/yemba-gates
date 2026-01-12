"""
Tests de base pour l'application de recrutement
"""
import pytest
from fastapi.testclient import TestClient


class TestImports:
    """Tests d'import des modules"""

    def test_models_import(self):
        """Vérifie que les modèles s'importent correctement"""
        from models import User, Job, Candidate, Application, Interview, Notification
        assert User is not None
        assert Job is not None
        assert Candidate is not None
        assert Application is not None
        assert Interview is not None
        assert Notification is not None

    def test_schemas_import(self):
        """Vérifie que les schémas s'importent correctement"""
        from schemas import JobCreate, JobResponse, CandidateCreate, CandidateResponse
        assert JobCreate is not None
        assert JobResponse is not None
        assert CandidateCreate is not None
        assert CandidateResponse is not None

    def test_routers_import(self):
        """Vérifie que les routers s'importent correctement"""
        from routers import jobs, candidates, auth, kpi, interviews, notifications
        assert jobs.router is not None
        assert candidates.router is not None
        assert auth.router is not None
        assert kpi.router is not None
        assert interviews.router is not None
        assert notifications.router is not None


class TestApp:
    """Tests de l'application FastAPI"""

    def test_app_creation(self):
        """Vérifie que l'application FastAPI se crée correctement"""
        from main import app
        assert app is not None
        assert app.title == "API Recrutement"

    def test_health_endpoint(self):
        """Vérifie le endpoint /health"""
        from main import app
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

    def test_root_endpoint(self):
        """Vérifie le endpoint racine /"""
        from main import app
        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "API Recrutement" in data["message"]


class TestModels:
    """Tests des modèles de données"""

    def test_user_role_enum(self):
        """Vérifie les valeurs de l'enum UserRole"""
        from models import UserRole
        assert UserRole.RECRUTEUR.value == "recruteur"
        assert UserRole.MANAGER.value == "manager"
        assert UserRole.CLIENT.value == "client"
        assert UserRole.ADMINISTRATEUR.value == "administrateur"

    def test_job_status_enum(self):
        """Vérifie les valeurs de l'enum JobStatus"""
        from models import JobStatus
        assert JobStatus.BROUILLON.value == "brouillon"
        assert JobStatus.A_VALIDER.value == "a_valider"
        assert JobStatus.EN_COURS.value == "en_cours"
        assert JobStatus.CLOTURE.value == "clôturé"

    def test_candidate_status_enum(self):
        """Vérifie les valeurs de l'enum CandidateStatus"""
        from models import CandidateStatus
        assert CandidateStatus.NOUVEAU.value == "Nouveau"
        assert CandidateStatus.ENTRETIEN.value == "Entretien"
        assert CandidateStatus.OFFRE.value == "Offre"


class TestSchemas:
    """Tests des schémas Pydantic"""

    def test_job_create_validation(self):
        """Vérifie la validation de JobCreate"""
        from schemas import JobCreate

        # Valide
        job = JobCreate(title="Développeur Python")
        assert job.title == "Développeur Python"

        # Invalide - titre vide
        with pytest.raises(ValueError):
            JobCreate(title="   ")

    def test_candidate_create_validation(self):
        """Vérifie la validation de CandidateCreate"""
        from schemas import CandidateCreate

        # Valide
        candidate = CandidateCreate(first_name="Jean", last_name="Dupont")
        assert candidate.first_name == "Jean"
        assert candidate.last_name == "Dupont"

        # Invalide - prénom vide
        with pytest.raises(ValueError):
            CandidateCreate(first_name="   ", last_name="Dupont")
