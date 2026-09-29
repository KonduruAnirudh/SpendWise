from decimal import Decimal

import pytest

from app.models.enums import SplitMethod
from app.services.splitting import Item, Participant, SplitError, calculate_split, from_paise, to_paise

A, B, C = 1, 2, 3


def rupees(value: str) -> int:
    return to_paise(Decimal(value))


def people(*pairs):
    return [Participant(member, None if value is None else Decimal(value)) for member, value in pairs]


def split(method, total, participants=(), items=(), payer=A):
    shares = calculate_split(method, rupees(total), list(participants), list(items), payer)
    return {member: str(from_paise(paise)) for member, paise in shares.items()}


def test_equal_split():
    result = split(SplitMethod.EQUAL, "3000", people((A, None), (B, None), (C, None)))
    assert result == {A: "1000.00", B: "1000.00", C: "1000.00"}


def test_equal_split_never_loses_a_paisa():
    result = split(SplitMethod.EQUAL, "100", people((A, None), (B, None), (C, None)))
    assert result == {A: "33.34", B: "33.33", C: "33.33"}


def test_exact_split():
    result = split(SplitMethod.EXACT, "3000", people((A, "1500"), (B, "1000"), (C, "500")))
    assert result == {A: "1500.00", B: "1000.00", C: "500.00"}


def test_exact_split_must_add_up():
    with pytest.raises(SplitError, match="add up to 2900.00"):
        split(SplitMethod.EXACT, "3000", people((A, "1500"), (B, "1000"), (C, "400")))


def test_percentage_split():
    result = split(SplitMethod.PERCENTAGE, "3000", people((A, "50"), (B, "30"), (C, "20")))
    assert result == {A: "1500.00", B: "900.00", C: "600.00"}


def test_percentages_must_total_100():
    with pytest.raises(SplitError, match="not 100"):
        split(SplitMethod.PERCENTAGE, "3000", people((A, "50"), (B, "30"), (C, "10")))


def test_shares_split():
    result = split(SplitMethod.SHARES, "3000", people((A, "2"), (B, "1"), (C, "1")))
    assert result == {A: "1500.00", B: "750.00", C: "750.00"}


def test_adjustment_split():
    result = split(SplitMethod.ADJUSTMENT, "3000", people((A, "300"), (B, None), (C, None)))
    assert result == {A: "1200.00", B: "900.00", C: "900.00"}


def test_reimbursement():
    result = split(SplitMethod.REIMBURSEMENT, "3000", people((B, None)), payer=A)
    assert result == {B: "3000.00"}


def test_reimbursement_cannot_target_payer():
    with pytest.raises(SplitError, match="cannot reimburse themselves"):
        split(SplitMethod.REIMBURSEMENT, "3000", people((A, None)), payer=A)


def test_itemized_split():
    items = [Item(rupees("600"), (A, B)), Item(rupees("400"), (B, C))]
    assert split(SplitMethod.ITEMIZED, "1000", items=items) == {A: "300.00", B: "500.00", C: "200.00"}


def test_itemized_items_must_add_up():
    with pytest.raises(SplitError, match="Items add up to 600.00"):
        split(SplitMethod.ITEMIZED, "1000", items=[Item(rupees("600"), (A, B))])


def test_member_cannot_appear_twice():
    with pytest.raises(SplitError, match="only once"):
        split(SplitMethod.EQUAL, "3000", people((A, None), (A, None)))