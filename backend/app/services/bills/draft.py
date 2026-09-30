"""Turns the model's reply into a validated BillDraft.

Lenient about what comes in (models add code fences, currency symbols, thousands separators),
strict about what goes out (2-decimal amounts, positive items), and every correction is reported
to the user as a warning instead of being applied silently.
"""

import json
import re
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any

from app.schemas.bill import BillDraft, BillItem

BILL_PROMPT = """You read receipts and bills and return their contents as JSON.

Reply with ONLY a JSON object, no explanation and no markdown, in exactly this shape:
{"merchant": string or null, "bill_date": "YYYY-MM-DD" or null, "currency": "ISO 4217 code" or null,
 "items": [{"name": string, "amount": number}],
 "taxes": [{"name": string, "amount": number}],
 "service_charges": [{"name": string, "amount": number}],
 "total": number or null, "warnings": [string]}

Rules:
- items: one entry per purchased line. "amount" is the line's final price (quantity x unit price), as printed.
- Never list subtotals, taxes, service charges, tips, discounts, round-off or the grand total as items.
- taxes: one entry per tax line exactly as printed (GST, CGST, SGST, IGST, VAT, cess). Empty if none.
- service_charges: one entry per service charge or tip line exactly as printed. Empty if none.
- Copy every amount as printed. Do not calculate, add up or correct anything.
- total: the grand total actually payable, as printed.
- Write numbers without currency symbols or thousands separators: 1234.50, not "Rs 1,234.50".
- If the bill has a discount, don't subtract it from the items; add a warning such as "Discount of 50.00".
- If something is unreadable or you are unsure of a value, give your best reading and add a short warning.
- Never invent items or amounts that are not on the bill."""

RETRY_NOTE = "\n\nYour previous reply was not valid JSON. Reply with the JSON object only."

# Items + tax + tip may differ from the printed total by up to this much (round-off) without a warning.
RECONCILE_TOLERANCE = Decimal("1.00")

CENT = Decimal("0.01")
MAX_AMOUNT = Decimal("9999999999.99")
CURRENCY_ALIASES = {"₹": "INR", "RS": "INR", "RS.": "INR", "RUPEES": "INR", "$": "USD", "€": "EUR", "£": "GBP"}
FENCED = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)
NUMBER = re.compile(r"-?\d[\d,]*(?:\.\d+)?")


def extract_json(reply: str) -> dict[str, Any]:
    """The JSON object in the model's reply, tolerating code fences and surrounding text.
    Raises ValueError if there is none."""
    text = reply.strip()
    fenced = FENCED.search(text)
    if fenced:
        text = fenced.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("The reply contains no JSON object")
    data = json.loads(text[start : end + 1])  # JSONDecodeError is a ValueError
    if not isinstance(data, dict):
        raise ValueError("The reply's JSON is not an object")
    return data


