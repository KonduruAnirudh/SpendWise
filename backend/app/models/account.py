from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import AccountType
from app.models.mixins import TimestampMixin


class Account(TimestampMixin, Base):
    __tablename__ = "accounts"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_accounts_user_id_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[AccountType] = mapped_column(
        Enum(AccountType, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])
    )
    currency: Mapped[str] = mapped_column(String(3))
    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0"), server_default="0"
    )