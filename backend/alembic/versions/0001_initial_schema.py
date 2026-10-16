"""Initial schema: clinic content, appointments, users, and the pgvector knowledge base.

The embedding column dimension is read from EMBEDDING_DIM at migration time and must
match the configured embedding model. Changing it later requires a new migration that
alters the column and re-indexes (POST /api/v1/admin/knowledge/reindex).

Revision ID: 0001
Revises: 
Create Date: 2026-10-15 21:10:56.205406
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from app.core.config import get_settings

EMBEDDING_DIM = get_settings().embedding_dim

revision: str = '0001'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # pgvector must exist before any vector column is created.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table('clinic_info',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('tagline', sa.String(length=255), nullable=False),
    sa.Column('about', sa.Text(), nullable=False),
    sa.Column('phone', sa.String(length=40), nullable=False),
    sa.Column('whatsapp', sa.String(length=40), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('address_line', sa.String(length=255), nullable=False),
    sa.Column('city', sa.String(length=100), nullable=False),
    sa.Column('state', sa.String(length=100), nullable=False),
    sa.Column('postal_code', sa.String(length=20), nullable=False),
    sa.Column('country', sa.String(length=100), nullable=False),
    sa.Column('map_embed_url', sa.Text(), nullable=True),
    sa.Column('opening_hours', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('emergency_note', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_clinic_info'))
    )
    op.create_table('contact_messages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('phone', sa.String(length=30), nullable=True),
    sa.Column('subject', sa.String(length=150), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_contact_messages'))
    )
    op.create_index(op.f('ix_contact_messages_created_at'), 'contact_messages', ['created_at'], unique=False)
    op.create_table('doctors',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('slug', sa.String(length=120), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('department', sa.String(length=30), nullable=False),
    sa.Column('specialization', sa.String(length=150), nullable=False),
    sa.Column('qualifications', sa.String(length=255), nullable=False),
    sa.Column('experience_years', sa.Integer(), nullable=False),
    sa.Column('bio', sa.Text(), nullable=False),
    sa.Column('languages', postgresql.ARRAY(sa.String(length=40)), nullable=False),
    sa.Column('photo_url', sa.String(length=500), nullable=True),
    sa.Column('consultation_days', postgresql.ARRAY(sa.Integer()), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('slot_minutes', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("department IN ('general', 'dental', 'skin', 'hair', 'pediatrics')", name=op.f('ck_doctors_department_valid')),
    sa.CheckConstraint('slot_minutes BETWEEN 10 AND 120', name=op.f('ck_doctors_slot_minutes_valid')),
    sa.CheckConstraint('start_time < end_time', name=op.f('ck_doctors_shift_valid')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_doctors')),
    sa.UniqueConstraint('slug', name=op.f('uq_doctors_slug'))
    )
    op.create_index(op.f('ix_doctors_department'), 'doctors', ['department'], unique=False)
    op.create_index(op.f('ix_doctors_is_active'), 'doctors', ['is_active'], unique=False)
    op.create_table('knowledge_documents',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('source_type', sa.String(length=20), nullable=False),
    sa.Column('source_key', sa.String(length=120), nullable=True),
    sa.Column('filename', sa.String(length=255), nullable=True),
    sa.Column('content_type', sa.String(length=100), nullable=True),
    sa.Column('content_text', sa.Text(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('chunk_count', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("source_type IN ('upload', 'seed', 'system')", name=op.f('ck_knowledge_documents_source_type_valid')),
    sa.CheckConstraint("status IN ('processing', 'ready', 'failed')", name=op.f('ck_knowledge_documents_status_valid')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_knowledge_documents')),
    sa.UniqueConstraint('source_key', name=op.f('uq_knowledge_documents_source_key'))
    )
    op.create_table('services',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('slug', sa.String(length=120), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('department', sa.String(length=30), nullable=False),
    sa.Column('short_description', sa.String(length=300), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('duration_minutes', sa.Integer(), nullable=False),
    sa.Column('price_from', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('icon', sa.String(length=50), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("department IN ('general', 'dental', 'skin', 'hair', 'pediatrics')", name=op.f('ck_services_department_valid')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_services')),
    sa.UniqueConstraint('slug', name=op.f('uq_services_slug'))
    )
    op.create_index(op.f('ix_services_department'), 'services', ['department'], unique=False)
    op.create_index(op.f('ix_services_is_active'), 'services', ['is_active'], unique=False)
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("role IN ('admin', 'staff')", name=op.f('ck_users_role_valid')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_users'))
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
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
    op.create_table('blog_posts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('slug', sa.String(length=160), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('excerpt', sa.String(length=400), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('category', sa.String(length=40), nullable=False),
    sa.Column('cover_image', sa.String(length=500), nullable=True),
    sa.Column('reading_minutes', sa.Integer(), nullable=False),
    sa.Column('author_id', sa.Integer(), nullable=True),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('published_at', sa.Date(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['doctors.id'], name=op.f('fk_blog_posts_author_id_doctors'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_blog_posts')),
    sa.UniqueConstraint('slug', name=op.f('uq_blog_posts_slug'))
    )
    op.create_index(op.f('ix_blog_posts_author_id'), 'blog_posts', ['author_id'], unique=False)
    op.create_index(op.f('ix_blog_posts_category'), 'blog_posts', ['category'], unique=False)
    op.create_index(op.f('ix_blog_posts_published_at'), 'blog_posts', ['published_at'], unique=False)
    op.create_table('knowledge_chunks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('document_id', sa.Integer(), nullable=False),
    sa.Column('chunk_index', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('embedding', Vector(EMBEDDING_DIM), nullable=False),
    sa.Column('embedding_model', sa.String(length=120), nullable=False),
    sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], name=op.f('fk_knowledge_chunks_document_id_knowledge_documents'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_knowledge_chunks'))
    )
    op.create_index(op.f('ix_knowledge_chunks_document_id'), 'knowledge_chunks', ['document_id'], unique=False)
    op.create_index('ix_knowledge_chunks_embedding_hnsw', 'knowledge_chunks', ['embedding'], unique=False, postgresql_using='hnsw', postgresql_ops={'embedding': 'vector_cosine_ops'})
    op.create_index(op.f('ix_knowledge_chunks_embedding_model'), 'knowledge_chunks', ['embedding_model'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_knowledge_chunks_embedding_model'), table_name='knowledge_chunks')
    op.drop_index('ix_knowledge_chunks_embedding_hnsw', table_name='knowledge_chunks', postgresql_using='hnsw', postgresql_ops={'embedding': 'vector_cosine_ops'})
    op.drop_index(op.f('ix_knowledge_chunks_document_id'), table_name='knowledge_chunks')
    op.drop_table('knowledge_chunks')
    op.drop_index(op.f('ix_blog_posts_published_at'), table_name='blog_posts')
    op.drop_index(op.f('ix_blog_posts_category'), table_name='blog_posts')
    op.drop_index(op.f('ix_blog_posts_author_id'), table_name='blog_posts')
    op.drop_table('blog_posts')
    op.drop_index('uq_appointments_active_slot', table_name='appointments', postgresql_where=sa.text("status IN ('PENDING', 'CONFIRMED')"))
    op.drop_index(op.f('ix_appointments_service_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_doctor_id'), table_name='appointments')
    op.drop_index('ix_appointments_date_status', table_name='appointments')
    op.drop_table('appointments')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_services_is_active'), table_name='services')
    op.drop_index(op.f('ix_services_department'), table_name='services')
    op.drop_table('services')
    op.drop_table('knowledge_documents')
    op.drop_index(op.f('ix_doctors_is_active'), table_name='doctors')
    op.drop_index(op.f('ix_doctors_department'), table_name='doctors')
    op.drop_table('doctors')
    op.drop_index(op.f('ix_contact_messages_created_at'), table_name='contact_messages')
    op.drop_table('contact_messages')
    op.drop_table('clinic_info')
    # The vector extension is left installed: other database objects may use it.
