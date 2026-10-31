from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

# Engine configuration with check_same_thread=False for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI dependency to yield database sessions with safe teardown."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
