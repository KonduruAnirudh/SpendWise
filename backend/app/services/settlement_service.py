from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.enums import MemberRole
from app.models.group import GroupMember
from app.models.settlement import Settlement
from app.repositories import settlement_repository
from app.schemas.settlement import SettlementCreate


def list_settlements(db: Session, membership: GroupMember) -> list[Settlement]:
    return settlement_repository.list_for_group(db, membership.group_id)


def record_settlement(db: Session, membership: GroupMember, data: SettlementCreate) -> Settlement:
    member_ids = {member.id for member in membership.group.members}
    if data.from_member_id not in member_ids or data.to_member_id not in member_ids:
        raise BadRequestError("Both people in a settlement must be members of this group")
    if data.from_member_id == data.to_member_id:
        raise BadRequestError("A member cannot settle with themselves")

    settlement = Settlement(
        group_id=membership.group_id,
        from_member_id=data.from_member_id,
        to_member_id=data.to_member_id,
        created_by_member_id=membership.id,
        amount=data.amount,
        settled_on=data.settled_on or date.today(),
        note=data.note,
    )
    settlement_repository.add(db, settlement)
    db.commit()
    db.refresh(settlement)
    return settlement


def delete_settlement(db: Session, membership: GroupMember, settlement_id: int) -> None:
    settlement = settlement_repository.get_for_group(db, membership.group_id, settlement_id)
    if settlement is None:
        raise NotFoundError("Settlement not found")
    if membership.role != MemberRole.OWNER and settlement.created_by_member_id != membership.id:
        raise ForbiddenError("Only the person who recorded this settlement or the group owner can delete it")
    settlement_repository.delete(db, settlement)
    db.commit()