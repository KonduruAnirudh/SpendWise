from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.group_expense import MemberBrief


class MemberBalance(BaseModel):
    member_id: int
    display_name: str
    is_guest: bool
    paid: Decimal
    share: Decimal
    settlements_sent: Decimal
    settlements_received: Decimal
    net: Decimal


class GroupBalances(BaseModel):
    group_id: int
    currency: str
    my_member_id: int
    is_settled: bool
    members: list[MemberBalance]


class SuggestedSettlement(BaseModel):
    from_member: MemberBrief
    to_member: MemberBrief
    amount: Decimal


class SettlementCreate(BaseModel):
    from_member_id: int
    to_member_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    settled_on: date | None = None
    note: str | None = Field(default=None, max_length=255)


class SettlementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_member: MemberBrief
    to_member: MemberBrief
    amount: Decimal
    settled_on: date
    note: str | None
    created_by_member_id: int
    created_at: datetime


class MyGroupPosition(BaseModel):
    group_id: int
    group_name: str
    currency: str
    my_net: Decimal
    i_owe: list[SuggestedSettlement]
    owed_to_me: list[SuggestedSettlement]