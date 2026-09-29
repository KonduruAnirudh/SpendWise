from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.account import Account
from app.models.user import User
from app.repositories import account_repository, transaction_repository
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate

DUPLICATE_NAME = "You already have an account with this name"
ACCOUNT_IN_USE = "This account has transactions. Delete or move them before deleting the account."
ZERO = Decimal("0")


def get_owned_account(db: Session, user: User, account_id: int) -> Account:
    account = account_repository.get_for_user(db, account_id, user.id)
    if account is None:
        raise NotFoundError("Account not found")
    return account


def list_accounts(db: Session, user: User) -> list[AccountResponse]:
    accounts = account_repository.list_for_user(db, user.id)
    deltas = transaction_repository.balance_deltas(db, user.id)
    return [_to_response(account, deltas.get(account.id, ZERO)) for account in accounts]


def get_account(db: Session, user: User, account_id: int) -> AccountResponse:
    account = get_owned_account(db, user, account_id)
    return _with_current_balance(db, user, account)


def create_account(db: Session, user: User, data: AccountCreate) -> AccountResponse:
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
    return _to_response(account, ZERO)


def update_account(db: Session, user: User, account_id: int, data: AccountUpdate) -> AccountResponse:
    account = get_owned_account(db, user, account_id)
    updates = data.model_dump(exclude_unset=True, exclude_none=True)

    if "name" in updates:
        updates["name"] = updates["name"].strip()
        if updates["name"] != account.name and account_repository.get_by_name(db, user.id, updates["name"]):
            raise ConflictError(DUPLICATE_NAME)

    for field, value in updates.items():
        setattr(account, field, value)

    _commit_or_conflict(db)
    db.refresh(account)
    return _with_current_balance(db, user, account)


def delete_account(db: Session, user: User, account_id: int) -> None:
    account = get_owned_account(db, user, account_id)
    account_repository.delete(db, account)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(ACCOUNT_IN_USE)


def _with_current_balance(db: Session, user: User, account: Account) -> AccountResponse:
    deltas = transaction_repository.balance_deltas(db, user.id, [account.id])
    return _to_response(account, deltas.get(account.id, ZERO))


def _to_response(account: Account, delta: Decimal) -> AccountResponse:
    return AccountResponse(
        id=account.id,
        name=account.name,
        type=account.type,
        currency=account.currency,
        opening_balance=account.opening_balance,
        current_balance=account.opening_balance + delta,
        created_at=account.created_at,
    )


def _commit_or_conflict(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(DUPLICATE_NAME)