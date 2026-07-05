# AGENTS.md — Orivraa Gold Shop App

> Project rules and conventions for AI agents working on this codebase.

## Project Structure

- **Turborepo monorepo** with three main packages:
  - `apps/api` — NestJS backend (TypeScript, Prisma, PostgreSQL)
  - `apps/web` — Next.js 14 frontend (App Router, TypeScript, Tailwind)
  - `apps/desktop` — Tauri desktop app (wraps the web app, auto-updates via GitHub Releases + R2 fallback)
  - `packages/shared` — Shared TypeScript package (`@gold-shop/shared`): enums, types, weight conversion, location data
- **Cloudflare Workers** — `cloudflare-worker/` (images/videos) and `cloudflare-worker/releases-worker/` (desktop installer downloads via R2)
- **Database:** PostgreSQL with Prisma ORM. Seeds at `apps/api/prisma/seeds/`

## Private Submodule (gold-shop-core)

Proprietary business logic lives in a private Git submodule at `apps/api/src/modules/core/`.
The submodule repo is `https://github.com/aakash-priyadarshi/gold-shop-core` (private).

### Modules in the submodule (14)

`subscriptions`, `payment-gateway`, `ai-credits`, `pricing`, `market-rates`, `shop-quotes`,
`pos`, `rfq`, `offers`, `commission`, `refunds`, `seller-performance`,
`marketplace-intelligence`, `tax-reports`

### Import path conventions

- **From public repo → core module:** `../core/subscriptions/...` (one level deeper than before)
- **app.module.ts:** `./modules/core/subscriptions/subscription-plans.module`
- **Within core (core→core):** `../subscriptions/...` (siblings, unchanged)
- **Within core (core→app module):** `../../auth/...` (two levels up to reach `modules/`)
- **Within core (core→infra):** `../../../prisma/...` (three levels up to reach `src/`)

### Cloning the repo with the submodule

```bash
# Clone with submodule (requires access to the private repo)
git clone --recurse-submodules <repo-url>

# If already cloned, initialize the submodule
git submodule update --init --recursive
```

### CI authentication

CI workflows use `SUBMODULE_PAT` (GitHub PAT with `Contents: Read` on `gold-shop-core`)
to checkout the private submodule. All `actions/checkout` steps in build/test/deploy jobs
include `submodules: recursive` and `token: ${{ secrets.SUBMODULE_PAT }}`.

### Updating the submodule pointer

When the core repo changes and you want the public repo to track the new commit:

```bash
cd apps/api/src/modules/core
git pull origin master
cd ../../../../..   # back to repo root
git add apps/api/src/modules/core
git commit -m "chore: update gold-shop-core submodule"
```

## Build & Test Commands

```bash
# Install dependencies (pnpm workspaces)
pnpm install

# Build all packages
pnpm build

# ─── Tests ───
# Run ALL tests (shared + web + API)
pnpm test:all

# Run shared package tests (vitest)
pnpm test:shared
cd packages/shared && npx vitest run

# Run frontend tests (vitest)
pnpm test:web
cd apps/web && npx vitest run

# Run API tests (jest)
pnpm test:api
cd apps/api && npx jest --no-coverage

# Run specific API test
cd apps/api && npx jest --testPathPattern="backend-tax-engine" --no-coverage

# Run specific frontend test
cd apps/web && npx vitest run src/lib/tax/__tests__/engine.test.ts

# Run frontend tests in watch mode
cd apps/web && npx vitest

# Run frontend tests with coverage
cd apps/web && npx vitest run --coverage

# ─── Typecheck ───
# Typecheck frontend
cd apps/web && npx tsc --noEmit

# Typecheck API
cd apps/api && npx tsc --noEmit

# ─── Dev servers ───
# Run frontend dev server
cd apps/web && npm run dev

# Run API dev server
cd apps/api && npm run start:dev
```

> **Note:** On Windows, use `npx.cmd` instead of `npx` if PowerShell execution policy blocks scripts.

## Test Infrastructure

### Test Runners

- **`apps/api`** — Jest 29 with ts-jest (config in `package.json` `jest` field)
- **`apps/web`** — Vitest 2 with jsdom + @testing-library/react (config: `vitest.config.ts`)
- **`packages/shared`** — Vitest 2 (config: `vitest.config.ts`, aliases to compiled `dist/`)
- **`e2e/`** — Playwright (separate package, `pnpm e2e`)

