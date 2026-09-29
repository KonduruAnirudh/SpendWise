from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.group import GroupMember
from app.models.mixins import TimestampMixin


class Settlement(TimestampMixin, Base):
    __tablename__ = "settlements"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("from_member_id <> to_member_id", name="different_members"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    from_member_id: Mapped[int] = mapped_column(ForeignKey("group_members.id"), index=True)
    to_member_id: Mapped[int] = mapped_column(ForeignKey("group_members.id"), index=True)
    created_by_member_id: Mapped[int] = mapped_column(ForeignKey("group_members.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    settled_on: Mapped[date] = mapped_column(Date)
    note: Mapped[str | None] = mapped_column(String(255))

    from_member: Mapped[GroupMember] = relationship(foreign_keys=[from_member_id], lazy="joined")
    to_member: Mapped[GroupMember] = relationship(foreign_keys=[to_member_id], lazy="joined")