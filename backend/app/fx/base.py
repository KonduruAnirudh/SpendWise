from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class FxQuote:
    base: str
    quote: str
    rate: Decimal  # 1 base = rate quote
    date: date  # the day the rate was published


class FxUnavailableError(Exception):
    """The exchange-rate source couldn't be reached or gave an unusable answer."""


class FxProvider(Protocol):
    def quote(self, base: str, quote: str) -> FxQuote: ...
