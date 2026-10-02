from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.models.enums import MemberRole
from app.models.group import Group, GroupMember
from app.models.user import User
from app.repositories import group_repository, user_repository
from app.schemas.group import GroupCreate, GroupDetail, GroupSummary, GroupUpdate, MemberCreate, MemberResponse

DUPLICATE_MEMBER = "This person is already a member of the group"
DUPLICATE_NAME = "A member with this name already exists in the group"


def get_membership(db: Session, user: User, group_id: int) -> GroupMember:
    membership = group_repository.get_membership(db, group_id, user.id)
    if membership is None:
        raise NotFoundError("Group not found")
    return membership


def list_groups(db: Session, user: User) -> list[GroupSummary]:
    memberships = group_repository.list_memberships_for_user(db, user.id)
    return [
        GroupSummary(
            id=m.group.id,
            name=m.group.name,
            currency=m.group.currency,
            simplify_debts=m.group.simplify_debts,
            member_count=len(m.group.members),
            my_role=m.role,
            created_at=m.group.created_at,
        )
        for m in memberships
    ]


def create_group(db: Session, user: User, data: GroupCreate) -> GroupDetail:
    group = Group(name=data.name.strip(), currency=data.currency or user.currency, created_by_id=user.id)
    owner = GroupMember(user_id=user.id, display_name=user.full_name, role=MemberRole.OWNER)
    group.members.append(owner)

    group_repository.add(db, group)
    db.commit()
    db.refresh(group)
    return get_group_detail(owner)


def get_group_detail(membership: GroupMember) -> GroupDetail:
    group = membership.group
    return GroupDetail(
        id=group.id,
        name=group.name,
        currency=group.currency,
        simplify_debts=group.simplify_debts,
        created_at=group.created_at,
        my_member_id=membership.id,
        my_role=membership.role,
        members=[MemberResponse.model_validate(member) for member in group.members],
    )


def update_group(db: Session, membership: GroupMember, data: GroupUpdate) -> GroupDetail:
    _require_owner(membership, "Only the group owner can edit the group")
    group = membership.group
    if data.name is not None:
        group.name = data.name.strip()
    if data.simplify_debts is not None:
        group.simplify_debts = data.simplify_debts
    db.commit()
    db.refresh(group)
    return get_group_detail(membership)


def add_member(db: Session, membership: GroupMember, data: MemberCreate) -> GroupMember:
    group_id = membership.group_id
    user_id: int | None = None
    display_name = data.display_name.strip() if data.display_name else None

    user: User | None = None
    if data.username is not None:
        user = user_repository.get_by_username(db, data.username)
        if user is None:
            raise NotFoundError(f"No SpendWise user with the username @{data.username}")
    elif data.email is not None:
        user = user_repository.get_by_email(db, data.email.lower())
        if user is None:
            raise NotFoundError("No SpendWise user with this email")

    if user is not None:
        if group_repository.get_membership(db, group_id, user.id) is not None:
            raise ConflictError(DUPLICATE_MEMBER)
        user_id = user.id
        if display_name is None:
            display_name = user.full_name
            # Two people can share a name; the handle tells them apart in this group.
            if group_repository.find_member_by_name(db, group_id, display_name) is not None:
                display_name = f"{user.full_name} (@{user.username})"[:100]

    if group_repository.find_member_by_name(db, group_id, display_name) is not None:
        raise ConflictError(DUPLICATE_NAME)

    member = GroupMember(group_id=group_id, user_id=user_id, display_name=display_name, role=MemberRole.MEMBER)
    group_repository.add(db, member)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(DUPLICATE_MEMBER)
    db.refresh(member)
    return member


def remove_member(db: Session, membership: GroupMember, member_id: int) -> None:
    _require_owner(membership, "Only the group owner can remove members")
    member = group_repository.get_member(db, membership.group_id, member_id)
    if member is None:
        raise NotFoundError("Member not found")
    if member.role == MemberRole.OWNER:
        raise BadRequestError("The group owner cannot be removed")

    group_repository.delete(db, member)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("This member has expenses or settlements in the group and cannot be removed")


def delete_group(db: Session, membership: GroupMember) -> None:
    _require_owner(membership, "Only the group owner can delete the group")
    group_repository.delete_group_by_id(db, membership.group_id)
    db.commit()


def _require_owner(membership: GroupMember, message: str) -> None:
    if membership.role != MemberRole.OWNER:
        raise ForbiddenError(message)