from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser, DbSession
from app.models.user import User
from app.schemas.settlement import MyGroupPosition
from app.schemas.user import UserLookup, UserResponse, normalize_username
from app.services import balance_service, user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def read_me(current_user: CurrentUser) -> User:
    return current_user


@router.get("/me/group-balances", response_model=list[MyGroupPosition])
def my_group_balances(current_user: CurrentUser, db: DbSession) -> list[MyGroupPosition]:
    return balance_service.my_group_positions(db, current_user)

# Exact match only (no search), so it can't be used to list who uses SpendWise.
@router.get("/lookup", response_model=UserLookup)
def lookup_user(
    current_user: CurrentUser,
    db: DbSession,
    username: str = Query(min_length=1, max_length=31),
) -> User:
    return user_service.lookup(db, normalize_username(username))
