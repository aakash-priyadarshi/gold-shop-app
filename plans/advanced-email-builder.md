# Advanced Email Builder for Product-Update Campaigns

> Shipped on `feat/admin-offers-email-builder` (Sep 2026). Builds on PR #47
> (PRODUCT_UPDATE campaign kind, inline CID images, simple email editor).

## Problem

Admin → Offers mixed festival offers, recovery winback, and product-update
announcements into one flat form. Festival emails only need subject + copy +
a claim link; product announcements need real media (GIF/video/pictures) and
ideally motion so recipients see the product in action.

## What shipped

### 1. Tabbed offers console (no behavior change to existing flows)

`/dashboard/admin/offers` now has `?tab=` deep-linkable tabs:

- **Festival offers** — calendar, simple editor (subject/heading/plain-text
  body/hero image), claim-link campaigns, audience + scheduling.
- **Product updates** — product-update campaigns + the advanced builder.
- **Performance** — the shared analytics funnel (`CampaignAnalytics`
  extracted to `components/admin/offers/CampaignAnalytics.tsx`).

Audience, preview card, and scheduling stay shared below the campaign tabs
because every kind is sent through the same queue and metrics.

### 2. Block-based email design (product updates only)

- `OfferCampaign.emailDesign Json?` — normalized block list stored as
  `{ blocks: [...] }` with types `heading | text | image | video | button |
divider | spacer`. Optional `fadeIn`/`slideUp` entrance animation is
  accepted on `heading`, `text`, `image`, and `video` blocks only (buttons,
  dividers, and spacers render statically). `apps/api/src/modules/recovery-offers/email-design.ts`
  validates every field (https-only URLs, length caps, ≤40 blocks).
- `EmailDesignRendererService` renders table-based, inline-styled 640px HTML
  in the Orivraa visual language. Text blocks support `**bold**`, `*italic*`,
  `[label](https://url)` after escaping. Brand header, fine print, and the
  unsubscribe footer are always appended.
- Motion strategy: animated **GIFs** work in all clients (Outlook desktop =
  first frame); `@keyframes` in a `<style>` block is progressive enhancement
  (Apple Mail/iOS/Thunderbird) that degrades to static in Gmail/Outlook;
  the **video block is a linked poster + play button** (the standard
  "fake video" pattern) pointing at an R2 MP4/WebM or any https page.
- Endpoints: `PUT /recovery-offers/admin/campaigns/:key/email-design`,
  `POST .../email-design/preview`, `DELETE .../email-design` (all
  ADMIN-only, PRODUCT_UPDATE-only, honoring the 5-minute pre-send lock).
- Delivery: `deliverQueuedOffer` renders the design via `mail.sendHtml` with
  the same idempotency key, Resend tags, and `List-Unsubscribe` headers as
  template sends. Invalid/oversized designs fall back to the template path.
- Size guards: render >90 KB logs a warning; >102 KB is rejected (Gmail
  clips HTML around 102 KB). The preview response returns `bytes` so the UI
  can warn.

### 3. Campaign media on R2 (images.orivraa.com)

- Worker: new `email` upload type — images (JPEG/PNG/WebP/GIF/AVIF) and
  video (MP4/WebM) ≤10 MB. Originals are stored byte-exact (no
  re-encoding), so GIF animation survives. `security.ts` accepts
  `email/…` object keys. **Requires one `wrangler deploy` of
  `cloudflare-worker/` before uploads work in production.**
- API: `image-upload-token` issues `email`-scoped tokens to ADMINs only.
- Web: `uploadEmailMedia()` in `lib/image-upload.ts` uploads animated GIFs
  and videos raw (canvas compression would flatten them) and still images
  through the normal compress path.

### 4. Builder UI

`components/admin/offers/email-builder/EmailBlockEditor.tsx` — block stack
(add/reorder/duplicate/delete), three starter layouts (Product spotlight,
Feature tour, Demo announcement), per-block upload/URL fields, animation
pickers with client-support captions, sandboxed live preview rendering the
server HTML with a Gmail-size warning. Festival editor untouched.

## Tests

- `email-design-renderer.service.spec.ts` — parser (URL schemes, limits,
  unknown types) and renderer (escaping, block coverage, animation
  fallback, unsubscribe, size accounting).
- `recovery-offers.service.spec.ts` — design save/reject/lock, delivery via
  `sendHtml` with headers/tags, fallback on invalid design JSON.

## Rollout notes

1. Deploy the API (migration is additive; legacy campaigns unaffected).
2. Deploy the Cloudflare images worker (`email` upload type).
3. Deploy web; optionally do one manual send to a Gmail and an Apple Mail
   inbox to eyeball the design render before a real campaign.
4. Rollback: `DELETE .../email-design` per campaign reverts to the template
   path — note the endpoint honors the 5-minute pre-send content lock, so it
   succeeds only while no offer for the campaign is queued for immediate or
   imminent delivery. Do not clear the column directly in the database as an
   emergency procedure; wait out the lock window instead (a nullable column
   also makes a full code rollback safe, since the design path only activates
   on campaigns that explicitly saved a design).
