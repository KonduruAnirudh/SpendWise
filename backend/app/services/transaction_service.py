from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.transaction import Transaction
from app.models.user import User
from app.repositories import transaction_repository
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilters,
    TransactionPage,
    TransactionResponse,
    TransactionUpdate,
)
from app.services import account_service, category_service


def list_transactions(db: Session, user: User, filters: TransactionFilters) -> TransactionPage:
    rows, total = transaction_repository.list_for_user(db, user.id, filters)
    return TransactionPage(
        items=[TransactionResponse.model_validate(row) for row in rows],
        total=total,
        limit=filters.limit,
        offset=filters.offset,
    )


def get_transaction(db: Session, user: User, transaction_id: int) -> Transaction:
    transaction = transaction_repository.get_for_user(db, transaction_id, user.id)
    if transaction is None:
        raise NotFoundError("Transaction not found")
    return transaction


def create_transaction(db: Session, user: User, data: TransactionCreate) -> Transaction:
    account = account_service.get_owned_account(db, user, data.account_id)
    category = category_service.get_category(db, user, data.category_id)

    transaction = Transaction(
        user_id=user.id,
        account_id=account.id,
        category_id=category.id,
        type=category.type,
        amount=data.amount,
        description=data.description.strip(),
        notes=data.notes,
        occurred_on=data.occurred_on or date.today(),
    )
    transaction_repository.add(db, transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def update_transaction(db: Session, user: User, transaction_id: int, data: TransactionUpdate) -> Transaction:
    transaction = get_transaction(db, user, transaction_id)
    updates = data.model_dump(exclude_unset=True, exclude_none=True)

    if "account_id" in updates:
        account_service.get_owned_account(db, user, updates["account_id"])
    if "category_id" in updates:
        category = category_service.get_category(db, user, updates["category_id"])
        updates["type"] = category.type
    if "description" in updates:
        updates["description"] = updates["description"].strip()

    for field, value in updates.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return transaction


def delete_transaction(db: Session, user: User, transaction_id: int) -> None:
    transaction = get_transaction(db, user, transaction_id)
    transaction_repository.delete(db, transaction)
    db.commit()