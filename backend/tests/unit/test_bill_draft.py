from decimal import Decimal

import pytest

from app.schemas.bill import BillItem
from app.services.bills.draft import build_draft, extract_json, reconcile, to_money
from app.services.bills.files import JPEG, MAX_BILL_BYTES, PDF, PNG, WEBP, sniff_media_type


def items(*amounts):
    return [BillItem(name=f"Item {n}", amount=Decimal(a)) for n, a in enumerate(amounts, start=1)]


# ---------- reconciliation ----------

def test_reconcile_accepts_an_exact_match():
    assert reconcile(items("100.00", "50.00"), Decimal("7.50"), Decimal("0.00"), Decimal("157.50")) is None


@pytest.mark.parametrize("total", ["158.50", "156.50"])
def test_reconcile_allows_up_to_one_rupee_of_round_off(total):
    assert reconcile(items("100.00", "50.00"), Decimal("7.50"), Decimal("0.00"), Decimal(total)) is None


def test_reconcile_warns_when_the_total_is_higher_than_the_lines():
    warning = reconcile(items("100.00", "50.00"), Decimal("7.50"), Decimal("10.00"), Decimal("237.50"))
    assert warning == (
        "Items, tax and tip add up to 167.50, but the bill total is 237.50 (70.00 more). "
        "Check for a missed item, a discount or a misread amount."
    )


def test_reconcile_warns_when_the_total_is_lower_than_the_lines():
    warning = reconcile(items("500.00"), Decimal("0.00"), Decimal("0.00"), Decimal("450.00"))
    assert "(50.00 less)" in warning


# ---------- magic-byte detection ----------

@pytest.mark.parametrize(
    ("header", "expected"),
    [
        (b"\xff\xd8\xff\xe0\x00\x10JFIF", JPEG),
        (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", PNG),
        (b"RIFF\x24\x00\x00\x00WEBPVP8 ", WEBP),
        (b"%PDF-1.7\n%\xe2\xe3", PDF),
    ],
)
def test_sniff_recognises_allowed_types_by_content(header, expected):
    assert sniff_media_type(header + b"rest of the file") == expected


@pytest.mark.parametrize(
    "data",
    [
        b"GIF89a....",  # GIF is not accepted
        b"MZ\x90\x00 an executable renamed to receipt.jpg",
        b"<svg xmlns='http://www.w3.org/2000/svg'/>",
        b"RIFF\x24\x00\x00\x00WAVEfmt ",  # RIFF, but audio rather than WebP
        b"\xff\xd8",  # truncated JPEG header
        b"",
    ],
)
def test_sniff_rejects_everything_else(data):
    assert sniff_media_type(data) is None


def test_upload_limit_is_five_megabytes():
    assert MAX_BILL_BYTES == 5 * 1024 * 1024


def test_accepted_uploads_are_buffered_in_memory_not_on_disk():
    import app.main  # noqa: F401  (applies the spool setting)
    from starlette.formparsers import MultiPartParser

    assert MultiPartParser.spool_max_size > MAX_BILL_BYTES


# ---------- parsing the model's reply ----------

@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (120, "120.00"),
        (99.5, "99.50"),
        ("1,234.50", "1234.50"),
        ("Rs. 1,234.555", "1234.56"),
        ("₹ 80", "80.00"),
        ("-40", "-40.00"),
    ],
)
def test_to_money_reads_numbers_and_printed_amounts(value, expected):
    assert to_money(value) == Decimal(expected)


@pytest.mark.parametrize("value", [None, True, "", "n/a", {"amount": 5}, "1e400", "2 x 150", float("inf")])
def test_to_money_returns_none_for_non_amounts(value):
    assert to_money(value) is None


def test_extract_json_tolerates_code_fences_and_surrounding_text():
    reply = 'Here you go:\n```json\n{"merchant": "Cafe", "items": []}\n```\nHope that helps!'
    assert extract_json(reply) == {"merchant": "Cafe", "items": []}


@pytest.mark.parametrize("reply", ["Sorry, I can't read that.", '["not", "an object"]', '{"merchant": "Cafe",'])
def test_extract_json_rejects_replies_without_a_json_object(reply):
    with pytest.raises(ValueError):
        extract_json(reply)


def test_build_draft_drops_invalid_lines_with_warnings():
    raw = {
        "merchant": "  Cafe Coffee Day  ",
        "bill_date": "2026-09-28",
        "currency": "₹",
        "items": [
            {"name": "Latte", "amount": "220"},
            {"name": "Refund", "amount": -40},
            {"name": "Smudged", "amount": "??"},
            "garbage",
            {"name": "", "amount": 60},
        ],
        "tax": 14,
        "tip": None,
        "total": 294,
        "warnings": ["Total partly covered by a thumb"],
    }
    draft = build_draft(raw, "INR")

    assert draft.merchant == "Cafe Coffee Day"
    assert draft.currency == "INR"
    assert [(item.name, item.amount) for item in draft.items] == [("Latte", Decimal("220.00")), ("Item 5", Decimal("60.00"))]
    assert (draft.tax, draft.tip, draft.total) == (Decimal("14.00"), Decimal("0.00"), Decimal("294.00"))
    assert draft.warnings == [
        "Total partly covered by a thumb",
        'Skipped "Refund": its amount (-40.00) isn\'t more than zero.',
        'Skipped "Smudged": its amount couldn\'t be read.',
        "Skipped line 4: it couldn't be read.",
    ]


def test_tax_and_service_lines_are_added_up_by_the_server_not_the_model():
    raw = {
        "items": [{"name": "Thali", "amount": 1055}],
        "taxes": [{"name": "CGST 2.5%", "amount": "26.38"}, {"name": "SGST 2.5%", "amount": 26.38}],
        "service_charges": [{"name": "Service Charge 5%", "amount": 52.75}, {"name": "Tip", "amount": "??"}],
        "total": 1160,
    }
    draft = build_draft(raw, "INR")
    assert (draft.tax, draft.tip) == (Decimal("52.76"), Decimal("52.75"))
    assert draft.warnings == ['Skipped the tip line "Tip": its amount couldn\'t be read.']


def test_build_draft_flags_a_foreign_currency_and_a_missing_total():
    draft = build_draft({"currency": "usd", "items": [{"name": "Burger", "amount": 12.5}], "bill_date": "28/09/2026"}, "INR")
    assert draft.currency == "USD"
    assert draft.bill_date is None
    assert "This bill is in USD but the group uses INR; amounts are not converted." in draft.warnings
    assert "The bill total wasn't found, so it couldn't be checked against the items." in draft.warnings
    assert "The bill date couldn't be read." in draft.warnings
