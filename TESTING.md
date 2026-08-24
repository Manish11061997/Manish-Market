# Testing Guide

## Backend unit/integration tests (pytest)

```bash
cd backend
pip install -r requirements.txt
python3 -m pytest tests/ -v
```

28 tests cover: order validation matrix, risk gates (lot size, oversell, no-position,
duplicate lock), portfolio reset validation, alert CRUD round-trip, auth gating on all
mutating endpoints, broker credential masking, audit-trail string coercion regression,
and the synthetic-data kill switch.

`CONTROL_TOKEN` is set to `test-token-123` automatically by `tests/conftest.py`.

## Frontend end-to-end tests (Playwright)

Requires the backend running (tests skip gracefully if it is not):

```bash
# terminal 1
cd backend
CONTROL_TOKEN=dev-token python3 -m uvicorn app:app --port 8000

# terminal 2
cd frontend
npm install                      # includes @playwright/test + playwright browsers
npx playwright install chromium  # one-time browser download
CONTROL_TOKEN=dev-token npm run test:e2e
```

34 tests across desktop (1440x900) and mobile (390x844) projects:
boot health, all 10 views render, search→modal→Escape flow, paper-order lot-size snap,
full order-fill with cash decrease, alerts modal, mobile drawer navigation, and a
zero-clipped-content check at 390px.

The Playwright config auto-starts the Vite dev server with `VITE_CONTROL_TOKEN` and
`VITE_API_BASE` derived from your environment (`CONTROL_TOKEN`, `BACKEND_URL`).

Tests run with `workers: 1` because desktop/mobile projects share one backend
portfolio; parallel workers race the paper-trading tests against each other.
For local E2E runs we recommend starting the backend with `RATE_LIMIT_REQUESTS=0`
(the suites poll aggressively).

## Environment variables

| Variable | Side | Purpose |
|---|---|---|
| `CONTROL_TOKEN` | backend | When set, all mutating endpoints require `X-Control-Token` header. Unset = dev fail-open. |
| `VITE_CONTROL_TOKEN` | frontend | Token attached to mutating requests; must match backend. |
| `VITE_API_BASE` | frontend | Backend URL (default `http://localhost:8000`). |
| `VITE_WS_BASE` | frontend | WebSocket URL (derived from API base if unset). |
| `ALLOW_SYNTHETIC_DATA` | backend | Set `false` to hard-disable fabricated market data/fundamentals. |
| `RATE_LIMIT_REQUESTS` | backend | Per-IP requests per 60s window (default 300). `0` disables — use for test runs. |

## CI

`.github/workflows/tests.yml` runs backend pytest and frontend build+lint on push.
Playwright runs are intentionally left out of CI (browser download flakiness in shared
runners); run them locally per instructions above.

## Auth model

Single shared token (`CONTROL_TOKEN` / `VITE_CONTROL_TOKEN`) gates all mutating HTTP
endpoints AND the WebSocket handshake (`?token=` query param; wrong/missing token is
rejected with HTTP 403 before any data flows). This is deliberate single-operator
design, not multi-user auth.

## Suggested CI workflow (already in .github/workflows/tests.yml)

- Job `backend`: Python 3.11 → install requirements → `pytest tests/ -v`
- Job `frontend`: Node 20 → `npm ci` → `npm run build` → `npx oxlint src`
