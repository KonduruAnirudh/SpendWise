from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import MemberRole
from app.models.mixins import TimestampMixin


class Group(TimestampMixin, Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    currency: Mapped[str] = mapped_column(String(3))
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    members: Mapped[list["GroupMember"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
        order_by="GroupMember.id",
    )


class GroupMember(TimestampMixin, Base):
    __tablename__ = "group_members"
    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_members_group_id_user_id"),
        UniqueConstraint("group_id", "display_name", name="uq_group_members_group_id_display_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])
    )

    group: Mapped[Group] = relationship(back_populates="members", lazy="joined")

    @property
    def is_guest(self) -> bool:
        return self.user_id is None