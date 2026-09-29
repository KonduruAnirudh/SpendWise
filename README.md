# SpendWise

**Personal finance tracking, Splitwise-style expense sharing, and an AI assistant that answers questions from your own data.**

A full-stack portfolio project: FastAPI + PostgreSQL on the backend, React on the frontend, and a local LLM (Ollama) for the assistant. The backend is covered by 110 automated tests, and CI runs them against a real PostgreSQL on every push.

---

## 1. Overview

### Features

| Area | What you can do |
|---|---|
| **Accounts** | Bank, savings, credit card, cash and wallet accounts. Balances are **derived** (opening balance + income − expenses), never stored. |
| **Transactions** | Add, edit, delete, search and filter. A transaction's type (income/expense) comes from its category, so it can't be inconsistent. |
| **Categories** | 11 system categories plus your own. System categories can't be deleted; custom names are unique per user (case-insensitive). |
| **Dashboard & analytics** | Monthly totals, month-over-month change, spending by category, 12-month trends, per-account spending, monthly reports. |
| **Expense sharing** | Groups with registered members (by email) and guests (by name). Seven split methods, per-member balances, the fewest payments to settle everything, and recorded settlements with undo. |
| **AI assistant** | Ask things like *"What were my biggest expenses this month?"*. The model answers by calling read-only tools over your data, and the UI shows which tools it used. |

### Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI[React pages] --> S[services/*Service.js<br/>adapters]
        S --> C[api.js<br/>JWT, errors]
    end
    C -- "/api/v1 (Vite proxy in dev)" --> R
    subgraph FastAPI
        R[Routers] --> D[Dependencies<br/>DB session, CurrentUser,<br/>GroupMembership]
        D --> SV[Services<br/>business rules, commit]
        SV --> RP[Repositories<br/>queries scoped by user/group]
        SV --> SE[Split engine &<br/>debt simplification]
        SV --> AI[AI chat service<br/>tool loop]
    end
    RP --> PG[(PostgreSQL 16)]
    AI -- "OpenAI-compatible API" --> OL[Ollama<br/>qwen3:8b]
    AI --> T[7 read-only tools] --> RP
```

A request, end to end:

```
Browser ─► api.js adds "Authorization: Bearer <JWT>"
        ─► Vite proxy (dev) ─► FastAPI router
        ─► CurrentUser dependency decodes the JWT and loads the user
        ─► service applies the business rules ─► repository runs a query filtered by user_id
        ─► Pydantic response schema (money as strings, e.g. "1500.00")
        ─► service adapter maps it to the shape the page renders
```

### Tech stack, and why

| Choice | Why |
|---|---|
| **FastAPI** | Type hints drive validation, serialization and OpenAPI docs; dependency injection makes auth and group membership reusable and testable. |
| **PostgreSQL** | Relational data with real constraints: foreign keys, `CHECK (amount > 0)`, unique indexes. `NUMERIC(12,2)` for money. |
| **SQLAlchemy 2.0 (sync)** | Typed ORM models with explicit queries in repositories. Sync keeps the code simple; the workload doesn't need async. |
| **Alembic** | Versioned, reviewed schema migrations. A test checks the migrations produce exactly the models' schema. |
| **Pydantic v2** | Request/response schemas separate from DB models, so the API contract can't leak internal fields. |
| **JWT (PyJWT) + Argon2 (pwdlib)** | Stateless auth; Argon2 is the current password-hashing recommendation. |
| **Ollama + OpenAI-compatible client** | A local model, no API keys or cost; one provider class means switching to a hosted model is a config change. |
| **React 19 + Vite 8 + Tailwind 4** | Fast dev loop; Recharts for charts. |

### Repository layout

```
backend/
  app/
    api/v1/routes/     HTTP layer: one module per resource
    core/              settings, security (JWT, hashing), dependencies, exceptions, dates
    models/            SQLAlchemy models
    schemas/           Pydantic request/response models
    repositories/      queries only, always scoped by user_id or group_id
    services/          business rules; services own db.commit()
      splitting/       pure split engine (integer paise, largest remainder)
      settlement_engine.py   pure greedy debt simplification
    ai/                LLM provider, tools, prompts, chat service
  migrations/          Alembic
  scripts/seed_demo.py demo data
  tests/               API tests, unit tests, migration test
