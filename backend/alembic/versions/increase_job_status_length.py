"""increase_job_status_length

Revision ID: increase_job_status_001
Revises: add_job_fields_001
Create Date: 2026-01-01 10:28:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'increase_job_status_001'
down_revision: Union[str, None] = 'add_job_fields_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Augmenter la taille du champ status pour accepter 'en_attente_validation' (21 caractères)
    # On augmente à 50 caractères pour permettre d'autres statuts à l'avenir
    op.alter_column('jobs', 'status',
                    existing_type=sa.VARCHAR(length=20),
                    type_=sa.VARCHAR(length=50),
                    existing_nullable=False,
                    existing_server_default=sa.text("'brouillon'::character varying"))
    
    # Mettre à jour la contrainte CHECK pour inclure le nouveau statut
    # D'abord, supprimer l'ancienne contrainte si elle existe
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'jobs_status_check'
            ) THEN
                ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
            END IF;
        END $$;
    """)
    
    # Ajouter la nouvelle contrainte avec le nouveau statut
    # Utiliser "en_attente" (11 caractères) au lieu de "en_attente_validation" (21 caractères) pour compatibilité
    op.execute("""
        ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
        CHECK (status IN ('brouillon', 'validé', 'en_cours', 'clôturé', 'en_attente', 'en_attente_validation'));
    """)


def downgrade():
    # Supprimer la contrainte
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'jobs_status_check'
            ) THEN
                ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
            END IF;
        END $$;
    """)
    
    # Remettre la taille originale
    op.alter_column('jobs', 'status',
                    existing_type=sa.VARCHAR(length=50),
                    type_=sa.VARCHAR(length=20),
                    existing_nullable=False,
                    existing_server_default=sa.text("'brouillon'::character varying"))
    
    # Remettre la contrainte CHECK originale
    op.execute("""
        ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
        CHECK (status IN ('brouillon', 'validé', 'en_cours', 'clôturé'));
    """)

