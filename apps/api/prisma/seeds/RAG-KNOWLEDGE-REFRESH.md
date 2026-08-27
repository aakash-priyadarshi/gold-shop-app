# Production RAG knowledge refresh (one-time)

Orivraa chatbot retrieval reads embedded rows in `KnowledgeChunk` (pgvector). API deploy runs **migrations only** — it does **not** run `knowledge-chunks.ts`. After merging changes to `knowledge-chunks.ts`, refresh production embeddings manually.

## When to run

- A new or updated `topic` was added to `prisma/seeds/knowledge-chunks.ts`
- Chatbot answers are stale but application code is already deployed

Do **not** add this seed to container startup (avoid re-embedding on every Railway restart).

## Seed behavior (safe resume)

Script: `prisma/seeds/knowledge-chunks.ts`

- If the table is **empty**: truncates and seeds all topics.
- If rows **already exist**: **resume mode** — skips topics already present unless listed in `FORCE_REFRESH`.
- `FORCE_REFRESH` topics: delete that topic’s row, re-embed with Gemini, insert again (**row count unchanged** for those topics).
- Missing topics: embed and insert (**row count increases**).

Expect ~13 seconds per Gemini embedding call (free-tier rate limit).

## Prerequisites

- Railway CLI logged in (`railway login`) and linked to project `eloquent-respect`, environment `production`
- Local: Node 20+, `pnpm install` completed, `apps/api` Prisma client generated (`npx prisma generate`)

## Safe production procedure

From repo root:

```powershell
cd apps/api

# Load production credentials via Railway CLI (do not copy secrets into files or chat)
$apiVars = railway variable list --service "@gold-shop/api" --json | ConvertFrom-Json
$pgVars  = railway variable list --service Postgres --json | ConvertFrom-Json

if (-not $apiVars.GEMINI_API_KEY) { throw "GEMINI_API_KEY missing on @gold-shop/api" }
if (-not $pgVars.DATABASE_PUBLIC_URL) { throw "DATABASE_PUBLIC_URL missing on Postgres" }

$env:GEMINI_API_KEY = $apiVars.GEMINI_API_KEY
$env:DATABASE_URL = $pgVars.DATABASE_PUBLIC_URL
$env:DIRECT_DATABASE_URL = $pgVars.DATABASE_PUBLIC_URL

npx ts-node -P tsconfig.json prisma/seeds/knowledge-chunks.ts
```

**Why `DATABASE_PUBLIC_URL`:** `@gold-shop/api` uses internal `postgres.railway.internal` URLs that are not reachable from your laptop. The Postgres service public proxy URL is used for one-off local runs only.

**Do not** run `railway run --service @gold-shop/api` for this seed from a local machine — internal DB host will fail.

## Verify after run

```powershell
railway run --service Postgres node -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_PUBLIC_URL } } });
const total = await p.\$queryRawUnsafe('SELECT COUNT(*)::int AS cnt FROM \"KnowledgeChunk\"');
const dupes = await p.\$queryRawUnsafe('SELECT topic, COUNT(*)::int c FROM \"KnowledgeChunk\" GROUP BY topic HAVING COUNT(*) > 1');
console.log(JSON.stringify({ total, dupes }));
await p.\$disconnect();
"
```

Check the new topic exists, `embedding IS NOT NULL`, and `dupes` is empty.

Optionally hit production chatbot (`POST /api/tickets/ai-chat`) with representative questions.

## Rollback

There is no automatic rollback. To remove a bad topic:

```sql
DELETE FROM "KnowledgeChunk" WHERE topic = '<topic>';
```

Then fix `knowledge-chunks.ts` and re-run the seed for that topic only (or add it to `FORCE_REFRESH` temporarily).