### Test File Locations

- **API:** `apps/api/src/**/*.spec.ts` (14 suites, 302 tests)
- **Web:** `apps/web/src/**/*.test.{ts,tsx}` (4 suites, 74 tests)
- **Shared:** `packages/shared/src/**/*.test.ts` (1 suite, 63 tests)
- **Total: 439 tests across 19 test files**

### Known Limitations

- `apps/web/src/lib/pricing/calculate-estimate.integration.test.ts` is excluded from vitest
  because `calculate-estimate.ts` uses TypeScript `type` modifiers in import specifiers which
  rollup's SSR transform can't parse. To test it, build the web app first or use jest with ts-jest.
- The `@gold-shop/shared` package is aliased to its compiled `dist/` in vitest configs to
  avoid the same rollup TS parsing issue. Run `pnpm build` in `packages/shared` after
  modifying shared code before running tests.
- API jest config uses `workerIdleMemoryLimit: "1GB"` and `maxWorkers: "50%"` to prevent
  OOM on the large `shops.service.matching.spec.ts` (1162 lines, 51 tests).

### Adding New Tests

- **API:** Create `*.spec.ts` files next to the source file. Use NestJS `Test.createTestingModule`.
- **Web:** Create `*.test.ts` or `*.test.tsx` files in `__tests__/` subdirectories or next to source.
  Use `@testing-library/react` for component tests. Wrap user-facing strings assertions with `<T>`.
- **Shared:** Create `*.test.ts` files next to source. Import from `../utils/...` (compiled dist).
- **When adding tax tests:** Update both `apps/api/src/modules/core/pricing/services/backend-tax-engine.service.spec.ts`
  AND `apps/web/src/lib/tax/__tests__/engine.test.ts` to keep frontend and backend in sync.

## Tax Engine

- **Backend tax engine:** `apps/api/src/modules/core/pricing/services/backend-tax-engine.service.ts`
- **Frontend fallback tax engine:** `apps/web/src/lib/tax/engine.ts`
- **Tax rules service:** `apps/api/src/modules/core/pricing/services/tax-rules.service.ts`
- **Tax rule sync (Gemini-powered):** `apps/api/src/modules/core/pricing/services/tax-rule-sync.service.ts`
- **Tests:** `apps/api/src/modules/core/pricing/services/backend-tax-engine.service.spec.ts`

### Current Tax Regimes (as of FY 2083/84 — 2026/27)

| Region | Regime            | Rules                                                                                                                                                                            |
| ------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NP     | `NP_2083_84_PLUS` | 0.5% Skill Promotion Fee on jewellery sale value (metal + making + finish) + 13% VAT on gemstones/diamonds. **2% Luxury Tax ABOLISHED.** Customs duty 20% (embedded in premium). |
| IN     | `IN_GST_2024`     | 3% GST on metal, 5% GST on making charges                                                                                                                                        |
| AE     | `AE_VAT_2024`     | 5% VAT on all components (investment gold 0%)                                                                                                                                    |
| UK     | `UK_VAT_2024`     | 20% VAT (investment gold exempt)                                                                                                                                                 |
| EU     | `EU_VAT_2024`     | 20% VAT (varies 19-21% by country)                                                                                                                                               |
| US     | `US_SALES_TAX`    | 0% federal (state-based)                                                                                                                                                         |

**IMPORTANT:** When changing tax rates, update ALL of these files:

1. `backend-tax-engine.service.ts` — the engine + `NEPAL_TAX_CONFIG` (or equivalent)
2. `tax-rules.service.ts` — fallback rates
3. `tax-rule-sync.service.ts` — trusted sources + Gemini prompt
4. `seed.ts` — seed data
5. `apps/web/src/lib/tax/engine.ts` — frontend fallback
6. `apps/web/src/lib/tax/secure-tax-client.ts` — type definitions + regime names
7. `apps/web/src/app/dashboard/shop/invoices/create/page.tsx` — invoice page fallback
8. `backend-tax-engine.service.spec.ts` — tests
9. `apps/web/src/lib/tax/__tests__/engine.test.ts` — frontend tests
10. `apps/web/src/components/admin/AdminTaxRulesPanel.tsx` — admin dropdown