def to_money(value: Any) -> Decimal | None:
    """A 2-decimal amount from a number or a string like "Rs 1,234.50"; None if it isn't one."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        text = str(value)
    elif isinstance(value, str):
        # Exactly one number, e.g. "Rs. 1,234.50". Zero or several ("2 x 150") is not an amount:
        # merging the digits would silently turn "2 x 150" into 2150.
        numbers = NUMBER.findall(value)
        if len(numbers) != 1:
            return None
        text = numbers[0].replace(",", "")
    else:
        return None
    try:
        amount = Decimal(text).quantize(CENT, rounding=ROUND_HALF_UP)
    except InvalidOperation:
        return None
    return amount if amount.is_finite() and abs(amount) <= MAX_AMOUNT else None


def reconcile(items: list[BillItem], tax: Decimal, tip: Decimal, total: Decimal) -> str | None:
    """A warning if items + tax + tip don't match the printed total (beyond round-off), else None.
    A mismatch never rejects the bill: the user fixes it while reviewing the draft."""
    calculated = sum((item.amount for item in items), Decimal("0.00")) + tax + tip
    difference = total - calculated
    if abs(difference) <= RECONCILE_TOLERANCE:
        return None
    direction = "more" if difference > 0 else "less"
    return (
        f"Items, tax and tip add up to {calculated:.2f}, but the bill total is {total:.2f} "
        f"({abs(difference):.2f} {direction}). Check for a missed item, a discount or a misread amount."
    )


def build_draft(raw: dict[str, Any], default_currency: str) -> BillDraft:
    """Validate the model's JSON into a BillDraft. Unusable lines are dropped with a warning."""
    warnings = [str(note).strip()[:200] for note in (raw.get("warnings") or []) if str(note).strip()][:10]

    items: list[BillItem] = []
    for index, entry in enumerate(raw.get("items") or [], start=1):
        if not isinstance(entry, dict):
            warnings.append(f"Skipped line {index}: it couldn't be read.")
            continue
        name = str(entry.get("name") or "").strip()[:100] or f"Item {index}"
        amount = to_money(entry.get("amount"))
        if amount is None:
            warnings.append(f'Skipped "{name}": its amount couldn\'t be read.')
        elif amount <= 0:
            warnings.append(f'Skipped "{name}": its amount ({amount:.2f}) isn\'t more than zero.')
        else:
            items.append(BillItem(name=name, amount=amount))

    # The model copies each tax/charge line; the server adds them up (models are unreliable at arithmetic).
    tax = _line_total(raw, "taxes", "tax", warnings)
    tip = _line_total(raw, "service_charges", "tip", warnings)
    total = to_money(raw.get("total"))
    if total is not None and total <= 0:
        warnings.append(f"Ignored the bill total ({total:.2f}): it isn't more than zero.")
        total = None

    if not items:
        warnings.append("No items were found. Add them yourself before saving.")
    if total is None:
        warnings.append("The bill total wasn't found, so it couldn't be checked against the items.")
    else:
        mismatch = reconcile(items, tax, tip, total)
        if mismatch:
            warnings.append(mismatch)

    currency = _currency(raw.get("currency"), default_currency)
    if currency != default_currency:
        warnings.append(f"This bill is in {currency} but the group uses {default_currency}; amounts are not converted.")

    merchant = str(raw.get("merchant") or "").strip()[:100] or None
    return BillDraft(
        merchant=merchant,
        bill_date=_bill_date(raw.get("bill_date"), warnings),
        currency=currency,
        items=items,
        tax=tax,
        tip=tip,
        total=total,
        warnings=warnings,
    )


def _line_total(raw: dict[str, Any], lines_key: str, total_key: str, warnings: list[str]) -> Decimal:
    """Sum the printed lines under `lines_key` (e.g. CGST + SGST); fall back to a single `total_key` amount."""
    lines = raw.get(lines_key)
    if not isinstance(lines, list):
        return _non_negative(raw.get(total_key), total_key, warnings)
    total = Decimal("0.00")
    for index, line in enumerate(lines, start=1):
        label = str(line.get("name") or f"line {index}").strip()[:60] if isinstance(line, dict) else f"line {index}"
        amount = to_money(line.get("amount")) if isinstance(line, dict) else None
        if amount is None or amount < 0:
            warnings.append(f'Skipped the {total_key} line "{label}": its amount couldn\'t be read.')
        else:
            total += amount
    return total


def _non_negative(value: Any, label: str, warnings: list[str]) -> Decimal:
    if value in (None, ""):
        return Decimal("0.00")
    amount = to_money(value)
    if amount is None or amount < 0:
        warnings.append(f"The {label} couldn't be read, so it was set to 0.")
        return Decimal("0.00")
    return amount


def _currency(value: Any, default: str) -> str:
    text = str(value or "").strip().upper()
    text = CURRENCY_ALIASES.get(text, text)
    return text if re.fullmatch(r"[A-Z]{3}", text) else default


def _bill_date(value: Any, warnings: list[str]) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value).strip())
    except ValueError:
        warnings.append("The bill date couldn't be read.")
        return None
