from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.group_expense import GroupExpense


def list_for_group(db: Session, group_id: int) -> list[GroupExpense]:
    stmt = (
        select(GroupExpense)
        .where(GroupExpense.group_id == group_id)
        .order_by(GroupExpense.occurred_on.desc(), GroupExpense.id.desc())
    )
    return list(db.scalars(stmt))


def get_for_group(db: Session, group_id: int, expense_id: int) -> GroupExpense | None:
    stmt = select(GroupExpense).where(GroupExpense.id == expense_id, GroupExpense.group_id == group_id)
    return db.scalar(stmt)


def add(db: Session, expense: GroupExpense) -> None:
    db.add(expense)


def delete(db: Session, expense: GroupExpense) -> None:
    db.delete(expense)