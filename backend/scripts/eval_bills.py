"""Score the bill reader field by field on receipts with known answers.

Run from backend/ with Ollama running:
    python -m scripts.eval_bills RECEIPT_DIR [--model qwen3-vl:8b-instruct] [case ...]

RECEIPT_DIR holds <case>.jpg (or .png/.webp/.pdf) files and a truth.json like:
    {"case": {"merchant": "...", "bill_date": "YYYY-MM-DD", "items": [120.0, ...],
              "tax": 25.0, "tip": 0.0, "total": 525.0}}

Each bill scores one point per expected item amount found, plus merchant, date, tax, tip, total and
"no extra items". It runs the real pipeline (file checks, image preparation, prompt, validation), so
it measures what users get. Re-run it whenever the prompt or model changes: an evaluation set is
to a prompt what unit tests are to code.
"""

import argparse
import json
import time
from pathlib import Path

from app.ai.providers.openai_compatible import OpenAICompatibleProvider
from app.core.config import settings
from app.services.bills import parse_bill

EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".pdf")


def find_file(folder: Path, case: str) -> Path:
    for extension in EXTENSIONS:
        if (folder / f"{case}{extension}").exists():
            return folder / f"{case}{extension}"
    raise FileNotFoundError(f"No file for {case} in {folder}")


def score(draft, expected: dict) -> tuple[int, int, list[str]]:
    got_items = sorted(float(item.amount) for item in draft.items)
    want_items = sorted(expected["items"])
    item_hits = sum(1 for amount in want_items if amount in got_items)
    checks = {
        "merchant": (draft.merchant or "").strip().upper() == expected["merchant"].upper(),
        "date": str(draft.bill_date) == expected["bill_date"],
        "tax": float(draft.tax) == expected["tax"],
        "tip": float(draft.tip) == expected["tip"],
        "total": draft.total is not None and float(draft.total) == expected["total"],
        "no extra items": len(got_items) == len(want_items),
    }
    missed = [name for name, ok in checks.items() if not ok]
    missed += [f"item {amount:.2f}" for amount in want_items if amount not in got_items]
    return sum(checks.values()) + item_hits, len(checks) + len(want_items), missed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("folder", type=Path)
    parser.add_argument("cases", nargs="*")
    parser.add_argument("--model", default=settings.llm_vision_model)
    args = parser.parse_args()

    truth = json.loads((args.folder / "truth.json").read_text())
    provider = OpenAICompatibleProvider(
        settings.llm_base_url, settings.llm_api_key, settings.llm_model, vision_model=args.model, timeout=600
    )
    correct_total = fields_total = 0
    seconds_total = 0.0
    for case in args.cases or list(truth):
        data = find_file(args.folder, case).read_bytes()
        start = time.time()
        draft = parse_bill(provider, data, "INR")
        seconds = time.time() - start
        correct, fields, missed = score(draft, truth[case])
        correct_total, fields_total, seconds_total = correct_total + correct, fields_total + fields, seconds_total + seconds
        print(f"{case:20} {correct:2}/{fields:<2} {seconds:6.1f}s  missed: {', '.join(missed) or '-'}")
        if missed:
            print(f"{'':20} got tax={draft.tax} tip={draft.tip} total={draft.total} date={draft.bill_date} "
                  f"merchant={draft.merchant!r}")
    count = len(args.cases or truth)
    print(f"== {args.model}: {correct_total}/{fields_total} fields "
          f"({100 * correct_total / max(fields_total, 1):.0f}%), {seconds_total / max(count, 1):.1f}s per bill")


if __name__ == "__main__":
    main()
