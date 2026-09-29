from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.account import Account
from app.models.category import Category
from app.models.enums import CategoryType
from app.models.mixins import TimestampMixin


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        Index("ix_transactions_user_id_occurred_on", "user_id", "occurred_on"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    type: Mapped[CategoryType] = mapped_column(
        Enum(CategoryType, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    description: Mapped[str] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    occurred_on: Mapped[date] = mapped_column(Date)

    account: Mapped[Account] = relationship(lazy="joined")
    category: Mapped[Category] = relationship(lazy="joined")