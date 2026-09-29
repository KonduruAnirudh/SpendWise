from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.dates import month_bounds, parse_month, previous_month, shift_month
from app.models.enums import CategoryType
from app.models.transaction import Transaction
from app.models.user import User
from app.repositories import analytics_repository
from app.schemas.dashboard import CategorySpend, DashboardSummary, MonthlyTrendPoint, PeriodTotals
from app.schemas.transaction import TransactionResponse
from app.services import account_service

ZERO = Decimal("0.00")
ONE_DECIMAL = Decimal("0.1")


def period_totals(db: Session, user: User, start: date, end: date) -> PeriodTotals:
    totals = analytics_repository.totals_by_type(db, user.id, start, end)
    income = totals.get(CategoryType.INCOME, ZERO)
    expense = totals.get(CategoryType.EXPENSE, ZERO)
    return PeriodTotals(income=income, expense=expense, net=income - expense)


def spending_by_category(db: Session, user: User, start: date, end: date) -> list[CategorySpend]:
    rows = analytics_repository.category_totals(db, user.id, start, end, CategoryType.EXPENSE)
    grand_total = sum((total for _, _, total, _ in rows), ZERO)
    return [
        CategorySpend(
            category_id=category_id,
            category_name=name,
            total=total,
            transaction_count=count,
            percentage=(total / grand_total * 100).quantize(ONE_DECIMAL) if grand_total else ZERO,
        )
        for category_id, name, total, count in rows
    ]


def largest_expenses(db: Session, user: User, start: date, end: date, limit: int = 5) -> list[Transaction]:
    return analytics_repository.largest_expenses(db, user.id, start, end, limit)


def monthly_trend(db: Session, user: User, months: int, end_month: str | None = None) -> list[MonthlyTrendPoint]:
    end_start, end_end = parse_month(end_month)
    first_year, first_month = shift_month(end_start.year, end_start.month, -(months - 1))
    range_start, _ = month_bounds(first_year, first_month)

    rows = analytics_repository.monthly_totals(db, user.id, range_start, end_end)
    by_key = {(month_start.strftime("%Y-%m"), transaction_type): total for month_start, transaction_type, total in rows}

    points = []
    for offset in range(months):
        year, month = shift_month(first_year, first_month, offset)
        key = f"{year:04d}-{month:02d}"
        income = by_key.get((key, CategoryType.INCOME), ZERO)
        expense = by_key.get((key, CategoryType.EXPENSE), ZERO)
        points.append(MonthlyTrendPoint(month=key, income=income, expense=expense, net=income - expense))
    return points


def get_summary(db: Session, user: User, month: str | None) -> DashboardSummary:
    start, end = parse_month(month)
    previous_start, previous_end = previous_month(start)

    totals = period_totals(db, user, start, end)
    previous = period_totals(db, user, previous_start, previous_end)
    accounts = account_service.list_accounts(db, user)

    return DashboardSummary(
        period_start=start,
        period_end=end,
        totals=totals,
        previous_totals=previous,
        expense_change_percent=_percent_change(previous.expense, totals.expense),
        total_balance=sum((account.current_balance for account in accounts), ZERO),
        spending_by_category=spending_by_category(db, user, start, end),
        largest_expenses=[
            TransactionResponse.model_validate(t) for t in largest_expenses(db, user, start, end)
        ],
        recent_transactions=[
            TransactionResponse.model_validate(t) for t in analytics_repository.recent(db, user.id, 5)
        ],
    )


def _percent_change(old: Decimal, new: Decimal) -> Decimal | None:
    if old == 0:
        return None
    return ((new - old) / old * 100).quantize(ONE_DECIMAL)