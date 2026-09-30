from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class BillItem(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class BillDraft(BaseModel):
    """What the model read from a bill. A draft for the user to review: never saved by the API."""

    merchant: str | None = Field(default=None, max_length=100)
    bill_date: date | None = None
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    items: list[BillItem] = Field(default_factory=list)
    tax: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    tip: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    total: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    # Anything the user should double-check: skipped lines, totals that don't add up, model notes.
    warnings: list[str] = Field(default_factory=list)
