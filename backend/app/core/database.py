from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# PostgreSQL engine configuration with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database (create tables if not exist - for development only)"""
    # In production, use migrations (Alembic) instead
    Base.metadata.create_all(bind=engine)
    _ensure_schema_compatibility()


def _ensure_schema_compatibility():
    """Aplica ajustes idempotentes de schema para compatibilidade de runtime."""
    statements = [
        "ALTER TABLE cameras ADD COLUMN IF NOT EXISTS detection_zone JSONB",
        "ALTER TABLE cameras ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb",
        "ALTER TABLE zones ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb",
        "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb",
        "CREATE INDEX IF NOT EXISTS idx_cameras_detection_zone ON cameras USING GIN(detection_zone) WHERE detection_zone IS NOT NULL",
    ]

    backfill_blocks = [
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name='cameras' AND column_name='metadata'
            ) THEN
                UPDATE cameras SET extra_data = COALESCE(extra_data, metadata) WHERE extra_data IS NULL;
            END IF;
        END
        $$;
        """,
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name='zones' AND column_name='metadata'
            ) THEN
                UPDATE zones SET extra_data = COALESCE(extra_data, metadata) WHERE extra_data IS NULL;
            END IF;
        END
        $$;
        """,
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name='alerts' AND column_name='metadata'
            ) THEN
                UPDATE alerts SET extra_data = COALESCE(extra_data, metadata) WHERE extra_data IS NULL;
            END IF;
        END
        $$;
        """,
    ]

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
        for block in backfill_blocks:
            conn.execute(text(block))

