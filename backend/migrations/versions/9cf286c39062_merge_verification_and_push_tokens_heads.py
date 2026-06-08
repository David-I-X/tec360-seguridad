"""merge verification and push tokens heads

Revision ID: 9cf286c39062
Revises: 9a4c2f5e6b78, d4ec1fedc99f
Create Date: 2026-05-26 17:13:02.562071

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9cf286c39062'
down_revision: Union[str, Sequence[str], None] = ('9a4c2f5e6b78', 'd4ec1fedc99f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
