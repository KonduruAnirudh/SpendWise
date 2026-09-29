# SpendWise

Personal finance analytics and expense sharing. The frontend is a React + Vite app that sits in front of the [FastAPI + PostgreSQL API](../SpendWise-api).

**Understand your money. Spend it wisely.**

## Stack

- React 19, Vite 8, Tailwind CSS 4
- React Router 7
- Lucide icons, Recharts
- Mock services that swap to REST per feature without rewriting UI

## Demo login

```
Email: demo@spendwise.com
Password: SpendWise123
```

## Develop

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. In development, `/api/*` is proxied to
the API at `http://localhost:8080`, so the API must be running for any live
feature to work.

```
React → /api → Vite proxy (dev) → FastAPI :8080
```

## Live vs mocked features

The backend is arriving one feature at a time, so services opt in individually.
`VITE_LIVE_SERVICES` lists the ones that call the real API; everything else
keeps returning mock data while `VITE_USE_MOCK=true`.

```
VITE_LIVE_SERVICES=auth,categories
```

Live today: **auth** (login, signup, profile, password) and **categories**.
Transactions, accounts, analytics, groups, bills, and AI are still mocked.
Removing a name from the list reverts that feature to mocks, which makes this
the switch to reach for if the API is unavailable.

Do not set `VITE_USE_MOCK=false` yet: that forces *every* service live,
including the ones with no endpoints behind them.

## Scripts

| Command        | Purpose              |
| -------------- | -------------------- |
| `npm run dev`  | Local development    |
| `npm run build`| Production build     |
| `npm run preview` | Preview the build |

## Architecture

UI components call **services**, which use a shared **API client**. With mocks on, services return realistic in-memory data after a short delay so loading and empty states can be exercised.

Protected routes require a session in `localStorage`. For email/password login
that session now holds a real JWT from the API, which `api.js` sends as a
bearer token.

Auth0 sign-in is a separate path and does **not** yet produce an API token: it
stores the literal string `'auth0'` and persists no session, so requests to
live endpoints go out unauthenticated and fail. Use email/password login for
anything backed by the API.
