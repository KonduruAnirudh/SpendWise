from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.group_expense import ExpenseSplit, GroupExpense
from app.models.settlement import Settlement


def paid_by_member(db: Session, group_id: int) -> dict[int, Decimal]:
    stmt = (
        select(GroupExpense.paid_by_member_id, func.sum(GroupExpense.amount))
        .where(GroupExpense.group_id == group_id)
        .group_by(GroupExpense.paid_by_member_id)
    )
    return {member_id: total for member_id, total in db.execute(stmt)}


def share_by_member(db: Session, group_id: int) -> dict[int, Decimal]:
    stmt = (
        select(ExpenseSplit.member_id, func.sum(ExpenseSplit.amount))
        .join(GroupExpense, ExpenseSplit.expense_id == GroupExpense.id)
        .where(GroupExpense.group_id == group_id)
        .group_by(ExpenseSplit.member_id)
    )
    return {member_id: total for member_id, total in db.execute(stmt)}


def settlements_sent_by_member(db: Session, group_id: int) -> dict[int, Decimal]:
    stmt = (
        select(Settlement.from_member_id, func.sum(Settlement.amount))
        .where(Settlement.group_id == group_id)
        .group_by(Settlement.from_member_id)
    )
    return {member_id: total for member_id, total in db.execute(stmt)}


def settlements_received_by_member(db: Session, group_id: int) -> dict[int, Decimal]:
    stmt = (
        select(Settlement.to_member_id, func.sum(Settlement.amount))
        .where(Settlement.group_id == group_id)
        .group_by(Settlement.to_member_id)
    )
    return {member_id: total for member_id, total in db.execute(stmt)}


def shares_owed_by_pair(db: Session, group_id: int) -> dict[tuple[int, int], Decimal]:
    """{(debtor, payer): total}: each member's shares in expenses someone else paid for."""
    stmt = (
        select(ExpenseSplit.member_id, GroupExpense.paid_by_member_id, func.sum(ExpenseSplit.amount))
        .join(GroupExpense, ExpenseSplit.expense_id == GroupExpense.id)
        .where(GroupExpense.group_id == group_id, ExpenseSplit.member_id != GroupExpense.paid_by_member_id)
        .group_by(ExpenseSplit.member_id, GroupExpense.paid_by_member_id)
    )
    return {(debtor, payer): total for debtor, payer, total in db.execute(stmt)}


def settlements_by_pair(db: Session, group_id: int) -> dict[tuple[int, int], Decimal]:
    """{(sender, receiver): total} of recorded settlements."""
    stmt = (
        select(Settlement.from_member_id, Settlement.to_member_id, func.sum(Settlement.amount))
        .where(Settlement.group_id == group_id)
        .group_by(Settlement.from_member_id, Settlement.to_member_id)
    )
    return {(sender, receiver): total for sender, receiver, total in db.execute(stmt)}
