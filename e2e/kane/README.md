# KaneAI / TestMu AI for Orivraa

Kane CLI (`kane-cli`) is an optional **visual / UX** layer on top of our existing
Playwright + API pipeline tests. It is **not** the source of truth for money,
tax, or stock.

## What stays the source of truth

| Layer                  | Command                                                      | Covers                                              |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| API money/tax/stock    | `cd apps/api && npx jest --testPathPattern=invoices.service` | Invoice tax aliases, payments, Sri Lanka compliance |
| API health + auth GETs | `cd e2e && node scripts/api-core-pipeline.mjs`               | Live production endpoints (read)                    |
| Playwright             | `cd e2e && npx playwright test`                              | Page-load smoke with `e2e/.auth/seller.json`        |

Kane does not replace those. Use it to click through hardware settings, invoice
Print, and dashboard chrome the way a seller would.

## Safety

Do **not** ask Kane to create invoices, checkout POS, record payments, or void
bills against https://www.orivraa.com. Those mutate live shop data.

Public suite: login / download / marketing pages only.
Seller suite: read-only UI checks. Requires a Chrome profile already logged in,
or a local/staging URL.

Cloudflare Turnstile blocks headless login on production. Use
`e2e/scripts/api-login.mjs` for API tests. For Kane seller checks, log in once
in a real Chrome profile (`kane-cli` can reuse `--cdp-endpoint`).

## Setup (once)

```bash
npm install -g @testmuai/kane-cli
kane-cli auth
```

Do not commit TestMu tokens. Store them in the Kane CLI profile on the machine
or as `TESTMU_ACCESS_KEY` in the environment (gitignored `.env`).

Docs: https://www.testmuai.com/support/docs/kane-cli-introduction/

## Run

From `e2e/`:

```bash
npm run kane:public
npm run kane:seller
```

Or from the repo root:

```bash
node e2e/kane/run.mjs --suite public
node e2e/kane/run.mjs --suite seller
```

Environment:

| Variable        | Default                   | Purpose                                                            |
| --------------- | ------------------------- | ------------------------------------------------------------------ |
| `KANE_BASE_URL` | `https://www.orivraa.com` | Site under test. Prefer `http://localhost:3000` for seller writes. |
| `KANE_TIMEOUT`  | `180`                     | Seconds                                                            |
| `KANE_HEADED`   | unset                     | Set to `1` to show the browser                                     |

CI: keep Kane **off** the deploy-guard workflow. Missing CLI exits `2` so a
local optional run is obvious and production deploys are not blocked.
