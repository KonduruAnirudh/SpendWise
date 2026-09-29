from collections.abc import Callable
from decimal import Decimal
from fractions import Fraction

from app.models.enums import SplitMethod
from app.services.splitting.base import Item, Participant, SplitError, allocate, from_paise, to_paise

Shares = dict[int, int]
Strategy = Callable[[int, list[Participant], list[Item], int], Shares]


def _require_participants(participants: list[Participant]) -> None:
    ids = [p.member_id for p in participants]
    if not ids:
        raise SplitError("At least one participant is required")
    if len(ids) != len(set(ids)):
        raise SplitError("Each member can appear only once in a split")


def _values(participants: list[Participant], label: str) -> dict[int, Decimal]:
    if any(p.value is None for p in participants):
        raise SplitError(f"Every participant needs a {label}")
    return {p.member_id: p.value for p in participants}


def split_equal(total: int, participants: list[Participant], items: list[Item], payer_id: int) -> Shares:
    _require_participants(participants)
    return allocate(total, {p.member_id: Fraction(1) for p in participants})


def split_exact(total: int, participants: list[Participant], items: list[Item], payer_id: int) -> Shares:
    _require_participants(participants)
    values = _values(participants, "amount")
    if any(v < 0 for v in values.values()):
        raise SplitError("Amounts cannot be negative")
    shares = {member: to_paise(v) for member, v in values.items()}
    if sum(shares.values()) != total:
        raise SplitError(
            f"Exact amounts add up to {from_paise(sum(shares.values()))}, "
            f"but the expense is {from_paise(total)}"
        )
    return shares


def split_percentage(total: int, participants: list[Participant], items: list[Item], payer_id: int) -> Shares:
    _require_participants(participants)
    values = _values(participants, "percentage")
    if any(v < 0 for v in values.values()):
        raise SplitError("Percentages cannot be negative")
    if sum(values.values()) != 100:
        raise SplitError(f"Percentages add up to {sum(values.values())}, not 100")
    return allocate(total, {member: Fraction(v) for member, v in values.items()})


def split_shares(total: int, participants: list[Participant], items: list[Item], payer_id: int) -> Shares:
    _require_participants(participants)
    values = _values(participants, "number of shares")
    if any(v <= 0 for v in values.values()):
        raise SplitError("Shares must be greater than zero")
    return allocate(total, {member: Fraction(v) for member, v in values.items()})


def split_adjustment(total: int, participants: list[Participant], items: list[Item], payer_id: int) -> Shares:
    _require_participants(participants)
    adjustments = {p.member_id: to_paise(p.value or Decimal("0")) for p in participants}
    remaining = total - sum(adjustments.values())
    if remaining < 0:
        raise SplitError("Adjustments add up to more than the expense total")

    base = allocate(remaining, {member: Fraction(1) for member in adjustments})
    shares = {member: base[member] + adjustments[member] for member in adjustments}
    if any(share < 0 for share in shares.values()):
        raise SplitError("An adjustment makes someone's share negative")
    return shares


def split_reimbursement(total: int, participants: list[Participant], items: list[Item], payer_id: int) -> Shares:
    if len(participants) != 1:
        raise SplitError("A reimbursement has exactly one participant: the person who owes the full amount")
    debtor = participants[0].member_id
    if debtor == payer_id:
        raise SplitError("The payer cannot reimburse themselves")
    return {debtor: total}


def split_itemized(total: int, participants: list[Participant], items: list[Item], payer_id: int) -> Shares:
    if not items:
        raise SplitError("An itemized expense needs at least one item")
    items_total = sum(item.amount_paise for item in items)
    if items_total != total:
        raise SplitError(f"Items add up to {from_paise(items_total)}, but the expense is {from_paise(total)}")

    shares: Shares = {}
    for item in items:
        if len(set(item.member_ids)) != len(item.member_ids):
            raise SplitError("Each member can appear only once per item")
        for member, paise in allocate(item.amount_paise, {m: Fraction(1) for m in item.member_ids}).items():
            shares[member] = shares.get(member, 0) + paise
    return shares


STRATEGIES: dict[SplitMethod, Strategy] = {
    SplitMethod.EQUAL: split_equal,
    SplitMethod.EXACT: split_exact,
    SplitMethod.PERCENTAGE: split_percentage,
    SplitMethod.SHARES: split_shares,
    SplitMethod.ADJUSTMENT: split_adjustment,
    SplitMethod.REIMBURSEMENT: split_reimbursement,
    SplitMethod.ITEMIZED: split_itemized,
}


def calculate_split(
    method: SplitMethod, total_paise: int, participants: list[Participant], items: list[Item], payer_id: int
) -> Shares:
    shares = STRATEGIES[method](total_paise, participants, items, payer_id)
    if sum(shares.values()) != total_paise:
        raise RuntimeError(f"Split invariant violated for {method}: shares do not sum to the total")
    return shares