import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_secret_key_shorter_than_32_characters_is_rejected_at_startup():
    with pytest.raises(ValidationError, match="secret_key"):
        Settings(secret_key="x" * 31)


def test_secret_key_of_32_characters_is_accepted():
    assert Settings(secret_key="x" * 32).secret_key == "x" * 32
