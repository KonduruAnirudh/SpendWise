from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, text

import app.models  # noqa: F401  (registers all tables on Base.metadata)
from app.core.config import settings
from app.db.base import Base

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def _alembic(connection) -> Config:
    config = Config(str(ALEMBIC_INI))
    config.attributes["connection"] = connection
    return config


def test_migrations_match_models():
    """The API tests build tables with create_all, which never runs a migration.
    This test builds the schema the way the dev and production databases get it (Alembic),
    then diffs it against the models, so a model without a migration fails here."""
    engine = create_engine(settings.test_database_url)
    with engine.begin() as connection:
        Base.metadata.drop_all(connection)
        connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        command.upgrade(_alembic(connection), "head")
    try:
        with engine.connect() as connection:
            diff = compare_metadata(MigrationContext.configure(connection), Base.metadata)
        assert diff == [], f"Models and migrations differ; add a migration (alembic revision --autogenerate): {diff}"
    finally:
        with engine.begin() as connection:
            command.downgrade(_alembic(connection), "base")
            connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        engine.dispose()


def test_username_migration_backfills_existing_users():
    """Users created before usernames existed get one from their email; clashes get a number."""
    engine = create_engine(settings.test_database_url)
    with engine.begin() as connection:
        Base.metadata.drop_all(connection)
        connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        command.upgrade(_alembic(connection), "a5de3252c88d")
        for email in ["asha.k@example.com", "asha.k@other.com", "7up@example.com", "ab@example.com"]:
            connection.execute(
                text("INSERT INTO users (email, password_hash, full_name, currency) VALUES (:e, 'x', 'N', 'INR')"),
                {"e": email},
            )
        command.upgrade(_alembic(connection), "7fe70c778bf2")
    try:
        with engine.connect() as connection:
            rows = connection.execute(text("SELECT email, username FROM users ORDER BY id")).all()
        assert [username for _, username in rows] == ["ashak", "ashak2", "user7up", "ab_user"]
    finally:
        with engine.begin() as connection:
            command.downgrade(_alembic(connection), "base")
            connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        engine.dispose()
