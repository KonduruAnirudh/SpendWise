# Design decisions

Short records of the decisions that shape SpendWise: what was decided, why, what else was considered, and what it costs. They're listed roughly in the order the project was built. See the [README](../README.md) for how everything fits together.

---

## 1. Money is `Decimal` in Python, `NUMERIC(12,2)` in the database, and a string in JSON

**Context.** Binary floating point can't represent most decimal fractions (`0.1 + 0.2 != 0.3`), and a JSON number becomes a float in JavaScript.

**Decision.** Store `NUMERIC(12,2)`, compute with `Decimal`, serialize as strings (`"1500.00"`). The frontend uses `Number()` only for display and sends amounts back as strings; the server recomputes anything that matters.

**Consequences.** Exact money everywhere that is saved. Slightly more ceremony in the frontend (adapters convert at the edge).

## 2. Every query is scoped to the user; other users' data returns 404

**Context.** The classic bug is authenticating a user and then forgetting to check that the requested row is theirs.

**Decision.** Repositories only offer queries filtered by `user_id` (or by group membership). A resource that exists but belongs to someone else returns **404, not 403**, so the API never confirms it exists.

**Alternatives.** Checking ownership in each route (easy to forget); 403 for foreign resources (leaks existence).

## 3. Balances are derived, never stored

**Decision.** An account's balance is `opening_balance + income - expenses`, computed in one `GROUP BY`. A group member's net is `paid - share + settlements sent - settlements received`. Suggested settlements are computed on request.

**Why.** Stored totals drift from the rows they summarize. Derived values are always consistent, and "undo" is just deleting a fact (an expense or a recorded settlement).

**Cost.** More computation per read; fine at this scale, and cacheable later.

## 4. Splits reference group members, not users

**Decision.** Expenses, splits and settlements point at `group_members.id`. A member is either a registered user (added by email) or a guest (just a name, `user_id` NULL).

**Why.** Guests become possible, and groups are isolated by construction: a member of one group can't appear in another's expenses.

**Consequence.** The frontend must compare against `my_member_id`, not the user's id; mixing the two ID spaces was a real bug caught during integration.

## 5. Splitting in integer paise with largest-remainder rounding

**Decision.** All seven split methods produce `{member_id: paise}` that sums exactly to the total (an invariant is checked). Leftover paise go to the largest fractional remainders, ties broken by member id. Methods are small strategy functions in a registry.

**Why.** Rounding each share independently loses or invents paise (₹1000.01 / 3 → 333.33 × 3). Largest remainder is exact and fair.

**Frontend.** The live preview is a port of the same algorithm, verified identical to the backend on 3,000 random cases. The server still recomputes every split.

## 6. The AI assistant uses tool calling, not RAG or a database dump

**Decision.** The model gets seven read-only tools (spending summary, category breakdown, trends, largest expenses, search, account balances, group balances). The backend runs them for the authenticated user; the model only phrases the answer. `tools_used` is returned and shown in the UI.

**Why.** Finance questions need exact aggregates, which SQL computes and models don't. The user id is injected server-side, so no prompt can make the model read another user's data.

