from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.enums import MemberRole


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")


class MemberCreate(BaseModel):
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=100)

    @model_validator(mode="after")
    def require_email_or_name(self) -> "MemberCreate":
        if self.email is None and self.display_name is None:
            raise ValueError("Provide an email (registered user) or a display_name (guest)")
        return self


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    role: MemberRole
    is_guest: bool


class GroupSummary(BaseModel):
    id: int
    name: str
    currency: str
    member_count: int
    my_role: MemberRole
    created_at: datetime


class GroupDetail(BaseModel):
    id: int
    name: str
    currency: str
    created_at: datetime
    my_member_id: int
    members: list[MemberResponse]