from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.enums import CategoryType
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionFilters


def _conditions(user_id: int, filters: TransactionFilters) -> list:
    conditions = [Transaction.user_id == user_id]
    if filters.start_date is not None:
        conditions.append(Transaction.occurred_on >= filters.start_date)
    if filters.end_date is not None:
        conditions.append(Transaction.occurred_on <= filters.end_date)
    if filters.type is not None:
        conditions.append(Transaction.type == filters.type)
    if filters.account_id is not None:
        conditions.append(Transaction.account_id == filters.account_id)
    if filters.category_id is not None:
        conditions.append(Transaction.category_id == filters.category_id)
    if filters.search:
        conditions.append(Transaction.description.ilike(f"%{filters.search}%"))
    return conditions


def list_for_user(db: Session, user_id: int, filters: TransactionFilters) -> tuple[list[Transaction], int]:
    conditions = _conditions(user_id, filters)
    total = db.scalar(select(func.count(Transaction.id)).where(*conditions)) or 0
    stmt = (
        select(Transaction)
        .where(*conditions)
        .order_by(Transaction.occurred_on.desc(), Transaction.id.desc())
        .limit(filters.limit)
        .offset(filters.offset)
    )
    return list(db.scalars(stmt)), total


def get_for_user(db: Session, transaction_id: int, user_id: int) -> Transaction | None:
    stmt = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
    return db.scalar(stmt)


def balance_deltas(db: Session, user_id: int, account_ids: list[int] | None = None) -> dict[int, Decimal]:
    signed_amount = case(
        (Transaction.type == CategoryType.INCOME, Transaction.amount),
        else_=-Transaction.amount,
    )
    stmt = (
        select(Transaction.account_id, func.sum(signed_amount))
        .where(Transaction.user_id == user_id)
        .group_by(Transaction.account_id)
    )
    if account_ids is not None:
        stmt = stmt.where(Transaction.account_id.in_(account_ids))
    return {account_id: total for account_id, total in db.execute(stmt)}


def add(db: Session, transaction: Transaction) -> Transaction:
    db.add(transaction)
    return transaction


def delete(db: Session, transaction: Transaction) -> None:
    db.delete(transaction)