"""add scheduled_end_at to interviews

Revision ID: add_scheduled_end_at_001
Revises: increase_job_status_001
Create Date: 2024-01-15 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_scheduled_end_at_001'
down_revision: Union[str, None] = 'increase_job_status_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter la colonne scheduled_end_at à la table interviews
    op.add_column('interviews', 
        sa.Column('scheduled_end_at', postgresql.TIMESTAMP(timezone=True), nullable=True)
    )


def downgrade() -> None:
    # Supprimer la colonne scheduled_end_at de la table interviews
    op.drop_column('interviews', 'scheduled_end_at')