frontend/
  src/
    pages/             one folder per screen
    services/          API calls + adapters (backend contract → UI shapes)
    utils/             split preview, palette, formatters, validators
.github/workflows/ci.yml
```

---

## 2. Setup

**Prerequisites:** Python 3.12, Node 20.19+ or 22.12+ (Vite 8's requirement; CI uses 24), Docker (the project was developed with [Colima](https://github.com/abiosoft/colima) on macOS), and [Ollama](https://ollama.com) for the AI assistant.

### Databases

```bash
cd backend
docker compose up -d --wait
```

| Service | Port | Database | Notes |
|---|---|---|---|
| `db` | **5434** | `spendwise` | development data, persisted in a volume |
| `db_test` | **5433** | `spendwise_test` | test database on tmpfs (RAM), recreated per test |

The non-default ports avoid clashing with a local PostgreSQL on 5432. On macOS with Colima, if Docker reports `docker.sock ... no such file`, run `colima start`.

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                      # then set SECRET_KEY (see below)
python -m alembic upgrade head
python -m scripts.seed_demo               # optional: demo user with six months of data
python -m uvicorn app.main:app --reload   # http://localhost:8000
```

Always run Python tools with `python -m ...` from `backend/`, so the virtualenv's Python 3.12 is used rather than any other Python on the machine.

### AI model

```bash
ollama pull qwen3:8b
```

Ollama serves an OpenAI-compatible API on `http://localhost:11434/v1`. The first answer after the model loads can take 20–60 seconds; later ones are much faster.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                               # http://localhost:5173
```

In development, Vite proxies `/api/*` to the backend, so the browser talks to one origin.

### Demo login

After `python -m scripts.seed_demo`: **demo@spendwise.com / SpendWise123**. The script also creates a second registered user (`priya.demo@spendwise.com`, same password), a "Goa Trip" group that uses all seven split methods, and a "Flatmates" group. Re-running it replaces only the demo users' data.

---

## 3. Environment variables

**backend/.env**

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://spendwise:spendwise@localhost:5434/spendwise` | development database |
| `TEST_DATABASE_URL` | `...@localhost:5433/spendwise_test` | test database; tests refuse to run unless the name ends in `_test` |
| `SECRET_KEY` | output of `python -c "import secrets; print(secrets.token_hex(32))"` | signs JWTs; at least 32 characters, enforced at startup (HS256 needs a 256-bit key) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | token lifetime |
| `LLM_BASE_URL` | `http://localhost:11434/v1` | any OpenAI-compatible endpoint |
| `LLM_API_KEY` | `ollama` | Ollama ignores it; hosted providers need a real key |
| `LLM_MODEL` | `qwen3:8b` | model name |
| `CORS_ORIGINS` | `http://localhost:5173` | comma-separated allowed origins |

Settings are loaded with pydantic-settings and validated at startup, so a missing variable fails immediately rather than at the first request.

**frontend/.env**

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE` | `/api/v1` | prefix for every API call |
| `VITE_PROXY_TARGET` | `http://localhost:8000` | where the Vite dev server proxies `/api` |

---

## 4. API

Interactive docs are generated from the code: **http://localhost:8000/docs** (Swagger UI) and **/redoc**. Everything is under `/api/v1`:

