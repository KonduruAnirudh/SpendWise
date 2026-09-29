from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DbSession
from app.models.user import User
from app.schemas.settlement import MyGroupPosition
from app.schemas.user import UserResponse
from app.services import balance_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def read_me(current_user: CurrentUser) -> User:
    return current_user


@router.get("/me/group-balances", response_model=list[MyGroupPosition])
def my_group_balances(current_user: CurrentUser, db: DbSession) -> list[MyGroupPosition]:
    return balance_service.my_group_positions(db, current_user)