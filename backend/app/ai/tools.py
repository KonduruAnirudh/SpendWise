import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError, model_validator
from sqlalchemy.orm import Session

from app.ai.providers.base import ToolCall, ToolSpec
from app.models.enums import CategoryType
from app.models.user import User
from app.repositories import analytics_repository, category_repository
from app.schemas.transaction import TransactionFilters
from app.services import account_service, balance_service, dashboard_service, transaction_service

ZERO = Decimal("0.00")


class ToolInputError(Exception):
    """The model called a tool with input we can't act on. The message goes back to the model."""


# ---------- Argument schemas (what the model may send) ----------

class DateRange(BaseModel):
    start_date: date = Field(description="First day of the period, YYYY-MM-DD")
    end_date: date = Field(description="Last day of the period (inclusive), YYYY-MM-DD")

    @model_validator(mode="after")
    def check_order(self) -> "DateRange":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        return self


class SpendingSummaryArgs(DateRange):
    category: str | None = Field(default=None, description="Optional category name, e.g. Food or Travel")
    day_type: Literal["weekday", "weekend"] | None = Field(
        default=None, description="Optional: count only weekdays or only weekends"
    )


class LargestExpensesArgs(DateRange):
    limit: int = Field(default=5, ge=1, le=10)


class MonthlyTrendArgs(BaseModel):
    months: int = Field(default=6, ge=1, le=12, description="How many months to include")
    end_month: str | None = Field(
        default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="Last month, YYYY-MM. Defaults to this month"
    )


