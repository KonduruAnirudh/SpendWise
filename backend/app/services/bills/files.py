"""Checks and prepares an uploaded bill file, entirely in memory (nothing is written to disk)."""

import io

from PIL import Image, ImageOps
from pypdf import PdfReader

MAX_BILL_BYTES = 5 * 1024 * 1024
# Longest side sent to the vision model: enough for small receipt print, and it keeps requests fast.
MAX_IMAGE_SIDE = 2000
# Refuse absurd resolutions before decoding (a small file can still decode to gigabytes of pixels).
MAX_IMAGE_PIXELS = 50_000_000
MAX_PDF_PAGES = 5
MAX_PDF_TEXT_CHARS = 20_000
# Fewer visible characters than this means the PDF is a scanned image, not text.
MIN_PDF_TEXT_CHARS = 20

JPEG = "image/jpeg"
PNG = "image/png"
WEBP = "image/webp"
PDF = "application/pdf"


class UnreadableFileError(Exception):
    """The file is an allowed type but its content can't be used (corrupt, scanned PDF, ...)."""


def sniff_media_type(data: bytes) -> str | None:
    """Identify the file from its first bytes ("magic numbers"), never from its name or Content-Type,
    both of which the client controls."""
    if data.startswith(b"\xff\xd8\xff"):
        return JPEG
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return PNG
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return WEBP
    if data.startswith(b"%PDF-"):
        return PDF
    return None


def prepare_image(data: bytes) -> bytes:
    """Return the photo upright, in RGB, at most MAX_IMAGE_SIDE pixels on its longest side, as JPEG.
    Re-encoding also drops EXIF metadata such as GPS location."""
    try:
        with Image.open(io.BytesIO(data)) as image:
            width, height = image.size
            if width * height > MAX_IMAGE_PIXELS:
                raise UnreadableFileError("This image's resolution is too high. Try a smaller photo.")
            # JPEGs can be decoded at a reduced scale directly, which is much cheaper for large photos.
            image.draft("RGB", (MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
            upright = ImageOps.exif_transpose(image).convert("RGB")
            upright.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
            out = io.BytesIO()
            upright.save(out, format="JPEG", quality=90)
            return out.getvalue()
    except UnreadableFileError:
        raise
    except Exception as exc:  # Untrusted input: any decoding failure means "unreadable".
        raise UnreadableFileError("This image couldn't be opened. Try another photo.") from exc


def pdf_text(data: bytes) -> str:
    """Extract the text of a text-based PDF (e-bills, invoices). Scanned PDFs have no text layer."""
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted and not reader.decrypt(""):
            raise UnreadableFileError("This PDF is password-protected. Upload an unprotected copy or a photo.")
        text = "\n".join((page.extract_text() or "") for page in reader.pages[:MAX_PDF_PAGES])
    except UnreadableFileError:
        raise
    except Exception as exc:  # Untrusted input: any parsing failure means "unreadable".
        raise UnreadableFileError("This PDF couldn't be read. Try a photo or screenshot of the bill.") from exc

    if len("".join(text.split())) < MIN_PDF_TEXT_CHARS:
        raise UnreadableFileError(
            "This PDF has no selectable text (it looks like a scan). Upload a photo or screenshot of the bill instead."
        )
    return text[:MAX_PDF_TEXT_CHARS]
