"""Create (or re-create) a demo user with six months of realistic data.

Run from backend/:  python -m scripts.seed_demo

The password comes from the DEMO_PASSWORD environment variable; if it isn't set, a random one is
generated. Either way the login is printed at the end. No credential is stored in the repository.

Everything goes through the service layer, so the demo data obeys the same rules as the API:
transaction types are derived from categories, splits are validated and computed in paise, and
group membership is checked. Re-running replaces the previous demo data and touches no other user.
Amounts come from a fixed random seed, and dates are relative to today, so the demo always looks current.
"""

import os
import random
import secrets
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registers all tables on Base.metadata)
from app.core.dates import month_bounds, shift_month
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.enums import MemberRole, SplitMethod
from app.models.group import GroupMember
from app.models.user import User
from app.schemas.account import AccountCreate
from app.schemas.group import GroupCreate, MemberCreate
from app.schemas.group_expense import GroupExpenseCreate, ItemInput, ParticipantInput
from app.schemas.settlement import SettlementCreate
from app.schemas.transaction import TransactionCreate
from app.schemas.user import UserCreate
from app.services import (
    account_service,
    auth_service,
    group_expense_service,
    group_service,
    settlement_service,
    transaction_service,
)

# example.com is reserved for documentation and examples (RFC 2606), so these can never be real inboxes.
DEMO_EMAIL = "demo@example.com"
DEMO_NAME = "Demo User"
DEMO_USERNAME = "demo"
# A second registered user, so the demo shows both kinds of group member (registered and guest).
FRIEND_EMAIL = "priya.demo@example.com"
FRIEND_NAME = "Priya"
FRIEND_USERNAME = "priya"
# The API's minimum password length (UserCreate).
MIN_PASSWORD_LENGTH = 8

MONTHS = 6