**Alternatives.** RAG over transaction text (the model would add up numbers); sending the data in the prompt (doesn't scale, leaks data).

## 7. The frontend was integrated through adapters, then the mocks were deleted

**Context.** The frontend started as a mock-driven UI with its own data shapes.

**Decision.** Each service gained an adapter (`toUiAccount`, `toUiTransaction`, …) and a per-feature mock/live switch, so features went live one at a time. Once everything was live, the mocks were deleted rather than kept.

**Why delete them?** They had drifted from the real data shapes, so keeping them would have left a second, broken code path.

## 8. A test compares the migrations with the models

**Context.** API tests build tables with `Base.metadata.create_all`, which bypasses migrations. The AI tables once had models but no migration: every test passed while the real database was missing them.

**Decision.** `tests/test_migrations.py` builds the schema with `alembic upgrade head`, diffs it against the models (`compare_metadata`), and downgrades to base.

## 9. Bill upload returns a draft; a person confirms every line

**Decision.** `POST /groups/{id}/bills/parse` returns an editable `BillDraft` and saves nothing. The draft pre-fills an itemized expense; the user checks amounts, assigns lines to members and saves through the ordinary expense endpoint, where the server validates and recomputes the split as usual.

**Why.** Vision models make confident mistakes. The draft saves most of the typing; the review catches the rest, and nothing unverified reaches the ledger.

**Alternative rejected.** Auto-saving the model's reading as an expense.

## 10. Uploaded files are checked by content, kept in memory, and normalized

**Decision.**
- **Type from magic bytes** (JPEG, PNG, WebP, PDF), never from the file name or `Content-Type`; anything else is 415. A real test receipt was a PNG named `.jpg`, which is handled correctly.
- **5 MB limit** (413). Starlette's multipart spool limit (1 MB, above which uploads go to a temp file on disk) is raised above it, so uploads stay in memory and are never written to disk.
- **Photos are normalized:** straightened using EXIF, downscaled to 2000 px, re-encoded as JPEG (which also strips GPS metadata).
- **Text PDFs** go through `pypdf` to the text model; scanned PDFs get a clear 400 ("upload a photo instead").

**Production gap.** A reverse-proxy body limit should reject oversized uploads before the app buffers them.

## 11. The model's output is untrusted input; the model copies, the server adds

**Decision.** The prompt asks for JSON only. The reply is parsed leniently (code fences, `"Rs 1,234.50"`) and validated strictly into `BillDraft` (2-dp `Decimal`, items > 0). Unusable lines are dropped with a warning; invalid JSON is retried once, then 502; an unreachable model is 503. The model lists each tax and service-charge line as printed, and the server sums them.

**Why.** Two measured failures shaped this:
- Asked for the tax total, the model computed "5% of the subtotal" (52.75) instead of adding the printed CGST + SGST lines (52.76).
- A parser that stripped non-digits would turn `"2 x 150"` into 2150. Now an amount must contain exactly one number, or it's rejected with a warning: a rejected value is better than a wrong one that looks right.

## 12. Reconciliation warns, it never rejects

**Decision.** If items + tax + tip differ from the printed total by more than ₹1, the draft carries a warning. Differences within ₹1 are round-off; in the form they're folded into the single assignable "Tax & service" line, so the saved expense equals what was actually paid.

**Why.** Bills have round-offs, discounts and misprints. Rejecting would block the user; warning puts the decision with the person who has the receipt in hand.

## 13. Vision model: `qwen3-vl:8b-instruct`, chosen by measurement

**Method.** `scripts/eval_bills.py` scores the real pipeline field by field (merchant, date, each item, tax, tip, total) on receipts with known answers. `scripts/make_test_receipts.py` renders synthetic ones; real photos are evaluated the same way but kept out of the repository.

| Model (Ollama, M3 Pro, 18 GB) | Synthetic (38 fields) | Time per bill |
|---|---|---|
| `qwen3-vl:8b` (thinking by default) | 38/38 | ~78 s |
| `qwen3.5:9b` (thinking by default) | 38/38 | ~131 s |
| `qwen3-vl:8b-instruct` | 38/38 | ~18 s |

On two real photos (a crumpled 2015 restaurant bill and a CC0 photo of a 2026 bill) the instruct model scored 23/25, then 25/25 after the prompt stated that "Service Tax" is a government tax. Thinking couldn't be disabled through the OpenAI-compatible API, which ruled out the thinking variants on speed alone.

**Caveat.** The sample is small, and the prompt fix was made after seeing that receipt fail. Accuracy on real, badly lit bills will be lower, which is why decision 9 matters more than any score.

## 14. No credentials in the repository

**Decision.** The demo users use the reserved `example.com` domain (RFC 2606). The seed script reads `DEMO_PASSWORD` or generates a random one and prints it. Nothing in the frontend bundle or the docs contains a password.

**Context.** An earlier version shipped a demo password in the frontend constants and the READMEs, and a secret scanner flagged it.
