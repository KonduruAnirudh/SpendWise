from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.group import GroupMember
from app.models.user import User
from app.repositories import balance_repository, group_repository
from app.schemas.group_expense import MemberBrief
from app.schemas.settlement import GroupBalances, MemberBalance, MyGroupPosition, SuggestedSettlement
from app.services.settlement_engine import Transfer, pairwise_transfers, simplify_debts
from app.services.splitting import from_paise, to_paise

ZERO = Decimal("0.00")


def member_balances(db: Session, membership: GroupMember) -> list[MemberBalance]:
    group_id = membership.group_id
    paid = balance_repository.paid_by_member(db, group_id)
    share = balance_repository.share_by_member(db, group_id)
    sent = balance_repository.settlements_sent_by_member(db, group_id)
    received = balance_repository.settlements_received_by_member(db, group_id)

    balances = []
    for member in membership.group.members:
        member_paid = paid.get(member.id, ZERO)
        member_share = share.get(member.id, ZERO)
        member_sent = sent.get(member.id, ZERO)
        member_received = received.get(member.id, ZERO)
        balances.append(
            MemberBalance(
                member_id=member.id,
                display_name=member.display_name,
                is_guest=member.is_guest,
                paid=member_paid,
                share=member_share,
                settlements_sent=member_sent,
                settlements_received=member_received,
                net=member_paid - member_share + member_sent - member_received,
            )
        )

    if sum((b.net for b in balances), ZERO) != 0:
        raise RuntimeError(f"Balances for group {group_id} do not sum to zero")
    return balances


def suggested_settlements(db: Session, membership: GroupMember, balances: list[MemberBalance]) -> list[SuggestedSettlement]:
    """Payments that clear the group: pair by pair, or the fewest overall if the group simplifies debts."""
    names = {b.member_id: b.display_name for b in balances}
    nets = {b.member_id: to_paise(b.net) for b in balances}
    if membership.group.simplify_debts:
        transfers = simplify_debts(nets)
    else:
        transfers = pairwise_transfers(
            {pair: to_paise(total) for pair, total in balance_repository.shares_owed_by_pair(db, membership.group_id).items()},
            {pair: to_paise(total) for pair, total in balance_repository.settlements_by_pair(db, membership.group_id).items()},
        )
    _check_transfers_clear(nets, transfers, membership.group_id)
    return [
        SuggestedSettlement(
            from_member=MemberBrief(id=t.from_member_id, display_name=names[t.from_member_id]),
            to_member=MemberBrief(id=t.to_member_id, display_name=names[t.to_member_id]),
            amount=from_paise(t.amount_paise),
        )
        for t in transfers
    ]


def _check_transfers_clear(nets: dict[int, int], transfers: list[Transfer], group_id: int) -> None:
    # Either way, doing every suggested payment must bring every balance to exactly zero.
    remaining = dict(nets)
    for t in transfers:
        remaining[t.from_member_id] += t.amount_paise
        remaining[t.to_member_id] -= t.amount_paise
    if any(remaining.values()):
        raise RuntimeError(f"Suggested settlements for group {group_id} don't clear the balances")


def get_group_balances(db: Session, membership: GroupMember) -> GroupBalances:
    balances = member_balances(db, membership)
    return GroupBalances(
        group_id=membership.group_id,
        currency=membership.group.currency,
        my_member_id=membership.id,
        is_settled=all(b.net == 0 for b in balances),
        members=balances,
    )


def get_suggested_settlements(db: Session, membership: GroupMember) -> list[SuggestedSettlement]:
    return suggested_settlements(db, membership, member_balances(db, membership))


def my_group_positions(db: Session, user: User) -> list[MyGroupPosition]:
    positions = []
    for membership in group_repository.list_memberships_for_user(db, user.id):
        balances = member_balances(db, membership)
        suggestions = suggested_settlements(db, membership, balances)
        positions.append(
            MyGroupPosition(
                group_id=membership.group_id,
                group_name=membership.group.name,
                currency=membership.group.currency,
                my_net=next(b.net for b in balances if b.member_id == membership.id),
                i_owe=[s for s in suggestions if s.from_member.id == membership.id],
                owed_to_me=[s for s in suggestions if s.to_member.id == membership.id],
            )
        )
    return positions