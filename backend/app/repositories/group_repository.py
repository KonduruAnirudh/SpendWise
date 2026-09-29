from sqlalchemy import delete as sql_delete
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.group import Group, GroupMember
from app.models.group_expense import GroupExpense
from app.models.settlement import Settlement


def list_memberships_for_user(db: Session, user_id: int) -> list[GroupMember]:
    stmt = select(GroupMember).where(GroupMember.user_id == user_id).order_by(GroupMember.group_id.desc())
    return list(db.scalars(stmt))


def get_membership(db: Session, group_id: int, user_id: int) -> GroupMember | None:
    stmt = select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
    return db.scalar(stmt)


def get_member(db: Session, group_id: int, member_id: int) -> GroupMember | None:
    stmt = select(GroupMember).where(GroupMember.id == member_id, GroupMember.group_id == group_id)
    return db.scalar(stmt)


def find_member_by_name(db: Session, group_id: int, display_name: str) -> GroupMember | None:
    stmt = select(GroupMember).where(
        GroupMember.group_id == group_id,
        func.lower(GroupMember.display_name) == display_name.lower(),
    )
    return db.scalar(stmt)


def add(db: Session, obj: Group | GroupMember) -> None:
    db.add(obj)


def delete(db: Session, obj: Group | GroupMember) -> None:
    db.delete(obj)


def delete_group_by_id(db: Session, group_id: int) -> None:
    # Children first: anything referencing members, then the group (its members cascade).
    db.execute(sql_delete(Settlement).where(Settlement.group_id == group_id))
    db.execute(sql_delete(GroupExpense).where(GroupExpense.group_id == group_id))
    db.execute(sql_delete(Group).where(Group.id == group_id))