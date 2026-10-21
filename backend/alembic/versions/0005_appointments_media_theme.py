"""Online booking engine, email audit trail, media uploads, before/after gallery and brand theme.

- appointments: real-time slot bookings with a partial unique index against double booking
- appointment_emails: every confirmation/cancellation email attempt (status, message id, error)
- media_files: uploaded images when Cloudinary isn't configured
- transformation_cases: before/after results (publishable only with patient consent)
- clinic_info.theme: the brand palette chosen in the admin panel
- users.doctor_id: links a "doctor" login to the doctor whose bookings it sees

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-22 10:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0005'
down_revision: str | None = '0004'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('appointments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('reference', sa.String(length=20), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=False),
    sa.Column('department', sa.String(length=30), nullable=False),
    sa.Column('consultation_fee', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('patient_name', sa.String(length=120), nullable=False),
    sa.Column('patient_email', sa.String(length=255), nullable=False),
    sa.Column('patient_phone', sa.String(length=30), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('appointment_date', sa.Date(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('source', sa.String(length=20), nullable=False),
    sa.Column('cancellation_reason', sa.Text(), nullable=True),
    sa.Column('admin_notes', sa.Text(), nullable=True),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status IN ('pending', 'confirmed', 'completed', 'cancelled')", name=op.f('ck_appointments_status_valid')),
    sa.CheckConstraint("source IN ('website', 'chatbot', 'admin')", name=op.f('ck_appointments_source_valid')),
    sa.CheckConstraint('start_time < end_time', name=op.f('ck_appointments_time_range_valid')),
    sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], name=op.f('fk_appointments_doctor_id_doctors'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_appointments')),
    sa.UniqueConstraint('reference', name=op.f('uq_appointments_reference'))
    )
    op.create_index(op.f('ix_appointments_doctor_id'), 'appointments', ['doctor_id'], unique=False)
    op.create_index(op.f('ix_appointments_department'), 'appointments', ['department'], unique=False)
    op.create_index(op.f('ix_appointments_status'), 'appointments', ['status'], unique=False)
    op.create_index('ix_appointments_date_status', 'appointments', ['appointment_date', 'status'], unique=False)
    op.create_index('uq_appointments_active_slot', 'appointments', ['doctor_id', 'appointment_date', 'start_time'], unique=True, postgresql_where=sa.text("status IN ('pending', 'confirmed')"))

    op.create_table('appointment_emails',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('appointment_id', sa.Integer(), nullable=False),
    sa.Column('kind', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('recipient', sa.String(length=255), nullable=False),
    sa.Column('subject', sa.String(length=255), nullable=False),
    sa.Column('message_id', sa.String(length=255), nullable=True),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("kind IN ('received', 'confirmation', 'cancellation')", name=op.f('ck_appointment_emails_kind_valid')),
    sa.CheckConstraint("status IN ('sent', 'failed', 'skipped')", name=op.f('ck_appointment_emails_status_valid')),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], name=op.f('fk_appointment_emails_appointment_id_appointments'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_appointment_emails'))
    )
    op.create_index(op.f('ix_appointment_emails_appointment_id'), 'appointment_emails', ['appointment_id'], unique=False)

    op.create_table('media_files',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('filename', sa.String(length=255), nullable=False),
    sa.Column('content_type', sa.String(length=100), nullable=False),
    sa.Column('size_bytes', sa.Integer(), nullable=False),
    sa.Column('data', sa.LargeBinary(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_media_files'))
    )

    op.create_table('transformation_cases',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('department', sa.String(length=30), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('before_image', sa.String(length=500), nullable=False),
    sa.Column('after_image', sa.String(length=500), nullable=False),
    sa.Column('patient_consent', sa.Boolean(), nullable=False),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("department IN ('general', 'dental', 'skin', 'hair', 'pediatrics')", name=op.f('ck_transformation_cases_department_valid')),
    sa.CheckConstraint('NOT is_published OR patient_consent', name=op.f('ck_transformation_cases_consent_before_publishing')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_transformation_cases'))
    )
    op.create_index(op.f('ix_transformation_cases_department'), 'transformation_cases', ['department'], unique=False)

    op.add_column('clinic_info', sa.Column('theme', sa.String(length=30), server_default='cedar', nullable=False))
    op.add_column('users', sa.Column('doctor_id', sa.Integer(), nullable=True))
    op.create_foreign_key(op.f('fk_users_doctor_id_doctors'), 'users', 'doctors', ['doctor_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint(op.f('fk_users_doctor_id_doctors'), 'users', type_='foreignkey')
    op.drop_column('users', 'doctor_id')
    op.drop_column('clinic_info', 'theme')
    op.drop_index(op.f('ix_transformation_cases_department'), table_name='transformation_cases')
    op.drop_table('transformation_cases')
    op.drop_table('media_files')
    op.drop_index(op.f('ix_appointment_emails_appointment_id'), table_name='appointment_emails')
    op.drop_table('appointment_emails')
    op.drop_index('uq_appointments_active_slot', table_name='appointments', postgresql_where=sa.text("status IN ('pending', 'confirmed')"))
    op.drop_index('ix_appointments_date_status', table_name='appointments')
    op.drop_index(op.f('ix_appointments_status'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_department'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_doctor_id'), table_name='appointments')
    op.drop_table('appointments')