class SearchTransactionsArgs(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    category: str | None = None
    text: str | None = Field(default=None, max_length=100, description="Words to find in the description")
    limit: int = Field(default=10, ge=1, le=20)


class NoArgs(BaseModel):
    pass


# ---------- Handlers (the user always comes from authentication, never from the model) ----------

def _money(value: Decimal) -> str:
    return f"{value:.2f}"


def _category_id(db: Session, user: User, name: str | None) -> int | None:
    if name is None:
        return None
    category = category_repository.find_visible_by_name(db, user.id, name.strip())
    if category is None:
        available = ", ".join(c.name for c in category_repository.list_visible(db, user.id))
        raise ToolInputError(f"Unknown category '{name}'. Available categories: {available}")
    return category.id


def _transaction(t: Any) -> dict[str, Any]:
    return {
        "date": t.occurred_on.isoformat(),
        "description": t.description,
        "category": t.category.name,
        "account": t.account.name,
        "type": t.type.value,
        "amount": _money(t.amount),
    }


def get_spending_summary(db: Session, user: User, args: SpendingSummaryArgs) -> dict[str, Any]:
    weekend = None if args.day_type is None else args.day_type == "weekend"
    totals = analytics_repository.filtered_totals(
        db, user.id, args.start_date, args.end_date, _category_id(db, user, args.category), weekend
    )
    income, income_count = totals.get(CategoryType.INCOME, (ZERO, 0))
    expense, expense_count = totals.get(CategoryType.EXPENSE, (ZERO, 0))
    return {
        "start_date": args.start_date.isoformat(),
        "end_date": args.end_date.isoformat(),
        "category": args.category,
        "day_type": args.day_type,
        "income": _money(income),
        "income_transactions": income_count,
        "expense": _money(expense),
        "expense_transactions": expense_count,
        "net": _money(income - expense),
    }


def get_category_breakdown(db: Session, user: User, args: DateRange) -> dict[str, Any]:
    rows = dashboard_service.spending_by_category(db, user, args.start_date, args.end_date)
    return {
        "start_date": args.start_date.isoformat(),
        "end_date": args.end_date.isoformat(),
        "categories": [
            {
                "category": r.category_name,
                "spent": _money(r.total),
                "percentage": str(r.percentage),
                "transactions": r.transaction_count,
            }
            for r in rows
        ],
    }


def get_monthly_trend(db: Session, user: User, args: MonthlyTrendArgs) -> dict[str, Any]:
    points = dashboard_service.monthly_trend(db, user, args.months, args.end_month)
    return {"months": [point.model_dump(mode="json") for point in points]}


def get_largest_expenses(db: Session, user: User, args: LargestExpensesArgs) -> dict[str, Any]:
    rows = dashboard_service.largest_expenses(db, user, args.start_date, args.end_date, args.limit)
    return {"expenses": [_transaction(t) for t in rows]}


def search_transactions(db: Session, user: User, args: SearchTransactionsArgs) -> dict[str, Any]:
    filters = TransactionFilters(
        start_date=args.start_date,
        end_date=args.end_date,
        category_id=_category_id(db, user, args.category),
        search=args.text,
        limit=args.limit,
    )
    page = transaction_service.list_transactions(db, user, filters)
    return {
        "total_matches": page.total,
        "shown": len(page.items),
        "transactions": [_transaction(t) for t in page.items],
    }


def get_account_balances(db: Session, user: User, args: NoArgs) -> dict[str, Any]:
    return {
        "accounts": [
            {"name": a.name, "type": a.type.value, "currency": a.currency, "current_balance": _money(a.current_balance)}
            for a in account_service.list_accounts(db, user)
        ]
    }


def get_group_balances(db: Session, user: User, args: NoArgs) -> dict[str, Any]:
    return {
        "groups": [
            {
                "group": p.group_name,
                "currency": p.currency,
                "my_net": _money(p.my_net),
                "i_owe": [{"to": s.to_member.display_name, "amount": _money(s.amount)} for s in p.i_owe],
                "owed_to_me": [{"from": s.from_member.display_name, "amount": _money(s.amount)} for s in p.owed_to_me],
            }
            for p in balance_service.my_group_positions(db, user)
        ]
    }


# ---------- Registry ----------

@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    args_model: type[BaseModel]
    handler: Callable[[Session, User, Any], dict[str, Any]]


TOOLS: dict[str, Tool] = {
    tool.name: tool
    for tool in [
        Tool(
            "get_spending_summary",
            "Total income, expenses and net for a date range. Optionally filter by one category name "
            "and/or weekdays vs weekends. Use for 'how much did I spend/earn' questions.",
            SpendingSummaryArgs,
            get_spending_summary,
        ),
        Tool(
            "get_category_breakdown",
            "Expenses per category for a date range, largest first, with percentages. "
            "Use for 'where do I spend the most' questions.",
            DateRange,
            get_category_breakdown,
        ),
        Tool(
            "get_monthly_trend",
            "Income, expenses and net for each of the last N months.",
            MonthlyTrendArgs,
            get_monthly_trend,
        ),
        Tool(
            "get_largest_expenses",
            "The biggest individual expenses in a date range.",
            LargestExpensesArgs,
            get_largest_expenses,
        ),
        Tool(
            "search_transactions",
            "Find individual transactions by date range, category, or words in the description. Newest first.",
            SearchTransactionsArgs,
            search_transactions,
        ),
        Tool(
            "get_account_balances",
            "Current balance of each of the user's accounts.",
            NoArgs,
            get_account_balances,
        ),
        Tool(
            "get_group_balances",
            "The user's position in each shared expense group: net balance, who they owe, and who owes them.",
            NoArgs,
            get_group_balances,
        ),
    ]
}


def tool_specs() -> list[ToolSpec]:
    return [ToolSpec(t.name, t.description, t.args_model.model_json_schema()) for t in TOOLS.values()]


def execute_tool(db: Session, user: User, call: ToolCall) -> str:
    tool = TOOLS.get(call.name)
    if tool is None:
        return _error(f"Unknown tool '{call.name}'. Available tools: {', '.join(TOOLS)}")
    try:
        args = tool.args_model.model_validate(json.loads(call.arguments or "{}"))
        data = tool.handler(db, user, args)
    except json.JSONDecodeError:
        return _error("Tool arguments must be a valid JSON object")
    except ValidationError as exc:
        details = "; ".join(
            f"{'.'.join(str(part) for part in e['loc']) or 'arguments'}: {e['msg']}" for e in exc.errors()
        )
        return _error(f"Invalid arguments: {details}")
    except ToolInputError as exc:
        return _error(str(exc))
    return json.dumps({"ok": True, "data": data})


def _error(message: str) -> str:
    return json.dumps({"ok": False, "error": message})