| Resource | Endpoints |
|---|---|
| Health | `GET /health` (503 if the database is down) |
| Auth | `POST /auth/register`, `POST /auth/login` (OAuth2 form: `username`, `password`) |
| Users | `GET /users/me`, `GET /users/me/group-balances` |
| Accounts | `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/{id}` |
| Categories | `GET /categories?type=`, `POST /categories`, `DELETE /categories/{id}` |
| Transactions | `GET /transactions` (filters + `limit`/`offset`), `POST`, `GET/PATCH/DELETE /transactions/{id}` |
| Dashboard | `GET /dashboard/summary?month=YYYY-MM`, `GET /dashboard/trends?months=&end_month=` |
| Groups | `GET/POST /groups`, `GET/DELETE /groups/{id}`, `GET/POST /groups/{id}/members`, `DELETE /groups/{id}/members/{member_id}` |
| Group expenses | `GET/POST /groups/{id}/expenses`, `GET/DELETE /groups/{id}/expenses/{expense_id}` |
| Balances & settlements | `GET /groups/{id}/balances`, `GET /groups/{id}/settlements/suggested`, `GET/POST /groups/{id}/settlements`, `DELETE /groups/{id}/settlements/{settlement_id}` |
| AI | `POST /ai/chat`, `GET /ai/conversations`, `GET /ai/conversations/{id}/messages`, `DELETE /ai/conversations/{id}` |

Conventions: money is sent and returned as **strings** (`"1500.00"`) so no precision is lost in JSON; errors are `{"detail": "..."}`.

---

## 5. How it works

### Authentication and authorization

- **Authentication** (who you are): `POST /auth/login` checks the Argon2 hash and returns a JWT (HS256, `sub` = user id, 60-minute expiry). The frontend stores it and sends it as a bearer token. On a 401, the client clears the session and returns to the login page.
- **Authorization** (what you can touch): the `CurrentUser` dependency resolves the user from the token, and **every repository query is filtered by `user_id`** (or by group membership). Another user's resource returns **404, not 403**, so the API doesn't even confirm it exists.
- Group routes use a `GroupMembership` dependency: you must be a member to see a group, and only the owner can remove members or delete the group.

### Money

`NUMERIC(12,2)` in PostgreSQL, `Decimal` in Python, strings in JSON. Splitting converts to **integer paise** so every share is exact.

### Expense splitting

Every method resolves to `{member_id: paise}` that sums **exactly** to the total; an invariant check enforces it.

| Method | Input per participant |
|---|---|
| equal | nothing |
| exact | an amount; must sum to the total |
| percentage | a percentage; must sum to 100 |
| shares | share units, each > 0 |
| adjustment | an extra (+/−) on top of an equal split of the remainder |
| reimbursement | exactly one participant, who owes the payer the full amount |
| itemized | items, each assigned to members and split equally among them |

Leftover paise go out by the **largest-remainder method**: floor every exact share, then give the remaining paise to the members with the biggest fractional remainders, with ties broken by member id. ₹1000.01 split three ways becomes 333.34 / 333.34 / 333.33, never 333.33 × 3 = 999.99.

The frontend runs the **same algorithm** for its live preview (verified identical to the backend on 3,000 random cases), but the server recomputes and validates every split. The client is never trusted with money.

### Balances and settling up

- Each member's **net** = paid − share + settlements sent − settlements received. Nets always sum to zero.
- **Suggested payments** are computed live, never stored: a greedy algorithm repeatedly matches the largest debtor with the largest creditor (two heaps), which gives at most *n − 1* payments.
- **Recorded settlements** are facts. Undoing one means deleting it, and the balances recompute.
- Splits and settlements reference `group_members.id`, not `users.id`. Guests are members without a user, and groups are isolated from each other by construction.

### AI assistant: tool calling, not RAG

