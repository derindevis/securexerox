import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Enforce TLS / SSL for external PostgreSQL connections in production
if db_url.startswith("postgresql://") and "sslmode=" not in db_url:
    separator = "&" if "?" in db_url else "?"
    db_url = f"{db_url}{separator}sslmode=require"

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine_options = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

if not db_url.startswith("sqlite"):
    engine_options.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
    })

engine = create_engine(db_url, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema_migrations():
    """Idempotently adds missing columns to existing SQLite/Postgres tables."""
    with engine.connect() as conn:
        for table, col, col_type in [
            ("users", "shop_public_id", "VARCHAR"),
            ("users", "shop_qr_payload", "VARCHAR"),
            ("print_jobs", "shop_id", "VARCHAR"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
