"""RUA Skin & Hair Center: service categories, centres, patient CRM, WhatsApp log and portal logins.

- departments become RUA's service categories (legacy values are mapped, not lost)
- doctors.departments: every category a doctor takes bookings for; doctors.fellowship
- branches: RUA's centres; appointments.branch_id records the chosen centre
- patients: the CRM (one row per mobile number); appointments.patient_id links bookings
- appointments.patient_email becomes optional (phone-first booking) + reminder timestamps
- whatsapp_messages: every automated or manual WhatsApp message and its delivery status
- patient_otps: hashed one-time codes for the patient portal

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-02 12:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '0006'
down_revision: str | None = '0005'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW = (
    "medical-dermatology", "dermatosurgery", "aesthetic-dermatology", "laser-treatments",
    "hair-treatments", "hair-transplant", "premium-packages",
)
OLD = ("general", "dental", "skin", "hair", "pediatrics")
DEPT_TABLES = ("doctors", "services", "transformation_cases")


def _check(values: tuple[str, ...]) -> str:
    return "department IN (" + ", ".join(f"'{v}'" for v in values) + ")"


def _swap_department_constraints(values: tuple[str, ...]) -> None:
    for table in DEPT_TABLES:
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_department_valid")
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT ck_{table}_department_valid CHECK ({_check(values)})")


def upgrade() -> None:
    # --- departments -> RUA service categories (map existing rows first) ---------------------
    for table in DEPT_TABLES:
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_department_valid")
    for table in (*DEPT_TABLES, "appointments"):
        op.execute(
            f"UPDATE {table} SET department = CASE department WHEN 'hair' THEN 'hair-treatments' "
            f"ELSE 'medical-dermatology' END WHERE department IN ('general', 'dental', 'skin', 'hair', 'pediatrics')"
        )
    _swap_department_constraints(NEW)

    op.add_column('doctors', sa.Column('departments', postgresql.ARRAY(sa.String(length=30)), server_default='{}', nullable=False))
    op.add_column('doctors', sa.Column('fellowship', sa.String(length=255), nullable=True))
    op.alter_column('doctors', 'experience_years', existing_type=sa.Integer(), nullable=True)
    op.execute("UPDATE doctors SET departments = ARRAY[department]")

    # --- centres ---------------------------------------------------------------------------
    op.create_table(
        'branches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=80), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('area', sa.String(length=80), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('phone', sa.String(length=40), nullable=False),
        sa.Column('whatsapp', sa.String(length=40), nullable=True),
        sa.Column('map_url', sa.String(length=500), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_branches')),
        sa.UniqueConstraint('slug', name=op.f('uq_branches_slug')),
    )
    op.create_index(op.f('ix_branches_is_active'), 'branches', ['is_active'], unique=False)

    # --- patients (CRM) -----------------------------------------------------------------------
    op.create_table(
        'patients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String(length=40)), server_default='{}', nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='website'),
        sa.Column('whatsapp_opt_in', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("source IN ('website', 'chatbot', 'admin', 'walk-in', 'portal')", name=op.f('ck_patients_source_valid')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_patients')),
    )
    op.create_index(op.f('ix_patients_phone'), 'patients', ['phone'], unique=True)

    # --- appointments ---------------------------------------------------------------------------
    op.add_column('appointments', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.add_column('appointments', sa.Column('patient_id', sa.Integer(), nullable=True))
    op.add_column('appointments', sa.Column('reminder_24h_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('appointments', sa.Column('reminder_2h_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.alter_column('appointments', 'patient_email', existing_type=sa.String(length=255), nullable=True)
    op.create_foreign_key(op.f('fk_appointments_branch_id_branches'), 'appointments', 'branches', ['branch_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key(op.f('fk_appointments_patient_id_patients'), 'appointments', 'patients', ['patient_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_appointments_branch_id'), 'appointments', ['branch_id'], unique=False)
    op.create_index(op.f('ix_appointments_patient_id'), 'appointments', ['patient_id'], unique=False)

    # --- WhatsApp log ------------------------------------------------------------------------------
    op.create_table(
        'whatsapp_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=True),
        sa.Column('patient_id', sa.Integer(), nullable=True),
        sa.Column('to_phone', sa.String(length=20), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('provider_message_id', sa.String(length=255), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "kind IN ('received', 'confirmation', 'cancellation', 'reschedule', 'reminder', 'otp', 'manual')",
            name=op.f('ck_whatsapp_messages_kind_valid'),
        ),
        sa.CheckConstraint("status IN ('sent', 'failed', 'skipped')", name=op.f('ck_whatsapp_messages_status_valid')),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], name=op.f('fk_whatsapp_messages_appointment_id_appointments'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], name=op.f('fk_whatsapp_messages_patient_id_patients'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_whatsapp_messages')),
    )
    op.create_index(op.f('ix_whatsapp_messages_appointment_id'), 'whatsapp_messages', ['appointment_id'], unique=False)
    op.create_index(op.f('ix_whatsapp_messages_patient_id'), 'whatsapp_messages', ['patient_id'], unique=False)
    op.create_index(op.f('ix_whatsapp_messages_created_at'), 'whatsapp_messages', ['created_at'], unique=False)

    # --- patient portal one-time codes -------------------------------------------------------------
    op.create_table(
        'patient_otps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('code_hash', sa.String(length=128), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('consumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_patient_otps')),
    )
    op.create_index(op.f('ix_patient_otps_phone'), 'patient_otps', ['phone'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_patient_otps_phone'), table_name='patient_otps')
    op.drop_table('patient_otps')
    op.drop_index(op.f('ix_whatsapp_messages_created_at'), table_name='whatsapp_messages')
    op.drop_index(op.f('ix_whatsapp_messages_patient_id'), table_name='whatsapp_messages')
    op.drop_index(op.f('ix_whatsapp_messages_appointment_id'), table_name='whatsapp_messages')
    op.drop_table('whatsapp_messages')

    op.drop_index(op.f('ix_appointments_patient_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_branch_id'), table_name='appointments')
    op.drop_constraint(op.f('fk_appointments_patient_id_patients'), 'appointments', type_='foreignkey')
    op.drop_constraint(op.f('fk_appointments_branch_id_branches'), 'appointments', type_='foreignkey')
    op.execute("UPDATE appointments SET patient_email = 'unknown@patients.example' WHERE patient_email IS NULL")
    op.alter_column('appointments', 'patient_email', existing_type=sa.String(length=255), nullable=False)
    op.drop_column('appointments', 'reminder_2h_sent_at')
    op.drop_column('appointments', 'reminder_24h_sent_at')
    op.drop_column('appointments', 'patient_id')
    op.drop_column('appointments', 'branch_id')

    op.drop_index(op.f('ix_patients_phone'), table_name='patients')
    op.drop_table('patients')
    op.drop_index(op.f('ix_branches_is_active'), table_name='branches')
    op.drop_table('branches')

    op.execute("UPDATE doctors SET experience_years = 0 WHERE experience_years IS NULL")
    op.alter_column('doctors', 'experience_years', existing_type=sa.Integer(), nullable=False)
    op.drop_column('doctors', 'fellowship')
    op.drop_column('doctors', 'departments')

    for table in DEPT_TABLES:
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_department_valid")
    for table in (*DEPT_TABLES, "appointments"):
        op.execute(
            f"UPDATE {table} SET department = CASE WHEN department LIKE 'hair-%' THEN 'hair' ELSE 'skin' END "
            f"WHERE department NOT IN ('general', 'dental', 'skin', 'hair', 'pediatrics')"
        )
    _swap_department_constraints(OLD)
