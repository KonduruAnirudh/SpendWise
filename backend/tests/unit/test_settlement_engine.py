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