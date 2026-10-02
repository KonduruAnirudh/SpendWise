from collections.abc import Generator
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401  (registers all tables on Base.metadata)
from app.core.config import settings
from app.core.dependencies import get_db
from app.db.base import Base
from app.db.seed import seed_default_categories
from app.fx import FxQuote, FxUnavailableError, get_fx_provider
from app.main import app

TEST_DB_NAME = settings.test_database_url.rsplit("/", 1)[-1]
assert TEST_DB_NAME.endswith("_test"), f"Refusing to run tests against database '{TEST_DB_NAME}'"

test_engine = create_engine(settings.test_database_url, pool_pre_ping=True)
TestSessionLocal = sessionmaker(bind=test_engine, autoflush=False)


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    Base.metadata.create_all(test_engine)
    session = TestSessionLocal()
    seed_default_categories(session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(test_engine)


class FixedRates:
    """A stand-in for the exchange-rate API: fixed, round rates, and no network."""

    PER_INR = {"INR": Decimal(1), "USD": Decimal("0.012"), "EUR": Decimal("0.01"), "GBP": Decimal("0.008"),
               "AUD": Decimal("0.018"), "CHF": Decimal("0.01")}
    DAY = date(2026, 10, 1)

    def __init__(self, available: bool = True):
        self.available = available
        self.calls: list[tuple[str, str]] = []

    def quote(self, base: str, quote: str) -> FxQuote:
        self.calls.append((base, quote))
        if not self.available:
            raise FxUnavailableError("offline")
        return FxQuote(base, quote, self.PER_INR[quote] / self.PER_INR[base], self.DAY)


@pytest.fixture()
def fx() -> FixedRates:
    return FixedRates()


@pytest.fixture()
def client(db: Session, fx: FixedRates) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_fx_provider] = lambda: fx
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers_for(client: TestClient):
    def _make(email: str = "asha@example.com", password: str = "supersecret1", full_name: str = "Asha") -> dict[str, str]:
        client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "full_name": full_name},
        )
        response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _make