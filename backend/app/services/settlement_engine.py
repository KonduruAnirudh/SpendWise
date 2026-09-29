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