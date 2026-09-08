# Seller-approved support access

Implemented behind `SUPPORT_ACCESS_ENABLED=true` on the API. The default is off.
Apply `20260908120000_support_access` with the normal migration pipeline before enabling.
No production migration or deployment is performed by this change.

## Journeys

- Admin/seller chat: request access or grant access directly. The actual owner selects the named admin's shop, expiry and individual permissions. Chat cards reference a database grant; message text is never authorization.
- Seller/admin dashboard → Support access: grants, revocation, recent sessions and action history.
- Approved admin opens the actual seller dashboard in the current tab. Other admin tabs retain their login. One opaque, hashed server-side session credential is stored in sessionStorage. No seller password, JWT, refresh token or shared cookie is issued or overwritten.
- One grant can authorize repeated sessions until its exact expiry (hours to one year). Each session lasts at most one hour, with 15 minutes without browser interaction ending access. New permissions or extensions require a fresh seller grant.
- Screen recording is off and unavailable. Sentry replay is excluded from support documents. Action logs remain enabled and do not store request/response bodies or credentials.

## Operations

The operation allowlist is in `support-access.policy.ts`. Reviewed reads cover the dashboard, shop settings/materials/capabilities/pricing, inventory, quotes, orders list, invoices and plan features. Unreviewed modules/actions return 403, including account/security changes, payments, message sending, deletion and bulk exports. Do not add broad URL prefixes or simply allow every GET: existing GET handlers can mutate data.

Seller-selectable actions are product edits (including prices/stock state), materials, capabilities, gemstone/component prices, real invoice creation, invoice settings and individual invoice PDF downloads. Existing seller role and plan gates still run. Product requests are additionally checked against the granted shop. HTTP credentials are opaque and therefore rejected by JWT-only socket/CI/auth paths; support chat sockets are intentionally disabled.

Support reads execute in an AsyncLocalStorage context that blocks Prisma writes and raw queries. Currency rebase and invoice-settings initialization are suppressed or represented without saving. Subscription fallback does not auto-activate a plan. The tiny subscription change is in the private core submodule and must be included when publishing this change.

## Release validation and rollback

Critical journeys affected: authentication, pricing reads, invoice creation/settings/PDF, subscriptions, Prisma middleware and migration. Run API/web typechecks, support-access tests, existing auth/shops/invoice tests and the web consent tests against this checkout. Before enabling in production, use an exact-SHA preview with two test shops owned by one seller and two admins. Check request → approve → browse → selected edit → revoke. Verify the other admin and other shop fail, idle/expiry terminate access, normal admin tabs stay logged in, and no Sentry replay starts. Confirm no mutation occurs while browsing an uninitialized shop. Review the access log after each action.

Rollback: set `SUPPORT_ACCESS_ENABLED=false` to reject all existing support credentials immediately; roll back code if needed. Keep additive tables/audit history. Do not drop the new enum value or tables as a routine rollback. When deploying, verify deployed SHA and monitor canaries/crash reports for 30 minutes per AGENTS.md.
