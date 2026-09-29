from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SplitMethod


class ParticipantInput(BaseModel):
    member_id: int
    value: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)


class ItemInput(BaseModel):
    description: str = Field(min_length=1, max_length=100)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    member_ids: list[int] = Field(min_length=1)


class GroupExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    paid_by_member_id: int
    split_method: SplitMethod
    participants: list[ParticipantInput] = Field(default_factory=list)
    items: list[ItemInput] = Field(default_factory=list)
    occurred_on: date | None = None


class MemberBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str


class SplitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    member_id: int
    display_name: str
    amount: Decimal


class GroupExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    amount: Decimal
    split_method: SplitMethod
    occurred_on: date
    paid_by: MemberBrief
    created_by_member_id: int
    splits: list[SplitResponse]
    created_at: datetime