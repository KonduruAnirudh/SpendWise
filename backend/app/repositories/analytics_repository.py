from datetime import date
from decimal import Decimal

from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.enums import CategoryType
from app.models.transaction import Transaction


def _in_period(user_id: int, start: date, end: date) -> tuple:
    return (
        Transaction.user_id == user_id,
        Transaction.occurred_on >= start,
        Transaction.occurred_on <= end,
    )


def totals_by_type(db: Session, user_id: int, start: date, end: date) -> dict[CategoryType, Decimal]:
    stmt = (
        select(Transaction.type, func.sum(Transaction.amount))
        .where(*_in_period(user_id, start, end))
        .group_by(Transaction.type)
    )
    return {transaction_type: total for transaction_type, total in db.execute(stmt)}


def category_totals(
    db: Session, user_id: int, start: date, end: date, category_type: CategoryType
) -> list[tuple[int, str, Decimal, int]]:
    total = func.sum(Transaction.amount)
    stmt = (
        select(Category.id, Category.name, total, func.count(Transaction.id))
        .select_from(Transaction)
        .join(Category, Transaction.category_id == Category.id)
        .where(*_in_period(user_id, start, end), Transaction.type == category_type)
        .group_by(Category.id, Category.name)
        .order_by(total.desc(), Category.name)
    )
    return [tuple(row) for row in db.execute(stmt)]


def monthly_totals(
    db: Session, user_id: int, start: date, end: date
) -> list[tuple[date, CategoryType, Decimal]]:
    month = cast(func.date_trunc("month", Transaction.occurred_on), Date).label("month")
    stmt = (
        select(month, Transaction.type, func.sum(Transaction.amount))
        .where(*_in_period(user_id, start, end))
        .group_by(month, Transaction.type)
        .order_by(month)
    )
    return [tuple(row) for row in db.execute(stmt)]


def recent(db: Session, user_id: int, limit: int) -> list[Transaction]:
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.occurred_on.desc(), Transaction.id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def largest_expenses(db: Session, user_id: int, start: date, end: date, limit: int) -> list[Transaction]:
    stmt = (
        select(Transaction)
        .where(*_in_period(user_id, start, end), Transaction.type == CategoryType.EXPENSE)
        .order_by(Transaction.amount.desc(), Transaction.id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))



def filtered_totals(
    db: Session,
    user_id: int,
    start: date,
    end: date,
    category_id: int | None = None,
    weekend: bool | None = None,
) -> dict[CategoryType, tuple[Decimal, int]]:
    conditions = list(_in_period(user_id, start, end))
    if category_id is not None:
        conditions.append(Transaction.category_id == category_id)
    if weekend is not None:
        day_of_week = func.date_part("isodow", Transaction.occurred_on)
        conditions.append(day_of_week.in_([6, 7]) if weekend else day_of_week.notin_([6, 7]))

    stmt = (
        select(Transaction.type, func.sum(Transaction.amount), func.count(Transaction.id))
        .where(*conditions)
        .group_by(Transaction.type)
    )
    return {transaction_type: (total, count) for transaction_type, total, count in db.execute(stmt)}