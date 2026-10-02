import re
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, EmailStr, Field

USERNAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,29}$")
USERNAME_RULE = "Usernames are 3 to 30 characters: lowercase letters, numbers and underscores, starting with a letter"


def normalize_username(value: object) -> object:
    # "@Asha_K " and "asha_k" are the same handle.
    return value.strip().removeprefix("@").lower() if isinstance(value, str) else value


def check_username(value: str) -> str:
    if not USERNAME_PATTERN.fullmatch(value):
        raise ValueError(USERNAME_RULE)
    return value


Username = Annotated[str, BeforeValidator(normalize_username), AfterValidator(check_username)]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    # Optional for API clients: one is generated from the email when it's left out.
    username: Username | None = None
    currency: str = Field(default="INR", pattern=r"^[A-Z]{3}$")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    username: str
    full_name: str
    currency: str
    created_at: datetime


class UserLookup(BaseModel):
    """What anyone signed in may learn about a username: that it exists, and whose it is."""

    model_config = ConfigDict(from_attributes=True)

    username: str
    full_name: str
