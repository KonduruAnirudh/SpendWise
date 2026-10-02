import heapq
from dataclasses import dataclass


@dataclass(frozen=True)
class Transfer:
    from_member_id: int
    to_member_id: int
    amount_paise: int


def simplify_debts(net_balances: dict[int, int]) -> list[Transfer]:
    """Turn net balances (in paise, summing to zero) into a short list of transfers."""
    if sum(net_balances.values()) != 0:
        raise ValueError("Net balances must sum to zero")

    creditors = [(-amount, member) for member, amount in net_balances.items() if amount > 0]
    debtors = [(amount, member) for member, amount in net_balances.items() if amount < 0]
    heapq.heapify(creditors)
    heapq.heapify(debtors)

    transfers: list[Transfer] = []
    while creditors and debtors:
        credit, creditor = heapq.heappop(creditors)
        debt, debtor = heapq.heappop(debtors)
        amount = min(-credit, -debt)
        transfers.append(Transfer(from_member_id=debtor, to_member_id=creditor, amount_paise=amount))

        if -credit > amount:
            heapq.heappush(creditors, (credit + amount, creditor))
        if -debt > amount:
            heapq.heappush(debtors, (debt + amount, debtor))
    return transfers

def pairwise_transfers(
    shares_owed: dict[tuple[int, int], int],
    settlements_paid: dict[tuple[int, int], int],
) -> list[Transfer]:
    """Who owes whom, pair by pair, straight from the expenses (amounts in paise).

    shares_owed[(debtor, payer)]: the debtor's shares in expenses the payer paid for.
    settlements_paid[(sender, receiver)]: recorded settlements between the two.
    Each pair's debts in both directions are netted, then settlements are applied, so every
    payment is between two people who actually shared an expense or a settlement.
    """
    owed: dict[tuple[int, int], int] = {}
    for (debtor, creditor), amount in shares_owed.items():
        key, sign = _pair(debtor, creditor)
        owed[key] = owed.get(key, 0) + sign * amount
    for (sender, receiver), amount in settlements_paid.items():
        # Paying someone reduces what you owe them (or makes them owe you).
        key, sign = _pair(sender, receiver)
        owed[key] = owed.get(key, 0) - sign * amount

    transfers = []
    for (low, high), amount in sorted(owed.items()):
        if amount > 0:
            transfers.append(Transfer(from_member_id=low, to_member_id=high, amount_paise=amount))
        elif amount < 0:
            transfers.append(Transfer(from_member_id=high, to_member_id=low, amount_paise=-amount))
    return transfers


def _pair(from_member: int, to_member: int) -> tuple[tuple[int, int], int]:
    """Key a directed amount by the unordered pair; +1 when it runs low → high."""
    if from_member < to_member:
        return (from_member, to_member), 1
    return (to_member, from_member), -1
