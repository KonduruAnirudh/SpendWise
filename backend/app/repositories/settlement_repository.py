from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.settlement import Settlement


def list_for_group(db: Session, group_id: int) -> list[Settlement]:
    stmt = (
        select(Settlement)
        .where(Settlement.group_id == group_id)
        .order_by(Settlement.settled_on.desc(), Settlement.id.desc())
    )
    return list(db.scalars(stmt))


def get_for_group(db: Session, group_id: int, settlement_id: int) -> Settlement | None:
    stmt = select(Settlement).where(Settlement.id == settlement_id, Settlement.group_id == group_id)
    return db.scalar(stmt)


def add(db: Session, settlement: Settlement) -> None:
    db.add(settlement)


def delete(db: Session, settlement: Settlement) -> None:
    db.delete(settlement)