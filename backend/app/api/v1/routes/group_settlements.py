from fastapi import APIRouter, status

from app.core.dependencies import DbSession, GroupMembership
from app.models.settlement import Settlement
from app.schemas.settlement import GroupBalances, SettlementCreate, SettlementResponse, SuggestedSettlement
from app.services import balance_service, settlement_service

router = APIRouter(prefix="/groups/{group_id}", tags=["balances & settlements"])


@router.get("/balances", response_model=GroupBalances)
def get_balances(membership: GroupMembership, db: DbSession) -> GroupBalances:
    return balance_service.get_group_balances(db, membership)


@router.get("/settlements/suggested", response_model=list[SuggestedSettlement])
def get_suggested_settlements(membership: GroupMembership, db: DbSession) -> list[SuggestedSettlement]:
    return balance_service.get_suggested_settlements(db, membership)


@router.get("/settlements", response_model=list[SettlementResponse])
def list_settlements(membership: GroupMembership, db: DbSession) -> list[Settlement]:
    return settlement_service.list_settlements(db, membership)


@router.post("/settlements", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
def record_settlement(data: SettlementCreate, membership: GroupMembership, db: DbSession) -> Settlement:
    return settlement_service.record_settlement(db, membership, data)


@router.delete("/settlements/{settlement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_settlement(settlement_id: int, membership: GroupMembership, db: DbSession) -> None:
    settlement_service.delete_settlement(db, membership, settlement_id)