from fastapi import APIRouter, status

from app.core.dependencies import CurrentUser, DbSession, GroupMembership
from app.models.group import GroupMember
from app.schemas.group import GroupCreate, GroupDetail, GroupSummary, GroupUpdate, MemberCreate, MemberResponse
from app.services import group_service

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("", response_model=list[GroupSummary])
def list_groups(current_user: CurrentUser, db: DbSession) -> list[GroupSummary]:
    return group_service.list_groups(db, current_user)


@router.post("", response_model=GroupDetail, status_code=status.HTTP_201_CREATED)
def create_group(data: GroupCreate, current_user: CurrentUser, db: DbSession) -> GroupDetail:
    return group_service.create_group(db, current_user, data)


@router.get("/{group_id}", response_model=GroupDetail)
def get_group(membership: GroupMembership) -> GroupDetail:
    return group_service.get_group_detail(membership)


@router.patch("/{group_id}", response_model=GroupDetail)
def update_group(data: GroupUpdate, membership: GroupMembership, db: DbSession) -> GroupDetail:
    return group_service.update_group(db, membership, data)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(membership: GroupMembership, db: DbSession) -> None:
    group_service.delete_group(db, membership)


@router.get("/{group_id}/members", response_model=list[MemberResponse])
def list_members(membership: GroupMembership) -> list[GroupMember]:
    return membership.group.members


@router.post("/{group_id}/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(data: MemberCreate, membership: GroupMembership, db: DbSession) -> GroupMember:
    return group_service.add_member(db, membership, data)


@router.delete("/{group_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(member_id: int, membership: GroupMembership, db: DbSession) -> None:
    group_service.remove_member(db, membership, member_id)