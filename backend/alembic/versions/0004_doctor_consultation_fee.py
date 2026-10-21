"""Add a consultation fee to doctors.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-21 16:30:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0004'
down_revision: str | None = '0003'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("doctors", sa.Column("consultation_fee", sa.Numeric(10, 2), nullable=True))
    # Raw DDL so the metadata naming convention can't double the constraint name (see 0003).
    op.execute(
        "ALTER TABLE doctors ADD CONSTRAINT ck_doctors_consultation_fee_valid "
        "CHECK (consultation_fee IS NULL OR consultation_fee >= 0)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE doctors DROP CONSTRAINT IF EXISTS ck_doctors_consultation_fee_valid")
    op.drop_column("doctors", "consultation_fee")
