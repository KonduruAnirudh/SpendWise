import io
import json

import pytest
from PIL import Image
from pypdf import PdfWriter

from app.ai.providers import LLMProviderError, LLMResponse, get_llm_provider
from app.main import app
from app.services.bills.draft import RETRY_NOTE
from app.services.bills.files import MAX_BILL_BYTES, MAX_IMAGE_SIDE

GOOD_REPLY = json.dumps(
    {
        "merchant": "Cafe Coffee Day",
        "bill_date": "2026-09-28",
        "currency": "INR",
        "items": [{"name": "Cappuccino", "amount": 220}, {"name": "Brownie", "amount": 140}],
        "tax": 18,
        "tip": 20,
        "total": 398,
        "warnings": [],
    }
)


class FakeBillProvider:
    """Plays back scripted model replies and records what it was sent."""

    def __init__(self, *replies):
        self.replies = list(replies)
        self.vision_calls = []
        self.chat_calls = []

    def vision(self, prompt, image, media_type):
        self.vision_calls.append({"prompt": prompt, "image": image, "media_type": media_type})
        return self.replies.pop(0)

    def chat(self, messages, tools):
        self.chat_calls.append({"messages": messages, "tools": tools})
        return LLMResponse(content=self.replies.pop(0))


class DownProvider:
    def vision(self, prompt, image, media_type):
        raise LLMProviderError("connection refused")

    def chat(self, messages, tools):
        raise LLMProviderError("connection refused")


def image_bytes(size=(60, 40), fmt="JPEG"):
    out = io.BytesIO()
    Image.new("RGB", size, "white").save(out, format=fmt)
    return out.getvalue()


