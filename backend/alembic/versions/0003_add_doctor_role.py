"""Allow 'doctor' in users role check constraint.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-17 15:05:00
"""
from collections.abc import Sequence

from alembic import op

revision: str = '0003'
down_revision: str | None = '0002'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint('ck_users_role_valid', 'users', type_='check')
    op.create_check_constraint(
        'ck_users_role_valid',
        'users',
        "role IN ('admin', 'staff', 'doctor')"
    )


def downgrade() -> None:
    op.drop_constraint('ck_users_role_valid', 'users', type_='check')
    op.create_check_constraint(
        'ck_users_role_valid',
        'users',
        "role IN ('admin', 'staff')"
    )
