from calendar import monthrange
from datetime import date, timedelta


def month_bounds(year: int, month: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


def parse_month(value: str | None, today: date | None = None) -> tuple[date, date]:
    if value is None:
        today = today or date.today()
        return month_bounds(today.year, today.month)
    year, month = (int(part) for part in value.split("-"))
    return month_bounds(year, month)


def previous_month(start: date) -> tuple[date, date]:
    last_day_of_previous = start - timedelta(days=1)
    return month_bounds(last_day_of_previous.year, last_day_of_previous.month)


def shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    index = year * 12 + (month - 1) + delta
    return index // 12, index % 12 + 1