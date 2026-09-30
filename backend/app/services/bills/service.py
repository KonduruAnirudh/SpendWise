"""Reads a bill with the LLM and returns a draft. Nothing is saved and the file never touches disk."""

from collections.abc import Callable
from typing import Any

from app.ai.providers import LLMMessage, LLMProvider, LLMProviderError
from app.core.exceptions import (
    BadGatewayError,
    BadRequestError,
    PayloadTooLargeError,
    ServiceUnavailableError,
    UnsupportedMediaTypeError,
)
from app.schemas.bill import BillDraft
from app.services.bills.draft import BILL_PROMPT, RETRY_NOTE, build_draft, extract_json
from app.services.bills.files import (
    JPEG,
    MAX_BILL_BYTES,
    PDF,
    UnreadableFileError,
    pdf_text,
    prepare_image,
    sniff_media_type,
)

UNREADABLE = "We couldn't read this bill. Try a clearer, well-lit photo, or enter the items yourself."
UNAVAILABLE = "The bill reader is unavailable right now. Please try again in a moment."


def parse_bill(provider: LLMProvider, data: bytes, default_currency: str) -> BillDraft:
    if len(data) > MAX_BILL_BYTES:
        raise PayloadTooLargeError(f"The file is larger than {MAX_BILL_BYTES // (1024 * 1024)} MB.")
    media_type = sniff_media_type(data)
    if media_type is None:
        raise UnsupportedMediaTypeError("Upload a JPEG, PNG or WebP photo, or a PDF.")

    try:
        ask = _pdf_reader(provider, data) if media_type == PDF else _image_reader(provider, data)
    except UnreadableFileError as exc:
        raise BadRequestError(str(exc)) from exc

    try:
        raw = _ask_for_json(ask)
    except LLMProviderError as exc:
        raise ServiceUnavailableError(UNAVAILABLE) from exc
    return build_draft(raw, default_currency)


def _image_reader(provider: LLMProvider, data: bytes) -> Callable[[str], str]:
    image = prepare_image(data)
    return lambda prompt: provider.vision(prompt, image, JPEG)


def _pdf_reader(provider: LLMProvider, data: bytes) -> Callable[[str], str]:
    # Text-based PDFs don't need the vision model: the text model reads the extracted text.
    text = pdf_text(data)
    return lambda prompt: provider.chat(
        [LLMMessage(role="system", content=prompt), LLMMessage(role="user", content=f"Bill text:\n\n{text}")],
        tools=[],
    ).content


def _ask_for_json(ask: Callable[[str], str]) -> dict[str, Any]:
    """Ask once; if the reply isn't JSON, ask once more with a reminder; then give up with a 502."""
    for prompt in (BILL_PROMPT, BILL_PROMPT + RETRY_NOTE):
        try:
            return extract_json(ask(prompt))
        except ValueError:
            continue
    raise BadGatewayError(UNREADABLE)
