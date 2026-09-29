from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import CategoryType


class TransactionCreate(BaseModel):
    account_id: int
    category_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(min_length=1, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)
    occurred_on: date | None = None


class TransactionUpdate(BaseModel):
    account_id: int | None = None
    category_id: int | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    description: str | None = Field(default=None, min_length=1, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)
    occurred_on: date | None = None


class AccountBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class CategoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: CategoryType
    amount: Decimal
    description: str
    notes: str | None
    occurred_on: date
    account: AccountBrief
    category: CategoryBrief
    created_at: datetime


class TransactionFilters(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    type: CategoryType | None = None
    account_id: int | None = None
    category_id: int | None = None
    search: str | None = Field(default=None, max_length=100)
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def check_date_range(self) -> "TransactionFilters":
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        return self


class TransactionPage(BaseModel):
    items: list[TransactionResponse]
    total: int
    limit: int
    offset: int