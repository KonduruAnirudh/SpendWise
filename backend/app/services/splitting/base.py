from dataclasses import dataclass
from decimal import Decimal
from fractions import Fraction

CENT = Decimal("0.01")


class SplitError(ValueError):
    """The input is well-formed but breaks a splitting rule."""


@dataclass(frozen=True)
class Participant:
    member_id: int
    value: Decimal | None = None


@dataclass(frozen=True)
class Item:
    amount_paise: int
    member_ids: tuple[int, ...]


def to_paise(amount: Decimal) -> int:
    return int((amount * 100).to_integral_value())


def from_paise(paise: int) -> Decimal:
    return (Decimal(paise) / 100).quantize(CENT)


def allocate(total_paise: int, weights: dict[int, Fraction]) -> dict[int, int]:
    """Split total_paise in proportion to weights, using the largest-remainder method."""
    weight_sum = sum(weights.values())
    if weight_sum <= 0:
        raise SplitError("Split weights must add up to more than zero")

    exact = {member: Fraction(total_paise) * weight / weight_sum for member, weight in weights.items()}
    shares = {member: int(value) for member, value in exact.items()}

    leftover = total_paise - sum(shares.values())
    by_remainder = sorted(exact, key=lambda member: (-(exact[member] - shares[member]), member))
    for member in by_remainder[:leftover]:
        shares[member] += 1
    return shares