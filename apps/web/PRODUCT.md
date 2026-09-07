# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Orivraa serves jewellery shopkeepers and customers. Administrators manage
product-update campaigns for shopkeepers through Admin → Offers → Product updates.

## Product Purpose

The email studio lets administrators explain product changes with readable copy,
screenshots and demos, and see the email while editing it.

## Capabilities and Constraints

The existing product uses Next.js, a NestJS API, validated block designs and
hosted email media. Campaign audience selection and scheduling remain in the
Offers workflow. Scheduled-send content locks, unsubscribe links, translation
support and HTML size limits must be preserved.

The approved studio direction is a persistent live preview, customizable
sections, style controls, undo/redo and recoverable drafts. A later demo-composer
stage will generate GIFs and static posters from videos or screenshots.

## Evidence on Hand

Existing editor and renderer: `src/components/admin/offers/email-builder/` and
`../api/src/modules/recovery-offers/`. The real product demo asset is
`public/ai-photo-studio-demo.gif`. The feature brief is `../../plans/live-email-studio.md`.