def money(value: float | int | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


@dataclass
class Context:
    db: Session
    user: User
    today: date
    rng: random.Random
    accounts: dict[str, int]
    categories: dict[str, int]
    transactions: int = 0

    def day(self, months_ago: int, day: int) -> date | None:
        """A date in the month `months_ago` before today, or None if it would be in the future."""
        year, month = shift_month(self.today.year, self.today.month, -months_ago)
        _, last = month_bounds(year, month)
        when = date(year, month, min(day, last.day))
        return when if when <= self.today else None

    def spend(self, months_ago: int, day: int, account: str, category: str, amount, description: str) -> None:
        when = self.day(months_ago, day)
        if when is None:
            return
        transaction_service.create_transaction(
            self.db,
            self.user,
            TransactionCreate(
                account_id=self.accounts[account],
                category_id=self.categories[category],
                amount=money(amount),
                description=description,
                occurred_on=when,
            ),
        )
        self.transactions += 1


def remove_user(db: Session, email: str) -> None:
    """Delete a previous demo user. Groups they own are deleted first, in dependency order
    (group_service.delete_group); the user row then cascades to accounts, transactions,
    categories and conversations."""
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        return
    owned = db.scalars(
        select(GroupMember).where(GroupMember.user_id == user.id, GroupMember.role == MemberRole.OWNER)
    ).all()
    for membership in owned:
        group_service.delete_group(db, membership)
    db.execute(delete(User).where(User.id == user.id))
    db.commit()


def seed_personal_finances(ctx: Context) -> None:
    rng = ctx.rng
    for m in range(MONTHS - 1, -1, -1):
        ctx.spend(m, 1, "HDFC Salary", "Salary", 85000, "Salary: Acme Technologies")
        ctx.spend(m, 3, "HDFC Salary", "Bills", 18500, "House rent")
        ctx.spend(m, 8, "HDFC Salary", "Bills", rng.randrange(1100, 1900), "Electricity bill")
        ctx.spend(m, 10, "ICICI Credit Card", "Bills", 999, "Airtel broadband")
        ctx.spend(m, 12, "Paytm Wallet", "Bills", 399, "Mobile recharge")
        ctx.spend(m, 15, "ICICI Credit Card", "Entertainment", 649, "Netflix")
        for day, store in ((6, "BigBasket"), (17, "DMart"), (26, "Zepto")):
            account = "ICICI Credit Card" if store != "Zepto" else "Paytm Wallet"
            ctx.spend(m, day, account, "Food", rng.randrange(1200, 3400), f"Groceries: {store}")
        for day, place in ((9, "Swiggy"), (19, "Zomato"), (24, "Third Wave Coffee")):
            ctx.spend(m, day, "Paytm Wallet", "Food", rng.randrange(250, 1600), place)
        for day, ride in ((4, "Uber"), (11, "Metro card top-up"), (18, "Rapido"), (27, "Petrol")):
            account = "Cash" if ride == "Petrol" else "Paytm Wallet"
            ctx.spend(m, day, account, "Transport", rng.randrange(150, 900), ride)
        ctx.spend(m, 21, "ICICI Credit Card", "Shopping", rng.randrange(800, 4500), rng.choice(["Amazon", "Myntra", "Decathlon"]))
        if m % 2 == 0:
            ctx.spend(m, 14, "Cash", "Health", rng.randrange(300, 1200), "Apollo Pharmacy")
        if m in (2, 4):
            ctx.spend(m, 20, "HDFC Salary", "Other Income", 12000, "Freelance design project")
    ctx.spend(2, 2, "ICICI Credit Card", "Travel", 8400, "Flights to Goa")
    ctx.spend(4, 16, "ICICI Credit Card", "Education", 499, "Udemy: SQL for data analysis")


def add_member(db: Session, owner: GroupMember, **fields) -> int:
    return group_service.add_member(db, owner, MemberCreate(**fields)).id


def expense(ctx: Context, owner: GroupMember, when: date, description: str, amount, paid_by: int, method: SplitMethod,
            participants=(), items=()) -> None:
    group_expense_service.create_expense(
        ctx.db,
        owner,
        GroupExpenseCreate(
            description=description,
            amount=money(amount),
            paid_by_member_id=paid_by,
            split_method=method,
            participants=[ParticipantInput(member_id=m, value=None if v is None else money(v)) for m, v in participants],
            items=[ItemInput(description=d, amount=money(a), member_ids=list(ids)) for d, a, ids in items],
            occurred_on=when,
        ),
    )


def seed_goa_trip(ctx: Context) -> None:
    """A trip that uses every split method, with one partial settlement."""
    detail = group_service.create_group(ctx.db, ctx.user, GroupCreate(name="Goa Trip"))
    owner = group_service.get_membership(ctx.db, ctx.user, detail.id)
    me = owner.id
    priya = add_member(ctx.db, owner, username=FRIEND_USERNAME)
    rahul = add_member(ctx.db, owner, display_name="Rahul")
    arun = add_member(ctx.db, owner, display_name="Arun")
    everyone = [me, priya, rahul, arun]
    trip = [ctx.day(2, day) for day in (5, 6, 7, 8)]

    expense(ctx, owner, trip[0], "Villa booking", 24000, me, SplitMethod.EQUAL, [(m, None) for m in everyone])
    expense(ctx, owner, trip[0], "Airport cab", 1850, me, SplitMethod.PERCENTAGE, [(m, 25) for m in everyone])
    expense(ctx, owner, trip[1], "Scooter rentals", 2400, rahul, SplitMethod.SHARES, [(me, 1), (priya, 1), (rahul, 2)])
    expense(ctx, owner, trip[1], "Seafood dinner", 5600, priya, SplitMethod.ITEMIZED, items=[
        ("Lobster platter", 2800, [me, priya]),
        ("Fish thali", 1800, [me, rahul, arun]),
        ("Drinks", 1000, everyone),
    ])
    expense(ctx, owner, trip[2], "Parasailing", 4500, arun, SplitMethod.EXACT, [(me, 1500), (rahul, 1500), (arun, 1500)])
    expense(ctx, owner, trip[2], "Villa groceries", 2100, rahul, SplitMethod.ADJUSTMENT, [(me, 0), (priya, 0), (rahul, 0), (arun, 300)])
    expense(ctx, owner, trip[3], "Sunburn tickets", 3000, me, SplitMethod.REIMBURSEMENT, [(priya, None)])

    settlement_service.record_settlement(
        ctx.db, owner, SettlementCreate(from_member_id=arun, to_member_id=me, amount=money(2000), settled_on=trip[3], note="Partly settled at the airport")
    )


def seed_flatmates(ctx: Context) -> None:
    """Ongoing shared costs with a guest flatmate, settled every month except the current one."""
    detail = group_service.create_group(ctx.db, ctx.user, GroupCreate(name="Flatmates"))
    owner = group_service.get_membership(ctx.db, ctx.user, detail.id)
    me = owner.id
    karthik = add_member(ctx.db, owner, display_name="Karthik")
    for m in (2, 1, 0):
        wifi_day, groceries_day = ctx.day(m, 2), ctx.day(m, 7)
        if wifi_day:
            expense(ctx, owner, wifi_day, "Wi-Fi and maid", 3600, me, SplitMethod.EQUAL, [(me, None), (karthik, None)])
        if groceries_day:
            expense(ctx, owner, groceries_day, "House groceries", 2800, karthik, SplitMethod.EQUAL, [(me, None), (karthik, None)])
        settle_day = ctx.day(m, 28)
        if m > 0 and settle_day:
            settlement_service.record_settlement(
                ctx.db, owner, SettlementCreate(from_member_id=karthik, to_member_id=me, amount=money(400), settled_on=settle_day)
            )


def seed_demo(db: Session, password: str, today: date | None = None) -> dict:
    today = today or date.today()
    remove_user(db, DEMO_EMAIL)
    remove_user(db, FRIEND_EMAIL)

    user = auth_service.register_user(db, UserCreate(email=DEMO_EMAIL, password=password, full_name=DEMO_NAME, username=DEMO_USERNAME))
    auth_service.register_user(db, UserCreate(email=FRIEND_EMAIL, password=password, full_name=FRIEND_NAME, username=FRIEND_USERNAME))

    accounts = {}
    for name, account_type, opening in (
        ("HDFC Salary", "bank", 45000),
        ("SBI Savings", "savings", 120000),
        ("ICICI Credit Card", "credit_card", 0),
        ("Cash", "cash", 3000),
        ("Paytm Wallet", "wallet", 1500),
    ):
        created = account_service.create_account(db, user, AccountCreate(name=name, type=account_type, opening_balance=money(opening)))
        accounts[name] = created.id

    categories = {c.name: c.id for c in db.scalars(select(Category).where(Category.user_id.is_(None)))}
    ctx = Context(db=db, user=user, today=today, rng=random.Random(2026), accounts=accounts, categories=categories)
    seed_personal_finances(ctx)
    seed_goa_trip(ctx)
    seed_flatmates(ctx)
    return {"user_id": user.id, "accounts": len(accounts), "transactions": ctx.transactions, "groups": 2}


def demo_password() -> str:
    """DEMO_PASSWORD if set (checked before touching the database), otherwise a random password."""
    password = os.environ.get("DEMO_PASSWORD")
    if password is None:
        return secrets.token_urlsafe(12)
    if len(password) < MIN_PASSWORD_LENGTH:
        raise SystemExit(f"DEMO_PASSWORD must be at least {MIN_PASSWORD_LENGTH} characters.")
    return password


def main() -> None:
    password = demo_password()
    with SessionLocal() as db:
        summary = seed_demo(db, password)
    print(
        f"Demo data ready: {summary['accounts']} accounts, {summary['transactions']} transactions, "
        f"{summary['groups']} groups.\n"
        f"Log in as:  {DEMO_EMAIL}\n"
        f"Password:   {password}\n"
        f"(Second registered member: {FRIEND_EMAIL}, same password. Set DEMO_PASSWORD to choose it.)"
    )


if __name__ == "__main__":
    main()