def text_pdf(*lines):
    """A minimal one-page PDF with a real text layer."""
    stream = "BT /F1 12 Tf 72 720 Td 16 TL " + " ".join(f"({line}) Tj T*" for line in lines) + " ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
    ]
    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{number} 0 obj\n{body}\nendobj\n".encode())
    xref = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets:
        out.write(f"{offset:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()


def scanned_pdf():
    """A PDF with a page but no text layer, like a scan."""
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


@pytest.fixture()
def group(client, auth_headers_for):
    headers = auth_headers_for("owner@example.com")
    group_id = client.post("/api/v1/groups", json={"name": "Dinner"}, headers=headers).json()["id"]
    return {"id": group_id, "headers": headers, "url": f"/api/v1/groups/{group_id}/bills/parse"}


@pytest.fixture()
def use_provider(client):
    def _install(provider):
        app.dependency_overrides[get_llm_provider] = lambda: provider
        return provider

    yield _install
    app.dependency_overrides.pop(get_llm_provider, None)


def upload(client, group, data, filename="receipt.jpg", content_type="image/jpeg", headers=None):
    return client.post(group["url"], files={"file": (filename, data, content_type)}, headers=headers or group["headers"])


def test_photo_is_read_into_a_draft_and_nothing_is_saved(client, group, use_provider):
    provider = use_provider(FakeBillProvider(GOOD_REPLY))

    response = upload(client, group, image_bytes())

    assert response.status_code == 200
    assert response.json() == {
        "merchant": "Cafe Coffee Day",
        "bill_date": "2026-09-28",
        "currency": "INR",
        "items": [{"name": "Cappuccino", "amount": "220.00"}, {"name": "Brownie", "amount": "140.00"}],
        "tax": "18.00",
        "tip": "20.00",
        "total": "398.00",
        "warnings": [],
    }
    [call] = provider.vision_calls
    assert call["media_type"] == "image/jpeg"
    assert call["image"].startswith(b"\xff\xd8\xff")
    expenses = client.get(f"/api/v1/groups/{group['id']}/expenses", headers=group["headers"]).json()
    assert expenses == []


def test_large_photo_is_downscaled_and_re_encoded_as_jpeg(client, group, use_provider):
    provider = use_provider(FakeBillProvider(GOOD_REPLY))

    response = upload(client, group, image_bytes(size=(3000, 1200), fmt="PNG"), "receipt.png", "image/png")

    assert response.status_code == 200
    sent = Image.open(io.BytesIO(provider.vision_calls[0]["image"]))
    assert sent.format == "JPEG"
    assert sent.size == (MAX_IMAGE_SIDE, 800)


def test_file_over_5_mb_is_rejected_with_413(client, group, use_provider):
    provider = use_provider(FakeBillProvider())
    too_big = b"\xff\xd8\xff" + b"0" * MAX_BILL_BYTES

    response = upload(client, group, too_big)

    assert response.status_code == 413
    assert response.json() == {"detail": "The file is larger than 5 MB."}
    assert provider.vision_calls == []


def test_file_disguised_as_a_jpeg_is_rejected_with_415(client, group, use_provider):
    provider = use_provider(FakeBillProvider())

    response = upload(client, group, b"MZ\x90\x00 an executable renamed to receipt.jpg")

    assert response.status_code == 415
    assert response.json() == {"detail": "Upload a JPEG, PNG or WebP photo, or a PDF."}
    assert provider.vision_calls == []


def test_non_member_gets_404(client, group, auth_headers_for, use_provider):
    use_provider(FakeBillProvider(GOOD_REPLY))
    outsider = auth_headers_for("outsider@example.com")

    response = upload(client, group, image_bytes(), headers=outsider)

    assert response.status_code == 404


def test_unauthenticated_request_gets_401(client, group):
    response = client.post(group["url"], files={"file": ("receipt.jpg", image_bytes(), "image/jpeg")})
    assert response.status_code == 401


def test_invalid_model_json_is_retried_once_then_gives_502(client, group, use_provider):
    provider = use_provider(FakeBillProvider("I think this is a receipt.", '{"merchant": "Cafe",'))

    response = upload(client, group, image_bytes())

    assert response.status_code == 502
    assert response.json()["detail"].startswith("We couldn't read this bill.")
    assert len(provider.vision_calls) == 2
    assert provider.vision_calls[1]["prompt"].endswith(RETRY_NOTE)


def test_retry_succeeds_when_the_second_reply_is_valid(client, group, use_provider):
    provider = use_provider(FakeBillProvider("Sorry, here it is:", GOOD_REPLY))

    response = upload(client, group, image_bytes())

    assert response.status_code == 200
    assert response.json()["total"] == "398.00"
    assert len(provider.vision_calls) == 2


def test_totals_that_dont_add_up_are_a_warning_not_an_error(client, group, use_provider):
    reply = json.dumps({"items": [{"name": "Thali", "amount": 300}], "tax": 0, "tip": 0, "total": 500})
    use_provider(FakeBillProvider(reply))

    response = upload(client, group, image_bytes())

    assert response.status_code == 200
    assert response.json()["warnings"] == [
        "Items, tax and tip add up to 300.00, but the bill total is 500.00 (200.00 more). "
        "Check for a missed item, a discount or a misread amount."
    ]


def test_text_pdf_is_read_by_the_text_model_not_the_vision_model(client, group, use_provider):
    provider = use_provider(FakeBillProvider(GOOD_REPLY))
    pdf = text_pdf("Saravana Bhavan", "Masala Dosa 120.00", "Filter Coffee 40.00", "Total 160.00")

    response = upload(client, group, pdf, "bill.pdf", "application/pdf")

    assert response.status_code == 200
    assert provider.vision_calls == []
    [call] = provider.chat_calls
    assert call["tools"] == []
    assert "Masala Dosa 120.00" in call["messages"][-1].content


def test_pdf_without_text_is_rejected_with_a_clear_400(client, group, use_provider):
    provider = use_provider(FakeBillProvider())

    response = upload(client, group, scanned_pdf(), "scan.pdf", "application/pdf")

    assert response.status_code == 400
    assert response.json()["detail"].startswith("This PDF has no selectable text")
    assert provider.chat_calls == []


def test_corrupt_image_is_rejected_with_400(client, group, use_provider):
    use_provider(FakeBillProvider())

    response = upload(client, group, b"\xff\xd8\xff\xe0 this is not really a jpeg")

    assert response.status_code == 400
    assert response.json() == {"detail": "This image couldn't be opened. Try another photo."}


def test_model_unavailable_gives_503(client, group, use_provider):
    use_provider(DownProvider())

    response = upload(client, group, image_bytes())

    assert response.status_code == 503
    assert response.json() == {"detail": "The bill reader is unavailable right now. Please try again in a moment."}
