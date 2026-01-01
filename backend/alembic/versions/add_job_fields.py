"""add_job_fields

Revision ID: add_job_fields_001
Revises: 8a6fe220c36b
Create Date: 2026-01-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_job_fields_001'
down_revision: Union[str, None] = '8a6fe220c36b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # INFORMATIONS GÉNÉRALES
    op.add_column('jobs', sa.Column('manager_demandeur', sa.String(length=255), nullable=True))
    op.add_column('jobs', sa.Column('entreprise', sa.String(length=255), nullable=True))
    op.add_column('jobs', sa.Column('motif_recrutement', sa.String(length=50), nullable=True))
    op.add_column('jobs', sa.Column('date_prise_poste', sa.Date(), nullable=True))
    
    # MISSIONS ET RESPONSABILITÉS
    op.add_column('jobs', sa.Column('missions_principales', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('missions_secondaires', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('kpi_poste', sa.Text(), nullable=True))
    
    # PROFIL RECHERCHÉ
    op.add_column('jobs', sa.Column('niveau_formation', sa.String(length=20), nullable=True))
    op.add_column('jobs', sa.Column('experience_requise', sa.Integer(), nullable=True))
    op.add_column('jobs', sa.Column('competences_techniques_obligatoires', postgresql.ARRAY(sa.Text()), nullable=True))
    op.add_column('jobs', sa.Column('competences_techniques_souhaitees', postgresql.ARRAY(sa.Text()), nullable=True))
    op.add_column('jobs', sa.Column('competences_comportementales', postgresql.ARRAY(sa.Text()), nullable=True))
    op.add_column('jobs', sa.Column('langues_requises', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('certifications_requises', sa.Text(), nullable=True))
    
    # CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
    op.add_column('jobs', sa.Column('localisation', sa.String(length=255), nullable=True))
    op.add_column('jobs', sa.Column('mobilite_deplacements', sa.String(length=20), nullable=True))
    op.add_column('jobs', sa.Column('teletravail', sa.String(length=20), nullable=True))
    op.add_column('jobs', sa.Column('contraintes_horaires', sa.Text(), nullable=True))
    op.add_column('jobs', sa.Column('criteres_eliminatoires', sa.Text(), nullable=True))
    
    # RÉMUNÉRATION ET CONDITIONS
    op.add_column('jobs', sa.Column('salaire_minimum', sa.Float(), nullable=True))
    op.add_column('jobs', sa.Column('salaire_maximum', sa.Float(), nullable=True))
    op.add_column('jobs', sa.Column('avantages', postgresql.ARRAY(sa.Text()), nullable=True))
    op.add_column('jobs', sa.Column('evolution_poste', sa.Text(), nullable=True))


def downgrade():
    # RÉMUNÉRATION ET CONDITIONS
    op.drop_column('jobs', 'evolution_poste')
    op.drop_column('jobs', 'avantages')
    op.drop_column('jobs', 'salaire_maximum')
    op.drop_column('jobs', 'salaire_minimum')
    
    # CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
    op.drop_column('jobs', 'criteres_eliminatoires')
    op.drop_column('jobs', 'contraintes_horaires')
    op.drop_column('jobs', 'teletravail')
    op.drop_column('jobs', 'mobilite_deplacements')
    op.drop_column('jobs', 'localisation')
    
    # PROFIL RECHERCHÉ
    op.drop_column('jobs', 'certifications_requises')
    op.drop_column('jobs', 'langues_requises')
    op.drop_column('jobs', 'competences_comportementales')
    op.drop_column('jobs', 'competences_techniques_souhaitees')
    op.drop_column('jobs', 'competences_techniques_obligatoires')
    op.drop_column('jobs', 'experience_requise')
    op.drop_column('jobs', 'niveau_formation')
    
    # MISSIONS ET RESPONSABILITÉS
    op.drop_column('jobs', 'kpi_poste')
    op.drop_column('jobs', 'missions_secondaires')
    op.drop_column('jobs', 'missions_principales')
    
    # INFORMATIONS GÉNÉRALES
    op.drop_column('jobs', 'date_prise_poste')
    op.drop_column('jobs', 'motif_recrutement')
    op.drop_column('jobs', 'entreprise')
    op.drop_column('jobs', 'manager_demandeur')

