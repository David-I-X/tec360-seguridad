"""
Test fixtures — shared database, client, and auth helpers
"""
import os

# MUST set env vars BEFORE any app imports (load_dotenv in config.py runs at import time)
os.environ["ENVIRONMENT"] = "test"
os.environ["SKIP_CONFIG_VALIDATION"] = "true"
os.environ["DEBUG"] = "False"
os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL",
    os.getenv("DATABASE_URL", "postgresql://admin:password123@127.0.0.1:5432/tec360")
)

import pytest
from uuid import uuid4
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.core.database import get_session
from app.core.config import settings
from app.core.auth_utils import create_access_token
from app.models import User, Technician
from app.main import app


# ============================================
# DATABASE FIXTURES
# ============================================

test_engine = create_engine(settings.DATABASE_URL, echo=False)


def override_get_session():
    with Session(test_engine) as session:
        yield session


app.dependency_overrides[get_session] = override_get_session
app.state.limiter.enabled = False


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once at test session start"""
    SQLModel.metadata.create_all(test_engine)
    yield
    # Don't drop tables — keep dev data intact


@pytest.fixture()
def session():
    """Fresh session per test"""
    with Session(test_engine) as session:
        yield session


@pytest.fixture()
def client():
    """FastAPI test client"""
    return TestClient(app)


# ============================================
# USER FIXTURES
# ============================================

@pytest.fixture()
def test_client_user(session: Session):
    """Create a test client user and return (user, token)"""
    user = User(
        id=uuid4(),
        email=f"testclient_{uuid4().hex[:8]}@test.com",
        phone=f"+57300{uuid4().int % 10000000:07d}",
        full_name="Test Cliente",
        hashed_password="nopassword",
        role="client",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(hours=1),
        extra_claims={"role": "client"},
    )
    yield user, token

    # Cleanup
    try:
        session.delete(user)
        session.commit()
    except Exception:
        session.rollback()


@pytest.fixture()
def test_tech_user(session: Session):
    """Create a test technician user and return (user, token)"""
    user = User(
        id=uuid4(),
        email=f"testtech_{uuid4().hex[:8]}@test.com",
        phone=f"+57310{uuid4().int % 10000000:07d}",
        full_name="Test Técnico",
        hashed_password="nopassword",
        role="technician",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Create technician profile
    tech = Technician(
        id=uuid4(),
        user_id=user.id,
        specializations=["gps_installation"],
        experience_years=3,
        bio="Técnico de prueba",
    )
    session.add(tech)
    session.commit()

    token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(hours=1),
        extra_claims={"role": "technician"},
    )
    yield user, token

    # Cleanup
    try:
        session.delete(tech)
        session.delete(user)
        session.commit()
    except Exception:
        session.rollback()


def auth_header(token: str) -> dict:
    """Helper to create Authorization header"""
    return {"Authorization": f"Bearer {token}"}
