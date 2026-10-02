from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class FxRateResponse(BaseModel):
    base: str
    quote: str
    rate: Decimal  # 1 base = rate quote
    date: date
