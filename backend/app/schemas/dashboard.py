from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.transaction import TransactionResponse


class PeriodTotals(BaseModel):
    income: Decimal
    expense: Decimal
    net: Decimal


class CategorySpend(BaseModel):
    category_id: int
    category_name: str
    total: Decimal
    transaction_count: int
    percentage: Decimal


class DashboardSummary(BaseModel):
    period_start: date
    period_end: date
    totals: PeriodTotals
    previous_totals: PeriodTotals
    expense_change_percent: Decimal | None
    total_balance: Decimal
    spending_by_category: list[CategorySpend]
    largest_expenses: list[TransactionResponse]
    recent_transactions: list[TransactionResponse]


class MonthlyTrendPoint(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    net: Decimal