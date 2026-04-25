"""Initial schema - 8 tables

Revision ID: 325a8fddd888
Revises: 
Create Date: 2026-03-10 02:33:06.717333

"""
from alembic import op
import sqlalchemy as sa


revision = '325a8fddd888'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('destinations',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('address', sa.String(length=500), nullable=True),
    sa.Column('lat', sa.Float(), nullable=False),
    sa.Column('lng', sa.Float(), nullable=False),
    sa.Column('rating', sa.Float(), nullable=True),
    sa.Column('activities', sa.JSON(), nullable=True),
    sa.Column('image_url', sa.String(length=500), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('destinations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_destinations_name'), ['name'], unique=False)

    op.create_table('users',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('avatar_url', sa.String(length=500), nullable=True),
    sa.Column('preferred_activities', sa.JSON(), nullable=True),
    sa.Column('bucket_list', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)

    op.create_table('trips',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('destination', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=True),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.Column('budget_limit', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('trip_type', sa.String(length=50), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('creator_id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('trips', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_trips_creator_id'), ['creator_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_trips_status'), ['status'], unique=False)

    op.create_table('expenses',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('trip_id', sa.String(length=36), nullable=False),
    sa.Column('paid_by', sa.String(length=36), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=True),
    sa.Column('split_type', sa.String(length=20), nullable=False),
    sa.Column('split_details', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['paid_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_expenses_paid_by'), ['paid_by'], unique=False)
        batch_op.create_index(batch_op.f('ix_expenses_trip_id'), ['trip_id'], unique=False)

    op.create_table('itinerary_days',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('trip_id', sa.String(length=36), nullable=False),
    sa.Column('day_number', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=True),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('itinerary_days', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_itinerary_days_trip_id'), ['trip_id'], unique=False)

    op.create_table('trip_members',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('trip_id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('joined_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('trip_id', 'user_id', name='uq_trip_member')
    )
    with op.batch_alter_table('trip_members', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_trip_members_trip_id'), ['trip_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_trip_members_user_id'), ['user_id'], unique=False)

    op.create_table('votes',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('trip_id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('vote_type', sa.String(length=30), nullable=False),
    sa.Column('target_id', sa.String(length=255), nullable=False),
    sa.Column('target_value', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('trip_id', 'user_id', 'vote_type', 'target_id', name='uq_vote')
    )
    with op.batch_alter_table('votes', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_votes_trip_id'), ['trip_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_votes_user_id'), ['user_id'], unique=False)

    op.create_table('activities',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('day_id', sa.String(length=36), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('time_slot', sa.String(length=20), nullable=True),
    sa.Column('category', sa.String(length=50), nullable=True),
    sa.Column('estimated_cost', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('lat', sa.Float(), nullable=True),
    sa.Column('lng', sa.Float(), nullable=True),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['day_id'], ['itinerary_days.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('activities', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_activities_day_id'), ['day_id'], unique=False)



def downgrade():
    with op.batch_alter_table('activities', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_activities_day_id'))

    op.drop_table('activities')
    with op.batch_alter_table('votes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_votes_user_id'))
        batch_op.drop_index(batch_op.f('ix_votes_trip_id'))

    op.drop_table('votes')
    with op.batch_alter_table('trip_members', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_trip_members_user_id'))
        batch_op.drop_index(batch_op.f('ix_trip_members_trip_id'))

    op.drop_table('trip_members')
    with op.batch_alter_table('itinerary_days', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_itinerary_days_trip_id'))

    op.drop_table('itinerary_days')
    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_expenses_trip_id'))
        batch_op.drop_index(batch_op.f('ix_expenses_paid_by'))

    op.drop_table('expenses')
    with op.batch_alter_table('trips', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_trips_status'))
        batch_op.drop_index(batch_op.f('ix_trips_creator_id'))

    op.drop_table('trips')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_email'))

    op.drop_table('users')
    with op.batch_alter_table('destinations', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_destinations_name'))

    op.drop_table('destinations')