## Weight Units

- **Shared utility:** `packages/shared/src/utils/weight-conversion.ts`
- All weights are stored internally in **grams**. Display conversions happen at the UI layer.
- Supported units: GRAM, KILOGRAM, TOLA (11.6638g), LAAL (0.1166g), OUNCE (troy, 31.1035g), POUND
- Market defaults: NP→TOLA, IN→GRAM, US→OUNCE, UK/EU/AE→GRAM
- Use `toGrams(value, unit)` and `fromGrams(grams, unit)` from `@gold-shop/shared`
- Use `getSupportedWeightUnits(countryCode)` to get valid units for a market

## Internationalization (i18n)

- **Backend:** Gemini 2.5 Flash translation API at `apps/api/src/modules/i18n/`
- **Frontend provider:** `apps/web/src/providers/translation-provider.tsx`
- **Translation component:** `<T>English text</T>` from `@/components/ui/T` — wraps text for auto-translation
- **Hook:** `useT()` from `@/providers/translation-provider` — for dynamic strings
- **Locale files:** `apps/api/src/modules/i18n/locales/{en,ne,hi,ar,fr,de,es}.json`
- **NEVER** hardcode user-facing English strings in pages. Always wrap with `<T>` or use `t()`.
- Translations are batched, cached in Redis + localStorage, and debounced (150ms).
- The `t()` function returns English on first render and queues async translation. Translations appear after the batch flush completes.

## Tutorial / Tooltip System

- **Tour steps:** `apps/web/src/components/tutorial/useTutorial.ts` — `TOUR_STEPS` object keyed by pathname
- **Tutorial button:** `apps/web/src/components/tutorial/TutorialButton.tsx` — uses `driver.js`
- Tour step titles and descriptions are pre-registered for translation on mount via `useTranslation().register()`.
- The `useTutorial` hook calls `t()` on step titles/descriptions in a `useMemo`.
- Tour anchors use `data-tour='element-id'` attributes on DOM elements.

## Invoice Feature

- **Create page:** `apps/web/src/app/dashboard/shop/invoices/create/page.tsx`
- **Backend module:** `apps/api/src/modules/invoices/`
- Supports: line items with metal/gemstone/making breakdown, tax per category, discounts, currency converter, live market rates with autofill, weight unit selector (tola/gram/etc.), weighing scale integration, quote import.
- Invoice country can differ from shop country (for export invoices).

## Walk-in Customer / Quote Feature

- **Create page:** `apps/web/src/app/dashboard/shop/quotes/create/page.tsx`
- **Mobile:** `apps/web/src/app/m/quotes/page.tsx`
- **Backend:** `apps/api/src/modules/core/shop-quotes/`
- Quotes can be converted to invoices. Supports customer lookup by phone, AI design preview, weight unit selector.

## Mobile App

- All mobile routes are under `/m/` (e.g., `/m/pos`, `/m/quotes`, `/m/customers`)
- Mobile is a web app optimized for mobile, NOT a separate native app
- Uses `useMarket()` hook for weight unit + currency
- Mobile POS: `apps/web/src/app/m/pos/page.tsx` — supports add-product form with tola unit selector

## AI Chatbot

- **Service:** `apps/api/src/modules/support/ai-chatbot.service.ts`
- Uses Google Gemini 2.5 Flash with RAG knowledge base
- **Knowledge base seeds:** `apps/api/prisma/seeds/knowledge-chunks.ts`
- Has role-specific prompts and tools (tax lookup, invoice help, product search)
- When adding new features, add knowledge chunks to `knowledge-chunks.ts` so the chatbot can answer questions about them.

## Cloudflare

- **Images Worker:** `cloudflare-worker/` — handles image/video uploads to R2 (`orivraa-images`, `orivraa-demos` buckets)
- **Releases Worker:** `cloudflare-worker/releases-worker/` — serves desktop installers from R2 (`orivraa-releases` bucket) over `releases.orivraa.com`
- **Download page:** `apps/web/src/app/download/page.tsx` — fetches from `/api/releases/latest`, download URLs point to `releases.orivraa.com` (R2 primary) with GitHub mirror link
- Use the Cloudflare MCP server for DNS, Workers, and route management.

## Desktop Release Pipeline

