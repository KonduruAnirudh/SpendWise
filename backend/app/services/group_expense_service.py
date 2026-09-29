from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.enums import MemberRole
from app.models.group import GroupMember
from app.models.group_expense import ExpenseSplit, GroupExpense
from app.repositories import group_expense_repository
from app.schemas.group_expense import GroupExpenseCreate
from app.services.splitting import Item, Participant, SplitError, calculate_split, from_paise, to_paise


def list_expenses(db: Session, membership: GroupMember) -> list[GroupExpense]:
    return group_expense_repository.list_for_group(db, membership.group_id)


def get_expense(db: Session, membership: GroupMember, expense_id: int) -> GroupExpense:
    expense = group_expense_repository.get_for_group(db, membership.group_id, expense_id)
    if expense is None:
        raise NotFoundError("Expense not found")
    return expense


def create_expense(db: Session, membership: GroupMember, data: GroupExpenseCreate) -> GroupExpense:
    group_member_ids = {member.id for member in membership.group.members}
    referenced_ids = (
        {data.paid_by_member_id}
        | {p.member_id for p in data.participants}
        | {member_id for item in data.items for member_id in item.member_ids}
    )
    if not referenced_ids <= group_member_ids:
        raise BadRequestError("The payer and every participant must be members of this group")

    participants = [Participant(p.member_id, p.value) for p in data.participants]
    items = [Item(to_paise(item.amount), tuple(item.member_ids)) for item in data.items]
    try:
        shares = calculate_split(
            data.split_method, to_paise(data.amount), participants, items, data.paid_by_member_id
        )
    except SplitError as exc:
        raise BadRequestError(str(exc))

    expense = GroupExpense(
        group_id=membership.group_id,
        paid_by_member_id=data.paid_by_member_id,
        created_by_member_id=membership.id,
        description=data.description.strip(),
        amount=data.amount,
        split_method=data.split_method,
        occurred_on=data.occurred_on or date.today(),
    )
    expense.splits = [
        ExpenseSplit(member_id=member_id, amount=from_paise(paise))
        for member_id, paise in sorted(shares.items())
        if paise > 0
    ]

    group_expense_repository.add(db, expense)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, membership: GroupMember, expense_id: int) -> None:
    expense = get_expense(db, membership, expense_id)
    if membership.role != MemberRole.OWNER and expense.created_by_member_id != membership.id:
        raise ForbiddenError("Only the person who added this expense or the group owner can delete it")
    group_expense_repository.delete(db, expense)
    db.commit()