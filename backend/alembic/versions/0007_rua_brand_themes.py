"""RUA brand themes: the admin palettes become RUA's own wood-and-cream family.

The multispeciality palettes (emerald, sapphire, slate, plum) are retired; a clinic still using
one falls back to the RUA signature palette ("cedar").

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-02 20:30:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0007'
down_revision: str | None = '0006'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW = ("cedar", "walnut", "rosewood", "espresso", "sage")
OLD = ("cedar", "emerald", "sapphire", "slate", "plum")


def _reset_unknown(allowed: tuple[str, ...]) -> None:
    op.execute(
        sa.text("UPDATE clinic_info SET theme = 'cedar' WHERE theme NOT IN :allowed").bindparams(
            sa.bindparam("allowed", value=allowed, expanding=True)
        )
    )


def upgrade() -> None:
    _reset_unknown(NEW)


def downgrade() -> None:
    _reset_unknown(OLD)
