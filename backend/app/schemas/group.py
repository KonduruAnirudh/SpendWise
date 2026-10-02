from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.core.currency import CurrencyCode
from app.models.enums import MemberRole
from app.schemas.user import Username


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    currency: CurrencyCode | None = None


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    simplify_debts: bool | None = None
    # Converts every amount in the group at today's rate.
    currency: CurrencyCode | None = None


class MemberCreate(BaseModel):
    """A registered user by username (or email), or a guest by display_name."""

    username: Username | None = None
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=100)

    @model_validator(mode="after")
    def require_someone(self) -> "MemberCreate":
        if self.username is None and self.email is None and self.display_name is None:
            raise ValueError("Provide a username or email (registered user), or a display_name (guest)")
        if self.username is not None and self.email is not None:
            raise ValueError("Provide a username or an email, not both")
        return self


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    username: str | None
    role: MemberRole
    is_guest: bool


class GroupSummary(BaseModel):
    id: int
    name: str
    currency: str
    simplify_debts: bool
    member_count: int
    my_role: MemberRole
    created_at: datetime


class GroupDetail(BaseModel):
    id: int
    name: str
    currency: str
    simplify_debts: bool
    created_at: datetime
    my_member_id: int
    my_role: MemberRole
    members: list[MemberResponse]