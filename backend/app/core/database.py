from sqlmodel import SQLModel, Session, create_engine
from app.core.config import settings

# Engine configuration with connection health checks and controlled SQL echo
engine = create_engine(
    settings.DATABASE_URL,
    echo=bool(getattr(settings, "DEBUG", False)),
    pool_pre_ping=True,
    pool_recycle=1800,
)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    SQLModel.metadata.create_all(engine)
