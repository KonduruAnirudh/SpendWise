from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from fractions import Fraction

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ServiceUnavailableError
from app.fx import FxProvider, FxQuote, FxUnavailableError
from app.models.account import Account
from app.models.group import Group
from app.models.group_expense import ExpenseSplit, GroupExpense
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User
from app.services.splitting import allocate, from_paise, to_paise

CENT = Decimal("0.01")
RATES_UNAVAILABLE = "Exchange rates are unavailable right now, so nothing was converted. Try again later."


@dataclass(frozen=True)
class Conversion:
    quote: FxQuote
    converted: dict[str, int]  # what was converted, e.g. {"accounts": 5, "transactions": 92}


def get_quote(fx: FxProvider, base: str, quote: str) -> FxQuote:
    try:
        return fx.quote(base, quote)
    except FxUnavailableError as error:
        raise ServiceUnavailableError(RATES_UNAVAILABLE) from error


def convert(amount: Decimal, rate: Decimal) -> Decimal:
    return (amount * rate).quantize(CENT, rounding=ROUND_HALF_UP)


def convert_positive(amount: Decimal, rate: Decimal) -> Decimal:
    # Stored amounts must stay > 0 (CHECK constraints); a tiny amount can't round to nothing.
    return max(convert(amount, rate), CENT)


def change_user_currency(db: Session, user: User, currency: str, fx: FxProvider) -> Conversion:
    """Convert the user's own money (accounts and transactions) at today's rate, in one transaction.

    Groups keep their own currency: they're shared, so only their owner can change it.
    """
    if currency == user.currency:
        raise BadRequestError(f"Your currency is already {currency}")
    quote = get_quote(fx, user.currency, currency)

    accounts = list(db.scalars(select(Account).where(Account.user_id == user.id)))
    for account in accounts:
        account.opening_balance = convert(account.opening_balance, quote.rate)
        account.currency = currency
    transactions = list(db.scalars(select(Transaction).where(Transaction.user_id == user.id)))
    for transaction in transactions:
        transaction.amount = convert_positive(transaction.amount, quote.rate)
    user.currency = currency
    db.commit()
    db.refresh(user)
    return Conversion(quote, {"accounts": len(accounts), "transactions": len(transactions)})


def change_group_currency(db: Session, group: Group, currency: str, fx: FxProvider) -> Conversion:
    """Convert a group's expenses, splits and settlements. Each expense's splits are re-allocated
    from its converted total (largest remainder), so they still add up to it exactly and every
    balance still sums to zero."""
    quote = get_quote(fx, group.currency, currency)

    expenses = list(db.scalars(select(GroupExpense).where(GroupExpense.group_id == group.id)))
    for expense in expenses:
        total = to_paise(convert_positive(expense.amount, quote.rate))
        splits = list(db.scalars(select(ExpenseSplit).where(ExpenseSplit.expense_id == expense.id)))
        shares = _reallocate(total, {split.id: to_paise(split.amount) for split in splits})
        for split in splits:
            if shares[split.id]:
                split.amount = from_paise(shares[split.id])
            else:
                # Only when the converted total has fewer minor units than people: they owe nothing.
                db.delete(split)
        expense.amount = from_paise(total)
    settlements = list(db.scalars(select(Settlement).where(Settlement.group_id == group.id)))
    for settlement in settlements:
        settlement.amount = convert_positive(settlement.amount, quote.rate)
    group.currency = currency
    return Conversion(quote, {"expenses": len(expenses), "settlements": len(settlements)})


def _reallocate(total_paise: int, old_paise: dict[int, int]) -> dict[int, int]:
    shares = allocate(total_paise, {key: Fraction(value) for key, value in old_paise.items()})
    # A share can't round to zero (CHECK amount > 0): move one minor unit from the largest share.
    for key in [k for k, v in shares.items() if v == 0]:
        largest = max(shares, key=lambda k: shares[k])
        if shares[largest] > 1:
            shares[largest] -= 1
            shares[key] = 1
    return shares
