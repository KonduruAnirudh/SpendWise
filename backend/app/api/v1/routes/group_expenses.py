from fastapi import APIRouter, status

from app.core.dependencies import DbSession, GroupMembership
from app.models.group_expense import GroupExpense
from app.schemas.group_expense import GroupExpenseCreate, GroupExpenseResponse
from app.services import group_expense_service

router = APIRouter(prefix="/groups/{group_id}/expenses", tags=["group expenses"])


@router.get("", response_model=list[GroupExpenseResponse])
def list_expenses(membership: GroupMembership, db: DbSession) -> list[GroupExpense]:
    return group_expense_service.list_expenses(db, membership)


@router.post("", response_model=GroupExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(data: GroupExpenseCreate, membership: GroupMembership, db: DbSession) -> GroupExpense:
    return group_expense_service.create_expense(db, membership, data)


@router.get("/{expense_id}", response_model=GroupExpenseResponse)
def get_expense(expense_id: int, membership: GroupMembership, db: DbSession) -> GroupExpense:
    return group_expense_service.get_expense(db, membership, expense_id)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, membership: GroupMembership, db: DbSession) -> None:
    group_expense_service.delete_expense(db, membership, expense_id)