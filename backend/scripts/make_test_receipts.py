"""Render synthetic receipts with known answers, for scripts/eval_bills.py.

Run from backend/:  python -m scripts.make_test_receipts OUTPUT_DIR

Writes three JPEGs (a clean restaurant bill, a clean grocery bill, and a tilted, blurred, noisy
"photo" of the restaurant bill) plus truth.json. Synthetic receipts catch regressions cheaply;
they are no substitute for real photos, which stay out of the repository.
"""

import json
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

MONOSPACE_FONTS = [
    "/System/Library/Fonts/Menlo.ttc",  # macOS
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",  # Debian/Ubuntu
]


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in MONOSPACE_FONTS:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def render(lines: list[tuple[str, str]], width: int = 720) -> Image.Image:
    regular, bold = font(26), font(32)
    image = Image.new("RGB", (width, 60 + 38 * len(lines)), (250, 248, 240))
    draw = ImageDraw.Draw(image)
    y = 30
    for text, style in lines:
        face = bold if style == "b" else regular
        x = (width - draw.textlength(text, font=face)) / 2 if style in ("c", "b") else 24
        draw.text((x, y), text, fill=(30, 30, 30), font=face)
        y += 38
    return image


def row(name: str, amount: str, width: int = 40) -> tuple[str, str]:
    return (name + amount.rjust(width - len(name)), "l")


def photo_like(image: Image.Image, seed: int = 1) -> Image.Image:
    """Tilt, blur and add sensor-like noise, roughly like a handheld phone photo."""
    rng = random.Random(seed)
    image = image.rotate(3.5, expand=True, fillcolor=(90, 85, 80), resample=Image.BICUBIC)
    image = image.filter(ImageFilter.GaussianBlur(0.9))
    pixels = image.load()
    for _ in range(image.size[0] * image.size[1] // 40):
        x, y = rng.randrange(image.size[0]), rng.randrange(image.size[1])
        shift = rng.randrange(-40, 40)
        pixels[x, y] = tuple(max(0, min(255, channel + shift)) for channel in pixels[x, y])
    return image


RESTAURANT = [
    ("CAFE MADRAS", "b"), ("12 MG Road, Bengaluru", "c"), ("GSTIN 29ABCDE1234F1Z5", "c"),
    ("Bill 1042      28/09/2026 20:14", "l"), ("-" * 40, "l"),
    row("Masala Dosa x2", "240.00"), row("Filter Coffee x3", "135.00"), row("Paneer Butter Masala", "280.00"),
    row("Butter Naan x4", "220.00"), row("Sweet Lassi x2", "180.00"), ("-" * 40, "l"),
    row("Subtotal", "1055.00"), row("CGST 2.5%", "26.38"), row("SGST 2.5%", "26.38"),
    row("Service Charge 5%", "52.75"), row("Round off", "-0.51"), ("-" * 40, "l"),
    row("TOTAL  Rs.", "1160.00"), ("Thank you! Visit again", "c"),
]
RESTAURANT_TRUTH = {
    "merchant": "CAFE MADRAS", "bill_date": "2026-09-28",
    "items": [240.00, 135.00, 280.00, 220.00, 180.00], "tax": 52.76, "tip": 52.75, "total": 1160.00,
}
GROCERY = [
    ("FRESHMART SUPERMARKET", "b"), ("Koramangala, Bengaluru", "c"), ("Inv 88213   05-09-2026", "l"), ("-" * 40, "l"),
    row("Amul Milk 1L x2", "132.00"), row("Brown Bread", "55.00"), row("Eggs (12)", "96.00"),
    row("Tomato 1kg", "48.00"), row("Onion 2kg", "90.00"), row("Basmati Rice 5kg", "649.00"),
    row("Toor Dal 1kg", "168.00"), row("Sunflower Oil 1L", "155.00"), row("Bananas 1 doz", "60.00"),
    row("Dish Soap", "99.00"), ("-" * 40, "l"), row("Total Items: 10", ""), row("GRAND TOTAL", "1552.00"),
    ("GST included in prices", "c"),
]
GROCERY_TRUTH = {
    "merchant": "FRESHMART SUPERMARKET", "bill_date": "2026-09-05",
    "items": [132.00, 55.00, 96.00, 48.00, 90.00, 649.00, 168.00, 155.00, 60.00, 99.00],
    "tax": 0.0, "tip": 0.0, "total": 1552.00,
}


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "test_receipts")
    out.mkdir(parents=True, exist_ok=True)
    cases = {
        "restaurant_clean": (render(RESTAURANT), RESTAURANT_TRUTH, 92),
        "grocery_clean": (render(GROCERY), GROCERY_TRUTH, 92),
        "restaurant_photo": (photo_like(render(RESTAURANT)), RESTAURANT_TRUTH, 70),
    }
    for name, (image, _, quality) in cases.items():
        image.save(out / f"{name}.jpg", quality=quality)
    (out / "truth.json").write_text(json.dumps({name: truth for name, (_, truth, _) in cases.items()}, indent=1))
    print(f"Wrote {len(cases)} receipts and truth.json to {out}/")


if __name__ == "__main__":
    main()
