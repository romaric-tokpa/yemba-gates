"""increase phone length

Revision ID: increase_phone_length
Revises: 8a6fe220c36b
Create Date: 2026-01-01 00:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'increase_phone_length'
down_revision: Union[str, None] = '8a6fe220c36b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Augmenter la longueur du champ phone de 20 à 30 caractères
    op.alter_column('candidates', 'phone',
                    existing_type=sa.VARCHAR(length=20),
                    type_=sa.VARCHAR(length=30),
                    existing_nullable=True)


def downgrade() -> None:
    # Revenir à 20 caractères (peut tronquer les données)
    op.alter_column('candidates', 'phone',
                    existing_type=sa.VARCHAR(length=30),
                    type_=sa.VARCHAR(length=20),
                    existing_nullable=True)

