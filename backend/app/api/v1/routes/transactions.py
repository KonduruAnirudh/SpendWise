from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilters,
    TransactionPage,
    TransactionResponse,
    TransactionUpdate,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=TransactionPage)
def list_transactions(
    filters: Annotated[TransactionFilters, Query()], current_user: CurrentUser, db: DbSession
) -> TransactionPage:
    return transaction_service.list_transactions(db, current_user, filters)


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(data: TransactionCreate, current_user: CurrentUser, db: DbSession) -> Transaction:
    return transaction_service.create_transaction(db, current_user, data)


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, current_user: CurrentUser, db: DbSession) -> Transaction:
    return transaction_service.get_transaction(db, current_user, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int, data: TransactionUpdate, current_user: CurrentUser, db: DbSession
) -> Transaction:
    return transaction_service.update_transaction(db, current_user, transaction_id, data)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, current_user: CurrentUser, db: DbSession) -> None:
    transaction_service.delete_transaction(db, current_user, transaction_id)