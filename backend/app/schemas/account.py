from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AccountType


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: AccountType
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    opening_balance: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    type: AccountType | None = None
    opening_balance: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: AccountType
    currency: str
    opening_balance: Decimal
    current_balance: Decimal
    created_at: datetime