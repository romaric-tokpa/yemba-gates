"""add_profile_title_and_years_of_experience_to_candidates

Revision ID: 8a6fe220c36b
Revises: 
Create Date: 2025-12-31 18:07:26.071229

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a6fe220c36b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
       op.add_column('candidates', sa.Column('profile_title', sa.String(length=255), nullable=True))
       op.add_column('candidates', sa.Column('years_of_experience', sa.Integer(), nullable=True))

def downgrade():
       op.drop_column('candidates', 'years_of_experience')
       op.drop_column('candidates', 'profile_title')