The assistant does **not** receive your database or search documents. The model gets a system prompt (today's date, your currency, rules) and **7 read-only tools**: spending summary, category breakdown, monthly trend, largest expenses, transaction search, account balances, and group balances.

```
question ─► model decides which tool(s) to call ─► backend runs the tool for the logged-in user
        ─► results (JSON) go back to the model ─► model writes the answer
        ─► response includes tools_used, shown in the UI as "Checked: …"
```

- **Grounding:** the numbers come from the same SQL the dashboard uses. `tools_used` makes it visible when an answer used no data at all.
- **Guardrails:** the user id is injected server-side, never taken from the model, so the model can't read someone else's data. Tool arguments are validated with Pydantic. The tool loop is capped at 5 rounds. If the model server is down, the API returns 503 with a friendly message.
- **Why not RAG?** Financial questions need exact aggregates ("how much this month?"). SQL computes those correctly; retrieving text chunks would make the model do arithmetic it can get wrong.
- **Provider abstraction:** an `LLMProvider` protocol with one OpenAI-compatible implementation; tests swap in a scripted fake.

### Frontend integration

The frontend started as a mock-driven UI. It was connected one feature at a time, with each service switching from mock to live behind a flag, and the mocks were deleted once everything was live. Each service has an **adapter** (`toUiAccount`, `toUiTransaction`, …) that translates the API contract into the shapes the pages render, so the backend's naming never leaks into the components.

---

## 6. Testing

```bash
cd backend && python -m pytest        # 110 tests, ~20 s
cd frontend && npm run lint && npm run build
```

- **API tests** go through FastAPI's `TestClient` against the real PostgreSQL test database: auth, ownership (404 for other users' data), validation, business-rule errors (403/409/400), and the happy paths of each resource.
- **Unit tests** cover the pure split engine and the debt-simplification algorithm.
- **Fake LLM:** AI tests replace the provider with a scripted one via `app.dependency_overrides`, so they're deterministic and need no model.
- **Migration test:** builds the schema with `alembic upgrade head`, compares it to the models with `compare_metadata`, then downgrades to base. It exists because the AI tables once had models but no migration: every API test passed, since tests create tables directly from the models, while the real database was missing them.
- **Seed test:** runs the demo seed twice and checks that it's repeatable, leaves other users alone, and that balances net to zero.
- **CI** (GitHub Actions) runs the backend suite against a PostgreSQL 16 service container, and the frontend lint and build, on every push to `main` and every pull request.

---

## 7. Git workflow

- One branch per phase (`feat/...`), small commits in [Conventional Commits](https://www.conventionalcommits.org/) style (`feat:`, `fix:`, `refactor(frontend):`, …).
- Before every commit: backend tests pass, the frontend builds, and no `.env` file is staged.
- Phases are fast-forward merged into `main`, so history stays linear and each commit tells one step of the story.
- Migrations are reviewed before committing, and an applied migration is never edited; a new one is written instead.

---

## 8. MVP vs production

This is an MVP: correct, tested, and honest about what it doesn't do. Unsupported features are labelled "Coming soon" in the UI rather than faked.

**What production would add**

| Area | Improvement |
|---|---|
| Auth | Short-lived access tokens + httpOnly refresh cookie (instead of `localStorage`), password reset by email, profile editing, rate limiting on login |
| Data | Multi-currency with exchange rates; category editing and sub-categories; CSV/PDF statement import |
| API | A `GET /groups` summary that returns member counts and totals (the UI currently loads each group: N+1 requests); server-side pagination in the transactions UI; `spending_by_account` in the dashboard summary (currently grouped client-side for one chart) |
| AI | Streaming responses; an evaluation set of questions with expected tool calls and answers; caching of repeated questions |
| Operations | Deployment (e.g. containers on ECS or App Runner with RDS PostgreSQL), managed secrets, structured logging and metrics, backups |

**Bill upload (designed, deferred).** Upload a receipt image/PDF → validate type and size → a vision model (for example `qwen2.5vl:7b` via Ollama) extracts `{merchant, date, items[{name, amount}], total}` → the result is returned as a **draft, not saved** → the user reviews and edits it → it's posted as an `itemized` group expense. Keeping a human in the loop matters because OCR makes mistakes. Production would add object storage (S3), virus scanning, size limits, and handling for bad scans.
