# tests/conftest.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: conftest.py

Purpose:
Shared pytest fixtures for the backend test suite.
Boots the FastAPI app against an isolated, in-memory
SQLite database instead of the real Neon Postgres
database, and forces Gemini "unavailable" by default so
no test ever makes a real network/AI call.

Functionality:
- Patches app.database's engine/SessionLocal to an
  in-memory SQLite engine BEFORE app.main (and therefore
  every router/model) is imported, so the
  Base.metadata.create_all() call in main.py creates
  tables in the test database, never the real one.
- Recreates the schema before every test for isolation.
- Forces GEMINI_AVAILABLE = False by default (autouse)
  so safe_invoke() always raises AIUnavailableError
  unless a specific test opts back in.
- Provides small factories for creating users and auth
  headers without going through the HTTP endpoints.

==================================================
"""

import os

# Must happen before any `app.*` module is imported — app/database.py and
# app/services/gemini_service.py read these at import time.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("SECRET_KEY", "pytest-test-secret-key")
os.environ["GEMINI_API_KEY"] = ""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import app.database as database_module

# A single shared in-memory SQLite connection (StaticPool) so every session —
# whether created by a test fixture or by a request going through the
# FastAPI app — sees the same database. Plain `sqlite:///:memory:` gives each
# connection its own empty database, which would make requests unable to see
# data set up by a test.
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)

# Patch the shared engine/session before app.main is imported anywhere, so
# every router, service and the startup create_all() call use the test
# database instead of the real Neon Postgres instance.
database_module.engine = TEST_ENGINE
database_module.SessionLocal = TestingSessionLocal

from app.database import Base  # noqa: E402 — must follow the engine patch above
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.auth_service import hash_password, create_access_token  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_schema():
    """Fresh, empty schema before every test — no cross-test data leakage."""
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield


@pytest.fixture(autouse=True)
def no_real_gemini(monkeypatch):
    """
    Default for every test: Gemini is "not configured". safe_invoke() raises
    AIUnavailableError immediately (before ever building a client), so no
    test can accidentally reach the real Gemini API. Tests that specifically
    exercise the AI-success path (none of the required tests do) can
    monkeypatch safe_invoke themselves.
    """
    import app.services.gemini_service as gemini_service

    monkeypatch.setattr(gemini_service, "GEMINI_AVAILABLE", False)


@pytest.fixture
def db():
    """A raw DB session for tests that call service functions directly."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """FastAPI TestClient — requests are served against the same in-memory DB."""
    return TestClient(app)


@pytest.fixture
def make_user(db):
    """Factory fixture: make_user() -> User, inserted directly (no HTTP call)."""

    def _make(username="testuser", email="test@example.com", password="Password123!"):
        user = User(username=username, email=email, password=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _make


@pytest.fixture
def auth_headers():
    """Factory fixture: auth_headers(user) -> {"Authorization": "Bearer ..."}"""

    def _headers(user):
        token = create_access_token({"sub": user.email})
        return {"Authorization": f"Bearer {token}"}

    return _headers
