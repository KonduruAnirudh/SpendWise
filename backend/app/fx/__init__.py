from functools import lru_cache

from app.core.config import settings
from app.fx.base import FxProvider, FxQuote, FxUnavailableError
from app.fx.frankfurter import FrankfurterProvider


@lru_cache
def get_fx_provider() -> FxProvider:
    return FrankfurterProvider(settings.fx_api_url)


__all__ = ["FxProvider", "FxQuote", "FxUnavailableError", "get_fx_provider"]
