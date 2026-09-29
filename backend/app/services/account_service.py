from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.account import Account
from app.models.user import User
from app.repositories import account_repository
from app.schemas.account import AccountCreate, AccountUpdate

DUPLICATE_NAME = "You already have an account with this name"


def list_accounts(db: Session, user: User) -> list[Account]:
    return account_repository.list_for_user(db, user.id)


def get_account(db: Session, user: User, account_id: int) -> Account:
    account = account_repository.get_for_user(db, account_id, user.id)
    if account is None:
        raise NotFoundError("Account not found")
    return account


def create_account(db: Session, user: User, data: AccountCreate) -> Account:
    name = data.name.strip()
    if account_repository.get_by_name(db, user.id, name) is not None:
        raise ConflictError(DUPLICATE_NAME)

    account = Account(
        user_id=user.id,
        name=name,
        type=data.type,
        currency=data.currency or user.currency,
        opening_balance=data.opening_balance,
    )
    account_repository.add(db, account)
    _commit_or_conflict(db)
    db.refresh(account)
    return account


def update_account(db: Session, user: User, account_id: int, data: AccountUpdate) -> Account:
    account = get_account(db, user, account_id)
    updates = data.model_dump(exclude_unset=True, exclude_none=True)

    if "name" in updates:
        updates["name"] = updates["name"].strip()
        if updates["name"] != account.name and account_repository.get_by_name(db, user.id, updates["name"]):
            raise ConflictError(DUPLICATE_NAME)

    for field, value in updates.items():
        setattr(account, field, value)

    _commit_or_conflict(db)
    db.refresh(account)
    return account


def delete_account(db: Session, user: User, account_id: int) -> None:
    account = get_account(db, user, account_id)
    account_repository.delete(db, account)
    db.commit()


def _commit_or_conflict(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(DUPLICATE_NAME)
    