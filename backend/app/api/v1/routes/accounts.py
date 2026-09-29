from fastapi import APIRouter, status

from app.core.dependencies import CurrentUser, DbSession
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate
from app.services import account_service

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
def list_accounts(current_user: CurrentUser, db: DbSession) -> list[Account]:
    return account_service.list_accounts(db, current_user)


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(data: AccountCreate, current_user: CurrentUser, db: DbSession) -> Account:
    return account_service.create_account(db, current_user, data)


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: int, current_user: CurrentUser, db: DbSession) -> Account:
    return account_service.get_account(db, current_user, account_id)


@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int, data: AccountUpdate, current_user: CurrentUser, db: DbSession
) -> Account:
    return account_service.update_account(db, current_user, account_id, data)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, current_user: CurrentUser, db: DbSession) -> None:
    account_service.delete_account(db, current_user, account_id)