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
