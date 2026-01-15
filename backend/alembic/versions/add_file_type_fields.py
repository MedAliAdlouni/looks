"""Add file_type and mime_type to documents

Revision ID: a1b2c3d4e5f6
Revises: 271f10e444ee
Create Date: 2024-01-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '271f10e444ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add file_type and mime_type columns to documents table
    # For existing records, set default values
    op.add_column('documents', sa.Column('file_type', sa.String(length=50), nullable=True))
    op.add_column('documents', sa.Column('mime_type', sa.String(length=100), nullable=True))
    
    # Update existing records to have default values
    op.execute("UPDATE documents SET file_type = 'pdf' WHERE file_type IS NULL")
    op.execute("UPDATE documents SET mime_type = 'application/pdf' WHERE mime_type IS NULL")
    
    # Now make columns NOT NULL
    op.alter_column('documents', 'file_type', nullable=False)
    op.alter_column('documents', 'mime_type', nullable=False)


def downgrade() -> None:
    # Remove file_type and mime_type columns
    op.drop_column('documents', 'mime_type')
    op.drop_column('documents', 'file_type')

