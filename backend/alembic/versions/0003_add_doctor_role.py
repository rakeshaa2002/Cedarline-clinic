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
    # Drop constraint safely using raw SQL to prevent naming convention doubling (ck_users_ck_users_...)
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role_valid")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_ck_users_role_valid")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS role_valid")
    op.execute("ALTER TABLE users ADD CONSTRAINT ck_users_role_valid CHECK (role IN ('admin', 'staff', 'doctor'))")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role_valid")
    op.execute("ALTER TABLE users ADD CONSTRAINT ck_users_role_valid CHECK (role IN ('admin', 'staff'))")
