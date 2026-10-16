"""Focus on the AI chatbot: drop online appointment booking, add chatbot usage events.

Appointments are now requested by phone, WhatsApp, email or at the front desk; the
website explains how. `chat_events` records only the outcome of each chatbot reply
(no question or answer text) for the admin dashboard.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-15 23:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0002'
down_revision: str | None = '0001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index('uq_appointments_active_slot', table_name='appointments', postgresql_where=sa.text("status IN ('PENDING', 'CONFIRMED')"))
    op.drop_index(op.f('ix_appointments_service_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_doctor_id'), table_name='appointments')
    op.drop_index('ix_appointments_date_status', table_name='appointments')
    op.drop_table('appointments')

    op.create_table('chat_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('provider', sa.String(length=80), nullable=False),
    sa.Column('latency_ms', sa.Integer(), nullable=False),
    sa.Column('top_similarity', sa.Float(), nullable=True),
    sa.CheckConstraint("status IN ('answered', 'no_context', 'safety_redirect', 'emergency', 'fallback')", name=op.f('ck_chat_events_status_valid')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_chat_events'))
    )
    op.create_index(op.f('ix_chat_events_created_at'), 'chat_events', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chat_events_created_at'), table_name='chat_events')
    op.drop_table('chat_events')

    op.create_table('appointments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('reference', sa.String(length=20), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=False),
    sa.Column('service_id', sa.Integer(), nullable=False),
    sa.Column('patient_name', sa.String(length=120), nullable=False),
    sa.Column('patient_email', sa.String(length=255), nullable=False),
    sa.Column('patient_phone', sa.String(length=30), nullable=False),
    sa.Column('appointment_date', sa.Date(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('staff_notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')", name=op.f('ck_appointments_status_valid')),
    sa.CheckConstraint('start_time < end_time', name=op.f('ck_appointments_time_range_valid')),
    sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], name=op.f('fk_appointments_doctor_id_doctors'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['service_id'], ['services.id'], name=op.f('fk_appointments_service_id_services'), ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_appointments')),
    sa.UniqueConstraint('reference', name=op.f('uq_appointments_reference'))
    )
    op.create_index('ix_appointments_date_status', 'appointments', ['appointment_date', 'status'], unique=False)
    op.create_index(op.f('ix_appointments_doctor_id'), 'appointments', ['doctor_id'], unique=False)
    op.create_index(op.f('ix_appointments_service_id'), 'appointments', ['service_id'], unique=False)
    op.create_index('uq_appointments_active_slot', 'appointments', ['doctor_id', 'appointment_date', 'start_time'], unique=True, postgresql_where=sa.text("status IN ('PENDING', 'CONFIRMED')"))
