from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SpendWise"
    environment: str = "development"

    database_url: str
    test_database_url: str

    # HS256 needs at least a 256-bit key (RFC 7518 §3.2); a short key makes JWTs brute-forceable.
    secret_key: str = Field(min_length=32)
    access_token_expire_minutes: int = 60

    llm_base_url: str
    llm_api_key: str
    llm_model: str

    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()