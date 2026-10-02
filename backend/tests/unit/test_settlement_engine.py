import pytest

from app.services.settlement_engine import Transfer, simplify_debts

A, B, C, D = 1, 2, 3, 4


def apply(net, transfers):
    result = dict(net)
    for transfer in transfers:
        result[transfer.from_member_id] += transfer.amount_paise
        result[transfer.to_member_id] -= transfer.amount_paise
    return result


def test_one_creditor_two_debtors():
    assert simplify_debts({A: 2000, B: -1000, C: -1000}) == [Transfer(B, A, 1000), Transfer(C, A, 1000)]


def test_chain_collapses_to_one_transfer():
    assert simplify_debts({A: -500, B: 0, C: 500}) == [Transfer(A, C, 500)]


def test_settled_group_needs_no_transfers():
    assert simplify_debts({A: 0, B: 0}) == []


def test_transfers_zero_every_balance():
    net = {A: 5000, B: -3000, C: -1500, D: -500}
    transfers = simplify_debts(net)

    assert all(balance == 0 for balance in apply(net, transfers).values())
    assert len(transfers) <= len(net) - 1


def test_unbalanced_input_is_rejected():
    with pytest.raises(ValueError):
        simplify_debts({A: 100, B: -50})

# ---------- pairwise_transfers: who owes whom, from the expenses themselves ----------
from app.services.settlement_engine import pairwise_transfers  # noqa: E402


def test_pairwise_keeps_each_debt_with_the_person_who_paid():
    # A paid 400 food, B paid 400 room; C and D each had 100 of both (the "Lonavala" case).
    shares = {(B, A): 100, (C, A): 100, (D, A): 100, (A, B): 100, (C, B): 100, (D, B): 100}

    assert pairwise_transfers(shares, {}) == [
        Transfer(C, A, 100),
        Transfer(D, A, 100),
        Transfer(C, B, 100),
        Transfer(D, B, 100),
    ]


def test_pairwise_nets_debts_in_both_directions():
    assert pairwise_transfers({(A, B): 300, (B, A): 100}, {}) == [Transfer(A, B, 200)]


def test_pairwise_applies_settlements_and_overpayments():
    assert pairwise_transfers({(A, B): 300}, {(A, B): 300}) == []
    assert pairwise_transfers({(A, B): 300}, {(A, B): 100}) == [Transfer(A, B, 200)]
    assert pairwise_transfers({(A, B): 300}, {(A, B): 400}) == [Transfer(B, A, 100)]


def test_pairwise_matches_every_members_net_balance():
    shares = {(B, A): 700, (C, A): 300, (A, C): 250, (D, C): 250, (B, D): 50}
    settlements = {(B, A): 200, (D, C): 250}
    net = {A: 0, B: 0, C: 0, D: 0}
    for (debtor, payer), amount in shares.items():
        net[payer] += amount
        net[debtor] -= amount
    for (sender, receiver), amount in settlements.items():
        net[sender] += amount
        net[receiver] -= amount

    assert all(balance == 0 for balance in apply(net, pairwise_transfers(shares, settlements)).values())
