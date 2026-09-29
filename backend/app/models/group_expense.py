from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import SplitMethod
from app.models.group import GroupMember
from app.models.mixins import TimestampMixin


class GroupExpense(TimestampMixin, Base):
    __tablename__ = "group_expenses"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    paid_by_member_id: Mapped[int] = mapped_column(ForeignKey("group_members.id"), index=True)
    created_by_member_id: Mapped[int] = mapped_column(ForeignKey("group_members.id"), index=True)
    description: Mapped[str] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    split_method: Mapped[SplitMethod] = mapped_column(
        Enum(SplitMethod, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])
    )
    occurred_on: Mapped[date] = mapped_column(Date)

    paid_by: Mapped[GroupMember] = relationship(foreign_keys=[paid_by_member_id], lazy="joined")
    splits: Mapped[list["ExpenseSplit"]] = relationship(
        back_populates="expense",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
        order_by="ExpenseSplit.member_id",
    )


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"
    __table_args__ = (
        UniqueConstraint("expense_id", "member_id", name="uq_expense_splits_expense_id_member_id"),
        CheckConstraint("amount > 0", name="amount_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    expense_id: Mapped[int] = mapped_column(ForeignKey("group_expenses.id", ondelete="CASCADE"), index=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("group_members.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    expense: Mapped[GroupExpense] = relationship(back_populates="splits")
    member: Mapped[GroupMember] = relationship(lazy="joined")

    @property
    def display_name(self) -> str:
        return self.member.display_name