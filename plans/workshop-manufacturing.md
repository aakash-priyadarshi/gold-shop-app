# Large Workshop Manufacturing

> **Status:** Phases 2–3 shipped 2026-08-14 (desktop). Phase 1 (shop ledger integrity) shipped 2026-08-14 on `/dashboard/shop/supply-chain`.
>
> **Not this plan:** growing the current Supply Chain page into an ERP. That page stays the **shop karigar book** (vault → issue → stages → loss).

**Last updated:** 2026-08-14

---

## 1. Two products, two homes

| Product                                | Who                                    | Route                          | What it is                                                               |
| -------------------------------------- | -------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| **Karigar ledger** (shipped)           | Independent jeweller, a few artisans   | `/dashboard/shop/supply-chain` | Vault, issue/return, job stages, gold loss                               |
| **Workshop manufacturing** (this plan) | In-house factory / large karigar floor | `/dashboard/shop/workshop/*`   | Work orders, BOM, department queues, QC, procurement lots, control tower |

Do **not** merge these into one mega-page. A shop with two karigars should never land on a Senco-style control tower.

Gate the new area with a **new** feature flag (suggested: `workshopManufacturing`, Enterprise / manufacturing add-on). Do **not** reuse `karigarSupplyChain`.

---

## 2. How people access it (locked)

**Workshop mode is a shop setting, not a toggle on the karigar page.**

Phase 2–3 need several pages (tower, jobs, floor, metal, QC). A mode switch on one page cannot reveal that nav. Use the **settings** branch:

| Shop setting `workshopMode` | What the shopkeeper sees                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Off** (default)           | Today’s **Supply Chain** karigar book only. No factory nav.                                                                    |
| **On**                      | Hide **Supply Chain**. Show the **Workshop** sidebar group (tower, jobs, floor, metal, QC). Same `Karigar*` tables underneath. |

Also require plan flag `workshopManufacturing` (Enterprise / manufacturing add-on). Setting on + flag off → prompt to upgrade, do not show a half-built factory.

Do **not** also put a shop/workshop switch on `/supply-chain`. Two switches will desync nav and bookmarks.

**Do not grow `/dashboard/shop/supply-chain` into the factory.** That route stays the shop karigar book.

**One new sidebar group when workshop mode is on, several pages, not one page per department.**

Departments (casting, filing, setting, polishing, QC) are **queues and filters**, not top-level nav items. A casting bench does not get `/dashboard/shop/casting`.

### Sidebar when workshop mode is on

Five items:

| Nav label    | Route                             | Role                            |
| ------------ | --------------------------------- | ------------------------------- |
| **Workshop** | `/dashboard/shop/workshop`        | Control tower (home)            |
| **Jobs**     | `/dashboard/shop/workshop/jobs`   | Manufacturing orders            |
| **Floor**    | `/dashboard/shop/workshop/floor`  | Department queues               |
| **Metal**    | `/dashboard/shop/workshop/ledger` | Issue / return / scrap / adjust |
| **QC**       | `/dashboard/shop/workshop/qc`     | Inspection / rework / approve   |

Secondary (from tower or job list, not extra primary nav):

- `/dashboard/shop/workshop/jobs/[id]` — job card
- `/dashboard/shop/workshop/karigars` — people, rates, settlements
- `/dashboard/shop/workshop/procurement` — suppliers, lots, receiving
- `/dashboard/shop/workshop/reports` — yield, wages, ageing, on-time

### Floor / departments

`/dashboard/shop/workshop/floor?dept=CASTING` (same page, query or tabs).

- Office: all departments, bottlenecks, overdue.
- Bench tablet: same URL with `dept` pinned (optional `/m/workshop/floor?dept=CASTING` later).
- Configurable department list lives in shop settings, not in the router.

### Why not one giant page

Control tower, job cards, metal slips, and QC checklists are different jobs. Nested routes under `workshop/layout.tsx` share chrome; each route stays focused.

### Why not a page per department

Casting / filing / setting / polish / QC are the **same Floor UI** with a different queue. Extra sidebar items rot; a new department would need a new route. Filters scale; nav items do not.

### If we had only needed one extra page

A toggle on the karigar page (shop view ↔ workshop view) would have been enough. That is **not** this plan. Do not implement that toggle.

---

## 3. Phase 2 — Manufacturing orders

Turn a “job” into a real work order.

- Link to customer, order, design/SKU, photos, due date, priority, qty, size, purity, metal colour, stones.
- BOM / expected consumption: gold, alloy, stones, findings, wax, plating, expected yield.
- Multiple casting trees and sub-assemblies (stop using `trees?.[0]` only).
- Configurable routing: department queue, assigned worker, stage timestamps, photos, notes, rework, rejection reason.
- Finished-goods receipt creates or updates `InventoryItem` (and later HUID/hallmark already stored on inventory).

Entry: **Jobs** list → job card. Floor only advances the current stage.

---

## 4. Phase 3 — Control tower

The Workshop **home** is an operations dashboard, not another card dump.

Show exceptions first:

- Overdue jobs
- Waiting on next department
- Loss-limit breaches
- Unreceived metal
- QC pending
- Low vault / lot
- Wages awaiting settlement
- Due this week
- Department load / bottlenecks
- On-time % and rework rate

Procurement, karigar settlement, and reports hang off this home. They are not Phase 3 blockers for a first factory pilot; the tower + jobs + floor + metal + QC loop is.

Out of scope for v1 of this plan: RJC/OECD chain-of-custody packs, multi-plant Oracle SFM, supplier KYC as a full compliance suite. Lot id on metal movements is enough to start genealogy later.

---

## 5. Data note

Reuse `KarigarJob`, `KarigarJobStage`, `KarigarMetalMovement`, `KarigarCastingTree` where they already match. Do not fork a second job table. Add fields (order id, BOM, due date, department) onto the existing models when this ships.

The shop Supply Chain UI can keep using a **subset** of the same tables.

---

## 6. Phase 1 (shipped 2026-08-14)

On the current Supply Chain page / karigar API:

1. Issue metal requires a workshop (API + UI).
2. Create job stores `workshopId` (dropdown value = workshop id).
3. Procure bullion is an inbound `ADJUST` metal movement, not only `saveSnapshot`.
4. Accrue `wageDue` from finished return × `wageRatePerGram`.
5. Render every casting tree, with Add tree.
6. Rate ticker shows live vs fallback.
