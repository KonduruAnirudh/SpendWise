# SpendWise frontend

React 19 + Vite 8 + Tailwind CSS 4 app for SpendWise. See the [root README](../README.md) for the full project: setup, architecture, API, and how the backend works.

## Develop

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

The backend must be running. In development, Vite proxies `/api/*` to `VITE_PROXY_TARGET` (default `http://localhost:8000`):

```
React → /api/v1/... → Vite proxy → FastAPI :8000
```

## Structure

- `src/pages/`: one folder per screen.
- `src/services/`: one module per API area. Each has an **adapter** (`toUiAccount`, `toUiTransaction`, …) that turns the API contract into the shapes the pages render, and turns form input into API requests.
- `src/services/api.js`: the only place that calls `fetch`. It adds the JWT, reads FastAPI's `{"detail": ...}` errors, and sends a stale session back to the login page on 401.
- `src/utils/splitCalculations.js`: live split preview using the backend's algorithm (integer paise, largest remainder). The server recomputes every split.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run lint` | Lint with oxlint |
| `npm run preview` | Preview the production build |

Demo login: run `python -m scripts.seed_demo` in `backend/`. It prints the login when it finishes.