The desktop app build and release process is fully automated via GitHub Actions (`.github/workflows/desktop-build.yml`).

### Trigger

- Push a tag `desktop-v{version}` (e.g., `desktop-v0.2.0`) → builds Windows + macOS
- Manual dispatch via GitHub UI (can target single platform)

### Pipeline (per platform)

1. **Build frontend** — Next.js static export with `TAURI_BUILD=1` → `apps/desktop/dist-desktop/`
2. **Build Tauri app** — `tauri-apps/tauri-action@v0` with updater signing → creates GitHub Release (draft) with installer assets + `latest.json`
3. **Clean R2 latest/** — Delete old installers from `s3://orivraa-releases/desktop/latest/` (preserves `latest.json`)
4. **Upload to R2 (latest only)** — New installers uploaded to `desktop/latest/` only. R2 does NOT keep versioned copies — older versions are served exclusively from GitHub Releases.
5. **Generate R2 latest.json** — Tauri updater manifest with R2 `desktop/latest/` URLs (fallback endpoint)
6. **Publish to API** — POST to `/api/releases/publish` with R2 download URL, file size, changelog → updates the download page

### Download Strategy (R2 + GitHub hybrid)

- **Latest version**: Served from R2 (`releases.orivraa.com/desktop/latest/`) — fast, CDN-backed
- **Older versions**: Served from GitHub Release assets (`github.com/.../releases/download/desktop-v{version}/{file}`)
- **Download page** (`/download`): Uses `resolveDownloadUrl()` — latest release uses stored `downloadUrl` (R2), older releases construct GitHub Release asset URL from version + fileName
- **Tauri updater**: Checks GitHub Releases `latest.json` (primary) → R2 `desktop/latest.json` (fallback)
- **R2 cost optimization**: Only one version's installers stored in R2 at any time (~100-200 MB vs. all versions)

### Tauri Updater Signing

- **Public key:** Configured in `apps/desktop/src-tauri/tauri.conf.json` (`plugins.updater.pubkey`)
- **Private key:** Stored as GitHub secret `TAURI_SIGNING_PRIVATE_KEY` (generated via `tauri signer generate`)
- **Private key location:** `.tauri-keys/private.key` (gitignored, never committed)
- If the private key is lost, updates will break — rotate by generating a new keypair and updating the pubkey in tauri.conf.json

### Required GitHub Secrets

| Secret                               | Purpose                                   |
| ------------------------------------ | ----------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | Tauri updater signing (base64 key string) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key (if set)     |
| `R2_ACCOUNT_ID`                      | Cloudflare account ID for R2 uploads      |
| `R2_ACCESS_KEY_ID`                   | R2 API token access key                   |
| `R2_SECRET_ACCESS_KEY`               | R2 API token secret                       |
| `ORIVRAA_ADMIN_TOKEN`                | Admin JWT for `/api/releases/publish`     |

### Updater Endpoints (in tauri.conf.json)

1. `https://github.com/aakash-priyadarshi/gold-shop-app/releases/latest/download/latest.json` (primary)
2. `https://releases.orivraa.com/desktop/latest.json` (R2 fallback)

### Local Build (optional, for dev)

- `apps/desktop/scripts/build-and-publish.ps1` — full pipeline: frontend export → Tauri build → API publish
- `apps/desktop/scripts/publish-release.ps1` — publish existing artifacts to API
- These are for local dev only; CI is the source of truth for production releases

## Key Conventions

1. **Always run typecheck** after changes: `npx tsc --noEmit` in both `apps/web` and `apps/api`
2. **Always run tests** after tax engine changes: `npx jest --testPathPattern="backend-tax-engine"` in `apps/api`
3. **Use `<T>` component** for all user-facing strings in new pages
4. **Store weights in grams** — convert at the display layer using `@gold-shop/shared`
5. **Update all tax files** when changing tax rates (see list above)
6. **Add knowledge chunks** to `knowledge-chunks.ts` when adding user-facing features
7. **Add tour steps** to `useTutorial.ts` when adding new pages with UI elements
8. **Use `data-tour` attributes** on key UI elements for tutorial anchors
9. **Prefer editing existing files** over creating new ones
10. **Follow existing import ordering** (React → next → @/components → @/hooks → @/lib → @gold-shop/shared → lucide-react)
